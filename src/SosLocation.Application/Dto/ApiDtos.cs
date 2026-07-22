namespace SosLocation.Application.Dto;

public sealed record CityDto(
    Guid Id,
    string Name,
    string? CountryCode,
    string? Region,
    string Slug,
    double? CenterLon,
    double? CenterLat,
    double? West,
    double? South,
    double? East,
    double? North,
    DateTimeOffset CreatedAt);

public sealed record CityRevisionDto(
    Guid Id,
    Guid CityId,
    int RevisionNumber,
    string Status,
    string ReconstructionProfile,
    string QualityLevel,
    string? SourceSummary,
    DateTimeOffset? PublishedAt,
    DateTimeOffset CreatedAt);

public sealed record ImportJobDto(
    Guid Id,
    Guid? CityId,
    Guid? CityRevisionId,
    string JobType,
    string Status,
    int Progress,
    string? CurrentStage,
    string? StageMessage,
    string? Error,
    int Attempts,
    DateTimeOffset? NextAttemptAt,
    DateTimeOffset? StartedAt,
    DateTimeOffset? CompletedAt,
    DateTimeOffset CreatedAt);

public sealed record SimulationRunDto(
    Guid Id,
    Guid CityRevisionId,
    string DisasterType,
    string Status,
    int Progress,
    string? CurrentStage,
    string? StageMessage,
    string? Error,
    int Attempts,
    double? IntensityWest,
    double? IntensitySouth,
    double? IntensityEast,
    double? IntensityNorth,
    DateTimeOffset? StartedAt,
    DateTimeOffset? CompletedAt,
    DateTimeOffset CreatedAt);

public sealed record BuildingSeismicResponseDto(
    Guid Id,
    Guid BuildingId,
    double NaturalPeriodSeconds,
    double PeakGroundAccelerationG,
    double PeakGroundVelocityCms,
    double SpectralAccelerationG,
    double PeakDriftRatio,
    string DamageState);

/// <summary>
/// Metadados suficientes para reproduzir a linha do tempo calculada pelo
/// motor sísmico e auditar a discretização usada naquela execução.
/// </summary>
public sealed record SeismicReplayManifestDto(
    string ModelVersion,
    int GridColumns,
    int GridRows,
    int RasterColumns,
    int RasterRows,
    double GridSpacingMeters,
    double TimeStepSeconds,
    int TotalSteps,
    double TotalSeconds,
    int BuildingCount,
    double EpicenterLon,
    double EpicenterLat,
    double DepthKm,
    double MomentMagnitude,
    double West,
    double South,
    double East,
    double North,
    IReadOnlyList<SeismicReplayFrameDto> Frames);

/// <summary>
/// Snapshot de uma etapa real da integração. O dano é cumulativo porque usa o
/// maior drift estrutural observado até o instante do quadro.
/// </summary>
public sealed record SeismicReplayFrameDto(
    int Index,
    int Step,
    double TimeSeconds,
    double PeakAccelerationG,
    double MaxCumulativeDriftRatio,
    int None,
    int Slight,
    int Moderate,
    int Extensive,
    int Complete);

public sealed record PlaceDto(
    string ProviderId,
    string Provider,
    string Name,
    string? Country,
    string? CountryCode,
    string? Region,
    double CenterLon,
    double CenterLat,
    double West,
    double South,
    double East,
    double North);

public sealed record ProvenanceDto(
    string Dataset,
    string Provider,
    string License,
    string Attribution,
    string? LicenseUri,
    string Version,
    string? Checksum,
    DateTimeOffset CapturedAt);

public sealed record BuildingDetailDto(
    Guid Id,
    Guid CityRevisionId,
    string ExternalId,
    double HeightMeters,
    double MinHeightMeters,
    double GroundElevationMeters,
    int? BuildingLevels,
    int? RoofLevels,
    string BuildingType,
    string? RoofShape,
    string HeightSource,
    double Confidence,
    IReadOnlyDictionary<string, string>? Tags,
    object? Geometry);

public sealed record RoadDetailDto(
    Guid Id,
    Guid CityRevisionId,
    string ExternalId,
    string RoadClass,
    string? Name,
    double? WidthMeters,
    int? Lanes,
    bool IsBridge,
    bool IsTunnel,
    double Confidence,
    IReadOnlyDictionary<string, string>? Tags,
    object? Geometry);

public sealed record WaterDetailDto(
    Guid Id,
    Guid CityRevisionId,
    string ExternalId,
    string WaterType,
    string? Name,
    double Confidence,
    IReadOnlyDictionary<string, string>? Tags,
    object? Geometry);
