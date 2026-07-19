using NetTopologySuite.Geometries;
using SosLocation.Domain.ValueObjects;

namespace SosLocation.Domain.Features;

/// <summary>Origem do valor de altura de um edifício.</summary>
public enum HeightSource
{
    Observed,
    Inferred
}

/// <summary>Edificação representada por footprint, altura e atributos semânticos.</summary>
public class Building
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public required Guid CityRevisionId { get; init; }
    public required string ExternalId { get; init; }
    public required Geometry Footprint { get; set; }
    public required Point Centroid { get; set; }
    public double HeightMeters { get; set; }
    public double MinHeightMeters { get; set; }
    public double GroundElevationMeters { get; set; }
    public int? BuildingLevels { get; set; }
    public int? RoofLevels { get; set; }
    public string BuildingType { get; set; } = "unknown";
    public string? RoofShape { get; set; }
    public HeightSource HeightSource { get; set; } = HeightSource.Inferred;
    public DataConfidence Confidence { get; set; } = DataConfidence.Unknown;
    public Guid? SourceDatasetVersionId { get; set; }
    /// <summary>Tags originais relevantes (JSON), preservadas para proveniência.</summary>
    public string? Tags { get; set; }
    public DateTimeOffset CreatedAt { get; init; } = DateTimeOffset.UtcNow;
}
