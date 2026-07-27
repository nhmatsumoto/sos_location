using SosLocation.Domain.BuildingIntelligence;
using Xunit;

namespace SosLocation.UnitTests;

public class ModelBundleTests
{
    private static ModelBundle NewBundle() => new()
    {
        Name = "building-segmentation",
        Version = "1.0.0",
        ArtifactUri = "s3://models/building-segmentation/1.0.0",
    };

    [Fact]
    public void MoveToEvaluation_FromDevelopment_Succeeds()
    {
        var bundle = NewBundle();
        bundle.MoveToEvaluation();
        Assert.Equal(ModelBundleStage.Evaluation, bundle.Stage);
    }

    [Fact]
    public void MoveToEvaluation_FromEvaluation_Throws()
    {
        var bundle = NewBundle();
        bundle.MoveToEvaluation();
        Assert.Throws<InvalidOperationException>(() => bundle.MoveToEvaluation());
    }

    [Fact]
    public void Approve_DirectlyFromDevelopment_Throws()
    {
        var bundle = NewBundle();
        Assert.Throws<InvalidOperationException>(
            () => bundle.Approve("reviewer@sos-location", DateTimeOffset.UtcNow));
    }

    [Fact]
    public void Approve_FromEvaluation_Succeeds()
    {
        var bundle = NewBundle();
        bundle.MoveToEvaluation();
        bundle.Approve("reviewer@sos-location", DateTimeOffset.UtcNow);
        Assert.Equal(ModelBundleStage.Approved, bundle.Stage);
    }

    [Fact]
    public void Approve_FromShadow_Succeeds()
    {
        var bundle = NewBundle();
        bundle.MoveToEvaluation();
        bundle.MoveToShadow();
        bundle.Approve("reviewer@sos-location", DateTimeOffset.UtcNow);
        Assert.Equal(ModelBundleStage.Approved, bundle.Stage);
    }

    [Fact]
    public void Approve_SetsApprovedAtAndApprovedBy()
    {
        var bundle = NewBundle();
        var now = DateTimeOffset.UtcNow;
        bundle.MoveToEvaluation();
        bundle.Approve("reviewer@sos-location", now);

        Assert.Equal(now, bundle.ApprovedAt);
        Assert.Equal("reviewer@sos-location", bundle.ApprovedBy);
    }

    [Fact]
    public void PromoteToChampion_FromApproved_Succeeds()
    {
        var bundle = NewBundle();
        bundle.MoveToEvaluation();
        bundle.Approve("reviewer@sos-location", DateTimeOffset.UtcNow);
        bundle.PromoteToChampion();
        Assert.Equal(ModelBundleStage.Champion, bundle.Stage);
    }

    [Fact]
    public void PromoteToChampion_FromEvaluation_Throws()
    {
        var bundle = NewBundle();
        bundle.MoveToEvaluation();
        Assert.Throws<InvalidOperationException>(() => bundle.PromoteToChampion());
    }

    [Fact]
    public void Deprecate_FromChampion_Succeeds()
    {
        var bundle = NewBundle();
        bundle.MoveToEvaluation();
        bundle.Approve("reviewer@sos-location", DateTimeOffset.UtcNow);
        bundle.PromoteToChampion();
        bundle.Deprecate();
        Assert.Equal(ModelBundleStage.Deprecated, bundle.Stage);
    }

    [Fact]
    public void Deprecate_Twice_Throws()
    {
        var bundle = NewBundle();
        bundle.Deprecate();
        Assert.Throws<InvalidOperationException>(() => bundle.Deprecate());
    }
}
