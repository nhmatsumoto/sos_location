using System.Text.Json;
using Microsoft.Extensions.Logging;
using SosLocation.Application.Abstractions;
using SosLocation.Domain.ValueObjects;

namespace SosLocation.Infrastructure.External;

public sealed class NominatimOptions
{
    public const string SectionName = "Nominatim";
    public string BaseUrl { get; set; } = "https://nominatim.openstreetmap.org";
    public int MaxResults { get; set; } = 8;
}

/// <summary>
/// Adapter de geocodificação via Nominatim. Executado sempre no backend,
/// com identificação da aplicação (User-Agent) e timeout controlado.
/// </summary>
public sealed class NominatimGeocoder(HttpClient httpClient, ILogger<NominatimGeocoder> logger) : IGeocoder
{
    public async Task<IReadOnlyList<PlaceSearchResult>> SearchAsync(string query, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(query)) return [];

        var url = $"search?q={Uri.EscapeDataString(query)}&format=jsonv2&addressdetails=1&limit=8";
        using var response = await httpClient.GetAsync(url, ct);
        response.EnsureSuccessStatusCode();

        await using var stream = await response.Content.ReadAsStreamAsync(ct);
        using var document = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
        var results = new List<PlaceSearchResult>();
        foreach (var item in document.RootElement.EnumerateArray())
        {
            var place = ParsePlace(item);
            if (place is not null) results.Add(place);
        }

        logger.LogInformation("Nominatim search '{Query}' returned {Count} places", query, results.Count);
        return results;
    }

    public async Task<PlaceSearchResult?> ResolveAsync(string providerId, CancellationToken ct)
    {
        // providerId no formato "way/123", "relation/456" ou "node/789".
        var parts = providerId.Split('/');
        if (parts.Length != 2) return null;
        var prefix = parts[0] switch
        {
            "way" => "W",
            "relation" => "R",
            "node" => "N",
            _ => null,
        };
        if (prefix is null || !long.TryParse(parts[1], out var osmId)) return null;

        var url = $"lookup?osm_ids={prefix}{osmId}&format=jsonv2&addressdetails=1";
        using var response = await httpClient.GetAsync(url, ct);
        response.EnsureSuccessStatusCode();

        await using var stream = await response.Content.ReadAsStreamAsync(ct);
        using var document = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
        foreach (var item in document.RootElement.EnumerateArray())
            return ParsePlace(item);
        return null;
    }

    private static PlaceSearchResult? ParsePlace(JsonElement item)
    {
        if (!item.TryGetProperty("osm_type", out var osmType)
            || !item.TryGetProperty("osm_id", out var osmId)
            || !item.TryGetProperty("boundingbox", out var bbox)
            || bbox.GetArrayLength() != 4)
            return null;

        // Nominatim boundingbox: [south, north, west, east] como strings.
        if (!TryParse(bbox[0], out var south) || !TryParse(bbox[1], out var north)
            || !TryParse(bbox[2], out var west) || !TryParse(bbox[3], out var east))
            return null;

        BoundingBox boundingBox;
        try
        {
            boundingBox = new BoundingBox(west, south, east, north);
        }
        catch (ArgumentException)
        {
            return null;
        }

        if (!TryParse(item.GetProperty("lon"), out var lon) || !TryParse(item.GetProperty("lat"), out var lat))
            return null;

        string? country = null, countryCode = null, region = null;
        if (item.TryGetProperty("address", out var address) && address.ValueKind == JsonValueKind.Object)
        {
            country = GetString(address, "country");
            countryCode = GetString(address, "country_code")?.ToUpperInvariant();
            region = GetString(address, "state") ?? GetString(address, "province") ?? GetString(address, "county");
        }

        var name = GetString(item, "name");
        if (string.IsNullOrEmpty(name))
            name = GetString(item, "display_name")?.Split(',')[0] ?? "Unknown";

        return new PlaceSearchResult
        {
            ProviderId = $"{osmType.GetString()}/{osmId.GetRawText()}",
            Provider = "nominatim",
            Name = name,
            Country = country,
            CountryCode = countryCode,
            Region = region,
            CenterLon = lon,
            CenterLat = lat,
            BoundingBox = boundingBox,
        };
    }

    private static bool TryParse(JsonElement element, out double value)
    {
        value = 0;
        return element.ValueKind switch
        {
            JsonValueKind.Number => element.TryGetDouble(out value),
            JsonValueKind.String => double.TryParse(element.GetString(),
                System.Globalization.NumberStyles.Float,
                System.Globalization.CultureInfo.InvariantCulture, out value),
            _ => false,
        };
    }

    private static string? GetString(JsonElement element, string property)
        => element.TryGetProperty(property, out var value) && value.ValueKind == JsonValueKind.String
            ? value.GetString()
            : null;
}
