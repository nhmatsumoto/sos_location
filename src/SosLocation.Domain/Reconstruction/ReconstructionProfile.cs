namespace SosLocation.Domain.Reconstruction;

/// <summary>
/// Perfil de reconstrução versionado. Nenhum valor de altura é fixado em código:
/// os perfis são registrados por nome (ex.: "osm-basic-v1") e persistidos junto à revisão.
/// </summary>
public sealed record ReconstructionProfile
{
    public required string Name { get; init; }
    public double DefaultLevelHeightMeters { get; init; } = 3.0;
    public double DefaultRoofLevelHeightMeters { get; init; } = 2.0;
    public double DefaultBuildingHeightMeters { get; init; } = 9.0;

    /// <summary>Altura padrão por building:type normalizado (ex.: "hospital" → 15).</summary>
    public IReadOnlyDictionary<string, double> HeightByBuildingType { get; init; } =
        new Dictionary<string, double>();

    /// <summary>Altura padrão por uso do solo normalizado (ex.: "industrial" → 8).</summary>
    public IReadOnlyDictionary<string, double> HeightByLandUse { get; init; } =
        new Dictionary<string, double>();

    public static ReconstructionProfile OsmBasicV1 { get; } = new()
    {
        Name = "osm-basic-v1",
        DefaultLevelHeightMeters = 3.0,
        DefaultRoofLevelHeightMeters = 2.0,
        DefaultBuildingHeightMeters = 9.0,
        HeightByBuildingType = new Dictionary<string, double>
        {
            ["residential"] = 9.0,
            ["commercial"] = 12.0,
            ["industrial"] = 8.0,
            ["public"] = 12.0,
            ["hospital"] = 18.0,
            ["school"] = 10.0,
        },
        HeightByLandUse = new Dictionary<string, double>
        {
            ["residential"] = 9.0,
            ["commercial"] = 12.0,
            ["industrial"] = 8.0,
        },
    };
}
