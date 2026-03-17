using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SOSLocation.Domain.Interfaces;
using System.Threading.Tasks;
using System;
using System.Net.Http;
using Microsoft.Extensions.Configuration;

namespace SOSLocation.API.Controllers
{
    [ApiController]
    [Route("api/v1/terrain")]
    [Authorize]
    public class TerrainController : ControllerBase
    {
        private readonly IGisService _gisService;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;

        public TerrainController(IGisService gisService, IHttpClientFactory httpClientFactory, IConfiguration configuration)
        {
            _gisService = gisService;
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
        }

        [HttpGet("heightmap")]
        [AllowAnonymous]
        public async Task<IActionResult> GetHeightmap([FromQuery] double north, [FromQuery] double south, [FromQuery] double east, [FromQuery] double west)
        {
            var data = await _gisService.GenerateHeightmapAsync(south, west, north, east);
            if (data == null || data.Length == 0)
                return NotFound();

            return File(data, "image/png");
        }

        [HttpGet("satellite")]
        [AllowAnonymous]
        public async Task<IActionResult> GetSatellite([FromQuery] double north, [FromQuery] double south, [FromQuery] double east, [FromQuery] double west)
        {
            var data = await _gisService.GenerateSatelliteImageryAsync(south, west, north, east);
            if (data == null || data.Length == 0)
                return NotFound();

            return File(data, "image/jpeg");
        }

        [HttpGet("context")]
        public async Task<ActionResult> GetTerrainContext([FromQuery] string bbox)
        {
            var client = _httpClientFactory.CreateClient();
            var gisUrl = (_configuration["ExternalIntegrations:GisServiceUrl"] ?? "http://backend-gis:8000") + "/api/context?bbox=" + bbox;

            var response = await client.GetAsync(gisUrl);
            if (!response.IsSuccessStatusCode) return StatusCode((int)response.StatusCode);

            var content = await response.Content.ReadAsStringAsync();
            return Content(content, "application/json");
        }
    }
}
