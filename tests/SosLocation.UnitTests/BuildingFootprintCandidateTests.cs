using NetTopologySuite.Geometries;
using SosLocation.Domain.BuildingIntelligence;
using SosLocation.Domain.ValueObjects;
using Xunit;

namespace SosLocation.UnitTests;

public class BuildingFootprintCandidateTests
{
    private static readonly GeometryFactory Factory =
        NetTopologySuite.NtsGeometryServices.Instance.CreateGeometryFactory(4326);

    private static Polygon NewGeometry() => Factory.CreatePolygon(
    [
        new Coordinate(0, 0), new Coordinate(1, 0), new Coordinate(1, 1),
        new Coordinate(0, 1), new Coordinate(0, 0),
    ]);

    private static BuildingFootprintCandidate NewCandidate() => new()
    {
        ObservationId = Guid.NewGuid(),
        Geometry = NewGeometry(),
        AreaM2 = 120.0,
        PerimeterM = 44.0,
        ModelName = "segformer-b2",
        ModelVersion = "1.0.0",
        Confidence = DataConfidence.From(0.9),
    };

    [Fact]
    public void MarkRequiresReview_FromDetected_TransitionsStatus()
    {
        var candidate = NewCandidate();
        candidate.MarkRequiresReview();
        Assert.Equal(CandidateStatus.RequiresReview, candidate.Status);
    }

    [Fact]
    public void MarkRequiresReview_FromApproved_Throws()
    {
        var candidate = NewCandidate();
        candidate.Approve();
        Assert.Throws<InvalidOperationException>(() => candidate.MarkRequiresReview());
    }

    [Fact]
    public void Approve_FromDetected_Succeeds()
    {
        var candidate = NewCandidate();
        candidate.Approve();
        Assert.Equal(CandidateStatus.Approved, candidate.Status);
    }

    [Fact]
    public void Approve_FromRequiresReview_Succeeds()
    {
        var candidate = NewCandidate();
        candidate.MarkRequiresReview();
        candidate.Approve();
        Assert.Equal(CandidateStatus.Approved, candidate.Status);
    }

    [Fact]
    public void Approve_FromRejected_Throws()
    {
        var candidate = NewCandidate();
        candidate.Reject();
        Assert.Throws<InvalidOperationException>(() => candidate.Approve());
    }

    [Fact]
    public void Reject_FromRequiresReview_Succeeds()
    {
        var candidate = NewCandidate();
        candidate.MarkRequiresReview();
        candidate.Reject();
        Assert.Equal(CandidateStatus.Rejected, candidate.Status);
    }

    [Fact]
    public void Reject_FromApproved_Throws()
    {
        var candidate = NewCandidate();
        candidate.Approve();
        Assert.Throws<InvalidOperationException>(() => candidate.Reject());
    }

    [Fact]
    public void MarkMerged_FromApproved_Succeeds()
    {
        var candidate = NewCandidate();
        candidate.Approve();
        candidate.MarkMerged();
        Assert.Equal(CandidateStatus.Merged, candidate.Status);
    }

    [Fact]
    public void MarkMerged_FromRejected_Throws()
    {
        var candidate = NewCandidate();
        candidate.Reject();
        Assert.Throws<InvalidOperationException>(() => candidate.MarkMerged());
    }

    [Fact]
    public void MarkSuperseded_FromApproved_Succeeds()
    {
        var candidate = NewCandidate();
        candidate.Approve();
        candidate.MarkSuperseded();
        Assert.Equal(CandidateStatus.Superseded, candidate.Status);
    }

    [Fact]
    public void MarkSuperseded_FromRejected_Throws()
    {
        var candidate = NewCandidate();
        candidate.Reject();
        Assert.Throws<InvalidOperationException>(() => candidate.MarkSuperseded());
    }

    [Theory]
    [InlineData(CandidateStatus.Detected, false)]
    [InlineData(CandidateStatus.RequiresReview, false)]
    [InlineData(CandidateStatus.Approved, true)]
    [InlineData(CandidateStatus.Rejected, true)]
    [InlineData(CandidateStatus.Merged, true)]
    [InlineData(CandidateStatus.Superseded, true)]
    public void IsDecided_ReflectsTerminalStatuses(CandidateStatus status, bool expectedDecided)
    {
        var candidate = NewCandidate();
        switch (status)
        {
            case CandidateStatus.RequiresReview: candidate.MarkRequiresReview(); break;
            case CandidateStatus.Approved: candidate.Approve(); break;
            case CandidateStatus.Rejected: candidate.Reject(); break;
            case CandidateStatus.Merged: candidate.Approve(); candidate.MarkMerged(); break;
            case CandidateStatus.Superseded: candidate.Approve(); candidate.MarkSuperseded(); break;
        }

        Assert.Equal(expectedDecided, candidate.IsDecided);
    }

    [Fact]
    public void Create_RequiresModelNameVersionConfidenceCreatedAt()
    {
        var candidate = NewCandidate();

        Assert.False(string.IsNullOrEmpty(candidate.ModelName));
        Assert.False(string.IsNullOrEmpty(candidate.ModelVersion));
        Assert.True(candidate.Confidence.Value is >= 0.0 and <= 1.0);
        Assert.True(candidate.CreatedAt <= DateTimeOffset.UtcNow);
    }
}
