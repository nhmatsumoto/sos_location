using Microsoft.Net.Http.Headers;
using SosLocation.Application.Abstractions;

namespace SosLocation.Api.Endpoints;

public static class TerrainEndpoints
{
    /// <summary>
    /// Tiles de relevo (encoding Terrarium) servidos EXCLUSIVAMENTE do object
    /// storage — preenchidos pelo worker na importação. Nenhuma chamada externa
    /// em runtime; sem tiles pré-carregados a área simplesmente fica plana.
    /// </summary>
    public static RouteGroupBuilder MapTerrainEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/terrain/{z:int}/{x:int}/{y:int}.png", async (
            int z, int x, int y, IObjectStorage storage, HttpContext http, CancellationToken ct) =>
        {
            if (z is < 0 or > 15 || x < 0 || y < 0 || x >= (1 << z) || y >= (1 << z))
                return Results.NotFound();

            var bytes = await storage.GetAsync($"terrain/{z}/{x}/{y}.png", ct);
            if (bytes is null) return Results.NotFound();

            http.Response.Headers[HeaderNames.CacheControl] = "public, max-age=2592000, immutable";
            return Results.Bytes(bytes, "image/png");
        }).WithName("GetTerrainTile");

        return group;
    }
}
