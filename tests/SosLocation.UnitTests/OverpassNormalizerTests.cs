using Microsoft.Extensions.Logging.Abstractions;
using NetTopologySuite.Geometries;
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
        var geometry = GeometryJson(ring);
        return $$"""{"type":"way","id":{{id}},"tags":{{{tags}}},"geometry":[{{geometry}}]}""";
    }

    private static string Relation(
        long id,
        string tags,
        params (string Role, (double lon, double lat)[] Coordinates)[] members)
    {
        var memberJson = string.Join(",", members.Select((member, index) =>
            $$"""{"type":"way","ref":{{id * 100 + index}},"role":"{{member.Role}}","geometry":[{{GeometryJson(member.Coordinates)}}]}"""));
        var tagsJson = $$"""{"type":"multipolygon",{{tags}}}""";
        return $$"""{"type":"relation","id":{{id}},"tags":{{tagsJson}},"members":[{{memberJson}}]}""";
    }

    private static string GeometryJson(IEnumerable<(double lon, double lat)> coordinates)
        => string.Join(",", coordinates.Select(point =>
            $$"""{"lat":{{point.lat.ToString(System.Globalization.CultureInfo.InvariantCulture)}},"lon":{{point.lon.ToString(System.Globalization.CultureInfo.InvariantCulture)}}}"""));

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
        Assert.Equal("apartment", building.BuildingClass);
        Assert.Equal(5, building.BuildingLevels);
        Assert.Equal("apartment", building.Tags["sos:building_class"]);
        Assert.Equal("building", building.Tags["sos:feature_kind"]);
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
        // Uma part cobrindo todo o footprint substitui o outline.
        var elements = string.Join(",",
            Way(10, """ "building":"yes","name":"Tower Outline" """, Square(0, 0, 0.002)),
            Way(11, """ "building:part":"yes","height":"100" """, Square(0, 0, 0.002)));

        var result = Normalizer.Normalize(Payload(elements), Limits);

        Assert.Single(result.Buildings);
        Assert.DoesNotContain(result.Buildings, b => b.ExternalId == "way/10");
        Assert.Contains(result.Issues, i => i.Code == "outline-hidden-by-parts" && i.FeatureId == "way/10");
    }

    [Fact]
    public void PartiallyCoveredOutline_PreservesUnmodeledFootprint()
    {
        var elements = string.Join(",",
            Way(13, """ "building":"yes" """, Square(0, 0, 0.002)),
            Way(14, """ "building:part":"yes","height":"30" """, Square(0, 0, 0.001)));

        var result = Normalizer.Normalize(Payload(elements), Limits);

        Assert.Equal(2, result.Buildings.Count);
        var remainder = Assert.Single(result.Buildings, building => building.ExternalId == "way/13");
        Assert.InRange(remainder.Footprint.Area, 0.0000029, 0.0000031);
        Assert.Contains(result.Issues, issue =>
            issue.Code == "outline-clipped-by-parts" && issue.FeatureId == "way/13");
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

    [Fact]
    public void FragmentedMultipolygon_JoinsReversedWaysAndPreservesHole()
    {
        var relation = Relation(
            100,
            """ "landuse":"residential" """,
            ("outer", [(0, 0), (2, 0), (2, 2)]),
            // Ordem invertida de propósito: o normalizador precisa reverter o way.
            ("outer", [(0, 0), (0, 2), (2, 2)]),
            ("inner", [(0.5, 0.5), (1, 0.5), (1, 1), (0.5, 1), (0.5, 0.5)]));

        var result = Normalizer.Normalize(Payload(relation), Limits);

        var landUse = Assert.Single(result.LandUse);
        var polygon = Assert.IsType<Polygon>(landUse.Geometry);
        Assert.Equal(1, polygon.NumInteriorRings);
        Assert.Equal(3.75, polygon.Area, 6);
        Assert.DoesNotContain(result.Issues, issue => issue.Code == "unclosed-relation-ring");
    }

    [Fact]
    public void AmenityArea_IsKeptAsCivicUrbanZone()
    {
        var result = Normalizer.Normalize(Payload(
            Way(101, """ "amenity":"hospital" """, Square(0, 0, 0.001))), Limits);

        var area = Assert.Single(result.LandUse);
        Assert.Equal("civic", area.LandUseType);
    }

    [Fact]
    public void ReservoirMappedAsLandUse_IsRenderedAsWater()
    {
        var result = Normalizer.Normalize(Payload(
            Way(102, """ "landuse":"reservoir" """, Square(0, 0, 0.001))), Limits);

        Assert.Single(result.Water);
        Assert.Empty(result.LandUse);
    }

    [Fact]
    public void IncompleteMultipolygon_IsReportedInsteadOfCreatingArtificialPolygon()
    {
        var relation = Relation(
            103,
            """ "leisure":"park" """,
            ("outer", [(0, 0), (1, 0), (1, 1)]));

        var result = Normalizer.Normalize(Payload(relation), Limits);

        Assert.Empty(result.LandUse);
        Assert.Contains(result.Issues, issue =>
            issue.FeatureId == "relation/103" && issue.Code == "unclosed-relation-ring");
    }

    [Fact]
    public void AreaHighway_IsPavementInsteadOfRoadOutline()
    {
        var result = Normalizer.Normalize(Payload(
            Way(104, """ "highway":"pedestrian","area":"yes","surface":"paving_stones" """,
                Square(0, 0, 0.001))), Limits);

        Assert.Empty(result.Roads);
        var pavement = Assert.Single(result.LandUse);
        Assert.Equal("pavement", pavement.LandUseType);
        Assert.Equal("pavement", pavement.Tags["sos:feature_kind"]);
        Assert.Equal("paved", pavement.Tags["sos:surface_class"]);
    }

    [Fact]
    public void NamedBridgeValue_IsRecognizedAndTagged()
    {
        var result = Normalizer.Normalize(Payload(
            Way(105, """ "highway":"primary","bridge":"viaduct","surface":"asphalt" """,
                [(0, 0), (0.001, 0.001)])), Limits);

        var bridge = Assert.Single(result.Roads);
        Assert.True(bridge.IsBridge);
        Assert.Equal("bridge", bridge.Tags["sos:feature_kind"]);
        Assert.Equal("paved", bridge.Tags["sos:surface_class"]);
        Assert.NotNull(bridge.WidthMeters);
    }
}
