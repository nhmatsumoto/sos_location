using SosLocation.Domain.Catalog;
using Xunit;

namespace SosLocation.UnitTests;

public class UrbanDataSourcesTests
{
    [Theory]
    [InlineData(UrbanDataSources.Plateau, 100)]
    [InlineData(UrbanDataSources.OpenStreetMap, 50)]
    [InlineData(UrbanDataSources.EStat, 10)]
    [InlineData(UrbanDataSources.Derived, 0)]
    [InlineData(UrbanDataSources.Simulation, 0)]
    public void DefaultPriority_MatchesHierarchy(string sourceKey, int expectedPriority)
    {
        Assert.Equal(expectedPriority, UrbanDataSources.DefaultPriority(sourceKey));
    }

    [Fact]
    public void DefaultPriority_UnknownSource_FallsBackToZero()
    {
        Assert.Equal(0, UrbanDataSources.DefaultPriority("some-other-dataset"));
    }

    [Fact]
    public void Plateau_OutranksOpenStreetMap_OutranksEStat()
    {
        Assert.True(UrbanDataSources.DefaultPriority(UrbanDataSources.Plateau)
            > UrbanDataSources.DefaultPriority(UrbanDataSources.OpenStreetMap));
        Assert.True(UrbanDataSources.DefaultPriority(UrbanDataSources.OpenStreetMap)
            > UrbanDataSources.DefaultPriority(UrbanDataSources.EStat));
    }
}
