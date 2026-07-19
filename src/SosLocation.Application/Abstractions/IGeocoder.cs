using SosLocation.Domain.ValueObjects;

namespace SosLocation.Application.Abstractions;

/// <summary>Resultado de pesquisa de lugar retornado pelo geocodificador.</summary>
public sealed record PlaceSearchResult
{
    public required string ProviderId { get; init; }
    public required string Provider { get; init; }
    public required string Name { get; init; }
    public string? Country { get; init; }
    public string? CountryCode { get; init; }
    public string? Region { get; init; }
    public required double CenterLon { get; init; }
    public required double CenterLat { get; init; }
    public required BoundingBox BoundingBox { get; init; }
}

/// <summary>Port para geocodificação. Nenhuma chamada direta do navegador a provedores GIS.</summary>
public interface IGeocoder
{
    Task<IReadOnlyList<PlaceSearchResult>> SearchAsync(string query, CancellationToken ct);
    Task<PlaceSearchResult?> ResolveAsync(string providerId, CancellationToken ct);
}
