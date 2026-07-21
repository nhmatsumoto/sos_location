using Microsoft.Net.Http.Headers;
using SosLocation.Application.Abstractions;
using SosLocation.Domain.Cities;

namespace SosLocation.Api.Endpoints;

public static class TilesEndpoints
{
    private const string MvtContentType = "application/vnd.mapbox-vector-tile";

    public static RouteGroupBuilder MapTilesEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/tiles/{revisionId:guid}/{layer}/{z:int}/{x:int}/{y:int}.mvt", async (
            Guid revisionId, string layer, int z, int x, int y,
            ITileReader tiles, IRevisionStore revisions, HttpContext http, CancellationToken ct) =>
        {
            var kind = ParseLayer(layer);
            if (kind is null) return Results.NotFound();

            var revision = await revisions.FindByIdAsync(revisionId, ct);
            if (revision?.Status != CityRevisionStatus.Published)
                return Results.NotFound();

            // Revisões são imutáveis: o ETag é determinístico e o cache pode ser agressivo.
            var etag = $"\"{revisionId:N}-{layer}-{z}-{x}-{y}\"";
            if (http.Request.Headers.IfNoneMatch.Contains(etag))
                return Results.StatusCode(StatusCodes.Status304NotModified);

            var bytes = await tiles.GetTileAsync(revisionId, kind.Value, z, x, y, ct);

            http.Response.Headers[HeaderNames.ETag] = etag;
            http.Response.Headers[HeaderNames.CacheControl] = "public, max-age=86400, immutable";

            return bytes is null
                ? Results.NoContent()
                : Results.Bytes(bytes, MvtContentType);
        }).WithName("GetVectorTile");

        return group;
    }

    private static TileLayerKind? ParseLayer(string layer) => layer.ToLowerInvariant() switch
    {
        "buildings" => TileLayerKind.Buildings,
        "roads" => TileLayerKind.Roads,
        "water" => TileLayerKind.Water,
        "land-use" => TileLayerKind.LandUse,
        _ => null,
    };
}
