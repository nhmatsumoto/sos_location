namespace SosLocation.Application.Disasters;

/// <summary>Adaptador de coleta; não interpreta notícia como fato consolidado.
/// Cada execução retorna o payload bruto e seus metadados de proveniência.</summary>
public interface IDisasterSourceCollector
{
    Task<IReadOnlyList<CollectedSourceDocument>> CollectAsync(CancellationToken ct);
}

public sealed record CollectedSourceDocument(
    string SourceId,
    string SourceUrl,
    string Kind,
    string Payload,
    DateTimeOffset ObservedAt,
    double Confidence);
