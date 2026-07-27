using SosLocation.Domain.BuildingIntelligence;
using SosLocation.Domain.ValueObjects;
using Xunit;

namespace SosLocation.UnitTests;

public class BuildingClassificationTests
{
    private static BuildingClassification NewClassification(Guid? buildingId, Guid? candidateId) => new()
    {
        BuildingId = buildingId,
        CandidateId = candidateId,
        BuildingType = BuildingType.ResidentialHouse,
        Probability = DataConfidence.From(0.72),
        ModelName = "catboost-building-type",
        ModelVersion = "2.1.0",
    };

    [Fact]
    public void Create_ReferencingBuilding_Succeeds()
    {
        var classification = NewClassification(Guid.NewGuid(), null);
        Assert.NotNull(classification.BuildingId);
        Assert.Null(classification.CandidateId);
    }

    [Fact]
    public void Create_ReferencingCandidate_Succeeds()
    {
        var classification = NewClassification(null, Guid.NewGuid());
        Assert.Null(classification.BuildingId);
        Assert.NotNull(classification.CandidateId);
    }

    [Fact]
    public void Create_WithOutOfRangeProbability_ThrowsArgumentOutOfRangeException()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => DataConfidence.From(-0.1));
    }
}
