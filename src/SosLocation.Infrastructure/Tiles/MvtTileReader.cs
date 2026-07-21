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
        Guid revisionId, TileLayerKind layer, int z, int x, int y, CancellationToken ct,
        Guid? simulationRunId = null)
    {
        if (z < 0 || z > MaxZoom || x < 0 || y < 0 || x >= (1 << z) || y >= (1 << z))
            return null;

        var sql = BuildSql(layer, z, simulationRunId is not null);
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
            if (simulationRunId is { } runId)
                command.Parameters.AddWithValue("sim", runId);

            var result = await command.ExecuteScalarAsync(ct);
            var bytes = result as byte[];
            return bytes is { Length: > 0 } ? bytes : null;
        }
        finally
        {
            if (shouldClose) await connection.CloseAsync();
        }
    }

    private static string? BuildSql(TileLayerKind layer, int z, bool includeSimulation)
    {
        var simulationJoin = includeSimulation
            ? "LEFT JOIN building_seismic_responses sr ON sr.building_id = b.id AND sr.simulation_run_id = @sim"
            : string.Empty;
        var simulationColumn = includeSimulation
            ? ", lower(sr.damage_state) AS damage_state"
            : string.Empty;

        return layer switch
        {
        // Edifícios só aparecem a partir do zoom 12; abaixo disso o tile é vazio por decisão de orçamento.
        TileLayerKind.Buildings when z < 12 => null,
        TileLayerKind.Buildings => $"""
            WITH bounds AS (SELECT ST_TileEnvelope(@z, @x, @y) AS env),
            mvtgeom AS (
                SELECT
                    -- Buffer 256 (vs 64): evita paredes cortadas em edifícios que cruzam bordas de tile.
                    ST_AsMVTGeom({ProjectAndSimplify("b.footprint", z)}, bounds.env, 4096, 256, true) AS geom,
                    b.id::text AS id,
                    b.building_type
                    {(z >= 14 ? ", round(b.height_m::numeric, 1)::double precision AS height_m, round(b.min_height_m::numeric, 1)::double precision AS min_height_m, round(b.ground_elevation_m::numeric, 1)::double precision AS ground_elevation_m, b.height_source, round(b.confidence::numeric, 2)::double precision AS confidence, b.building_levels" : "")}
                    {simulationColumn}
                FROM buildings b
                {simulationJoin}
                CROSS JOIN bounds
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
                    ST_AsMVTGeom({ProjectAndSimplify("r.geometry", z)}, bounds.env, 4096, 64, true) AS geom,
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
                    ST_AsMVTGeom({ProjectAndSimplify("w.geometry", z)}, bounds.env, 4096, 64, true) AS geom,
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
                    ST_AsMVTGeom({ProjectAndSimplify("l.geometry", z)}, bounds.env, 4096, 64, true) AS geom,
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
    }

    /// <summary>
    /// Projeta antes de simplificar: a tolerância passa a representar pixels reais
    /// no tile, sem distorção diferente por latitude como ocorria em graus WGS84.
    /// </summary>
    private static string ProjectAndSimplify(string column, int z)
    {
        var projected = $"ST_Transform({column}, 3857)";
        if (z >= 15) return projected;

        // Circunferência Web Mercator / pixels no zoom: tolerância visual de 0,5 px.
        const double mercatorWorldMeters = 40_075_016.68557849;
        var toleranceMeters = mercatorWorldMeters / (256.0 * Math.Pow(2, z)) * 0.5;
        return $"ST_SimplifyPreserveTopology({projected}, {toleranceMeters.ToString("G6", System.Globalization.CultureInfo.InvariantCulture)})";
    }
}
