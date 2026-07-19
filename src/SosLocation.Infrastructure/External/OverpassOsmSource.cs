using Microsoft.Extensions.Logging;
using SosLocation.Application.Abstractions;
using SosLocation.Application.Options;
using SosLocation.Domain.ValueObjects;

namespace SosLocation.Infrastructure.External;

public sealed class OverpassOptions
{
    public const string SectionName = "Overpass";
    public string BaseUrl { get; set; } = "https://overpass-api.de";
    public int QueryTimeoutSeconds { get; set; } = 120;
}

/// <summary>
/// Adapter Overpass para importação de pequenas áreas por bounding box.
/// Aplicado sempre no backend com timeout estrito, limite de tamanho da resposta
/// e verificação do host contra a allowlist configurada.
/// </summary>
public sealed class OverpassOsmSource(
    HttpClient httpClient,
    OverpassOptions options,
    ImportLimits limits,
    ILogger<OverpassOsmSource> logger) : IOsmSource
{
    public async Task<SourcePayload> DownloadAreaAsync(BoundingBox area, CancellationToken ct)
    {
        var baseUri = new Uri(options.BaseUrl);
        if (!limits.AllowedImportHosts.Contains(baseUri.Host, StringComparer.OrdinalIgnoreCase))
            throw new InvalidOperationException(
                $"Host '{baseUri.Host}' is not in the allowed import hosts list (SSRF protection).");

        var bbox = string.Create(System.Globalization.CultureInfo.InvariantCulture,
            $"{area.South},{area.West},{area.North},{area.East}");
        var query = $"""
            [out:json][timeout:{options.QueryTimeoutSeconds}][bbox:{bbox}];
            (
              way["building"];
              relation["building"]["type"="multipolygon"];
              way["building:part"];
              relation["building:part"]["type"="multipolygon"];
              way["highway"];
              way["railway"];
              way["waterway"];
              way["natural"="water"];
              relation["natural"="water"]["type"="multipolygon"];
              way["landuse"];
              way["leisure"];
            );
            out tags geom;
            """;

        logger.LogInformation("Overpass download for bbox {Bbox} ({Area:0.0} km²)", bbox, area.AreaKm2);

        using var content = new FormUrlEncodedContent([new KeyValuePair<string, string>("data", query)]);
        using var response = await httpClient.PostAsync(new Uri(baseUri, "/api/interpreter"), content, ct);
        response.EnsureSuccessStatusCode();

        // Lê com limite explícito: respostas maiores que o permitido são abortadas.
        await using var stream = await response.Content.ReadAsStreamAsync(ct);
        using var buffer = new MemoryStream();
        var chunk = new byte[81920];
        int read;
        while ((read = await stream.ReadAsync(chunk, ct)) > 0)
        {
            buffer.Write(chunk, 0, read);
            if (buffer.Length > limits.MaximumDownloadBytes)
                throw new InvalidOperationException(
                    $"Overpass response exceeded the maximum of {limits.MaximumDownloadBytes} bytes.");
        }

        return new SourcePayload
        {
            Content = buffer.ToArray(),
            Format = SourcePayloadFormat.OverpassJson,
            SourceName = "openstreetmap",
            SourceUri = $"{options.BaseUrl}/api/interpreter",
            ContentType = "application/json",
        };
    }
}
