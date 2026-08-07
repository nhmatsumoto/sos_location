using NetTopologySuite.Geometries;
using SosLocation.Application.RiskZones;
using Xunit;

namespace SosLocation.UnitTests;

public class RiskZoneRequestValidatorTests
{
    private static readonly RiskZoneRequestValidator Validator = new();
    private static readonly GeometryFactory Factory =
        NetTopologySuite.NtsGeometryServices.Instance.CreateGeometryFactory(4326);

    private static Polygon ValidPolygon() => Factory.CreatePolygon(
    [
        new Coordinate(0, 0), new Coordinate(1, 0), new Coordinate(1, 1),
        new Coordinate(0, 1), new Coordinate(0, 0),
    ]);

    private static RiskZoneRequest ValidRequest() => new()
    {
        Name = "Flood-prone riverside",
        HazardType = HazardTypes.Flood,
        Level = RiskLevels.High,
        Geometry = ValidPolygon(),
    };

    [Fact]
    public void ValidRequest_Passes()
    {
        Assert.True(Validator.Validate(ValidRequest()).IsValid);
    }

    [Fact]
    public void UnknownHazardType_Fails()
    {
        var request = ValidRequest() with { HazardType = "meteor" };
        var result = Validator.Validate(request);
        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.PropertyName == nameof(RiskZoneRequest.HazardType));
    }

    [Fact]
    public void UnknownLevel_Fails()
    {
        var request = ValidRequest() with { Level = "catastrophic" };
        var result = Validator.Validate(request);
        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.PropertyName == nameof(RiskZoneRequest.Level));
    }

    [Fact]
    public void EmptyName_Fails()
    {
        var request = ValidRequest() with { Name = "" };
        Assert.False(Validator.Validate(request).IsValid);
    }

    [Fact]
    public void NonPolygonGeometry_Fails()
    {
        var point = Factory.CreatePoint(new Coordinate(0, 0));
        var request = ValidRequest() with { Geometry = point };
        var result = Validator.Validate(request);
        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.PropertyName == nameof(RiskZoneRequest.Geometry));
    }

    [Fact]
    public void PolygonWithFewerThanThreeVertices_Fails()
    {
        // Triângulo degenerado: só 2 vértices distintos antes de fechar o anel.
        var degenerate = Factory.CreatePolygon(
        [
            new Coordinate(0, 0), new Coordinate(1, 1), new Coordinate(0, 0),
        ]);
        var request = ValidRequest() with { Geometry = degenerate };
        var result = Validator.Validate(request);
        Assert.False(result.IsValid);
    }
}
