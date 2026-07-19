using Microsoft.EntityFrameworkCore;
using Npgsql;
using SosLocation.Application.Abstractions;
using SosLocation.Infrastructure.Persistence;

namespace SosLocation.Infrastructure.Tiles;

/// <summary>
/// Gera vector tiles diretamente no PostGIS com ST_TileEnvelope + ST_AsMVTGeom + ST_AsMVT.
/// Dados autoritativos em 4326; transformação para 3857 apenas na consulta do tile.
/// Simplificação e conjunto de atributos variam por zoom — nunca retornamos tags completas.
/// </summary>
public sealed class MvtTileReader(SosDbContext context) : ITileReader
{
    private const int MaxZoom = 22;

    public async Task<byte[]?> GetTileAsync(
        Guid revisionId, TileLayerKind layer, int z, int x, int y, CancellationToken ct)
    {
        if (z < 0 || z > MaxZoom || x < 0 || y < 0 || x >= (1 << z) || y >= (1 << z))
            return null;

        var sql = BuildSql(layer, z);
        if (sql is null) return null;

        var connection = (NpgsqlConnection)context.Database.GetDbConnection();
        var shouldClose = connection.State != System.Data.ConnectionState.Open;
        if (shouldClose) await connection.OpenAsync(ct);
        try
        {
            await using var command = new NpgsqlCommand(sql, connection);
            command.Parameters.AddWithValue("rev", revisionId);
            command.Parameters.AddWithValue("z", z);
            command.Parameters.AddWithValue("x", x);
            command.Parameters.AddWithValue("y", y);

            var result = await command.ExecuteScalarAsync(ct);
            var bytes = result as byte[];
            return bytes is { Length: > 0 } ? bytes : null;
        }
        finally
        {
            if (shouldClose) await connection.CloseAsync();
        }
    }

    private static string? BuildSql(TileLayerKind layer, int z) => layer switch
    {
        // Edifícios só aparecem a partir do zoom 12; abaixo disso o tile é vazio por decisão de orçamento.
        TileLayerKind.Buildings when z < 12 => null,
        TileLayerKind.Buildings => $"""
            WITH bounds AS (SELECT ST_TileEnvelope(@z, @x, @y) AS env),
            mvtgeom AS (
                SELECT
                    -- Buffer 256 (vs 64): evita paredes cortadas em edifícios que cruzam bordas de tile.
                    ST_AsMVTGeom(ST_Transform({Simplify("b.footprint", z)}, 3857), bounds.env, 4096, 256, true) AS geom,
                    b.id::text AS id,
                    round(b.height_m::numeric, 1)::double precision AS height_m,
                    round(b.min_height_m::numeric, 1)::double precision AS min_height_m,
                    round(b.ground_elevation_m::numeric, 1)::double precision AS ground_elevation_m,
                    b.building_type
                    {(z >= 14 ? ", b.height_source, round(b.confidence::numeric, 2)::double precision AS confidence, b.building_levels" : "")}
                FROM buildings b, bounds
                WHERE b.city_revision_id = @rev
                  AND b.footprint && ST_Transform(bounds.env, 4326)
            )
            SELECT ST_AsMVT(mvtgeom.*, 'buildings', 4096, 'geom') FROM mvtgeom WHERE geom IS NOT NULL
            """,

        TileLayerKind.Roads when z < 8 => null,
        TileLayerKind.Roads => $"""
            WITH bounds AS (SELECT ST_TileEnvelope(@z, @x, @y) AS env),
            mvtgeom AS (
                SELECT
                    ST_AsMVTGeom(ST_Transform({Simplify("r.geometry", z)}, 3857), bounds.env, 4096, 64, true) AS geom,
                    r.id::text AS id,
                    r.road_class
                    {(z >= 13 ? ", r.name, r.lanes, r.is_bridge, r.is_tunnel" : "")}
                FROM roads r, bounds
                WHERE r.city_revision_id = @rev
                  AND r.geometry && ST_Transform(bounds.env, 4326)
                  {(z < 12 ? "AND r.road_class IN ('highway', 'primary', 'secondary', 'rail')" : "")}
            )
            SELECT ST_AsMVT(mvtgeom.*, 'roads', 4096, 'geom') FROM mvtgeom WHERE geom IS NOT NULL
            """,

        TileLayerKind.Water when z < 6 => null,
        TileLayerKind.Water => $"""
            WITH bounds AS (SELECT ST_TileEnvelope(@z, @x, @y) AS env),
            mvtgeom AS (
                SELECT
                    ST_AsMVTGeom(ST_Transform({Simplify("w.geometry", z)}, 3857), bounds.env, 4096, 64, true) AS geom,
                    w.id::text AS id,
                    w.water_type
                    {(z >= 12 ? ", w.name" : "")}
                FROM water_features w, bounds
                WHERE w.city_revision_id = @rev
                  AND w.geometry && ST_Transform(bounds.env, 4326)
            )
            SELECT ST_AsMVT(mvtgeom.*, 'water', 4096, 'geom') FROM mvtgeom WHERE geom IS NOT NULL
            """,

        TileLayerKind.LandUse when z < 8 => null,
        TileLayerKind.LandUse => $"""
            WITH bounds AS (SELECT ST_TileEnvelope(@z, @x, @y) AS env),
            mvtgeom AS (
                SELECT
                    ST_AsMVTGeom(ST_Transform({Simplify("l.geometry", z)}, 3857), bounds.env, 4096, 64, true) AS geom,
                    l.id::text AS id,
                    l.land_use_type
                FROM land_use_areas l, bounds
                WHERE l.city_revision_id = @rev
                  AND l.geometry && ST_Transform(bounds.env, 4326)
            )
            SELECT ST_AsMVT(mvtgeom.*, 'land_use', 4096, 'geom') FROM mvtgeom WHERE geom IS NOT NULL
            """,

        _ => null,
    };

    /// <summary>Simplificação geométrica progressiva: tolerância em graus decresce com o zoom.</summary>
    private static string Simplify(string column, int z)
    {
        if (z >= 15) return column;
        // ~0.5 px de tolerância no zoom correspondente (graus por pixel ≈ 360 / (256 · 2^z)).
        var tolerance = 360.0 / (256.0 * Math.Pow(2, z)) * 0.5;
        return $"ST_SimplifyPreserveTopology({column}, {tolerance.ToString("G6", System.Globalization.CultureInfo.InvariantCulture)})";
    }
}
