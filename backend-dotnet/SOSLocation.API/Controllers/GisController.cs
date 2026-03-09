using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SOSLocation.Domain.Interfaces;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace SOSLocation.API.Controllers
{
    [ApiController]
    [Route("api/v1")]
    public class GisController : ControllerBase
    {
        private readonly IGisService _gisService;
        private readonly IAlertsService _alertsService;

        public GisController(IGisService gisService, IAlertsService alertsService)
        {
            _gisService = gisService;
            _alertsService = alertsService;
        }

        [AllowAnonymous]
        [HttpPost("terrain/dem")]
        public async Task<IActionResult> GetDigitalElevationModel([FromBody] DemRequest req)
        {
            var grid = await _gisService.FetchElevationGridAsync(req.MinLat, req.MinLon, req.MaxLat, req.MaxLon, req.Resolution);

            return Ok(new
            {
                status = "success",
                metadata = new
                {
                    source = "SRTM GL3 / OpenTopography",
                    resolution = req.Resolution
                },
                data = grid
            });
        }

        [AllowAnonymous]
        [HttpPost("urban/features")]
        public async Task<IActionResult> GetUrbanFeatures([FromBody] UrbanRequest req)
        {
            var data = await _gisService.FetchUrbanFeaturesAsync(req.MinLat, req.MinLon, req.MaxLat, req.MaxLon);
            return Ok(new
            {
                status = "success",
                data = data
            });
        }

        [AllowAnonymous]
        [HttpPost("soil/data")]
        public async Task<IActionResult> GetSoilData([FromBody] GisAreaRequest req)
        {
            var data = await _gisService.FetchSoilDataAsync(req.MinLat, req.MinLon, req.MaxLat, req.MaxLon);
            return Ok(new { status = "success", data = data });
        }

        [AllowAnonymous]
        [HttpPost("vegetation/data")]
        public async Task<IActionResult> GetVegetationData([FromBody] GisAreaRequest req)
        {
            var data = await _gisService.FetchVegetationDataAsync(req.MinLat, req.MinLon, req.MaxLat, req.MaxLon);
            return Ok(new { status = "success", data = data });
        }

        [AllowAnonymous]
        [HttpGet("alerts/active")]
        public IActionResult GetActiveAlerts()
        {
            var alerts = _alertsService.GetActiveAlerts();
            return Ok(new
            {
                status = "success",
                count = 0, // Placeholder for count
                data = alerts
            });
        }
    }

    public class GisAreaRequest
    {
        [JsonPropertyName("min_lat")]
        public double MinLat { get; set; }
        [JsonPropertyName("min_lon")]
        public double MinLon { get; set; }
        [JsonPropertyName("max_lat")]
        public double MaxLat { get; set; }
        [JsonPropertyName("max_lon")]
        public double MaxLon { get; set; }
    }

    public class DemRequest
    {
        [JsonPropertyName("min_lat")]
        public double MinLat { get; set; }
        [JsonPropertyName("min_lon")]
        public double MinLon { get; set; }
        [JsonPropertyName("max_lat")]
        public double MaxLat { get; set; }
        [JsonPropertyName("max_lon")]
        public double MaxLon { get; set; }
        public int Resolution { get; set; } = 128;
    }

    public class UrbanRequest
    {
        [JsonPropertyName("min_lat")]
        public double MinLat { get; set; }
        [JsonPropertyName("min_lon")]
        public double MinLon { get; set; }
        [JsonPropertyName("max_lat")]
        public double MaxLat { get; set; }
        [JsonPropertyName("max_lon")]
        public double MaxLon { get; set; }
    }
}
