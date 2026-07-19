using NetTopologySuite.Geometries;
using SosLocation.Domain.ValueObjects;

namespace SosLocation.Domain.Features;

/// <summary>Área de uso do solo (residencial, comercial, industrial, verde...).</summary>
public class LandUseArea
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public required Guid CityRevisionId { get; init; }
    public required string ExternalId { get; init; }
    public required Geometry Geometry { get; set; }
    public string LandUseType { get; set; } = "unknown";
    public DataConfidence Confidence { get; set; } = DataConfidence.Unknown;
    public Guid? SourceDatasetVersionId { get; set; }
    public string? Tags { get; set; }
    public DateTimeOffset CreatedAt { get; init; } = DateTimeOffset.UtcNow;
}
