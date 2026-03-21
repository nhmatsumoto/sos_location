using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Configuration;
using SOSLocation.Domain.Interfaces;
using System;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;

namespace SOSLocation.API.Controllers
{
    [ApiController]
    [Route("api/public")]
    [AllowAnonymous]
    public class PublicController : ControllerBase
    {
        private readonly IIncidentRepository _incidentRepository;
        private readonly ISearchAreaRepository _searchAreaRepository;
        private readonly HttpClient _httpClient;
        private readonly string _riskServiceUrl;

        public PublicController(
            IIncidentRepository incidentRepository,
            ISearchAreaRepository searchAreaRepository,
            IHttpClientFactory httpClientFactory,
            IConfiguration configuration)
        {
            _incidentRepository = incidentRepository;
            _searchAreaRepository = searchAreaRepository;
            _httpClient = httpClientFactory.CreateClient();
            _riskServiceUrl = configuration["ExternalIntegrations:RiskServiceUrl"] ?? "http://risk-analysis:8000";
        }

        [HttpGet("incidents")]
        public async Task<IActionResult> GetIncidents()
        {
            return Ok(await _incidentRepository.GetAllAsync());
        }

        [HttpGet("incidents/{incidentId}/areas")]
        public async Task<IActionResult> GetAreas(Guid incidentId)
        {
            return Ok(await _searchAreaRepository.GetByIncidentIdAsync(incidentId));
        }

        /// <summary>
        /// Proxies risk summary from the Python risk analysis unit.
        /// Returns severity counts + top-risk locations for the public map.
        /// </summary>
        [HttpGet("risk-scores")]
        public async Task<IActionResult> GetPublicRiskScores()
        {
            try
            {
                using var cts = new System.Threading.CancellationTokenSource(TimeSpan.FromSeconds(5));
                var data = await _httpClient.GetFromJsonAsync<object>(
                    $"{_riskServiceUrl}/api/v1/risk/public", cts.Token);
                return Ok(data);
            }
            catch
            {
                // Risk unit may be warming up — return empty shape so the UI degrades gracefully
                return Ok(new
                {
                    scores = Array.Empty<object>(),
                    summary = new { total = 0, critical = 0, high = 0, medium = 0, low = 0, top_risk = Array.Empty<object>() },
                    last_cycle = (string?)null,
                });
            }
        }

        /// <summary>
        /// Proxies geographic hotspot query from the risk analysis unit.
        /// Returns scored locations within the bounding box for OSM risk enrichment in the 3D engine.
        /// Shape: [{ lat, lng, intensity (0-1), radius, type, level, country, location, score }]
        /// </summary>
        [HttpGet("risk-hotspots")]
        public async Task<IActionResult> GetRiskHotspots(
            [FromQuery] double minLat, [FromQuery] double minLon,
            [FromQuery] double maxLat, [FromQuery] double maxLon)
        {
            try
            {
                using var cts = new System.Threading.CancellationTokenSource(TimeSpan.FromSeconds(5));
                var url = $"{_riskServiceUrl}/api/v1/risk/hotspots?min_lat={minLat}&min_lon={minLon}&max_lat={maxLat}&max_lon={maxLon}";
                var data = await _httpClient.GetFromJsonAsync<object[]>(url, cts.Token);
                return Ok(data ?? Array.Empty<object>());
            }
            catch
            {
                return Ok(Array.Empty<object>());
            }
        }
    }
}
