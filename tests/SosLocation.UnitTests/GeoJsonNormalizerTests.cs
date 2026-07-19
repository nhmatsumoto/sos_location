using Microsoft.Extensions.Logging.Abstractions;
using SosLocation.Application.Abstractions;
using SosLocation.Application.Normalization;
using SosLocation.GeoProcessing.Normalizers;
using Xunit;

namespace SosLocation.UnitTests;

public class GeoJsonNormalizerTests
{
    private static readonly GeoJsonNormalizer Normalizer = new(NullLogger<GeoJsonNormalizer>.Instance);
    private static readonly NormalizationLimits Limits = new();

    public static string FindFixturePath()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null)
        {
            var candidate = Path.Combine(dir.FullName, "tools", "fixtures", "demo-district.geojson");
            if (File.Exists(candidate)) return candidate;
            dir = dir.Parent;
        }
        throw new FileNotFoundException("demo-district.geojson not found walking up from test bin.");
    }

    private static SourcePayload LoadFixture() => new()
    {
        Content = File.ReadAllBytes(FindFixturePath()),
        Format = SourcePayloadFormat.GeoJson,
        SourceName = "demo-fixture",
    };

    [Fact]
    public void DemoFixture_MeetsMinimumContentRequirements()
    {
        var result = Normalizer.Normalize(LoadFixture(), Limits);

        Assert.True(result.Buildings.Count >= 50,
            $"Fixture must have at least 50 buildings, found {result.Buildings.Count}.");
        Assert.True(result.Roads.Count > 0, "Fixture must contain roads.");
        Assert.True(result.Water.Count > 0, "Fixture must contain water.");
        Assert.NotNull(result.Boundary);

        var categories = result.Buildings.Select(b => b.BuildingType).Distinct().ToList();
        Assert.True(categories.Count >= 3,
            $"Fixture must have at least 3 building categories, found: {string.Join(", ", categories)}.");
    }

    [Fact]
    public void DemoFixture_HasHeightVariation()
    {
        var result = Normalizer.Normalize(LoadFixture(), Limits);

        var withExplicitHeight = result.Buildings.Count(b => b.ExplicitHeightMeters is not null);
        var withLevels = result.Buildings.Count(b => b.BuildingLevels is not null);
        var withNothing = result.Buildings.Count(b => b.ExplicitHeightMeters is null && b.BuildingLevels is null);

        Assert.True(withExplicitHeight > 0, "Some buildings must carry explicit height.");
        Assert.True(withLevels > 0, "Some buildings must carry building:levels.");
        Assert.True(withNothing > 0, "Some buildings must rely on the default height fallback.");
    }

    [Fact]
    public void DemoFixture_AllGeometriesAreValidWgs84()
    {
        var result = Normalizer.Normalize(LoadFixture(), Limits);

        Assert.All(result.Buildings, b =>
        {
            Assert.True(b.Footprint.IsValid);
            Assert.Equal(4326, b.Footprint.SRID);
        });
    }

    [Fact]
    public void MalformedJson_Throws()
    {
        var payload = new SourcePayload
        {
            Content = "{ not geojson"u8.ToArray(),
            Format = SourcePayloadFormat.GeoJson,
            SourceName = "test",
        };
        Assert.Throws<InvalidDataException>(() => Normalizer.Normalize(payload, Limits));
    }

    [Fact]
    public void EmptyCollection_Throws()
    {
        var payload = new SourcePayload
        {
            Content = """{"type":"FeatureCollection","features":[]}"""u8.ToArray(),
            Format = SourcePayloadFormat.GeoJson,
            SourceName = "test",
        };
        Assert.Throws<InvalidDataException>(() => Normalizer.Normalize(payload, Limits));
    }

    [Fact]
    public void FeatureCountLimit_IsEnforced()
    {
        var payload = LoadFixture();
        var tinyLimits = new NormalizationLimits { MaximumFeatureCount = 5 };
        Assert.Throws<InvalidDataException>(() => Normalizer.Normalize(payload, tinyLimits));
    }

    [Fact]
    public void InvalidCoordinates_ProduceIssueAndSkipFeature()
    {
        var payload = new SourcePayload
        {
            Content = """
            {"type":"FeatureCollection","features":[
              {"type":"Feature","properties":{"building":"yes","id":"bad-1"},
               "geometry":{"type":"Polygon","coordinates":[[[500,0],[501,0],[501,1],[500,1],[500,0]]]}},
              {"type":"Feature","properties":{"building":"yes","id":"good-1"},
               "geometry":{"type":"Polygon","coordinates":[[[0,0],[1,0],[1,1],[0,1],[0,0]]]}}
            ]}
            """u8.ToArray(),
            Format = SourcePayloadFormat.GeoJson,
            SourceName = "test",
        };

        var result = Normalizer.Normalize(payload, Limits);
        Assert.Single(result.Buildings);
        Assert.Contains(result.Issues, i => i.Code == "invalid-coordinates" && i.FeatureId == "bad-1");
    }
}
