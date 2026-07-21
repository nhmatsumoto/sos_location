using NetTopologySuite.Geometries;
using SosLocation.Domain.Jobs;

namespace SosLocation.Application.Normalization;

public sealed record NormalizedBuilding(
    string ExternalId,
    Geometry Footprint,
    double? ExplicitHeightMeters,
    int? BuildingLevels,
    int? RoofLevels,
    string BuildingType,
    string? RoofShape,
    double MinHeightMeters,
    IReadOnlyDictionary<string, string> Tags);

public sealed record NormalizedRoad(
    string ExternalId,
    Geometry Geometry,
    string RoadClass,
    string? Name,
    double? WidthMeters,
    int? Lanes,
    bool IsBridge,
    bool IsTunnel,
    IReadOnlyDictionary<string, string> Tags);

public sealed record NormalizedWater(
    string ExternalId,
    Geometry Geometry,
    string WaterType,
    string? Name,
    IReadOnlyDictionary<string, string> Tags);

public sealed record NormalizedLandUse(
    string ExternalId,
    Geometry Geometry,
    string LandUseType,
    IReadOnlyDictionary<string, string> Tags);

public sealed record NormalizationIssue(
    string? FeatureId,
    string Code,
    string Message,
    IssueSeverity Severity);

/// <summary>Resultado da normalização de uma fonte: features limpas + problemas registrados.</summary>
public sealed record NormalizedCityData
{
    public IReadOnlyList<NormalizedBuilding> Buildings { get; init; } = [];
    public IReadOnlyList<NormalizedRoad> Roads { get; init; } = [];
    public IReadOnlyList<NormalizedWater> Water { get; init; } = [];
    public IReadOnlyList<NormalizedLandUse> LandUse { get; init; } = [];
    public IReadOnlyList<NormalizationIssue> Issues { get; init; } = [];
    public Geometry? Boundary { get; init; }
}

public sealed record NormalizationLimits
{
    public int MaximumFeatureCount { get; init; } = 500_000;
    public int MaximumVerticesPerFeature { get; init; } = 50_000;
}

/// <summary>Contrato implementado pelos normalizadores do GeoProcessing (GeoJSON, Overpass...).</summary>
public interface ICityDataNormalizer
{
    bool CanHandle(Abstractions.SourcePayloadFormat format);
    NormalizedCityData Normalize(Abstractions.SourcePayload payload, NormalizationLimits limits);
}
