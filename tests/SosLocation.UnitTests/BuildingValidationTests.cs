using NetTopologySuite.Geometries;
using SosLocation.Domain.BuildingIntelligence;
using Xunit;

namespace SosLocation.UnitTests;

public class BuildingValidationTests
{
    private static readonly GeometryFactory Factory =
        NetTopologySuite.NtsGeometryServices.Instance.CreateGeometryFactory(4326);

    [Fact]
    public void Create_WithCorrectGeometryDecision_CarriesCorrectedGeometry()
    {
        var corrected = Factory.CreatePolygon(
        [
            new Coordinate(0, 0), new Coordinate(2, 0), new Coordinate(2, 2),
            new Coordinate(0, 2), new Coordinate(0, 0),
        ]);

        var validation = new BuildingValidation
        {
            CandidateId = Guid.NewGuid(),
            ReviewerId = Guid.NewGuid(),
            Decision = ValidationDecision.CorrectGeometry,
            CorrectedGeometry = corrected,
        };

        Assert.Equal(ValidationDecision.CorrectGeometry, validation.Decision);
        Assert.Same(corrected, validation.CorrectedGeometry);
    }

    [Fact]
    public void Create_WithApproveDecision_HasNoCorrectedFields()
    {
        var validation = new BuildingValidation
        {
            CandidateId = Guid.NewGuid(),
            ReviewerId = Guid.NewGuid(),
            Decision = ValidationDecision.Approve,
        };

        Assert.Null(validation.CorrectedGeometry);
        Assert.Null(validation.CorrectedBuildingType);
    }
}
