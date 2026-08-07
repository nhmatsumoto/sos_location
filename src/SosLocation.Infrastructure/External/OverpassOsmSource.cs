using Microsoft.Extensions.Logging;
using SosLocation.Application.Abstractions;
using SosLocation.Application.Options;
using SosLocation.Domain.ValueObjects;
using System.Text.Json;

namespace SosLocation.Infrastructure.External;

public sealed class OverpassOptions
{
    public const string SectionName = "Overpass";
    public string BaseUrl { get; set; } = "https://overpass-api.de";
    public string[] BaseUrls { get; set; } = [];
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
        var bbox = string.Create(System.Globalization.CultureInfo.InvariantCulture,
            $"{area.South},{area.West},{area.North},{area.East}");
        var query = $"""
            [out:json][timeout:{options.QueryTimeoutSeconds}][bbox:{bbox}];
            (
              // Volumes 3D e footprints.
              way["building"];
              relation["building"]["type"="multipolygon"];
              way["building:part"];
              relation["building:part"]["type"="multipolygon"];
              // Estruturas construídas que frequentemente não recebem
              // building=* no Japão (torres, silos e instalações técnicas).
              way["man_made"~"^(tower|water_tower|silo|storage_tank|gasometer|chimney|works|wastewater_plant)$"];
              relation["man_made"~"^(tower|water_tower|silo|storage_tank|gasometer|chimney|works|wastewater_plant)$"]["type"="multipolygon"];

              // Mobilidade.
              way["highway"];
              way["railway"];
              // Superfícies viárias/pavimentos e tabuleiros de ponte.
              way["area:highway"];
              relation["area:highway"]["type"="multipolygon"];
              way["man_made"="bridge"];
              relation["man_made"="bridge"]["type"="multipolygon"];

              // Hidrografia linear e areal. Reservatórios também são
              // frequentemente mapeados apenas como landuse no OSM.
              way["waterway"];
              way["natural"="water"];
              relation["natural"="water"]["type"="multipolygon"];
              way["water"];
              relation["water"]["type"="multipolygon"];
              way["landuse"~"^(reservoir|basin)$"];
              relation["landuse"~"^(reservoir|basin)$"]["type"="multipolygon"];

              // Zoneamento e áreas urbanas. Relações são essenciais: parques,
              // campi e bairros grandes costumam ser multipolígonos compostos
              // por vários ways, não um único way fechado.
              way["landuse"];
              relation["landuse"]["type"="multipolygon"];
              way["leisure"];
              relation["leisure"]["type"="multipolygon"];
              way["amenity"];
              relation["amenity"]["type"="multipolygon"];
              way["natural"~"^(wood|grassland|scrub|heath|beach|wetland)$"];
              relation["natural"~"^(wood|grassland|scrub|heath|beach|wetland)$"]["type"="multipolygon"];
              way["aeroway"~"^(aerodrome|apron)$"];
              relation["aeroway"~"^(aerodrome|apron)$"]["type"="multipolygon"];
              way["place"="square"];
              relation["place"="square"]["type"="multipolygon"];
            );
            out tags geom;
            """;

        var endpoints = options.BaseUrls.Length > 0 ? options.BaseUrls : [options.BaseUrl];
        Exception? lastError = null;

        foreach (var endpoint in endpoints.Distinct(StringComparer.OrdinalIgnoreCase))
        {
            var baseUri = new Uri(endpoint);
            if (!limits.AllowedImportHosts.Contains(baseUri.Host, StringComparer.OrdinalIgnoreCase))
                throw new InvalidOperationException(
                    $"Host '{baseUri.Host}' is not in the allowed import hosts list (SSRF protection).");

            try
            {
                logger.LogInformation(
                    "Overpass download from {Host} for bbox {Bbox} ({Area:0.0} km²)",
                    baseUri.Host, bbox, area.AreaKm2);

                using var request = new HttpRequestMessage(
                    HttpMethod.Post,
                    new Uri(baseUri, "/api/interpreter"))
                {
                    Content = new FormUrlEncodedContent(
                        [new KeyValuePair<string, string>("data", query)]),
                };
                using var response = await httpClient.SendAsync(
                    request,
                    HttpCompletionOption.ResponseHeadersRead,
                    ct);
                response.EnsureSuccessStatusCode();
                var content = await ReadLimitedAsync(response, ct);
                ValidateOverpassPayload(content);

                return new SourcePayload
                {
                    Content = content,
                    Format = SourcePayloadFormat.OverpassJson,
                    SourceName = "openstreetmap",
                    SourceUri = $"{baseUri.GetLeftPart(UriPartial.Authority)}/api/interpreter",
                    ContentType = "application/json",
                };
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
            {
                lastError = ex;
                logger.LogWarning(ex, "Overpass endpoint {Host} failed; trying the next configured endpoint", baseUri.Host);
            }
        }

        throw new HttpRequestException(
            "All configured Overpass endpoints failed.", lastError);
    }

    private static void ValidateOverpassPayload(byte[] content)
    {
        try
        {
            using var document = JsonDocument.Parse(
                content,
                new JsonDocumentOptions { MaxDepth = 32 });
            var root = document.RootElement;
            if (root.ValueKind != JsonValueKind.Object)
                throw new HttpRequestException("Overpass returned a non-object JSON payload.");
            if (root.TryGetProperty("remark", out var remark)
                && remark.ValueKind == JsonValueKind.String)
                throw new HttpRequestException($"Overpass rejected or truncated the query: {remark.GetString()}");
            if (!root.TryGetProperty("elements", out var elements)
                || elements.ValueKind != JsonValueKind.Array)
                throw new HttpRequestException("Overpass response has no elements array.");
        }
        catch (JsonException ex)
        {
            throw new HttpRequestException("Overpass returned malformed JSON.", ex);
        }
    }

    private async Task<byte[]> ReadLimitedAsync(HttpResponseMessage response, CancellationToken ct)
    {
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

        return buffer.ToArray();
    }
}
