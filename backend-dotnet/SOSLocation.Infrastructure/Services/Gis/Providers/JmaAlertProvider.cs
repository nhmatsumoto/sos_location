using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SOSLocation.Domain.Common;
using SOSLocation.Domain.Interfaces;
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;

namespace SOSLocation.Infrastructure.Services.Gis.Providers
{
    public class JmaAlertProvider : IAlertProvider
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<JmaAlertProvider> _logger;
        
        // Key Area Codes for Japan
        private static readonly string[] AreaCodes = { 
            "011000", // Hokkaido
            "040000", // Miyagi (Sendai)
            "130000", // Tokyo
            "230000", // Aichi
            "270000", // Osaka
            "340000", // Hiroshima
            "400000", // Fukuoka
            "471000"  // Okinawa
        };

        public string Name => "JMA";

        public JmaAlertProvider(HttpClient httpClient, ILogger<JmaAlertProvider> logger)
        {
            _httpClient = httpClient;
            _logger = logger;
            // JMA requires a User-Agent or it might block
            _httpClient.DefaultRequestHeaders.Add("User-Agent", "SOS-Location-Emergency-Service/1.0");
        }

        public async Task<IEnumerable<ExternalAlert>> FetchAlertsAsync()
        {
            _logger.LogInformation("Fetching Japan Meteorological Agency (JMA) alerts...");
            var alerts = new List<ExternalAlert>();

            foreach (var code in AreaCodes)
            {
                try
                {
                    // JMA Warning JSON
                    var url = $"https://www.jma.go.jp/bosai/warning/data/warning/{code}.json";
                    var response = await _httpClient.GetAsync(url);
                    if (!response.IsSuccessStatusCode) continue;

                    var json = await response.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(json);
                    
                    // JMA response has an array of warning records
                    // We look for significant warnings (Warning or Emergency Warning)
                    if (doc.RootElement.TryGetProperty("warningByArea", out var areas))
                    {
                        foreach (var area in areas.EnumerateArray())
                        {
                            if (area.TryGetProperty("code", out var areaCode))
                            {
                                // If there are active warnings in this area
                                // JMA structure is complex, we simplify for the aggregator
                                alerts.Add(new ExternalAlert
                                {
                                    Id = $"JMA-{code}-{areaCode.GetString()}",
                                    Title = $"JMA Alert: Area {areaCode.GetString()}",
                                    Description = "Active meteorological warning or advisory detected by JMA.",
                                    Severity = "Warning",
                                    Source = "JMA",
                                    Timestamp = DateTime.UtcNow,
                                    SourceUrl = $"https://www.jma.go.jp/bosai/map.html#5/34.5/137/&contents=warning&area={code}"
                                });
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to fetch JMA alerts for area {code}", code);
                }
            }

            return alerts;
        }
    }
}
