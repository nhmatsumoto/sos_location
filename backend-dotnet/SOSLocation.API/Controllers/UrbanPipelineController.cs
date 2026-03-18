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
        /// Extracts and processes geospatial data (Satellite, Topology, Infrastructure).
        /// </summary>
        [HttpPost("pipeline")]
        public async Task<ActionResult<Result<SimulationResultDto>>> ProcessPipeline([FromBody] SimulationRequestDto req)
        {
            if (req == null || !req.IsValid())
                return BadRequest(Result<SimulationResultDto>.Failure("BBOX inválido para processamento de área."));

            try
            {
                // Create or find a SimulationArea
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

                // Trigger GIS tasks in parallel
                var demTask = _gisService.FetchElevationGridAsync(req.MinLat, req.MinLon, req.MaxLat, req.MaxLon, req.Resolution);
                var urbanTask = _gisService.ProcessUrbanPipelineAsync(req.MinLat, req.MinLon, req.MaxLat, req.MaxLon);
                var vegTask = _gisService.FetchVegetationDataAsync(req.MinLat, req.MinLon, req.MaxLat, req.MaxLon);

                await Task.WhenAll(demTask, urbanTask, vegTask);

                // Create a ScenarioBundle (The Index)
                var bundle = new ScenarioBundle
                {
                    AreaId = area.Id,
                    Status = "indexed",
                    ParametersJson = System.Text.Json.JsonSerializer.Serialize(new { 
                        indexedAt = DateTime.UtcNow,
                        res = req.Resolution
                    })
                };
                _context.ScenarioBundles.Add(bundle);
                await _context.SaveChangesAsync();

                var result = new SimulationResultDto
                {
                    SimulationId = bundle.Id, // Linking to bundle
                    Status = "indexed",
                    Bbox = new[] { req.MinLat, req.MinLon, req.MaxLat, req.MaxLon },
                    Resolution = req.Resolution,
                    ElevationGrid = await demTask,
                    UrbanFeatures = await urbanTask as UrbanDataResponse,
                    Vegetation = await vegTask,
                    GeneratedAt = DateTime.UtcNow
                };

                return Ok(Result<SimulationResultDto>.Success(result));
            }
            catch (Exception ex)
            {
                return StatusCode(500, Result<SimulationResultDto>.Failure($"Erro ao processar pipeline urbano: {ex.Message}"));
            }
        }
    }
}
