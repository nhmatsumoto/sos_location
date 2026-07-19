using SosLocation.GeoProcessing.Osm;
using Xunit;

namespace SosLocation.UnitTests;

public class OsmTagNormalizerTests
{
    [Theory]
    [InlineData("12", 12.0)]
    [InlineData("12.5", 12.5)]
    [InlineData("12,5", 12.5)]
    [InlineData("12 m", 12.0)]
    [InlineData("12m", 12.0)]
    public void ParseHeightMeters_AcceptsCommonFormats(string raw, double expected)
    {
        Assert.Equal(expected, OsmTagNormalizer.ParseHeightMeters(raw)!.Value, 3);
    }

    [Fact]
    public void ParseHeightMeters_ConvertsFeet()
    {
        var meters = OsmTagNormalizer.ParseHeightMeters("100 ft");
        Assert.NotNull(meters);
        Assert.Equal(30.48, meters.Value, 2);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("abc")]
    [InlineData("-5")]
    [InlineData("0")]
    [InlineData("99999")]
    public void ParseHeightMeters_RejectsInvalid(string? raw)
    {
        Assert.Null(OsmTagNormalizer.ParseHeightMeters(raw));
    }

    [Theory]
    [InlineData("3", 3)]
    [InlineData("2.5", 3)]
    [InlineData("1", 1)]
    public void ParseLevels_RoundsToInteger(string raw, int expected)
    {
        Assert.Equal(expected, OsmTagNormalizer.ParseLevels(raw));
    }

    [Theory]
    [InlineData("0")]
    [InlineData("-2")]
    [InlineData("garbage")]
    [InlineData("999")]
    public void ParseLevels_RejectsInvalid(string raw)
    {
        Assert.Null(OsmTagNormalizer.ParseLevels(raw));
    }

    [Theory]
    [InlineData("apartments", "residential")]
    [InlineData("house", "residential")]
    [InlineData("retail", "commercial")]
    [InlineData("office", "commercial")]
    [InlineData("warehouse", "industrial")]
    [InlineData("school", "school")]
    [InlineData("hospital", "hospital")]
    [InlineData("townhall", "public")]
    [InlineData("weird_value", "unknown")]
    public void NormalizeBuildingType_MapsBuildingTag(string osmValue, string expected)
    {
        var tags = new Dictionary<string, string> { ["building"] = osmValue };
        Assert.Equal(expected, OsmTagNormalizer.NormalizeBuildingType(tags));
    }

    [Fact]
    public void NormalizeBuildingType_AmenityOverridesGenericBuilding()
    {
        var tags = new Dictionary<string, string> { ["building"] = "yes", ["amenity"] = "hospital" };
        Assert.Equal("hospital", OsmTagNormalizer.NormalizeBuildingType(tags));
    }

    [Fact]
    public void NormalizeBuildingType_GenericYesWithShop_IsCommercial()
    {
        var tags = new Dictionary<string, string> { ["building"] = "yes", ["shop"] = "convenience" };
        Assert.Equal("commercial", OsmTagNormalizer.NormalizeBuildingType(tags));
    }

    [Theory]
    [InlineData("motorway", "highway")]
    [InlineData("primary", "primary")]
    [InlineData("residential", "residential")]
    [InlineData("footway", "path")]
    public void NormalizeRoadClass_MapsHighwayTag(string highway, string expected)
    {
        Assert.Equal(expected, OsmTagNormalizer.NormalizeRoadClass(highway, new Dictionary<string, string>()));
    }

    [Fact]
    public void NormalizeRoadClass_RailwayWins()
    {
        var tags = new Dictionary<string, string> { ["railway"] = "rail" };
        Assert.Equal("rail", OsmTagNormalizer.NormalizeRoadClass(null, tags));
    }
}
