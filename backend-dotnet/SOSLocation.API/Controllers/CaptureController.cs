using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SOSLocation.Domain.Common;
using System;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;

namespace SOSLocation.API.Controllers
{
    [ApiController]
    [Route("api/v1/capture")]
    [Authorize]
    public class CaptureController : ControllerBase
    {
        private readonly string _capturesRoot;

        public CaptureController()
        {
            // Relative to the app root — maps to /app/captures inside Docker
            _capturesRoot = Path.Combine(AppContext.BaseDirectory, "..", "captures");
        }

        /// <summary>
        /// Stores captured simulation blueprint data to disk in a structured directory.
        /// POST /api/v1/capture/store
        /// </summary>
        [HttpPost("store")]
        public async Task<ActionResult<Result<CaptureStoreResponse>>> StoreCapture([FromBody] CaptureStoreRequest req)
        {
            if (req == null)
                return BadRequest(Result<CaptureStoreResponse>.Failure("Payload inválido."));

            try
            {
                var dateStr = DateTime.UtcNow.ToString("yyyy-MM-dd");
                var latStr  = req.CenterLat.ToString("F5").Replace('.', '_').Replace('-', 'n');
                var lonStr  = req.CenterLon.ToString("F5").Replace('.', '_').Replace('-', 'n');
                var dirName = $"{latStr}_x_{lonStr}";
                var capDir  = Path.Combine(_capturesRoot, dateStr, dirName);

                Directory.CreateDirectory(capDir);

                // 1. Save metadata JSON
                var metaPath = Path.Combine(capDir, "metadata.json");
                var meta = new
                {
                    capturedAt   = DateTime.UtcNow.ToString("O"),
                    centerLat    = req.CenterLat,
                    centerLon    = req.CenterLon,
                    bbox         = req.Bbox,
                    disasterType = req.DisasterType,
                    source       = "HYDRA_CORE_v4"
                };
                await System.IO.File.WriteAllTextAsync(metaPath, JsonSerializer.Serialize(meta, new JsonSerializerOptions { WriteIndented = true }));

                // 2. Save semantic grid if provided
                if (!string.IsNullOrEmpty(req.SemanticGridJson))
                {
                    var semPath = Path.Combine(capDir, "semantic_grid.json");
                    await System.IO.File.WriteAllTextAsync(semPath, req.SemanticGridJson);
                }

                // 3. Save elevation grid if provided
                if (!string.IsNullOrEmpty(req.ElevationGridJson))
                {
                    var elevPath = Path.Combine(capDir, "elevation_grid.json");
                    await System.IO.File.WriteAllTextAsync(elevPath, req.ElevationGridJson);
                }

                // 4. Save OSM features if provided
                if (!string.IsNullOrEmpty(req.OsmFeaturesJson))
                {
                    var osmPath = Path.Combine(capDir, "osm_features.geojson");
                    await System.IO.File.WriteAllTextAsync(osmPath, req.OsmFeaturesJson);
                }

                // 5. Decode and save satellite image if provided (base64 PNG)
                string? satellitePath = null;
                if (!string.IsNullOrEmpty(req.SatelliteImageBase64))
                {
                    try
                    {
                        var imgBytes = Convert.FromBase64String(req.SatelliteImageBase64);
                        satellitePath = Path.Combine(capDir, "satellite.png");
                        await System.IO.File.WriteAllBytesAsync(satellitePath, imgBytes);
                    }
                    catch
                    {
                        // Non-fatal: skip satellite image if decode fails
                    }
                }

                return Ok(Result<CaptureStoreResponse>.Success(new CaptureStoreResponse
                {
                    CaptureId   = $"{dateStr}/{dirName}",
                    Directory   = capDir,
                    MetaPath    = metaPath,
                    HasSatellite = satellitePath != null,
                    HasSemantic  = !string.IsNullOrEmpty(req.SemanticGridJson),
                    HasElevation = !string.IsNullOrEmpty(req.ElevationGridJson),
                    HasOsm       = !string.IsNullOrEmpty(req.OsmFeaturesJson),
                }));
            }
            catch (Exception ex)
            {
                return StatusCode(500, Result<CaptureStoreResponse>.Failure($"Erro ao armazenar captura: {ex.Message}"));
            }
        }
    }

    public class CaptureStoreRequest
    {
        public double CenterLat     { get; set; }
        public double CenterLon     { get; set; }
        public double[]? Bbox       { get; set; }
        public string DisasterType  { get; set; } = "unknown";
        public string? SemanticGridJson   { get; set; }
        public string? ElevationGridJson  { get; set; }
        public string? OsmFeaturesJson    { get; set; }
        public string? SatelliteImageBase64 { get; set; }
    }

    public class CaptureStoreResponse
    {
        public string CaptureId  { get; set; } = "";
        public string Directory  { get; set; } = "";
        public string MetaPath   { get; set; } = "";
        public bool HasSatellite { get; set; }
        public bool HasSemantic  { get; set; }
        public bool HasElevation { get; set; }
        public bool HasOsm       { get; set; }
    }
}
