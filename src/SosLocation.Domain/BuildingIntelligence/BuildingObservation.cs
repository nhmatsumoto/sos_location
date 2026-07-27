using NetTopologySuite.Geometries;

namespace SosLocation.Domain.BuildingIntelligence;

/// <summary>Observação bruta proveniente de imagem, OSM, PLATEAU ou outra fonte.
/// Imutável — cada ingestão gera um novo registro, nunca sobrescreve um anterior.</summary>
public class BuildingObservation
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public required Guid DatasetId { get; init; }
    public required string SourceType { get; init; }
    public string? SourceReference { get; init; }
    public required DateTimeOffset CapturedAt { get; init; }
    public DateTimeOffset IngestedAt { get; init; } = DateTimeOffset.UtcNow;
    public required Geometry Geometry { get; init; }
    public string? RasterAssetUri { get; init; }
    public required int SpatialReferenceId { get; init; }
    public Guid? LicenseId { get; init; }
    public string? MetadataJson { get; init; }
}
