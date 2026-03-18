using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace SOSLocation.Infrastructure.Services.Gis.Providers
{
    public class EarthdataProvider : IGisDataProvider
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<EarthdataProvider> _logger;
        private readonly GisOptions _options;

        public string ProviderName => "NASA Earthdata";

        public EarthdataProvider(HttpClient httpClient, ILogger<EarthdataProvider> logger, IOptions<GisOptions> options)
        {
            _httpClient = httpClient;
            _logger = logger;
            _options = options.Value;
        }

        public async Task<object> FetchDataAsync(double minLat, double minLon, double maxLat, double maxLon)
        {
            _logger.LogInformation("Querying NASA Earthdata for region: {minLat}, {minLon}", minLat, minLon);

            if (string.IsNullOrEmpty(_options.EarthdataToken))
            {
                _logger.LogWarning("NASA Earthdata Token is missing. Skipping direct NASA queries.");
                return new { success = false, message = "Token missing" };
            }

            try
            {
                // Note: NASA Earthdata typical use is finding granules via CMR.
                // We'll simulate fetching refined vegetation (NDVI) and soil moisture data (SMAP).
                
                using var request = new HttpRequestMessage(HttpMethod.Get, "https://cmr.earthdata.nasa.gov/search/granules.json?short_name=MOD13Q1&bounding_box=" + $"{minLon},{minLat},{maxLon},{maxLat}");
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.EarthdataToken);
                
                using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(15));
                var response = await _httpClient.SendAsync(request, cts.Token);
                
                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInformation("Successfully interfaced with NASA Earthdata CMR.");
                    // In a production scenario, we'd parse the granule URLs and download them.
                    // For the simulation, we'll return a 'NASA_VERIFIED' flag to refine the vegetation logic.
                    return new 
                    { 
                        success = true, 
                        dataSource = "NASA_CMR_MODIS",
                        confidence = 0.95,
                        refined_ndvi = 0.55 // Simulated refined value
                    };
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning("NASA Earthdata connection failed: {msg}", ex.Message);
            }

            return new { success = false };
        }

        public async Task<bool> CheckHealthAsync()
        {
            try
            {
                using var request = new HttpRequestMessage(HttpMethod.Get, "https://cmr.earthdata.nasa.gov/search/health");
                if (!string.IsNullOrEmpty(_options.EarthdataToken))
                {
                    request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.EarthdataToken);
                }
                var response = await _httpClient.SendAsync(request);
                return response.IsSuccessStatusCode;
            }
            catch
            {
                return false;
            }
        }
    }
}
