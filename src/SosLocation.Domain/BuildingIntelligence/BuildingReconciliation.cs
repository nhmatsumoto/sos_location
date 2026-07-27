using SosLocation.Domain.ValueObjects;

namespace SosLocation.Domain.BuildingIntelligence;

public enum ChangeStatus
{
    Confirmed,
    MissingInOSM,
    GeometryChanged,
    PossiblyRemoved,
    NewConstruction,
    Unchanged,
    RequiresReview
}

/// <summary>Comparação entre um candidato e um footprint existente (ou ausência de match).
/// Imutável — resultados conflitantes de execuções diferentes permanecem rastreáveis.</summary>
public class BuildingReconciliation
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public required Guid CandidateId { get; init; }
    public Guid? ExistingBuildingId { get; init; }
    public required DataConfidence IntersectionOverUnion { get; init; }
    public double? CentroidDistanceM { get; init; }
    public double? AreaDifferenceRatio { get; init; }
    public required ChangeStatus ChangeStatus { get; init; }
    public string? Decision { get; init; }
    public DateTimeOffset CreatedAt { get; init; } = DateTimeOffset.UtcNow;
}
