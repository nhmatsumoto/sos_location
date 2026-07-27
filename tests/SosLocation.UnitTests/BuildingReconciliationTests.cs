using SosLocation.Domain.BuildingIntelligence;
using SosLocation.Domain.ValueObjects;
using Xunit;

namespace SosLocation.UnitTests;

public class BuildingReconciliationTests
{
    private static BuildingReconciliation NewReconciliation(DataConfidence iou) => new()
    {
        CandidateId = Guid.NewGuid(),
        IntersectionOverUnion = iou,
        ChangeStatus = ChangeStatus.Confirmed,
    };

    [Fact]
    public void Create_WithValidIntersectionOverUnion_Succeeds()
    {
        var reconciliation = NewReconciliation(DataConfidence.From(0.87));
        Assert.Equal(0.87, reconciliation.IntersectionOverUnion.Value, precision: 5);
    }

    [Fact]
    public void Create_WithOutOfRangeIntersectionOverUnion_ThrowsArgumentOutOfRangeException()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => DataConfidence.From(1.5));
    }

    [Fact]
    public void Create_WithoutExistingBuildingId_AllowsNull()
    {
        var reconciliation = NewReconciliation(DataConfidence.From(0.1));
        Assert.Null(reconciliation.ExistingBuildingId);
    }
}
