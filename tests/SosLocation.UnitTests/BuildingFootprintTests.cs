using NetTopologySuite.Geometries;
using SosLocation.Domain.BuildingIntelligence;
using Xunit;

namespace SosLocation.UnitTests;

public class BuildingFootprintTests
{
    private static readonly GeometryFactory Factory =
        NetTopologySuite.NtsGeometryServices.Instance.CreateGeometryFactory(4326);

    private static Polygon NewGeometry() => Factory.CreatePolygon(
    [
        new Coordinate(0, 0), new Coordinate(1, 0), new Coordinate(1, 1),
        new Coordinate(0, 1), new Coordinate(0, 0),
    ]);

    private static BuildingFootprint NewFootprint() => new()
    {
        Geometry = NewGeometry(),
        SourceOfTruth = "ManualSurvey",
    };

    [Fact]
    public void Supersede_FromActive_SetsStatusAndValidTo()
    {
        var footprint = NewFootprint();
        var now = DateTimeOffset.UtcNow;

        footprint.Supersede(now);

        Assert.Equal(BuildingFootprintStatus.Superseded, footprint.Status);
        Assert.Equal(now, footprint.ValidTo);
    }

    [Fact]
    public void Supersede_FromRetired_Throws()
    {
        var footprint = NewFootprint();
        footprint.Retire(DateTimeOffset.UtcNow);

        Assert.Throws<InvalidOperationException>(() => footprint.Supersede(DateTimeOffset.UtcNow));
    }

    [Fact]
    public void Supersede_IncrementsRevision()
    {
        var footprint = NewFootprint();
        var initialRevision = footprint.Revision;

        footprint.Supersede(DateTimeOffset.UtcNow);

        Assert.Equal(initialRevision + 1, footprint.Revision);
    }

    [Fact]
    public void Retire_FromActive_SetsStatusAndValidTo()
    {
        var footprint = NewFootprint();
        var now = DateTimeOffset.UtcNow;

        footprint.Retire(now);

        Assert.Equal(BuildingFootprintStatus.Retired, footprint.Status);
        Assert.Equal(now, footprint.ValidTo);
    }

    [Fact]
    public void Retire_FromSuperseded_Throws()
    {
        var footprint = NewFootprint();
        footprint.Supersede(DateTimeOffset.UtcNow);

        Assert.Throws<InvalidOperationException>(() => footprint.Retire(DateTimeOffset.UtcNow));
    }
}
