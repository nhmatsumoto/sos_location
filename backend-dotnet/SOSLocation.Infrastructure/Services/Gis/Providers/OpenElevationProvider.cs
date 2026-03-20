using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace SOSLocation.Infrastructure.Services.Gis.Providers
{
    /// <summary>
    /// Fetches elevation data via the Open-Meteo Elevation API.
    /// Completely free, no API key required, global coverage.
    /// Samples a grid of points within the bbox and bilinearly upsamples to target resolution.
    /// API: https://api.open-meteo.com/v1/elevation?latitude=lat1,lat2&longitude=lon1,lon2
    /// </summary>
    public class OpenElevationProvider : IGisDataProvider
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<OpenElevationProvider> _logger;
        private const int SampleGrid = 32;   // 32×32 = 1024 sample points
        private const int TargetRes  = 128;  // upsampled output grid

        public string ProviderName => "OpenElevation";

        public OpenElevationProvider(HttpClient httpClient, ILogger<OpenElevationProvider> logger)
        {
            _httpClient = httpClient;
            _logger = logger;
        }

        public async Task<object> FetchDataAsync(double minLat, double minLon, double maxLat, double maxLon)
        {
            _logger.LogInformation("Fetching Open-Meteo elevation for {MinLat},{MinLon}→{MaxLat},{MaxLon}", minLat, minLon, maxLat, maxLon);
            try
            {
                // Build grid of sample points
                var lats = new List<double>(SampleGrid * SampleGrid);
                var lons = new List<double>(SampleGrid * SampleGrid);
                for (int r = 0; r < SampleGrid; r++)
                    for (int c = 0; c < SampleGrid; c++)
                    {
                        lats.Add(minLat + (maxLat - minLat) * r / (SampleGrid - 1));
                        lons.Add(minLon + (maxLon - minLon) * c / (SampleGrid - 1));
                    }

                var latStr = string.Join(",", lats.ConvertAll(v => $"{v:F6}"));
                var lonStr = string.Join(",", lons.ConvertAll(v => $"{v:F6}"));
                var url = $"https://api.open-meteo.com/v1/elevation?latitude={latStr}&longitude={lonStr}";

                using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(20));
                var response = await _httpClient.GetAsync(url, cts.Token);

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Open-Meteo elevation returned {Status}", response.StatusCode);
                    return new List<List<float>>();
                }

                var json = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(json);
                if (!doc.RootElement.TryGetProperty("elevation", out var elevArr))
                    return new List<List<float>>();

                // Parse flat array into SampleGrid×SampleGrid
                var raw = new float[SampleGrid, SampleGrid];
                int idx = 0;
                foreach (var el in elevArr.EnumerateArray())
                {
                    int r = idx / SampleGrid, c = idx % SampleGrid;
                    raw[r, c] = el.GetSingle();
                    idx++;
                }

                // Bilinear upsample to TargetRes×TargetRes
                var grid = new List<List<float>>(TargetRes);
                for (int r = 0; r < TargetRes; r++)
                {
                    var row = new List<float>(TargetRes);
                    for (int c = 0; c < TargetRes; c++)
                    {
                        double sr = (double)r / (TargetRes - 1) * (SampleGrid - 1);
                        double sc = (double)c / (TargetRes - 1) * (SampleGrid - 1);
                        int r0 = (int)sr, r1 = Math.Min(r0 + 1, SampleGrid - 1);
                        int c0 = (int)sc, c1 = Math.Min(c0 + 1, SampleGrid - 1);
                        double fr = sr - r0, fc = sc - c0;
                        float v = (float)(
                            raw[r0, c0] * (1 - fr) * (1 - fc) +
                            raw[r0, c1] * (1 - fr) * fc +
                            raw[r1, c0] * fr * (1 - fc) +
                            raw[r1, c1] * fr * fc
                        );
                        row.Add(v);
                    }
                    grid.Add(row);
                }

                _logger.LogInformation("Open-Meteo elevation OK: {Rows}×{Cols}", TargetRes, TargetRes);
                return grid;
            }
            catch (Exception ex)
            {
                _logger.LogWarning("OpenElevation fetch failed: {Msg}", ex.Message);
                return new List<List<float>>();
            }
        }

        public Task<bool> CheckHealthAsync() => Task.FromResult(true);
    }
}
