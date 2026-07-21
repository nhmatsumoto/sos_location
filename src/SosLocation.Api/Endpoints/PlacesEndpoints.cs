using Microsoft.Extensions.Caching.Memory;
using SosLocation.Application.Abstractions;
using SosLocation.Application.Dto;
using SosLocation.Domain.Cities;

namespace SosLocation.Api.Endpoints;

public static class PlacesEndpoints
{
    public static RouteGroupBuilder MapPlacesEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/places/search", async (
            string? q,
            IGeocoder geocoder,
            ICityStore cities,
            IMemoryCache cache,
            ILoggerFactory loggerFactory,
            CancellationToken ct) =>
        {
            if (string.IsNullOrWhiteSpace(q) || q.Trim().Length < 2)
                return Results.BadRequest(new { error = "Query parameter 'q' must have at least 2 characters." });

            var normalized = q.Trim();
            var local = (await cities.ListAsync(ct))
                .Where(city => Matches(city, normalized))
                .Select(ToPlaceDto)
                .Where(place => place is not null)
                .Cast<PlaceDto>()
                .Take(8)
                .ToList();

            // A versão importada é autoritativa e já tem o boundary efetivamente
            // usado pelo sistema. Para nome exato, evita rede e devolve mais rápido.
            if (local.Any(place => string.Equals(place.Name, normalized, StringComparison.OrdinalIgnoreCase)))
                return Results.Ok(local);

            IReadOnlyList<PlaceDto> external;
            try
            {
                var cacheKey = $"place-search:{normalized.Normalize().ToUpperInvariant()}";
                external = await cache.GetOrCreateAsync(cacheKey, async entry =>
                {
                    entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(15);
                    var places = await geocoder.SearchAsync(normalized, ct);
                    return (IReadOnlyList<PlaceDto>)places.Select(p => new PlaceDto(
                            p.ProviderId, p.Provider, p.Name, p.Country, p.CountryCode, p.Region,
                            p.CenterLon, p.CenterLat,
                            p.BoundingBox.West, p.BoundingBox.South,
                            p.BoundingBox.East, p.BoundingBox.North))
                        .ToArray();
                }) ?? [];
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
            {
                loggerFactory.CreateLogger("PlacesSearch")
                    .LogWarning(ex, "External geocoder unavailable for query {Query}", normalized);

                if (local.Count > 0)
                    return Results.Ok(local);

                return Results.Problem(
                    title: "Geocoder unavailable",
                    detail: "The external geocoding service could not be reached. The offline demo city remains available.",
                    statusCode: StatusCodes.Status503ServiceUnavailable);
            }

            return Results.Ok(local.Concat(external).Take(8));
        })
        .WithName("SearchPlaces")
        .WithSummary("Pesquisa cidades/lugares via geocodificador (backend-only).");

        return group;
    }

    private static bool Matches(City city, string query)
        => city.Name.Contains(query, StringComparison.OrdinalIgnoreCase)
           || (city.Region?.Contains(query, StringComparison.OrdinalIgnoreCase) ?? false)
           || (city.CountryCode?.Contains(query, StringComparison.OrdinalIgnoreCase) ?? false);

    private static PlaceDto? ToPlaceDto(City city)
    {
        var envelope = city.Boundary?.EnvelopeInternal;
        if (city.Centroid is null || envelope is null) return null;

        return new PlaceDto(
            $"city/{city.Id}", "catalog", city.Name, null, city.CountryCode, city.Region,
            city.Centroid.X, city.Centroid.Y,
            envelope.MinX, envelope.MinY, envelope.MaxX, envelope.MaxY);
    }
}
