using NetTopologySuite.Geometries;

namespace SosLocation.Domain.Disasters;

/// <summary>Zona de risco desenhada manualmente sobre uma revisão de cidade, para
/// planejamento de gestão de desastres. Não confundir com SimulationRun, que é a
/// simulação numérica de um evento sísmico específico.</summary>
public class RiskZone
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public required Guid CityRevisionId { get; init; }
    public required string Name { get; set; }
    public DisasterType HazardType { get; set; }
    public RiskLevel Level { get; set; }
    public string? Notes { get; set; }
    public required Geometry Geometry { get; set; }
    public DateTimeOffset CreatedAt { get; init; } = DateTimeOffset.UtcNow;
}
