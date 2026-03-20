using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace SOSLocation.Infrastructure.Services.Gis.Providers
{
    public class OpenTopographyProvider : IGisDataProvider
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<OpenTopographyProvider> _logger;
        private readonly GisOptions _options;

        public string ProviderName => "OpenTopography";

        public OpenTopographyProvider(HttpClient httpClient, ILogger<OpenTopographyProvider> logger, IOptions<GisOptions> options)
        {
            _httpClient = httpClient;
            _logger = logger;
            _options = options.Value;
        }

        public async Task<object> FetchDataAsync(double minLat, double minLon, double maxLat, double maxLon)
        {
            _logger.LogInformation("Fetching DEM from OpenTopography: {minLat}, {minLon}", minLat, minLon);
            var queryUrl = $"{_options.OpenTopographyUrl}?demtype=SRTMGL1&west={minLon}&south={minLat}&east={maxLon}&north={maxLat}&outputFormat=AAIGrid";
            if (!string.IsNullOrEmpty(_options.OpenTopographyApiKey)) {
                queryUrl += $"&API_Key={_options.OpenTopographyApiKey}";
            }
            int resolution = 128;

            try
            {
                using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(25));
                var response = await _httpClient.GetAsync(queryUrl, cts.Token);
                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInformation("Successfully connected to OpenTopography.");
                    var asciiData = await response.Content.ReadAsStringAsync();
                    return ParseAAIGrid(asciiData, resolution);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning("OpenTopography query failed: {msg}", ex.Message);
            }

            return GenerateSyntheticTerrain(minLat, minLon, resolution, false);
        }

        private List<List<float>> ParseAAIGrid(string ascii, int targetRes)
        {
            try {
                // Tokenize the entire string by removing empty entries from any type of whitespace
                var tokens = ascii.Split(new[] { ' ', '\n', '\r', '\t' }, StringSplitOptions.RemoveEmptyEntries);
                
                int ncols = 0, nrows = 0;
                int tokenIndex = 0;
                
                // Parse 6-line header
                while (tokenIndex < tokens.Length) {
                    var label = tokens[tokenIndex].ToLower();
                    if (label == "ncols") ncols = int.Parse(tokens[++tokenIndex]);
                    else if (label == "nrows") nrows = int.Parse(tokens[++tokenIndex]);
                    else if (label == "xllcorner" || label == "yllcorner" || label == "cellsize" || label == "nodata_value") {
                        tokenIndex++; // Skip the value too
                    }
                    else {
                        // Data starts here
                        break;
                    }
                    tokenIndex++;
                }

                if (ncols <= 0 || nrows <= 0) 
                    return GenerateSyntheticTerrain(0, 0, targetRes, false);

                // AAIGrid row 0 = northernmost. Frontend expects row 0 = southernmost (UV.y=0=south).
                var rawRows = new List<float>[nrows];
                for (int i = 0; i < nrows; i++) {
                    var row = new List<float>();
                    for (int j = 0; j < ncols; j++) {
                        row.Add(tokenIndex < tokens.Length ? float.Parse(tokens[tokenIndex++]) : 0f);
                    }
                    rawRows[i] = row;
                }
                var grid = new List<List<float>>(nrows);
                for (int i = nrows - 1; i >= 0; i--)
                    grid.Add(rawRows[i]);

                return grid;
            } catch (Exception ex) {
                _logger.LogError("Failed to parse AAIGrid: {msg}", ex.Message);
                return GenerateSyntheticTerrain(0, 0, targetRes, false);
            }
        }

        public async Task<bool> CheckHealthAsync()
        {
            try
            {
                // Light health check (HEAD request or similar if supported, or just testing connectivity)
                var response = await _httpClient.GetAsync(_options.OpenTopographyUrl + "?demtype=SRTMGL1&west=0&south=0&east=0.01&north=0.01&outputFormat=GTiff");
                return response.IsSuccessStatusCode;
            }
            catch
            {
                return false;
            }
        }

        private List<List<float>> GenerateSyntheticTerrain(double lat, double lon, int resolution, bool highQuality)
        {
            var grid = new List<List<float>>();
            Random rnd = new Random((int)(lat * 10000 + lon * 10000));
            float baseH = (float)(rnd.NextDouble() * 50);

            for (int i = 0; i < resolution; i++)
            {
                var row = new List<float>();
                for (int j = 0; j < resolution; j++)
                {
                    // Noise influenced by seeding (lat/lon)
                    float freq = 0.05f + (float)rnd.NextDouble() * 0.05f;
                    float noise = (float)(Math.Sin((i + lat * 100) * freq) * Math.Cos((j + lon * 100) * freq) * 40.0);
                    noise += (float)(Math.Sin(i * 0.02) * 80.0 * rnd.NextDouble());
                    
                    if (highQuality) noise += (float)(rnd.NextDouble() * 5.0);
                    row.Add(Math.Max(0, baseH + noise));
                }
                grid.Add(row);
            }
            return grid;
        }
    }
}
