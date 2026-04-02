using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SOSLocation.Domain.Interfaces;
using SOSLocation.Domain.Common;
using SOSLocation.Domain.Entities;
using SOSLocation.Infrastructure.Persistence;
using SOSLocation.Application.DTOs.Common;
using SOSLocation.Application.DTOs.Simulation;
using System.Threading.Tasks;
using System;

namespace SOSLocation.API.Controllers
{
    [ApiController]
    [Route("api/v1/urban")]
    [Authorize]
    public class UrbanPipelineController : ControllerBase
    {
        private readonly IGisService _gisService;
        private readonly SOSLocationDbContext _context;

        public UrbanPipelineController(IGisService gisService, SOSLocationDbContext context)
        {
            _gisService = gisService;
            _context = context;
        }

        /// <summary>
        /// Phase 2: Data Indexing Pipeline.
        /// Extracts and processes real geospatial data (Satellite, Topology, OSM Infrastructure).
        /// </summary>
        [HttpPost("pipeline")]
        public async Task<ActionResult<Result<SimulationResultDto>>> ProcessPipeline([FromBody] SimulationRequestDto req)
        {
            if (req == null || !req.IsValid())
                return BadRequest(Result<SimulationResultDto>.Failure("BBOX inválido para processamento de área."));

            try
            {
                var areaName = $"Area_{req.MinLat:F4}_{req.MinLon:F4}";
                var area = new SimulationArea
                {
                    Name = areaName,
                    BboxMinLat = req.MinLat,
                    BboxMinLng = req.MinLon,
                    BboxMaxLat = req.MaxLat,
                    BboxMaxLng = req.MaxLon
                };
                _context.SimulationAreas.Add(area);
                await _context.SaveChangesAsync();

                // Compute world scale from bbox physical dimensions.
                // Target: ~200 world units for a typical 5 km city area (1 unit ≈ 25 m).
                double latMid      = (req.MinLat + req.MaxLat) / 2.0;
                double widthMeters = (req.MaxLon - req.MinLon) * 111139.0 * Math.Cos(latMid * Math.PI / 180.0);
                double heightMeters = (req.MaxLat - req.MinLat) * 111139.0;
                double worldSizeMeters = Math.Max(widthMeters, heightMeters);
                // metersPerUnit target = 25 m → areaScale = worldSizeMeters / 25
                double areaScale = Math.Clamp(worldSizeMeters / 25.0, 50.0, 1000.0);

                // Fetch real OSM urban features + elevation + land cover in parallel
                var urbanTask  = _gisService.FetchUrbanFeaturesAsync(req.MinLat, req.MinLon, req.MaxLat, req.MaxLon);
                var demTask    = _gisService.FetchElevationGridAsync(req.MinLat, req.MinLon, req.MaxLat, req.MaxLon, req.Resolution > 0 ? req.Resolution : 256);
                var vegTask    = _gisService.FetchVegetationDataAsync(req.MinLat, req.MinLon, req.MaxLat, req.MaxLon);
                var lcTask     = _gisService.FetchLandCoverAsync(req.MinLat, req.MinLon, req.MaxLat, req.MaxLon);

                await Task.WhenAll(urbanTask, demTask, vegTask, lcTask);

                // Attach the computed area scale so the frontend can position features correctly
                var urbanFeatures = await urbanTask as UrbanDataResponse;
                if (urbanFeatures != null)
                    urbanFeatures.AreaScale = areaScale;

                var bundle = new ScenarioBundle
                {
                    AreaId = area.Id,
                    Status = "indexed",
                    ParametersJson = System.Text.Json.JsonSerializer.Serialize(new {
                        indexedAt  = DateTime.UtcNow,
                        res        = req.Resolution,
                        areaScale  = areaScale
                    })
                };
                _context.ScenarioBundles.Add(bundle);
                await _context.SaveChangesAsync();

                var result = new SimulationResultDto
                {
                    SimulationId  = bundle.Id,
                    Status        = "indexed",
                    Bbox          = new[] { req.MinLat, req.MinLon, req.MaxLat, req.MaxLon },
                    Resolution    = req.Resolution > 0 ? req.Resolution : 256,
                    ElevationGrid = await demTask,
                    UrbanFeatures = urbanFeatures,
                    Vegetation    = await vegTask,
                    LandCover     = await lcTask,
                    GeneratedAt   = DateTime.UtcNow
                };

                return Ok(Result<SimulationResultDto>.Success(result));
            }
            catch (Exception ex)
            {
                return StatusCode(500, Result<SimulationResultDto>.Failure($"Erro ao processar pipeline urbano: {ex.Message}"));
            }
        }

        /// <summary>Global soil data from ISRIC SoilGrids — clay/sand/silt percentages, pH, bulk density, permeability.</summary>
        [HttpGet("soil")]
        public async Task<IActionResult> GetSoil(
            [FromQuery] double minLat, [FromQuery] double minLon,
            [FromQuery] double maxLat, [FromQuery] double maxLon)
        {
            var result = await _gisService.FetchSoilDataAsync(minLat, minLon, maxLat, maxLon);
            return Ok(Result<object>.Success(result));
        }

        /// <summary>ESA WorldCover 2021 land cover classification grid (64×64 byte array of class codes).</summary>
        [HttpGet("landcover")]
        public async Task<IActionResult> GetLandCover(
            [FromQuery] double minLat, [FromQuery] double minLon,
            [FromQuery] double maxLat, [FromQuery] double maxLon)
        {
            var result = await _gisService.FetchLandCoverAsync(minLat, minLon, maxLat, maxLon);
            if (result is null)
                return StatusCode(502, Result<object>.Failure("Falha ao obter dados de cobertura do solo.", statusCode: 502));

            return Ok(Result<object>.Success(result));
        }

        /// <summary>WorldPop 2020 population density grid (32×32, normalized 0-1 log scale).</summary>
        [HttpGet("population")]
        public async Task<IActionResult> GetPopulation(
            [FromQuery] double minLat, [FromQuery] double minLon,
            [FromQuery] double maxLat, [FromQuery] double maxLon)
        {
            var result = await _gisService.FetchPopulationDensityAsync(minLat, minLon, maxLat, maxLon);
            if (result is null)
                return StatusCode(502, Result<object>.Failure("Falha ao obter dados de densidade populacional.", statusCode: 502));

            return Ok(Result<object>.Success(result));
        }
    }
}
