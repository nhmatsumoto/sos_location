using NetTopologySuite.Geometries;
using SosLocation.Application.Disasters;
using Xunit;

namespace SosLocation.UnitTests;

public class OperationalFeatureRequestValidatorTests
{
    private static readonly OperationalFeatureRequestValidator Validator = new();
    private static readonly GeometryFactory Factory =
        NetTopologySuite.NtsGeometryServices.Instance.CreateGeometryFactory(4326);

    private static Polygon Polygon() => Factory.CreatePolygon(
    [
        new Coordinate(130.70, 32.68),
        new Coordinate(130.72, 32.68),
        new Coordinate(130.72, 32.70),
        new Coordinate(130.70, 32.70),
        new Coordinate(130.70, 32.68),
    ]);

    private static OperationalFeatureRequest ValidRequest() => new()
    {
        FeatureType = OperationalFeatureTypes.SearchSector,
        Name = "Setor SAR-03",
        Geometry = Polygon(),
        Priority = 1,
        Status = OperationalStatuses.Assigned,
        ConfirmedVictims = 2,
        EstimatedVictims = 5,
        AssignedTeam = "SAR-03",
        VerificationStatus = OperationalVerificationStatuses.Corroborated,
    };

    [Fact]
    public void SearchSector_WithOperationalFields_IsValid()
        => Assert.True(Validator.Validate(ValidRequest()).IsValid);

    [Theory]
    [InlineData(OperationalFeatureTypes.RiskArea)]
    [InlineData(OperationalFeatureTypes.SafeArea)]
    [InlineData(OperationalFeatureTypes.SearchSector)]
    public void AreaTypes_RequirePolygon(string featureType)
    {
        var request = ValidRequest() with
        {
            FeatureType = featureType,
            Geometry = Factory.CreatePoint(new Coordinate(130.71, 32.69)),
        };

        var result = Validator.Validate(request);
        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, error => error.PropertyName == nameof(request.Geometry));
    }

    [Fact]
    public void TrafficInterruption_RequiresLineString()
    {
        var request = ValidRequest() with
        {
            FeatureType = OperationalFeatureTypes.TrafficInterruption,
            Geometry = Factory.CreateLineString(
            [
                new Coordinate(130.70, 32.68),
                new Coordinate(130.72, 32.70),
            ]),
        };

        Assert.True(Validator.Validate(request).IsValid);
    }

    [Fact]
    public void Alert_RequiresPoint()
    {
        var request = ValidRequest() with
        {
            FeatureType = OperationalFeatureTypes.Alert,
            Geometry = Factory.CreatePoint(new Coordinate(130.71, 32.69)),
        };

        Assert.True(Validator.Validate(request).IsValid);
        Assert.False(Validator.Validate(request with { Geometry = Polygon() }).IsValid);
    }

    [Fact]
    public void RescueRoute_RequiresLineString()
    {
        var request = ValidRequest() with
        {
            FeatureType = OperationalFeatureTypes.RescueRoute,
            Geometry = Factory.CreateLineString(
            [
                new Coordinate(130.70, 32.68),
                new Coordinate(130.72, 32.70),
            ]),
        };

        Assert.True(Validator.Validate(request).IsValid);
    }

    [Fact]
    public void EstimatedVictims_CannotBeBelowConfirmed()
    {
        var result = Validator.Validate(ValidRequest() with
        {
            ConfirmedVictims = 5,
            EstimatedVictims = 4,
        });

        Assert.False(result.IsValid);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(5)]
    public void Priority_OutsideP1ToP4_IsRejected(int priority)
        => Assert.False(Validator.Validate(ValidRequest() with { Priority = priority }).IsValid);
}
