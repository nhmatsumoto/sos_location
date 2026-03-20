using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace SOSLocation.Infrastructure.Services.Gis.Providers
{
    /// <summary>
    /// Fetches Copernicus DEM GLO-30 elevation data via OpenTopography API.
    /// Higher quality than SRTM (no voids), globally consistent, free without API key for small areas.
    /// Returns a 256×256 elevation grid in metres.
    /// </summary>
    public class CopernicusDemProvider : IGisDataProvider
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<CopernicusDemProvider> _logger;
        private readonly GisOptions _options;
        private const int TargetRes = 256;

        public string ProviderName => "CopernicusDEM";

        public CopernicusDemProvider(HttpClient httpClient, ILogger<CopernicusDemProvider> logger, IOptions<GisOptions> options)
        {
            _httpClient = httpClient;
            _logger = logger;
            _options = options.Value;
        }

        public async Task<object> FetchDataAsync(double minLat, double minLon, double maxLat, double maxLon)
        {
            _logger.LogInformation("Fetching Copernicus DEM COP30 for {MinLat},{MinLon}→{MaxLat},{MaxLon}", minLat, minLon, maxLat, maxLon);

            var demType = string.IsNullOrEmpty(_options.CopernicusDemType) ? "COP30" : _options.CopernicusDemType;
            var queryUrl = $"{_options.OpenTopographyUrl}?demtype={demType}" +
                           $"&west={minLon:F6}&south={minLat:F6}&east={maxLon:F6}&north={maxLat:F6}" +
                           "&outputFormat=AAIGrid";
            if (!string.IsNullOrEmpty(_options.OpenTopographyApiKey))
                queryUrl += $"&API_Key={_options.OpenTopographyApiKey}";

            try
            {
                using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(30));
                var response = await _httpClient.GetAsync(queryUrl, cts.Token);
                if (response.IsSuccessStatusCode)
                {
                    var ascii = await response.Content.ReadAsStringAsync();
                    var grid = ParseAAIGrid(ascii);
                    if (grid.Count > 0)
                    {
                        _logger.LogInformation("COP30 DEM fetched: {Rows}×{Cols}", grid.Count, grid[0].Count);
                        return grid;
                    }
                }
                else
                {
                    _logger.LogWarning("COP30 returned HTTP {Status}, falling back to synthetic", response.StatusCode);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning("CopernicusDEM fetch failed: {Msg}", ex.Message);
            }

            // Return empty so GisService can try the next provider in the chain
            return new List<List<float>>();
        }

        public async Task<bool> CheckHealthAsync()
        {
            try
            {
                var url = $"{_options.OpenTopographyUrl}?demtype=COP30&west=0&south=0&east=0.01&north=0.01&outputFormat=GTiff";
                var r = await _httpClient.GetAsync(url);
                return r.IsSuccessStatusCode;
            }
            catch { return false; }
        }

        private List<List<float>> ParseAAIGrid(string ascii)
        {
            try
            {
                var tokens = ascii.Split(new[] { ' ', '\n', '\r', '\t' }, StringSplitOptions.RemoveEmptyEntries);
                int ncols = 0, nrows = 0, idx = 0;

                while (idx < tokens.Length)
                {
                    var label = tokens[idx].ToLower();
                    if (label == "ncols")          ncols = int.Parse(tokens[++idx]);
                    else if (label == "nrows")     nrows = int.Parse(tokens[++idx]);
                    else if (label is "xllcorner" or "yllcorner" or "cellsize" or "nodata_value") idx++;
                    else break;
                    idx++;
                }

                if (ncols <= 0 || nrows <= 0) return new List<List<float>>();

                // AAIGrid stores row 0 as northernmost row (top of raster).
                // Frontend UV convention: UV.y=0 = south = world Z=-areaHalf.
                // So we reverse row order: first row stored = southernmost = UV.y=0.
                var rows = new List<float>[nrows];
                for (int r = 0; r < nrows; r++)
                {
                    var row = new List<float>(ncols);
                    for (int c = 0; c < ncols; c++)
                        row.Add(idx < tokens.Length ? float.Parse(tokens[idx++]) : 0f);
                    rows[r] = row;
                }
                var grid = new List<List<float>>(nrows);
                for (int r = nrows - 1; r >= 0; r--)
                    grid.Add(rows[r]);
                return grid;
            }
            catch (Exception ex)
            {
                _logger.LogError("Failed to parse COP30 AAIGrid: {Msg}", ex.Message);
                return new List<List<float>>();
            }
        }

        private static List<List<float>> GenerateSyntheticTerrain(double lat, double lon)
        {
            var rnd = new Random((int)(lat * 10000 + lon * 10000));
            float baseH = (float)(rnd.NextDouble() * 50);
            var grid = new List<List<float>>(TargetRes);
            for (int i = 0; i < TargetRes; i++)
            {
                var row = new List<float>(TargetRes);
                for (int j = 0; j < TargetRes; j++)
                {
                    float freq = 0.05f + (float)rnd.NextDouble() * 0.05f;
                    float noise = (float)(Math.Sin((i + lat * 100) * freq) * Math.Cos((j + lon * 100) * freq) * 40.0)
                                + (float)(Math.Sin(i * 0.02) * 80.0 * rnd.NextDouble());
                    row.Add(Math.Max(0, baseH + noise));
                }
                grid.Add(row);
            }
            return grid;
        }
    }
}
