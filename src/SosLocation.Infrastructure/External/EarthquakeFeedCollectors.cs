using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using SosLocation.Application.Abstractions;
using SosLocation.Application.Disasters;

namespace SosLocation.Infrastructure.External;

/// <summary>Coleta o feed GeoJSON oficial do USGS. A normalização de um evento
/// específico acontece depois, mantendo este adaptador deliberadamente simples.</summary>
public sealed class UsgsEarthquakeFeedCollector(HttpClient http, IObjectStorage storage) : IDisasterSourceCollector
{
    public async Task<IReadOnlyList<CollectedSourceDocument>> CollectAsync(CancellationToken ct)
    {
        const string url = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.geojson";
        var payload = await SourceDocumentCache.GetOrFetchAsync(storage, "usgs-earthquake-feed", token => http.GetStringAsync(url, token), ct);
        return [new("usgs-earthquake-feed", url, "earthquake-feed", payload, DateTimeOffset.UtcNow, 0.95)];
    }
}

/// <summary>Coleta o feed Atom oficial de terremotos/vulcões da JMA. O XML é
/// encapsulado em JSON para preservar o mesmo contrato jsonb do repositório.</summary>
public sealed class JmaEarthquakeFeedCollector(HttpClient http, IObjectStorage storage) : IDisasterSourceCollector
{
    public async Task<IReadOnlyList<CollectedSourceDocument>> CollectAsync(CancellationToken ct)
    {
        const string url = "https://www.data.jma.go.jp/developer/xml/feed/eqvol.xml";
        var atom = await SourceDocumentCache.GetOrFetchAsync(storage, "jma-earthquake-volcano-feed.atom", token => http.GetStringAsync(url, token), ct);
        var payload = JsonSerializer.Serialize(new { format = "atom+xml", document = atom });
        return [new("jma-earthquake-volcano-feed", url, "early-warning-and-earthquake-feed", payload, DateTimeOffset.UtcNow, 0.98)];
    }
}

public static class CollectedSourceDocumentExtensions
{
    public static string Sha256(this CollectedSourceDocument document)
        => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(document.Payload))).ToLowerInvariant();
}
