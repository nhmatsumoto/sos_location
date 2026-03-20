using System;
using System.Collections.Generic;
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
    /// Fetches population density data from WorldPop (2020, 1km resolution).
    /// Returns a 32×32 grid of values normalized 0-1 using log scale,
    /// suitable for heatmap visualization.
    /// Falls back gracefully if the remote API or download is unavailable.
    /// </summary>
    public class GhslProvider : IGisDataProvider
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<GhslProvider> _logger;
        private readonly GisOptions _options;
        private const int GridSize = 32;

        public string ProviderName => "GHSL_WorldPop";

        // ISO3 lookup for common countries (centroid lat/lon based)
        private static readonly (double MinLat, double MaxLat, double MinLon, double MaxLon, string Iso3)[] CountryBounds =
        [
            (-33.7, 5.3,   -73.9, -34.8, "BRA"),
            (24.4,  49.4,  -124.8, -66.9, "USA"),
            (36.0,  71.2,   -9.5,  35.5,  "DEU"),
            (35.5,  71.2,  -25.0,  40.2,  "FRA"),
            (50.0,  61.0,  -8.0,   2.0,   "GBR"),
            (36.7,  47.1,   6.6,   18.5,  "ITA"),
            (27.3,  53.6,   73.5,  135.0, "CHN"),
            (8.1,   37.1,   68.1,  97.4,  "IND"),
            (30.8,  45.6,  129.5, 145.8, "JPN"),
            (22.0,  31.7,   29.0,  36.9,  "EGY"),
            (-34.9, -3.3,  -53.4, -28.9,  "ARG"),
            (-55.0, 12.5,  -81.4, -66.8,  "COL"),
            (-18.2, 4.2,   29.0,  41.0,  "COD"),
            (-34.9, -22.1,  16.5,  32.9,  "ZAF"),
            (-11.0, 37.3,  -17.5,  51.3,  "NGA"),
            (-4.7,  37.4,  33.9,   41.9,  "ETH"),
            (1.5,   13.9,  32.0,   48.0,  "SDN"),
            (-29.4, -1.1,  28.9,   40.4,  "TZA"),
            (-26.9, -1.1,  31.3,   40.6,  "MOZ"),
            (12.4,  23.5,   0.2,   15.9,  "NER"),
            (4.7,   13.9,   2.7,   15.0,  "NGA"),
            (30.0,  42.4,   26.0,  44.8,  "TUR"),
            (34.9,  42.4,   44.2,  63.3,  "IRN"),
            (22.5,  37.1,   36.8,  55.7,  "SAU"),
            (-55.0, 12.8,  -80.0, -50.0,  "BRA"),
        ];

        public GhslProvider(HttpClient httpClient, ILogger<GhslProvider> logger, IOptions<GisOptions> options)
        {
            _httpClient = httpClient;
            _logger = logger;
            _options = options.Value;
        }

        public async Task<object> FetchDataAsync(double minLat, double minLon, double maxLat, double maxLon)
        {
            double centerLat = (minLat + maxLat) / 2.0;
            double centerLon = (minLon + maxLon) / 2.0;
            string iso3 = ResolveIso3(centerLat, centerLon);

            _logger.LogInformation("Fetching WorldPop population density for ISO3={ISO3}", iso3);

            try
            {
                // Query WorldPop Hub for the dataset URL
                var catalogUrl = $"{_options.WorldPopApiUrl}?iso3={iso3}&year=2020";
                using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(15));
                var catalogResp = await _httpClient.GetAsync(catalogUrl, cts.Token);
                if (!catalogResp.IsSuccessStatusCode)
                    return FallbackGrid();

                var catalogJson = await catalogResp.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(catalogJson);
                var data = doc.RootElement.GetProperty("data");
                string? fileUrl = null;
                foreach (var item in data.EnumerateArray())
                {
                    if (item.TryGetProperty("files", out var files))
                    {
                        foreach (var f in files.EnumerateArray())
                        {
                            var fn = f.GetString() ?? "";
                            if (fn.EndsWith("_1km_Aggregated_UNadj.tif") || fn.EndsWith(".tif"))
                            {
                                fileUrl = fn;
                                break;
                            }
                        }
                        if (fileUrl != null) break;
                    }
                }

                if (string.IsNullOrEmpty(fileUrl))
                {
                    _logger.LogWarning("No WorldPop GeoTIFF file found for {ISO3}", iso3);
                    return FallbackGrid();
                }

                var tiffBytes = await _httpClient.GetByteArrayAsync(fileUrl, cts.Token);
                return ExtractSubgrid(tiffBytes, minLat, minLon, maxLat, maxLon);
            }
            catch (Exception ex)
            {
                _logger.LogWarning("WorldPop fetch failed: {Msg}", ex.Message);
                return FallbackGrid();
            }
        }

        public async Task<bool> CheckHealthAsync()
        {
            try
            {
                var r = await _httpClient.GetAsync($"{_options.WorldPopApiUrl}?iso3=BRA&year=2020");
                return r.IsSuccessStatusCode;
            }
            catch { return false; }
        }

        private static string ResolveIso3(double lat, double lon)
        {
            foreach (var (minLat, maxLat, minLon, maxLon, iso) in CountryBounds)
            {
                if (lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon)
                    return iso;
            }
            return "BRA"; // default fallback
        }

        private static PopulationDensityDto ExtractSubgrid(byte[] tiff, double minLat, double minLon, double maxLat, double maxLon)
        {
            // Minimal TIFF reader for float32 single-band population raster
            try
            {
                bool le = tiff[0] == 0x49;
                Func<int, short> rs = o => (short)(le ? (tiff[o] | tiff[o+1]<<8) : (tiff[o]<<8 | tiff[o+1]));
                Func<int, int> ri = o => le ? (tiff[o] | tiff[o+1]<<8 | tiff[o+2]<<16 | tiff[o+3]<<24)
                                           : (tiff[o]<<24 | tiff[o+1]<<16 | tiff[o+2]<<8 | tiff[o+3]);

                int ifdOff = ri(4);
                int numE = (ushort)rs(ifdOff);
                int imgW = 0, imgH = 0, stripOff = 0, sampleFormat = 1, bitsPerSample = 8;
                for (int e = 0; e < numE; e++)
                {
                    int eo = ifdOff + 2 + e * 12;
                    int tag = (ushort)rs(eo);
                    int val = ri(eo + 8);
                    if (tag == 256) imgW = val;
                    else if (tag == 257) imgH = val;
                    else if (tag == 273) stripOff = val;
                    else if (tag == 339) sampleFormat = val;  // 3=float
                    else if (tag == 258) bitsPerSample = val;
                }

                if (imgW < GridSize || imgH < GridSize || stripOff <= 0)
                    return FallbackGrid();

                var rawValues = new float[GridSize * GridSize];
                float maxVal = 0;
                for (int r = 0; r < GridSize; r++)
                {
                    int srcRow = (int)((r / (double)(GridSize-1)) * (imgH-1));
                    for (int c = 0; c < GridSize; c++)
                    {
                        int srcCol = (int)((c / (double)(GridSize-1)) * (imgW-1));
                        int pixOff = stripOff + (srcRow * imgW + srcCol) * (bitsPerSample / 8);
                        float v = 0;
                        if (sampleFormat == 3 && bitsPerSample == 32 && pixOff + 4 <= tiff.Length)
                            v = Math.Max(0, BitConverter.ToSingle(tiff, pixOff));
                        else if (pixOff < tiff.Length)
                            v = tiff[pixOff];
                        rawValues[r * GridSize + c] = v;
                        if (v > maxVal) maxVal = v;
                    }
                }

                // Normalize log scale: log(1+pop) / log(1+maxPop)
                double logMax = Math.Log(1 + maxVal);
                var grid = new float[GridSize][];
                for (int r = 0; r < GridSize; r++)
                {
                    grid[r] = new float[GridSize];
                    for (int c = 0; c < GridSize; c++)
                        grid[r][c] = logMax > 0 ? (float)(Math.Log(1 + rawValues[r * GridSize + c]) / logMax) : 0f;
                }

                return new PopulationDensityDto { Rows = GridSize, Cols = GridSize, Grid = grid, MaxRawValue = maxVal, IsAvailable = true };
            }
            catch
            {
                return FallbackGrid();
            }
        }

        private static PopulationDensityDto FallbackGrid()
        {
            var grid = new float[GridSize][];
            for (int r = 0; r < GridSize; r++) grid[r] = new float[GridSize];
            return new PopulationDensityDto { Rows = GridSize, Cols = GridSize, Grid = grid, IsAvailable = false };
        }
    }
}
