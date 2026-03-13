using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;

namespace SOSLocation.API.Controllers
{
    [ApiController]
    [Route("api/risk")]
    public class RiskController : ControllerBase
    {
        private readonly HttpClient _httpClient;
        private readonly string _riskServiceUrl;

        public RiskController(HttpClient httpClient, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _riskServiceUrl = configuration["ExternalIntegrations:RiskServiceUrl"] ?? "http://risk-analysis:8000";
        }

        [HttpGet("assessment")]
        public async Task<IActionResult> GetAssessment()
        {
            try
            {
                var scores = await _httpClient.GetFromJsonAsync<List<object>>($"{_riskServiceUrl}/api/v1/risk/scores");
                return Ok(new
                {
                    model = new { name = "SOS-Risk-ML-Unit", version = "v1.0.0" },
                    riskMap = scores ?? new List<object>(),
                    status = "live_from_ml_unit"
                });
            }
            catch (Exception ex)
            {
                return Ok(new
                {
                    model = new { name = "SOS-Risk-Fallback", version = "v0.1-fallback" },
                    riskMap = new List<object>(),
                    error = "Risk analysis service unavailable",
                    message = ex.Message
                });
            }
        }

        [HttpPost("pipeline-sync")]
        public IActionResult PipelineSync()
        {
            return Ok(new { savedRiskAreas = 0, status = "automatic_sync_active" });
        }
    }
}
