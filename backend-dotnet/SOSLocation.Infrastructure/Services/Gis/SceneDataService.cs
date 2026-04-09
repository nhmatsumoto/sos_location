using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SOSLocation.Application.DTOs.Simulation;
using SOSLocation.Application.Interfaces;
using SOSLocation.Domain.Entities;
using SOSLocation.Domain.Interfaces;
using SOSLocation.Infrastructure.Persistence;
using SOSLocation.ML.Services;

namespace SOSLocation.Infrastructure.Services.Gis
{
    /// <summary>
    /// Orchestrates the complete scene data pipeline for a geographic bounding box.
    /// Moves heavy GIS processing (DEM, segmentation, slope, OSM) from the
    /// browser to the backend, improving security and performance.
    ///
    /// Pipeline steps (executed in parallel where possible):
    ///   1. Cache lookup  → return early if fresh cache hit
    ///   2. Elevation grid (DEM) + OSM features  [parallel]
    ///   3. Satellite imagery → semantic segmentation
    ///   4. Slope analysis (Horn 1981) from elevation grid
    ///   5. Sun position / light direction
    ///   6. Assemble SceneDataDto → persist to cache → return
    /// </summary>
    public sealed class SceneDataService : ISceneDataService
    {
        public const int CacheTtlDays = 7;

        private readonly IGisService               _gis;
        private readonly SlopeAnalyzerService     _slope;
        private readonly GISMathService           _gisMath;
        private readonly SOSLocationDbContext     _db;
        private readonly ILogger<SceneDataService> _logger;

        private static readonly JsonSerializerOptions _jsonOpts =
            new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

        public SceneDataService(
            IGisService                gis,
            SlopeAnalyzerService       slope,
            GISMathService             gisMath,
            SOSLocationDbContext       db,
            ILogger<SceneDataService>  logger)
        {
            _gis     = gis;
            _slope   = slope;
            _gisMath = gisMath;
            _db      = db;
            _logger  = logger;
        }

        public async Task<SceneDataDto> FetchSceneDataAsync(
            SceneBboxRequest request,
            CancellationToken ct = default)
        {
            // ── 1. Cache lookup ──────────────────────────────────────────────
            var cached = await _db.CachedScenes
                .AsNoTracking()
                .Where(s =>
                    s.MinLat       == request.MinLat &&
                    s.MinLon       == request.MinLon &&
                    s.MaxLat       == request.MaxLat &&
                    s.MaxLon       == request.MaxLon &&
                    s.DemResolution == request.DemResolution &&
                    s.ExpiresAt    > DateTime.UtcNow)
                .OrderByDescending(s => s.CreatedAt)
                .FirstOrDefaultAsync(ct);

            if (cached is not null)
            {
                _logger.LogDebug(
                    "[SceneData] Cache hit for bbox [{MinLat},{MinLon},{MaxLat},{MaxLon}]",
                    request.MinLat, request.MinLon, request.MaxLat, request.MaxLon);

                var dto = JsonSerializer.Deserialize<SceneDataDto>(cached.SceneDataJson, _jsonOpts);
                if (dto is not null && !HasSyntheticOsm(dto.OsmFeatures)) return dto;

                _logger.LogInformation(
                    "[SceneData] Ignoring cached synthetic scene for bbox [{MinLat},{MinLon},{MaxLat},{MaxLon}]",
                    request.MinLat, request.MinLon, request.MaxLat, request.MaxLon);
            }

            // ── 2. Fetch DEM + OSM — each step is independently resilient ────
            _logger.LogInformation(
                "[SceneData] Building scene for bbox [{MinLat},{MinLon},{MaxLat},{MaxLon}]",
                request.MinLat, request.MinLon, request.MaxLat, request.MaxLon);

            // DEM — graceful fallback to flat terrain on any error
            List<List<float>>? rawDem = null;
            try
            {
                rawDem = await _gis.FetchElevationGridAsync(
                    request.MinLat, request.MinLon,
                    request.MaxLat, request.MaxLon,
                    request.DemResolution);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[SceneData] DEM fetch failed — using flat terrain");
            }

            // OSM — graceful fallback to empty features on any error
            object osmData = new { };
            try
            {
                osmData = await _gis.FetchUrbanFeaturesAsync(
                    request.MinLat, request.MinLon,
                    request.MaxLat, request.MaxLon);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[SceneData] OSM fetch failed — using empty features");
            }

            // NOTE: satellite imagery is NOT fetched server-side.
            // The browser's TileLoader fetches tiles natively in parallel,
            // which is faster and avoids server bandwidth.  Semantic segmentation
            // returns an empty grid; the frontend renderer handles this gracefully
            // by using the satellite canvas it loaded directly.

            // ── 3. Normalise elevation grid + compute min/max ────────────────
            var (normGrid, elevMin, elevMax) = NormalizeElevation(rawDem);

            // ── 4. Slope analysis (Horn 1981) ────────────────────────────────
            var (worldSpanX, worldSpanZ) = _gisMath.ComputeWorldSpan(
                request.MinLat, request.MinLon, request.MaxLat, request.MaxLon);

            float[] slopeGrid = normGrid.Count > 0
                ? _slope.Compute(normGrid, worldSpanX, worldSpanZ)
                : Array.Empty<float>();

            // ── 5. Semantic segmentation — skipped (satellite is frontend-only) ─
            var semantics = EmptySemantics(request.TileSize);

            // ── 6. Sun position ──────────────────────────────────────────────
            double centerLat = (request.MinLat + request.MaxLat) / 2;
            double centerLon = (request.MinLon + request.MaxLon) / 2;
            var (azimuth, elevation) = _gisMath.ComputeSunPosition(centerLat, centerLon, DateTime.UtcNow);
            float[] lightDir = _gisMath.SunToLightDir(azimuth, elevation);

            // ── 7. Assemble DTO ───────────────────────────────────────────────
            var sceneData = new SceneDataDto
            {
                Bbox         = new[] { request.MinLat, request.MinLon, request.MaxLat, request.MaxLon },
                WorldSpanX   = worldSpanX,
                WorldSpanZ   = worldSpanZ,
                ElevationGrid = normGrid,
                ElevationMin = elevMin,
                ElevationMax = elevMax,
                SlopeGrid    = slopeGrid,
                Semantics    = semantics,
                OsmFeatures  = osmData,
                SunPosition  = new SunPositionDto
                {
                    AzimuthDeg   = azimuth,
                    ElevationDeg = elevation,
                    LightDir     = lightDir,
                },
                CachedAt = DateTime.UtcNow,
            };

            // ── 8. Persist to cache ───────────────────────────────────────────
            if (!HasSyntheticOsm(sceneData.OsmFeatures))
            {
                await PersistCacheAsync(request, sceneData, ct);
            }
            else
            {
                _logger.LogInformation(
                    "[SceneData] Skipping persistent cache for synthetic OSM fallback scene [{MinLat},{MinLon},{MaxLat},{MaxLon}]",
                    request.MinLat, request.MinLon, request.MaxLat, request.MaxLon);
            }

            return sceneData;
        }

