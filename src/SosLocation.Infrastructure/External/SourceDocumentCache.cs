using System.Text;
using SosLocation.Application.Abstractions;

namespace SosLocation.Infrastructure.External;

/// <summary>Cache persistente de documentos de fonte. A chave é estável por
/// fonte, portanto uma coleta posterior reutiliza o objeto armazenado no MinIO
/// e não baixa novamente o mesmo documento.</summary>
internal static class SourceDocumentCache
{
    public static async Task<string> GetOrFetchAsync(
        IObjectStorage storage, string sourceId, Func<CancellationToken, Task<string>> fetch, CancellationToken ct)
    {
        var key = $"source-cache/{sourceId}.json";
        var cached = await storage.GetAsync(key, ct);
        if (cached is not null) return Encoding.UTF8.GetString(cached);

        var payload = await fetch(ct);
        await storage.PutAsync(key, Encoding.UTF8.GetBytes(payload), "application/json; charset=utf-8", ct);
        return payload;
    }
}
