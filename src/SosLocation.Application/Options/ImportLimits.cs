namespace SosLocation.Application.Options;

/// <summary>Limites de segurança da importação (seção de configuração "ImportLimits").</summary>
public sealed class ImportLimits
{
    public const string SectionName = "ImportLimits";

    public double MaximumImportAreaKm2 { get; set; } = 250.0;
    public long MaximumUploadBytes { get; set; } = 100 * 1024 * 1024;
    public long MaximumDownloadBytes { get; set; } = 200 * 1024 * 1024;
    public int MaximumFeatureCount { get; set; } = 500_000;
    public int MaximumVerticesPerFeature { get; set; } = 50_000;
    public int ExternalProcessTimeoutSeconds { get; set; } = 300;
    public string[] AllowedImportHosts { get; set; } =
        ["overpass-api.de", "nominatim.openstreetmap.org", "download.geofabrik.de"];
}