        // ── Helpers ──────────────────────────────────────────────────────────

        /// <summary>
        /// Normalizes a raw elevation grid to [0, 1] and extracts min/max in metres.
        /// Returns an empty grid if the input is null or empty.
        /// </summary>
        private static (List<List<float>> normGrid, float elevMin, float elevMax)
            NormalizeElevation(List<List<float>>? raw)
        {
            if (raw is null || raw.Count == 0)
                return (new List<List<float>>(), 0f, 0f);

            float min = float.MaxValue;
            float max = float.MinValue;

            foreach (var row in raw)
                foreach (var v in row)
                {
                    if (v < min) min = v;
                    if (v > max) max = v;
                }

            float range = max - min;
            if (range < 0.001f) range = 1f; // flat terrain guard

            var norm = new List<List<float>>(raw.Count);
            foreach (var row in raw)
            {
                var normRow = new List<float>(row.Count);
                foreach (var v in row)
                    normRow.Add((v - min) / range);
                norm.Add(normRow);
            }

            return (norm, min, max);
        }

        private static SemanticSegmentationResultDto EmptySemantics(int tileSize) =>
            new()
            {
                Cols     = 0,
                Rows     = 0,
                TileSize = tileSize,
                Grid     = new List<List<SemanticCellDto>>(),
                Metadata = new SemanticMetadataDto(),
                AreaScale = 1.0,
            };

        private static bool HasSyntheticOsm(object? osmFeatures)
        {
            if (osmFeatures is UrbanDataResponse urbanData)
                return urbanData.IsSynthetic;

            if (osmFeatures is JsonElement json && json.ValueKind == JsonValueKind.Object)
            {
                if (json.TryGetProperty("isSynthetic", out var camelSynthetic) &&
                    camelSynthetic.ValueKind is JsonValueKind.True or JsonValueKind.False)
                    return camelSynthetic.GetBoolean();

                if (json.TryGetProperty("IsSynthetic", out var pascalSynthetic) &&
                    pascalSynthetic.ValueKind is JsonValueKind.True or JsonValueKind.False)
                    return pascalSynthetic.GetBoolean();
            }

            return false;
        }

        private async Task PersistCacheAsync(
            SceneBboxRequest request,
            SceneDataDto     dto,
            CancellationToken ct)
        {
            try
            {
                // Prune expired entries for this bbox first
                var expired = await _db.CachedScenes
                    .Where(s =>
                        s.MinLat == request.MinLat && s.MinLon == request.MinLon &&
                        s.MaxLat == request.MaxLat && s.MaxLon == request.MaxLon)
                    .ToListAsync(ct);

                if (expired.Count > 0)
                    _db.CachedScenes.RemoveRange(expired);

                var json = JsonSerializer.Serialize(dto, _jsonOpts);
                _db.CachedScenes.Add(new CachedScene
                {
                    MinLat        = request.MinLat,
                    MinLon        = request.MinLon,
                    MaxLat        = request.MaxLat,
                    MaxLon        = request.MaxLon,
                    DemResolution = request.DemResolution,
                    SceneDataJson = json,
                    ExpiresAt     = DateTime.UtcNow.AddDays(CacheTtlDays),
                });

                await _db.SaveChangesAsync(ct);
            }
            catch (Exception ex)
            {
                // Cache persistence is best-effort — never fail the request over it
                _logger.LogWarning(ex, "[SceneData] Failed to persist scene cache");
            }
        }
    }
}
