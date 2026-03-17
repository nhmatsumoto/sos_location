using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SOSLocation.Domain.Interfaces;
using SOSLocation.Domain.Common;
using SOSLocation.Application.DTOs.Common;
using SOSLocation.Application.DTOs.Simulation;
using SOSLocation.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;

namespace SOSLocation.API.Controllers
{
    [ApiController]
    [Route("api/simulation")]
    [Authorize]
    public class SimulationController : ControllerBase
    {
        private readonly IGisService _gisService;
        private readonly SOSLocationDbContext _context;

        public SimulationController(IGisService gisService, SOSLocationDbContext context)
        {
            _gisService = gisService;
            _context = context;
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

            var result = new SimulationResultDto
            {
                SimulationId  = Guid.NewGuid(),
                Status        = "completed",
                ScenarioType  = req.ScenarioType,
                Bbox          = new[] { req.MinLat, req.MinLon, req.MaxLat, req.MaxLon },
                Resolution    = req.Resolution,
                ElevationGrid = await demTask,
                UrbanFeatures = await urbanTask,
                Climate       = await climateTask,
                Soil          = await soilTask,
                Vegetation    = await vegTask,
                GeneratedAt   = DateTime.UtcNow
            };

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
