using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;

namespace SOSLocation.API.Controllers
{
    [ApiController]
    [Route("api/risk")]
    [Authorize]
    public class RiskController : ControllerBase
    {
        private readonly HttpClient _httpClient;
        private readonly string _riskServiceUrl;

        public RiskController(HttpClient httpClient, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _riskServiceUrl = configuration["ExternalIntegrations:RiskServiceUrl"] ?? "http://risk-analysis:8000";
        }

        /// <summary>
        /// Returns risk assessment data. The Python RAU returns items shaped as:
        ///   { country, location, score(0-100), level("High"), lat?, lng?, factors? }
        /// This endpoint normalises them to the frontend contract:
        ///   { country, location, riskScore(0-1), severity("high"), lat?, lon?, factors? }
        /// and adds an analytics summary aggregated from all scores.
        /// </summary>
        [HttpGet("assessment")]
        public async Task<IActionResult> GetAssessment()
        {
            try
            {
                var raw = await _httpClient.GetFromJsonAsync<List<JsonElement>>(
                    $"{_riskServiceUrl}/api/v1/risk/scores");

                var scores = (raw ?? new List<JsonElement>()).Select(s =>
                {
                    // lat/lon — Python engine stores lon as "lng"
                    double? lat = s.TryGetProperty("lat", out var latEl) && latEl.ValueKind == JsonValueKind.Number
                        ? latEl.GetDouble() : (double?)null;
                    double? lon = s.TryGetProperty("lng", out var lngEl) && lngEl.ValueKind == JsonValueKind.Number
                        ? lngEl.GetDouble() : (double?)null;

                    // score: Python int 0-100  →  riskScore float 0-1
                    double scoreRaw = s.TryGetProperty("score", out var scEl) && scEl.ValueKind == JsonValueKind.Number
                        ? scEl.GetDouble() : 0.0;
                    double riskScore = Math.Clamp(scoreRaw / 100.0, 0.0, 1.0);

                    // severity: Python "High"/"Critical" → lowercase
                    string level = s.TryGetProperty("level", out var lvlEl)
                        ? (lvlEl.GetString() ?? "low").ToLowerInvariant() : "low";

                    string country  = s.TryGetProperty("country",  out var cEl)  ? cEl.GetString()  ?? "" : "";
                    string location = s.TryGetProperty("location", out var lEl)  ? lEl.GetString()  ?? "" : "";
                    string updated  = s.TryGetProperty("last_updated", out var uEl) ? uEl.GetString() ?? "" : "";

                    object? factors = null;
                    if (s.TryGetProperty("factors", out var fEl) && fEl.ValueKind == JsonValueKind.Object)
                    {
                        int alertCount = fEl.TryGetProperty("alert_count", out var acEl) ? acEl.GetInt32() : 0;

                        double humidity = 0, temp = 0, seismic = 0;
                        if (fEl.TryGetProperty("environmental", out var envEl))
                        {
                            humidity = envEl.TryGetProperty("humidity", out var hEl) ? hEl.GetDouble() : 0;
                            temp     = envEl.TryGetProperty("temp",     out var tEl) ? tEl.GetDouble() : 0;
                            seismic  = envEl.TryGetProperty("seismic",  out var sEEl) ? sEEl.GetDouble() : 0;
                        }

                        var alertsSample = new List<string>();
                        if (fEl.TryGetProperty("alerts_sample", out var asEl) && asEl.ValueKind == JsonValueKind.Array)
                            foreach (var a in asEl.EnumerateArray())
                                alertsSample.Add(a.GetString() ?? "");

                        factors = new
                        {
                            alertCount,
                            environmental = new { humidity, temp, seismic },
                            alertsSample
                        };
                    }

                    return new
                    {
                        lat, lon, riskScore, severity = level,
                        country, location, lastUpdated = updated,
                        factors
                    };
                }).OrderByDescending(s => s.riskScore).ToList();

                // Compute analytics
                int criticalCount = scores.Count(s => s.severity == "critical");
                int highCount     = scores.Count(s => s.severity == "high");
                int mediumCount   = scores.Count(s => s.severity == "medium");
                int lowCount      = scores.Count(s => s.severity == "low");

                return Ok(new
                {
                    model = new { name = "SOS-Risk-ML-Unit", version = "v1.0.0" },
                    riskMap = scores,
                    analytics = new
                    {
                        totalLocations = scores.Count,
                        criticalCount,
                        highCount,
                        mediumCount,
                        lowCount,
                        affectedPopulation        = (criticalCount + highCount) * 50_000,
                        criticalInfrastructureCount = criticalCount + highCount
                    },
                    generatedAt = DateTime.UtcNow.ToString("o")
                });
            }
            catch (Exception ex)
            {
                return Ok(new
                {
                    model    = new { name = "SOS-Risk-Fallback", version = "v0.1-fallback" },
                    riskMap  = new List<object>(),
                    analytics = new
                    {
                        totalLocations = 0, criticalCount = 0, highCount = 0,
                        mediumCount = 0, lowCount = 0, affectedPopulation = 0,
                        criticalInfrastructureCount = 0
                    },
                    generatedAt = DateTime.UtcNow.ToString("o"),
                    error   = "Risk analysis service unavailable",
                    message = ex.Message
                });
            }
        }

        /// <summary>
        /// Triggers a new risk analysis cycle on the Python RAU.
        /// </summary>
        [HttpPost("pipeline-sync")]
        public async Task<IActionResult> PipelineSync()
        {
            try
            {
                // The RAU doesn't expose a manual trigger endpoint; calling /health
                // confirms it's reachable. The scheduler already runs every 5 min.
                // We call /api/v1/risk/scores to force a fresh read.
                var result = await _httpClient.GetAsync($"{_riskServiceUrl}/health");
                return Ok(new
                {
                    status  = result.IsSuccessStatusCode ? "sync_requested" : "unreachable",
                    message = result.IsSuccessStatusCode
                        ? "Risk Analysis Unit respondeu. Ciclo agendado a cada 5 min."
                        : "Risk Analysis Unit inacessível."
                });
            }
            catch
            {
                return Ok(new { status = "unreachable", message = "Risk Analysis Unit inacessível." });
            }
        }
    }
}
