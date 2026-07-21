using Microsoft.Net.Http.Headers;
using Microsoft.Extensions.Caching.Memory;
using SosLocation.Application.Abstractions;
using SosLocation.Domain.Cities;
using SosLocation.Domain.Disasters;

namespace SosLocation.Api.Endpoints;

public static class TilesEndpoints
{
    private const string MvtContentType = "application/vnd.mapbox-vector-tile";

    public static RouteGroupBuilder MapTilesEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/tiles/{revisionId:guid}/{layer}/{z:int}/{x:int}/{y:int}.mvt", async (
            Guid revisionId, string layer, int z, int x, int y, Guid? simulationId,
            ITileReader tiles, IRevisionStore revisions, ISimulationRunStore simulations,
            IMemoryCache cache, HttpContext http, CancellationToken ct) =>
        {
            var kind = ParseLayer(layer);
            if (kind is null) return Results.NotFound();

            var revisionPublished = await cache.GetOrCreateAsync(
                $"tile-revision:{revisionId:N}",
                async entry =>
                {
                    var revision = await revisions.FindByIdAsync(revisionId, ct);
                    var published = revision?.Status == CityRevisionStatus.Published;
                    entry.AbsoluteExpirationRelativeToNow = published
                        ? TimeSpan.FromHours(6)
                        : TimeSpan.FromSeconds(15);
                    return published;
                });
            if (revisionPublished != true)
                return Results.NotFound();

            if (simulationId is { } runId)
            {
                if (kind != TileLayerKind.Buildings) return Results.BadRequest();
                var simulationValid = await cache.GetOrCreateAsync(
                    $"tile-simulation:{runId:N}:{revisionId:N}",
                    async entry =>
                    {
                        var run = await simulations.FindByIdAsync(runId, ct);
                        var valid = run?.Status == SimulationRunStatus.Completed
                                    && run.CityRevisionId == revisionId;
                        entry.AbsoluteExpirationRelativeToNow = valid
                            ? TimeSpan.FromHours(6)
                            : TimeSpan.FromSeconds(15);
                        return valid;
                    });
                if (simulationValid != true) return Results.NotFound();
            }

            // Revisões são imutáveis: o ETag é determinístico e o cache pode ser agressivo.
            var simulationKey = simulationId?.ToString("N") ?? "base";
            var etag = $"\"{revisionId:N}-{simulationKey}-{layer}-{z}-{x}-{y}\"";
            if (http.Request.Headers.IfNoneMatch.Contains(etag))
                return Results.StatusCode(StatusCodes.Status304NotModified);

            var bytes = await tiles.GetTileAsync(
                revisionId, kind.Value, z, x, y, ct,
                kind == TileLayerKind.Buildings ? simulationId : null);

            http.Response.Headers[HeaderNames.ETag] = etag;
            http.Response.Headers[HeaderNames.CacheControl] = "public, max-age=2592000, immutable";

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
