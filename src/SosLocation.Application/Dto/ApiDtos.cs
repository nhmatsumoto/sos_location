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
