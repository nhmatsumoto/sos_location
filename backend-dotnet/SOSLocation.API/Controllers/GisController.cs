using Microsoft.AspNetCore.Mvc;
using SOSLocation.Domain.Interfaces;
using System.ComponentModel.DataAnnotations;
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

    public class DemRequest
    {
        public double MinLat { get; set; }
        public double MinLon { get; set; }
        public double MaxLat { get; set; }
        public double MaxLon { get; set; }
        public int Resolution { get; set; } = 128;
    }

    public class UrbanRequest
    {
        public double MinLat { get; set; }
        public double MinLon { get; set; }
        public double MaxLat { get; set; }
        public double MaxLon { get; set; }
    }
}
