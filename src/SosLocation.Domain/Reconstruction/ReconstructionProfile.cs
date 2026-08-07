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

    /// <summary>
    /// Altura típica por classe fina da construção. A classe preserva diferenças
    /// que o tipo de uso agregado não expressa, como casa, apartamento e garagem.
    /// Valores desta tabela são sempre inferências, nunca observações.
    /// </summary>
    public IReadOnlyDictionary<string, double> HeightByBuildingClass { get; init; } =
        new Dictionary<string, double>();

    /// <summary>Número típico de pavimentos associado à classe fina.</summary>
    public IReadOnlyDictionary<string, int> LevelsByBuildingClass { get; init; } =
        new Dictionary<string, int>();

    /// <summary>Forma de telhado padrão por classe, usada apenas quando o OSM não informa roof:shape.</summary>
    public IReadOnlyDictionary<string, string> RoofShapeByBuildingClass { get; init; } =
        new Dictionary<string, string>();

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

    /// <summary>
    /// Perfil morfológico para cidades japonesas. Tags OSM e valores PLATEAU
    /// observados continuam tendo precedência; estes valores só preenchem lacunas.
    /// O perfil é separado e versionado para que revisões antigas permaneçam
    /// reproduzíveis.
    /// </summary>
    public static ReconstructionProfile OsmJapanUrbanV2 { get; } = new()
    {
        Name = "osm-japan-urban-v2",
        DefaultLevelHeightMeters = 2.9,
        DefaultRoofLevelHeightMeters = 1.8,
        DefaultBuildingHeightMeters = 7.2,
        HeightByBuildingType = new Dictionary<string, double>
        {
            ["residential"] = 8.0,
            ["commercial"] = 12.0,
            ["industrial"] = 8.0,
            ["public"] = 11.0,
            ["hospital"] = 17.0,
            ["school"] = 10.0,
        },
        HeightByBuildingClass = new Dictionary<string, double>
        {
            ["house"] = 7.4,
            ["apartment"] = 14.5,
            ["mixed_use"] = 14.5,
            ["commercial"] = 12.0,
            ["industrial"] = 8.0,
            ["warehouse"] = 7.0,
            ["school"] = 10.0,
            ["hospital"] = 17.0,
            ["government"] = 11.0,
            ["religious"] = 9.0,
            ["garage"] = 3.2,
            ["roof"] = 3.2,
            ["shed"] = 3.2,
            ["transport"] = 8.0,
            ["farm"] = 6.0,
            ["utility"] = 5.0,
            ["construction"] = 7.2,
        },
        LevelsByBuildingClass = new Dictionary<string, int>
        {
            ["house"] = 2,
            ["apartment"] = 5,
            ["mixed_use"] = 5,
            ["commercial"] = 3,
            ["industrial"] = 2,
            ["warehouse"] = 1,
            ["school"] = 3,
            ["hospital"] = 5,
            ["government"] = 3,
            ["religious"] = 2,
            ["garage"] = 1,
            ["roof"] = 1,
            ["shed"] = 1,
            ["transport"] = 2,
            ["farm"] = 2,
            ["utility"] = 1,
            ["construction"] = 2,
        },
        RoofShapeByBuildingClass = new Dictionary<string, string>
        {
            ["house"] = "hipped",
            ["religious"] = "gabled",
            ["farm"] = "gabled",
            ["apartment"] = "flat",
            ["mixed_use"] = "flat",
            ["commercial"] = "flat",
            ["industrial"] = "flat",
            ["warehouse"] = "flat",
            ["school"] = "flat",
            ["hospital"] = "flat",
            ["government"] = "flat",
            ["garage"] = "flat",
            ["roof"] = "flat",
            ["shed"] = "gabled",
            ["transport"] = "flat",
            ["utility"] = "flat",
        },
        HeightByLandUse = new Dictionary<string, double>
        {
            ["residential"] = 7.4,
            ["commercial"] = 12.0,
            ["industrial"] = 8.0,
        },
    };
}
