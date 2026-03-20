using System;
using System.Net.Http;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SOSLocation.Application.DTOs.Simulation;

namespace SOSLocation.Infrastructure.Services.Gis.Providers
{
    /// <summary>
    /// Fetches real global soil data from ISRIC SoilGrids REST v2.0.
    /// Replaces the hardcoded Brazil-only soil logic in GisService.
    /// No API key required. Returns SoilDataDto with USDA texture classification.
    /// </summary>
    public class SoilGridsProvider : IGisDataProvider
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<SoilGridsProvider> _logger;
        private readonly GisOptions _options;

        public string ProviderName => "SoilGrids";

        public SoilGridsProvider(HttpClient httpClient, ILogger<SoilGridsProvider> logger, IOptions<GisOptions> options)
        {
            _httpClient = httpClient;
            _logger = logger;
            _options = options.Value;
        }

        public async Task<object> FetchDataAsync(double minLat, double minLon, double maxLat, double maxLon)
        {
            double centerLat = (minLat + maxLat) / 2.0;
            double centerLon = (minLon + maxLon) / 2.0;

            _logger.LogInformation("Fetching SoilGrids for {Lat},{Lon}", centerLat, centerLon);

            var url = $"{_options.SoilGridsUrl}" +
                      $"?lon={centerLon:F6}&lat={centerLat:F6}" +
                      "&property=clay&property=sand&property=silt&property=phh2o&property=bdod&property=ocd" +
                      "&depth=0-5cm&value=mean";

            try
            {
                using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
                var response = await _httpClient.GetAsync(url, cts.Token);
                if (response.IsSuccessStatusCode)
                {
                    var json = await response.Content.ReadAsStringAsync();
                    return ParseSoilGrids(json, centerLat, centerLon);
                }
                _logger.LogWarning("SoilGrids returned HTTP {Status}", response.StatusCode);
            }
            catch (Exception ex)
            {
                _logger.LogWarning("SoilGrids fetch failed: {Msg}", ex.Message);
            }

            return FallbackSoil(centerLat, centerLon);
        }

        public async Task<bool> CheckHealthAsync()
        {
            try
            {
                var r = await _httpClient.GetAsync($"{_options.SoilGridsUrl}?lon=0&lat=0&property=clay&depth=0-5cm&value=mean");
                return r.IsSuccessStatusCode;
            }
            catch { return false; }
        }

        private SoilDataDto ParseSoilGrids(string json, double lat, double lon)
        {
            var dto = FallbackSoil(lat, lon);
            try
            {
                using var doc = JsonDocument.Parse(json);
                var props = doc.RootElement.GetProperty("properties");
                var layers = props.GetProperty("layers");

                foreach (var layer in layers.EnumerateArray())
                {
                    var name = layer.GetProperty("name").GetString() ?? "";
                    var depths = layer.GetProperty("depths");
                    double? rawVal = null;
                    foreach (var depth in depths.EnumerateArray())
                    {
                        if (depth.GetProperty("label").GetString() == "0-5cm")
                        {
                            if (depth.GetProperty("values").TryGetProperty("mean", out var mv) && mv.ValueKind != JsonValueKind.Null)
                                rawVal = mv.GetDouble();
                            break;
                        }
                    }
                    if (rawVal == null) continue;

                    double dFactor = 1.0;
                    if (layer.TryGetProperty("unit_measure", out var um) && um.TryGetProperty("d_factor", out var df))
                        dFactor = df.GetDouble();

                    double value = rawVal.Value / dFactor;

                    switch (name)
                    {
                        case "clay": dto.ClayPct = value / 10.0; break;   // g/kg → %
                        case "sand": dto.SandPct = value / 10.0; break;
                        case "silt": dto.SiltPct = value / 10.0; break;
                        case "phh2o": dto.Ph = value / 10.0; break;       // pH×10 → pH
                        case "bdod": dto.BulkDensity = value / 100.0; break; // cg/cm³ → g/cm³
                        case "ocd": dto.OrganicCarbonDensity = value; break;
                    }
                }

                dto.Type = ClassifyUSDA(dto.ClayPct, dto.SandPct, dto.SiltPct);
                dto.PhDescriptor = dto.Ph < 6.5 ? "Acidic" : dto.Ph > 7.5 ? "Alkaline" : "Neutral";
                dto.Permeability = dto.BulkDensity > 0 ? Math.Round(10.0 / dto.BulkDensity, 2) : 3.5;
                dto.Source = "SoilGrids_v2";
                dto.QueryPoint = [lat, lon];
            }
            catch (Exception ex)
            {
                _logger.LogWarning("SoilGrids parse error: {Msg}", ex.Message);
            }
            return dto;
        }

        /// <summary>
        /// Simplified USDA soil texture triangle — 5-bucket classification.
        /// </summary>
        private static string ClassifyUSDA(double clay, double sand, double silt)
        {
            if (clay < 0 && sand < 0) return "Unknown";
            if (clay > 40) return "Clay";
            if (sand > 70) return sand > 85 ? "Sand" : "Sandy Loam";
            if (clay > 27 && silt < 28) return "Clay Loam";
            if (silt > 50 && clay < 27) return "Silt Loam";
            return "Loam";
        }

        private static SoilDataDto FallbackSoil(double lat, double lon) => new()
        {
            Type = "Loam",
            ClayPct = 25, SandPct = 40, SiltPct = 35,
            Ph = 6.8, BulkDensity = 1.3,
            OrganicCarbonDensity = 5.0,
            Permeability = 3.5,
            PhDescriptor = "Neutral",
            Source = "SoilGrids_Unavailable",
            QueryPoint = [lat, lon]
        };
    }
}
