using NetTopologySuite.Geometries;

namespace SosLocation.Domain.Cities;

public enum CityRevisionStatus
{
    Draft,
    Processing,
    Ready,
    Published,
    Failed,
    Archived
}

/// <summary>Nível de qualidade da reconstrução (L0–L4).</summary>
public enum QualityLevel
{
    L0BoundaryOnly = 0,
    L1RoadsAndBasicFeatures = 1,
    L2FootprintsInferredHeights = 2,
    L3ObservedHeights = 3,
    L4SimulationReady = 4
}

/// <summary>Versão imutável e publicável da reconstrução de uma cidade.</summary>
public class CityRevision
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public required Guid CityId { get; init; }
    public int RevisionNumber { get; init; }
    public CityRevisionStatus Status { get; private set; } = CityRevisionStatus.Draft;
    public required string ReconstructionProfile { get; init; }
    public Geometry? SpatialCoverage { get; set; }
    public string? SourceSummary { get; set; }
    public QualityLevel QualityLevel { get; set; } = QualityLevel.L0BoundaryOnly;
    public DateTimeOffset? PublishedAt { get; private set; }
    public DateTimeOffset CreatedAt { get; init; } = DateTimeOffset.UtcNow;

    public void MarkProcessing()
    {
        if (Status is not (CityRevisionStatus.Draft or CityRevisionStatus.Processing))
            throw new InvalidOperationException($"Cannot start processing a revision in status {Status}.");
        Status = CityRevisionStatus.Processing;
    }

    public void MarkReady()
    {
        if (Status != CityRevisionStatus.Processing)
            throw new InvalidOperationException($"Cannot mark ready a revision in status {Status}.");
        Status = CityRevisionStatus.Ready;
    }

    public void Publish(DateTimeOffset now)
    {
        if (Status is not (CityRevisionStatus.Ready or CityRevisionStatus.Published))
            throw new InvalidOperationException($"Cannot publish a revision in status {Status}.");
        // Idempotente: publicar novamente uma revisão já publicada não altera PublishedAt.
        if (Status == CityRevisionStatus.Published) return;
        Status = CityRevisionStatus.Published;
        PublishedAt = now;
    }

    public void MarkFailed() => Status = CityRevisionStatus.Failed;

    public void Archive()
    {
        if (Status != CityRevisionStatus.Published)
            throw new InvalidOperationException($"Only published revisions can be archived (status: {Status}).");
        Status = CityRevisionStatus.Archived;
    }
}
