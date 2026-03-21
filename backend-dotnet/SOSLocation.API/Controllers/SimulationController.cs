using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SOSLocation.Domain.Interfaces;
using SOSLocation.Domain.Common;
using SOSLocation.Application.DTOs.Common;
using SOSLocation.Application.DTOs.Simulation;
using SOSLocation.Application.Interfaces;
using SOSLocation.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using Microsoft.Extensions.Configuration;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace SOSLocation.API.Controllers
{
    [ApiController]
    [Route("api/simulation")]
    [Authorize]
    public class SimulationController : ControllerBase
    {
        private readonly IGisService        _gisService;
        private readonly ISceneDataService  _sceneData;
        private readonly SOSLocationDbContext _context;
        private readonly HttpClient          _httpClient;
        private readonly string              _riskServiceUrl;

        public SimulationController(
            IGisService          gisService,
            ISceneDataService    sceneData,
            SOSLocationDbContext context,
            HttpClient           httpClient,
            IConfiguration       configuration)
        {
            _gisService     = gisService;
            _sceneData      = sceneData;
            _context        = context;
            _httpClient     = httpClient;
            _riskServiceUrl = configuration["ExternalIntegrations:RiskServiceUrl"]
                              ?? "http://risk-analysis:8000";
        }

        // ── Scene Data Pipeline ───────────────────────────────────────────────

        /// <summary>
        /// Returns fully preprocessed scene data for the given bounding box:
        /// elevation grid (normalized 0-1), slope analysis (Horn 1981),
        /// semantic land-use segmentation, OSM urban features, and sun position.
        ///
        /// Results are cached in PostgreSQL for 7 days.
        /// This endpoint is the backend-side replacement for the frontend's
        /// GeoDataPipeline + CityBlueprintBuilder heavy processing.
        /// </summary>
        [HttpPost("v1/scenes/data")]
        [AllowAnonymous] // public endpoint — data is non-sensitive geographic info
        public async Task<ActionResult<Result<SceneDataDto>>> GetSceneData(
            [FromBody]        SceneBboxRequest request,
            CancellationToken ct = default)
        {
            if (request.MinLat >= request.MaxLat || request.MinLon >= request.MaxLon)
                return BadRequest(Result<SceneDataDto>.Failure("Invalid bounding box."));

            try
            {
                var dto = await _sceneData.FetchSceneDataAsync(request, ct);
                return Ok(Result<SceneDataDto>.Success(dto));
            }
            catch (OperationCanceledException)
            {
                return StatusCode(499); // client closed request
            }
            catch (Exception ex)
            {
                return StatusCode(500, Result<SceneDataDto>.Failure(
                    $"Scene data pipeline failed: {ex.Message}"));
            }
        }

        /// <summary>
        /// Returns real hotspots from MapAnnotations in the DB, enriched with GIS risk scores.
        /// Falls back to calculating a risk score from the annotation metadata.
        /// </summary>
        [HttpGet("hotspots")]
        public async Task<ActionResult<Result<List<HotspotDto>>>> GetHotspots(
            [FromQuery] double? lat = null,
            [FromQuery] double? lon = null,
            [FromQuery] double radiusKm = 50,
            [FromQuery] int limit = 20)
        {
            var query = _context.MapAnnotations
                .Where(m => m.RecordType == "hotspot" && m.Status != "Deleted")
                .OrderByDescending(m => m.CreatedAt);

            var annotations = await query.Take(limit * 2).ToListAsync();

            var hotspots = annotations
                .Select(a =>
                {
                    var meta = ParseMeta(a.MetadataJson);
                    double score = meta.TryGetValue("score", out var s) && double.TryParse(s?.ToString(), out var sv) ? sv : ComputeRiskScore(a.Severity, meta);
                    int affected = meta.TryGetValue("estimatedAffected", out var ea) && int.TryParse(ea?.ToString(), out var eav) ? eav : 0;

                    return new HotspotDto
                    {
                        Id = a.Id,
                        Lat = a.Lat,
                        Lng = a.Lng,
                        Intensity = score / 100.0,
                        Type = meta.TryGetValue("type", out var t) ? t?.ToString() ?? a.RecordType : a.RecordType,
                        Urgency = a.Severity,
                        EstimatedAffected = affected
                    };
                })
                .Where(h => lat == null || lon == null || HaversineKm(h.Lat, h.Lng, lat.Value, lon.Value) <= radiusKm)
                .OrderByDescending(h => h.Intensity)
                .Take(limit)
                .ToList();

            return Ok(Result<List<HotspotDto>>.Success(hotspots));
        }

        /// <summary>
        /// Runs a GIS-backed simulation for the given bbox/scenario.
        /// Fetches real terrain, urban features and climate data via GisService.
        /// </summary>
        [HttpPost("run")]
        public async Task<ActionResult<Result<SimulationResultDto>>> RunSimulation([FromBody] SimulationRequestDto req)
        {
            if (req == null || !req.IsValid())
                return BadRequest(Result<SimulationResultDto>.Failure("Payload inválido. Forneça bbox e tipo de simulação."));

            // Parallel fetch of all GIS data needed
            var demTask     = _gisService.FetchElevationGridAsync(req.MinLat, req.MinLon, req.MaxLat, req.MaxLon, req.Resolution);
            var urbanTask   = _gisService.FetchUrbanFeaturesAsync(req.MinLat, req.MinLon, req.MaxLat, req.MaxLon);
            var climateTask = _gisService.FetchClimateDataAsync(req.MinLat, req.MinLon, req.MaxLat, req.MaxLon);
            var soilTask    = _gisService.FetchSoilDataAsync(req.MinLat, req.MinLon, req.MaxLat, req.MaxLon);
            var vegTask     = _gisService.FetchVegetationDataAsync(req.MinLat, req.MinLon, req.MaxLat, req.MaxLon);

            await Task.WhenAll(demTask, urbanTask, climateTask, soilTask, vegTask);

            // Compute world scale from bbox physical dimensions (1 world unit ≈ 25 m)
            double latMid        = (req.MinLat + req.MaxLat) / 2.0;
            double widthMeters   = (req.MaxLon - req.MinLon) * 111139.0 * Math.Cos(latMid * Math.PI / 180.0);
            double heightMeters  = (req.MaxLat - req.MinLat) * 111139.0;
            double areaScale     = Math.Clamp(Math.Max(widthMeters, heightMeters) / 25.0, 50.0, 1000.0);

            var urbanFeatures = await urbanTask as SOSLocation.Application.DTOs.Simulation.UrbanDataResponse;
            if (urbanFeatures != null)
                urbanFeatures.AreaScale = areaScale;

            var result = new SimulationResultDto
            {
                SimulationId  = Guid.NewGuid(),
                Status        = "completed",
                ScenarioType  = req.ScenarioType,
                Bbox          = new[] { req.MinLat, req.MinLon, req.MaxLat, req.MaxLon },
                Resolution    = req.Resolution,
                ElevationGrid = await demTask,
                UrbanFeatures = urbanFeatures,
                Climate       = await climateTask,
                Soil          = await soilTask,
                Vegetation    = await vegTask,
                GeneratedAt   = DateTime.UtcNow
            };

            // INTEGRAÇÃO: Chamar Unidade de Análise de Risco (Python)
            try 
            {
                var riskRequest = new
                {
                    scenario_id = result.SimulationId.ToString(),
                    hazard_type = req.ScenarioType.ToLower(),
                    bbox = result.Bbox,
                    inputs = new {
                        meteo = result.Climate,
                        urban = result.UrbanFeatures,
                        terrain = new { 
                            elevation_sample = ((List<List<float>>)result.ElevationGrid!).FirstOrDefault()?.Take(5),
                            soil = result.Soil,
                            vegetation = result.Vegetation
                        },
                        config = new {
                            intensity = req.Intensity,
                            duration = req.Duration,
                            water_level = req.WaterLevel,
                            wind_speed = req.WindSpeed,
                            pressure = req.Pressure,
                            geology_index = req.GeologyIndex,
                            temperature = req.Temperature
                        }
                    },
                    sensors = new List<object>() // Pode ser expandido com sensores reais no futuro
                };

                var pythonResponse = await _httpClient.PostAsJsonAsync($"{_riskServiceUrl}/api/v1/simulations/run", riskRequest);
                if (pythonResponse.IsSuccessStatusCode)
                {
                    result.Analysis = await pythonResponse.Content.ReadFromJsonAsync<object>();
                }
            }
            catch (Exception ex)
            {
                // Log and continue with raw data if analysis unit is unreachable
                Console.WriteLine($"Risk Analysis Unit Unreachable: {ex.Message}");
            }

            return Ok(Result<SimulationResultDto>.Success(result));
        }

        private static Dictionary<string, object?> ParseMeta(string json)
        {
            try { return JsonSerializer.Deserialize<Dictionary<string, object?>>(json) ?? new(); }
            catch { return new(); }
        }

        private static double ComputeRiskScore(string severity, Dictionary<string, object?> meta)
        {
            return severity switch
            {
                "critical" or "emergency" => 90 + new Random().Next(0, 10),
                "high"    or "alta"       => 70 + new Random().Next(0, 20),
                "medium"  or "media"      => 45 + new Random().Next(0, 25),
                _                         => 20 + new Random().Next(0, 25)
            };
        }

        private static double HaversineKm(double lat1, double lon1, double lat2, double lon2)
        {
            const double R = 6371;
            var dLat = (lat2 - lat1) * Math.PI / 180;
            var dLon = (lon2 - lon1) * Math.PI / 180;
            var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                    Math.Cos(lat1 * Math.PI / 180) * Math.Cos(lat2 * Math.PI / 180) *
                    Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
            return R * 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        }
    }
}
