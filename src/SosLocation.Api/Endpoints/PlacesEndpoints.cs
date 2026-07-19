using SosLocation.Application.Abstractions;
using SosLocation.Application.Dto;

namespace SosLocation.Api.Endpoints;

public static class PlacesEndpoints
{
    public static RouteGroupBuilder MapPlacesEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/places/search", async (string? q, IGeocoder geocoder, CancellationToken ct) =>
        {
            if (string.IsNullOrWhiteSpace(q) || q.Trim().Length < 2)
                return Results.BadRequest(new { error = "Query parameter 'q' must have at least 2 characters." });

            IReadOnlyList<PlaceSearchResult> places;
            try
            {
                places = await geocoder.SearchAsync(q.Trim(), ct);
            }
            catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
            {
                // Geocoder externo indisponível: erro limpo, sem stack trace; a demo offline continua funcional.
                return Results.Problem(
                    title: "Geocoder unavailable",
                    detail: "The external geocoding service could not be reached. The offline demo city remains available.",
                    statusCode: StatusCodes.Status503ServiceUnavailable);
            }

            return Results.Ok(places.Select(p => new PlaceDto(
                p.ProviderId, p.Provider, p.Name, p.Country, p.CountryCode, p.Region,
                p.CenterLon, p.CenterLat,
                p.BoundingBox.West, p.BoundingBox.South, p.BoundingBox.East, p.BoundingBox.North)));
        })
        .WithName("SearchPlaces")
        .WithSummary("Pesquisa cidades/lugares via geocodificador (backend-only).");

        return group;
    }
}
