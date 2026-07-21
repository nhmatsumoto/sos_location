using NetTopologySuite.Geometries;
using SosLocation.Domain.ValueObjects;

namespace SosLocation.Domain.Features;

/// <summary>Corpo d'água (rio, lago, canal, reservatório).</summary>
public class WaterFeature
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public required Guid CityRevisionId { get; init; }
    public required string ExternalId { get; init; }
    public required Geometry Geometry { get; set; }
    public string WaterType { get; set; } = "unknown";
    public string? Name { get; set; }
    public DataConfidence Confidence { get; set; } = DataConfidence.Unknown;
    public Guid? SourceDatasetVersionId { get; set; }
    public string? Tags { get; set; }
    public DateTimeOffset CreatedAt { get; init; } = DateTimeOffset.UtcNow;
}
