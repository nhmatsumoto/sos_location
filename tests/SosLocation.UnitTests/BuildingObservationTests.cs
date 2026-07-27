using NetTopologySuite.Geometries;
using SosLocation.Domain.BuildingIntelligence;
using Xunit;

namespace SosLocation.UnitTests;

public class BuildingObservationTests
{
    private static readonly GeometryFactory Factory =
        NetTopologySuite.NtsGeometryServices.Instance.CreateGeometryFactory(4326);

    private static Point NewPoint() => Factory.CreatePoint(new Coordinate(0, 0));

    [Fact]
    public void Create_WithMinimalFields_Succeeds()
    {
        var observation = new BuildingObservation
        {
            DatasetId = Guid.NewGuid(),
            SourceType = "AerialImage",
            CapturedAt = DateTimeOffset.UtcNow,
            Geometry = NewPoint(),
            SpatialReferenceId = 4326,
        };

        Assert.Equal(4326, observation.SpatialReferenceId);
        Assert.Null(observation.LicenseId);
    }

    [Fact]
    public void IngestedAt_DefaultsToNow()
    {
        var before = DateTimeOffset.UtcNow;
        var observation = new BuildingObservation
        {
            DatasetId = Guid.NewGuid(),
            SourceType = "Osm",
            CapturedAt = DateTimeOffset.UtcNow,
            Geometry = NewPoint(),
            SpatialReferenceId = 4326,
        };
        var after = DateTimeOffset.UtcNow;

        Assert.InRange(observation.IngestedAt, before, after);
    }
}
