using NetTopologySuite.Geometries;
using SosLocation.Domain.ValueObjects;

namespace SosLocation.Domain.Features;

/// <summary>Via urbana (rua, avenida, rodovia, ferrovia).</summary>
public class Road
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public required Guid CityRevisionId { get; init; }
    public required string ExternalId { get; init; }
    public required Geometry Geometry { get; set; }
    public string RoadClass { get; set; } = "unknown";
    public string? Name { get; set; }
    public double? WidthMeters { get; set; }
    public int? Lanes { get; set; }
    public bool IsBridge { get; set; }
    public bool IsTunnel { get; set; }
    public DataConfidence Confidence { get; set; } = DataConfidence.Unknown;
    public Guid? SourceDatasetVersionId { get; set; }
    public string? Tags { get; set; }
    public DateTimeOffset CreatedAt { get; init; } = DateTimeOffset.UtcNow;
}
