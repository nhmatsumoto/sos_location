using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using SOSLocation.Application.DTOs.Common;
using SOSLocation.Application.DTOs.Simulation;
using SOSLocation.Domain.Common;
using SOSLocation.Domain.Interfaces;
using System;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace SOSLocation.API.Controllers
{
    /// <summary>
    /// Phase 3 — Semantic Intelligence Pipeline.
    /// Fetches satellite imagery for a bbox, forwards to the Python
    /// semantic-segmentation agent, and returns the classified grid
    /// that the frontend 3D engine uses for color-coded city reconstruction.
    /// </summary>
    [ApiController]
    [Route("api/v1/urban")]
    [Authorize]
    public class SemanticSegmentationController : ControllerBase
    {
        private readonly IGisService   _gisService;
        private readonly HttpClient    _http;
        private readonly string        _riskServiceUrl;

        public SemanticSegmentationController(
            IGisService    gisService,
            HttpClient     httpClient,
            IConfiguration configuration)
        {
            _gisService     = gisService;
            _http           = httpClient;
            _riskServiceUrl = configuration["ExternalIntegrations:RiskServiceUrl"]
                              ?? "http://risk-analysis:8000";
        }

        /// <summary>
        /// Segment the satellite imagery of an area into a semantic land-use grid.
        /// Returns per-cell class labels (vegetation, water, road, buildings…)
        /// plus aggregate statistics, ready for 3D color-coded reconstruction.
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

                // 3. Forward to Python segmentation agent
                string b64 = Convert.ToBase64String(satBytes);
                var pyPayload = new { image_b64 = b64, tile_size = req.TileSize };

                using var pyResp = await _http.PostAsJsonAsync(
                    $"{_riskServiceUrl}/api/v1/semantic/segment", pyPayload);

                if (!pyResp.IsSuccessStatusCode)
                    return StatusCode(502, Result<SemanticSegmentationResultDto>.Failure(
                        $"Agente de segmentação retornou {(int)pyResp.StatusCode}."));

                // 4. Deserialize Python response and map to our DTO
                using var stream = await pyResp.Content.ReadAsStreamAsync();
                var pyResult = await JsonSerializer.DeserializeAsync<PySegmentResult>(
                    stream, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                if (pyResult == null)
                    return StatusCode(500, Result<SemanticSegmentationResultDto>.Failure(
                        "Falha ao desserializar resposta do agente."));

                var dto = MapToDto(pyResult, areaScale);
                return Ok(Result<SemanticSegmentationResultDto>.Success(dto));
            }
            catch (Exception ex)
            {
                return StatusCode(500, Result<SemanticSegmentationResultDto>.Failure(
                    $"Erro na segmentação semântica: {ex.Message}"));
            }
        }

        // ── Helpers ──────────────────────────────────────────────────────────────

        private static SemanticSegmentationResultDto MapToDto(PySegmentResult py, double areaScale)
        {
            var dto = new SemanticSegmentationResultDto
            {
                Cols      = py.Cols,
                Rows      = py.Rows,
                TileSize  = py.TileSize,
                AreaScale = areaScale,
                Metadata  = new SemanticMetadataDto
                {
                    VegetationPct  = py.Metadata.VegetationPct,
                    WaterPct       = py.Metadata.WaterPct,
                    RoadPct        = py.Metadata.RoadPct,
                    BuildingPct    = py.Metadata.BuildingPct,
                    SlumPct        = py.Metadata.SlumPct,
                    UrbanDensity   = py.Metadata.UrbanDensity,
                }
            };

            foreach (var pyRow in py.Grid)
            {
                var row = new System.Collections.Generic.List<SemanticCellDto>();
                foreach (var pyCell in pyRow)
                    row.Add(new SemanticCellDto
                    {
                        Class     = pyCell.Class,
                        Intensity = pyCell.Intensity,
                        R         = pyCell.R,
                        G         = pyCell.G,
                        B         = pyCell.B,
                    });
                dto.Grid.Add(row);
            }

            return dto;
        }

        // ── Python response shape (snake_case) ───────────────────────────────────

        private sealed class PySegmentResult
        {
            [JsonPropertyName("cols")]      public int           Cols     { get; set; }
            [JsonPropertyName("rows")]      public int           Rows     { get; set; }
            [JsonPropertyName("tile_size")] public int           TileSize { get; set; }
            [JsonPropertyName("grid")]      public System.Collections.Generic.List<System.Collections.Generic.List<PyCellDto>> Grid { get; set; } = new();
            [JsonPropertyName("metadata")]  public PyMeta        Metadata { get; set; } = new();
        }

        private sealed class PyCellDto
        {
            [JsonPropertyName("class")]     public int    Class     { get; set; }
            [JsonPropertyName("intensity")] public double Intensity { get; set; }
            [JsonPropertyName("r")]         public int    R         { get; set; }
            [JsonPropertyName("g")]         public int    G         { get; set; }
            [JsonPropertyName("b")]         public int    B         { get; set; }
        }

        private sealed class PyMeta
        {
            [JsonPropertyName("vegetation_pct")] public double VegetationPct { get; set; }
            [JsonPropertyName("water_pct")]       public double WaterPct      { get; set; }
            [JsonPropertyName("road_pct")]        public double RoadPct       { get; set; }
            [JsonPropertyName("building_pct")]    public double BuildingPct   { get; set; }
            [JsonPropertyName("slum_pct")]        public double SlumPct       { get; set; }
            [JsonPropertyName("urban_density")]   public double UrbanDensity  { get; set; }
        }
    }
}
