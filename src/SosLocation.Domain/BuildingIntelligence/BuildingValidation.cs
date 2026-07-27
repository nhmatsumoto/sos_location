using NetTopologySuite.Geometries;

namespace SosLocation.Domain.BuildingIntelligence;

public enum ValidationDecision
{
    Approve,
    Reject,
    CorrectGeometry,
    CorrectClassification,
    MergeWithExisting,
    MarkDuplicate
}

/// <summary>Decisão humana sobre um candidato — o único mecanismo pelo qual uma inferência de IA
/// pode afetar um BuildingFootprint confirmado. Imutável.</summary>
public class BuildingValidation
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public required Guid CandidateId { get; init; }
    public required Guid ReviewerId { get; init; }
    public required ValidationDecision Decision { get; init; }
    public Geometry? CorrectedGeometry { get; init; }
    public BuildingType? CorrectedBuildingType { get; init; }
    public string? Reason { get; init; }
    public DateTimeOffset CreatedAt { get; init; } = DateTimeOffset.UtcNow;
}
