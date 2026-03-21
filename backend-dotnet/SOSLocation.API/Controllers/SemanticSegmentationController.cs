using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using SOSLocation.Application.DTOs.Common;
using SOSLocation.Application.DTOs.Simulation;
using SOSLocation.Domain.Common;
using SOSLocation.Domain.Interfaces;
using SOSLocation.ML.Services;
using System;
using System.Threading.Tasks;

namespace SOSLocation.API.Controllers
{
    /// <summary>
    /// Phase 3 — Semantic Intelligence Pipeline.
    /// Fetches satellite imagery for a bbox and runs native .NET segmentation
    /// via <see cref="SemanticSegmentationService"/> (SOSLocation.ML).
    /// The classified grid is returned to the frontend 3D engine for
    /// colour-coded city reconstruction — no Python round-trip required.
    /// </summary>
    [ApiController]
    [Route("api/v1/urban")]
    [Authorize]
    public class SemanticSegmentationController : ControllerBase
    {
        private readonly IGisService                  _gisService;
        private readonly SemanticSegmentationService  _segmentationService;

        public SemanticSegmentationController(
            IGisService                 gisService,
            SemanticSegmentationService segmentationService)
        {
            _gisService          = gisService;
            _segmentationService = segmentationService;
        }

        /// <summary>
        /// Segment the satellite imagery of an area into a semantic land-use grid.
        /// Returns per-cell class labels (vegetation, water, road, buildings…)
        /// plus aggregate statistics, ready for 3D colour-coded reconstruction.
        /// </summary>
        [HttpPost("segment")]
        public async Task<ActionResult<Result<SemanticSegmentationResultDto>>> Segment(
            [FromBody] SemanticSegmentationRequestDto req)
        {
            if (req == null || !req.IsValid())
                return BadRequest(Result<SemanticSegmentationResultDto>.Failure(
                    "BBOX inválido para segmentação semântica."));

            try
            {
                // 1. Compute world scale
                double latMid       = (req.MinLat + req.MaxLat) / 2.0;
                double widthMeters  = (req.MaxLon - req.MinLon) * 111139.0
                                      * Math.Cos(latMid * Math.PI / 180.0);
                double heightMeters = (req.MaxLat - req.MinLat) * 111139.0;
                double areaScale    = Math.Clamp(
                    Math.Max(widthMeters, heightMeters) / 25.0, 50.0, 1000.0);

                // 2. Fetch satellite imagery from the GIS provider
                byte[] satBytes = await _gisService.GenerateSatelliteImageryAsync(
                    req.MinLat, req.MinLon, req.MaxLat, req.MaxLon);

                if (satBytes.Length == 0)
                    return StatusCode(503, Result<SemanticSegmentationResultDto>.Failure(
                        "Satellite imagery não disponível para esta área."));

                // 3. Run native .NET segmentation (no Python round-trip)
                var mlResult = await _segmentationService.SegmentGridAsync(satBytes, req.TileSize);

                // 4. Map ML result to the public-facing DTO
                var dto = new SemanticSegmentationResultDto
                {
                    Cols      = mlResult.Cols,
                    Rows      = mlResult.Rows,
                    TileSize  = mlResult.TileSize,
                    AreaScale = areaScale,
                    Metadata  = new SemanticMetadataDto
                    {
                        VegetationPct = mlResult.Metadata.VegetationPct,
                        WaterPct      = mlResult.Metadata.WaterPct,
                        RoadPct       = mlResult.Metadata.RoadPct,
                        BuildingPct   = mlResult.Metadata.BuildingPct,
                        SlumPct       = mlResult.Metadata.SlumPct,
                        UrbanDensity  = mlResult.Metadata.UrbanDensity,
                    }
                };

                foreach (var mlRow in mlResult.Grid)
                {
                    var row = new System.Collections.Generic.List<SemanticCellDto>();
                    foreach (var cell in mlRow)
                        row.Add(new SemanticCellDto
                        {
                            Class     = cell.Class,
                            Intensity = cell.Intensity,
                            R         = cell.R,
                            G         = cell.G,
                            B         = cell.B,
                        });
                    dto.Grid.Add(row);
                }

                return Ok(Result<SemanticSegmentationResultDto>.Success(dto));
            }
            catch (Exception ex)
            {
                return StatusCode(500, Result<SemanticSegmentationResultDto>.Failure(
                    $"Erro na segmentação semântica: {ex.Message}"));
            }
        }
    }
}
