using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;
using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Threading.Tasks;

namespace SOSLocation.Infrastructure.Services.Gis.Providers
{
    public class TerrainRgbProvider : IGisDataProvider
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<TerrainRgbProvider> _logger;
        private readonly GisOptions _options;

        public string ProviderName => "TerrainRGB";

        public TerrainRgbProvider(HttpClient httpClient, ILogger<TerrainRgbProvider> logger, IOptions<GisOptions> options)
        {
            _httpClient = httpClient;
            _logger = logger;
            _options = options.Value;
        }

        public async Task<object> FetchDataAsync(double minLat, double minLon, double maxLat, double maxLon)
        {
            // We'll return a grid of floats similar to OpenTopography for compatibility,
            // but sourced from high-res Terrain-RGB tiles.
            int zoom = 12; // Appropriate zoom for simulation scale
            var (minX, minY) = LatLonToTile(minLat, minLon, zoom);
            var (maxX, maxY) = LatLonToTile(maxLat, maxLon, zoom);

            // Swap Y if necessary (depends on projection)
            if (minY > maxY) (minY, maxY) = (maxY, minY);
            if (minX > maxX) (minX, maxX) = (maxX, minX);

            int tilesX = maxX - minX + 1;
            int tilesY = maxY - minY + 1;

            using var fullImage = new Image<Rgb24>(tilesX * 256, tilesY * 256);

            for (int y = 0; y < tilesY; y++)
            {
                for (int x = 0; x < tilesX; x++)
                {
                    var tileImg = await DownloadTileAsync(minX + x, minY + y, zoom);
                    if (tileImg != null)
                    {
                        fullImage.Mutate(ctx => ctx.DrawImage(tileImg, new Point(x * 256, y * 256), 1f));
                        tileImg.Dispose();
                    }
                }
            }

            // Convert stitched image back to elevation grid
            int targetRes = 128;
            fullImage.Mutate(ctx => ctx.Resize(targetRes, targetRes));

            var grid = new List<List<float>>();
            for (int y = 0; y < targetRes; y++)
            {
                var row = new List<float>();
                for (int x = 0; x < targetRes; x++)
                {
                    var pixel = fullImage[x, y];
                    float alt = (pixel.R * 65536f + pixel.G * 256f + pixel.B) * 0.1f - 10000f;
                    row.Add(Math.Max(0, alt));
                }
                grid.Add(row);
            }

            return grid;
        }

        private async Task<Image<Rgb24>?> DownloadTileAsync(int x, int y, int z)
        {
            string url;
            if (!string.IsNullOrEmpty(_options.MapboxToken))
            {
                url = _options.MapboxUrl.Replace("{z}", z.ToString()).Replace("{x}", x.ToString()).Replace("{y}", y.ToString()) + $"?access_token={_options.MapboxToken}";
            }
            else
            {
                url = _options.AwsTerrainUrl.Replace("{z}", z.ToString()).Replace("{x}", x.ToString()).Replace("{y}", y.ToString());
            }

            try
            {
                var response = await _httpClient.GetAsync(url);
                if (response.IsSuccessStatusCode)
                {
                    var stream = await response.Content.ReadAsStreamAsync();
                    return await Image.LoadAsync<Rgb24>(stream);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning("Failed to download tile {z}/{x}/{y}: {msg}", z, x, y, ex.Message);
            }
            return null;
        }

        public async Task<bool> CheckHealthAsync()
        {
            try
            {
                var response = await _httpClient.GetAsync(_options.AwsTerrainUrl.Replace("{z}", "0").Replace("{x}", "0").Replace("{y}", "0"));
                return response.IsSuccessStatusCode;
            }
            catch
            {
                return false;
            }
        }

        private (int x, int y) LatLonToTile(double lat, double lon, int zoom)
        {
            double n = Math.Pow(2.0, zoom);
            int x = (int)((lon + 180.0) / 360.0 * n);
            int y = (int)((1.0 - Math.Log(Math.Tan(lat * Math.PI / 180.0) + 1.0 / Math.Cos(lat * Math.PI / 180.0)) / Math.PI) / 2.0 * n);
            return (x, y);
        }

        // Helper for the "generate-heightmap" endpoint to return PNG bytes
        public async Task<byte[]> GenerateGrayscaleHeightmapAsync(double minLat, double minLon, double maxLat, double maxLon)
        {
            var gridObj = await FetchDataAsync(minLat, minLon, maxLat, maxLon);
            var grid = gridObj as List<List<float>>;
            if (grid == null) return Array.Empty<byte>();

            float minH = float.MaxValue;
            float maxH = float.MinValue;

            foreach (var row in grid)
            {
                foreach (var h in row)
                {
                    if (h < minH) minH = h;
                    if (h > maxH) maxH = h;
                }
            }

            float range = maxH - minH;
            if (range < 1.0f) range = 1.0f;

            using var heightmap = new Image<L8>(grid[0].Count, grid.Count);
            for (int y = 0; y < grid.Count; y++)
            {
                for (int x = 0; x < grid[0].Count; x++)
                {
                    float normalized = (grid[y][x] - minH) / range;
                    heightmap[x, y] = new L8((byte)(normalized * 255));
                }
            }

            using var ms = new MemoryStream();
            await heightmap.SaveAsPngAsync(ms);
            return ms.ToArray();
        }

        public async Task<byte[]> GenerateSatelliteImageryAsync(double minLat, double minLon, double maxLat, double maxLon)
        {
            // Similar to FetchDataAsync but returns the raw RGB image without decoding altitude
            int zoom = 14; 
            var (minX, minY) = LatLonToTile(minLat, minLon, zoom);
            var (maxX, maxY) = LatLonToTile(maxLat, maxLon, zoom);

            if (minY > maxY) (minY, maxY) = (maxY, minY);
            if (minX > maxX) (minX, maxX) = (maxX, minX);

            int tilesX = maxX - minX + 1;
            int tilesY = maxY - minY + 1;

            // Cap tiles to avoid huge memory usage
            tilesX = Math.Min(tilesX, 8);
            tilesY = Math.Min(tilesY, 8);

            using var fullImage = new Image<Rgb24>(tilesX * 256, tilesY * 256);

            for (int y = 0; y < tilesY; y++) {
                for (int x = 0; x < tilesX; x++) {
                    // Using CartoDB Dark Matter for the "tactical" look or Mapbox Satellite if available
                    string url = $"https://a.basemaps.cartocdn.com/dark_all/{zoom}/{minX + x}/{minY + y}.png";
                    
                    try {
                        var bytes = await _httpClient.GetByteArrayAsync(url);
                        using var tileImg = Image.Load<Rgb24>(bytes);
                        fullImage.Mutate(ctx => ctx.DrawImage(tileImg, new Point(x * 256, y * 256), 1f));
                    } catch { }
                }
            }

            using var ms = new MemoryStream();
            await fullImage.SaveAsPngAsync(ms);
            return ms.ToArray();
        }
    }
}
