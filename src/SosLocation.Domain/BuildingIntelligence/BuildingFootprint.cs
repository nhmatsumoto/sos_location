using NetTopologySuite.Geometries;

namespace SosLocation.Domain.BuildingIntelligence;

public enum BuildingFootprintStatus
{
    Active,
    Superseded,
    Retired
}

/// <summary>Geometria confirmada/aceita de uma construção — o registro auditável do prédio em si.
/// Nunca criado ou alterado automaticamente por IA; Revision funciona como token de concorrência
/// otimista.</summary>
public class BuildingFootprint
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public required Geometry Geometry { get; init; }
    public required string SourceOfTruth { get; init; }
    public BuildingFootprintStatus Status { get; private set; } = BuildingFootprintStatus.Active;
    public DateTimeOffset ValidFrom { get; init; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? ValidTo { get; private set; }
    public int Revision { get; private set; } = 1;
    public DateTimeOffset CreatedAt { get; init; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; private set; } = DateTimeOffset.UtcNow;

    public void Supersede(DateTimeOffset now)
    {
        if (Status != BuildingFootprintStatus.Active)
            throw new InvalidOperationException($"Cannot supersede a footprint in status {Status}.");
        Status = BuildingFootprintStatus.Superseded;
        ValidTo = now;
        Revision++;
        UpdatedAt = now;
    }

    public void Retire(DateTimeOffset now)
    {
        if (Status != BuildingFootprintStatus.Active)
            throw new InvalidOperationException($"Cannot retire a footprint in status {Status}.");
        Status = BuildingFootprintStatus.Retired;
        ValidTo = now;
        Revision++;
        UpdatedAt = now;
    }
}
