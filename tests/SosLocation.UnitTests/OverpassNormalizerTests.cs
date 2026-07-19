using Microsoft.Extensions.Logging.Abstractions;
using SosLocation.Application.Abstractions;
using SosLocation.Application.Normalization;
using SosLocation.GeoProcessing.Normalizers;
using Xunit;

namespace SosLocation.UnitTests;

public class OverpassNormalizerTests
{
    private static readonly OverpassNormalizer Normalizer = new(NullLogger<OverpassNormalizer>.Instance);
    private static readonly NormalizationLimits Limits = new();

    private static SourcePayload Payload(string elementsJson) => new()
    {
        Content = System.Text.Encoding.UTF8.GetBytes(
            $$"""{"version":0.6,"elements":[{{elementsJson}}]}"""),
        Format = SourcePayloadFormat.OverpassJson,
        SourceName = "test",
    };

    private static string Way(long id, string tags, (double lon, double lat)[] ring)
    {
        var geometry = string.Join(",", ring.Select(p =>
            $$"""{"lat":{{p.lat.ToString(System.Globalization.CultureInfo.InvariantCulture)}},"lon":{{p.lon.ToString(System.Globalization.CultureInfo.InvariantCulture)}}}"""));
        return $$"""{"type":"way","id":{{id}},"tags":{{{tags}}},"geometry":[{{geometry}}]}""";
    }

    private static (double, double)[] Square(double x, double y, double size) =>
        [(x, y), (x + size, y), (x + size, y + size), (x, y + size), (x, y)];

    [Fact]
    public void SimpleWayBuilding_IsNormalized()
    {
        var result = Normalizer.Normalize(Payload(
            Way(1, """ "building":"apartments","building:levels":"5" """, Square(0, 0, 0.001))), Limits);

        var building = Assert.Single(result.Buildings);
        Assert.Equal("way/1", building.ExternalId);
        Assert.Equal("residential", building.BuildingType);
        Assert.Equal(5, building.BuildingLevels);
    }

    [Fact]
    public void BuildingPart_IsTreatedAsBuilding_WithMinHeight()
    {
        var result = Normalizer.Normalize(Payload(
            Way(2, """ "building:part":"commercial","height":"120","min_height":"40" """,
                Square(0, 0, 0.001))), Limits);

        var part = Assert.Single(result.Buildings);
        Assert.Equal(120.0, part.ExplicitHeightMeters);
        Assert.Equal(40.0, part.MinHeightMeters);
        // Tipo classificado pelo valor de building:part.
        Assert.Equal("commercial", part.BuildingType);
    }

    [Fact]
    public void OutlineCoveredByParts_IsHiddenFrom3D()
    {
        // Contorno 0..0.002 contendo duas parts (Simple 3D Buildings).
        var elements = string.Join(",",
            Way(10, """ "building":"yes","name":"Tower Outline" """, Square(0, 0, 0.002)),
            Way(11, """ "building:part":"yes","height":"100" """, Square(0.0002, 0.0002, 0.0008)),
            Way(12, """ "building:part":"yes","height":"180","min_height":"100" """,
                Square(0.0004, 0.0004, 0.0004)));

        var result = Normalizer.Normalize(Payload(elements), Limits);

        Assert.Equal(2, result.Buildings.Count);
        Assert.DoesNotContain(result.Buildings, b => b.ExternalId == "way/10");
        Assert.Contains(result.Issues, i => i.Code == "outline-hidden-by-parts" && i.FeatureId == "way/10");
    }

    [Fact]
    public void OutlineWithoutParts_IsKept()
    {
        // Duas footprints separadas: part longe do contorno → contorno permanece.
        var elements = string.Join(",",
            Way(20, """ "building":"yes" """, Square(0, 0, 0.001)),
            Way(21, """ "building:part":"yes","height":"50" """, Square(0.01, 0.01, 0.001)));

        var result = Normalizer.Normalize(Payload(elements), Limits);

        Assert.Equal(2, result.Buildings.Count);
        Assert.Contains(result.Buildings, b => b.ExternalId == "way/20");
    }
}
