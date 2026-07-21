using SosLocation.Domain.ValueObjects;

namespace SosLocation.Application.Abstractions;

public enum SourcePayloadFormat
{
    GeoJson,
    OverpassJson,
    OsmPbf
}

/// <summary>Dado bruto baixado de uma fonte, antes de qualquer transformação.</summary>
public sealed record SourcePayload
{
    public required byte[] Content { get; init; }
    public required SourcePayloadFormat Format { get; init; }
    public required string SourceName { get; init; }
    public string? SourceUri { get; init; }
    public string? ContentType { get; init; }
}

/// <summary>Port de aquisição de dados OpenStreetMap para pequenas áreas (bounding box).</summary>
public interface IOsmSource
{
    Task<SourcePayload> DownloadAreaAsync(BoundingBox area, CancellationToken ct);
}

/// <summary>Port da fixture offline incluída no repositório.</summary>
public interface IFixtureSource
{
    Task<SourcePayload> LoadAsync(CancellationToken ct);
}
