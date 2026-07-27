using NetTopologySuite.Geometries;
using SosLocation.Domain.ValueObjects;

namespace SosLocation.Domain.BuildingIntelligence;

public enum CandidateStatus
{
    Detected,
    RequiresReview,
    Approved,
    Rejected,
    Merged,
    Superseded
}

/// <summary>Construção detectada automaticamente, ainda não confirmada. Nunca substitui um
/// BuildingFootprint diretamente — apenas uma BuildingValidation explícita avança seu status.</summary>
public class BuildingFootprintCandidate
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public required Guid ObservationId { get; init; }
    public required Geometry Geometry { get; init; }
    public required double AreaM2 { get; init; }
    public required double PerimeterM { get; init; }
    public required string ModelName { get; init; }
    public required string ModelVersion { get; init; }
    public required DataConfidence Confidence { get; init; }
    public DataConfidence? Uncertainty { get; init; }
    public CandidateStatus Status { get; private set; } = CandidateStatus.Detected;
    public DateTimeOffset CreatedAt { get; init; } = DateTimeOffset.UtcNow;

    public bool IsDecided => Status is not (CandidateStatus.Detected or CandidateStatus.RequiresReview);

    public void MarkRequiresReview()
    {
        if (Status != CandidateStatus.Detected)
            throw new InvalidOperationException($"Cannot route to review a candidate in status {Status}.");
        Status = CandidateStatus.RequiresReview;
    }

    public void Approve()
    {
        if (Status is not (CandidateStatus.Detected or CandidateStatus.RequiresReview))
            throw new InvalidOperationException($"Cannot approve a candidate in status {Status}.");
        Status = CandidateStatus.Approved;
    }

    public void Reject()
    {
        if (Status is not (CandidateStatus.Detected or CandidateStatus.RequiresReview))
            throw new InvalidOperationException($"Cannot reject a candidate in status {Status}.");
        Status = CandidateStatus.Rejected;
    }

    public void MarkMerged()
    {
        if (Status is not (CandidateStatus.Detected or CandidateStatus.RequiresReview or CandidateStatus.Approved))
            throw new InvalidOperationException($"Cannot merge a candidate in status {Status}.");
        Status = CandidateStatus.Merged;
    }

    public void MarkSuperseded()
    {
        if (Status is CandidateStatus.Rejected or CandidateStatus.Merged or CandidateStatus.Superseded)
            throw new InvalidOperationException($"Cannot supersede a candidate in status {Status}.");
        Status = CandidateStatus.Superseded;
    }
}
