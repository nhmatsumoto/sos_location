using System.Collections.Concurrent;
using Microsoft.Extensions.Logging;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using SosLocation.Application.Abstractions;
using SosLocation.Application.Options;
using SosLocation.Domain.ValueObjects;
using SosLocation.GeoProcessing.Terrain;

namespace SosLocation.Infrastructure.External;

public sealed class TerrainOptions
{
    public const string SectionName = "Terrain";
    public bool Enabled { get; set; } = true;
    public string BaseUrl { get; set; } = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium";
    /// <summary>Zoom usado para amostragem de elevação (~30 m/pixel em z12).</summary>
    public int SamplingZoom { get; set; } = 12;
    /// <summary>Zooms pré-carregados para renderização do relevo.</summary>
    public int MinRenderZoom { get; set; } = 8;
    public int MaxRenderZoom { get; set; } = 12;
    public int MaxPrefetchTiles { get; set; } = 400;
}

/// <summary>
/// Elevação via AWS Terrain Tiles (encoding Terrarium; SRTM/NED/GMTED, domínio
/// público — sem tokens). Cache-through no object storage: uma vez baixado na
/// importação, o tile é servido para sempre do MinIO (runtime 100% offline).
/// </summary>
public sealed class TerrariumElevationProvider(
    HttpClient httpClient,
    IObjectStorage storage,
    TerrainOptions options,
    ImportLimits limits,
    ILogger<TerrariumElevationProvider> logger) : IElevationProvider
{
    private static string StorageKey(int z, int x, int y) => $"terrain/{z}/{x}/{y}.png";

    public async Task<double[]?> SampleAsync(
        IReadOnlyList<(double Lon, double Lat)> points, CancellationToken ct)
    {
        if (!options.Enabled || points.Count == 0) return null;

        try
        {
            var zoom = options.SamplingZoom;
            var decodedTiles = new ConcurrentDictionary<(int X, int Y), Image<Rgba32>?>();
            var elevations = new double[points.Count];

            for (var i = 0; i < points.Count; i++)
            {
                ct.ThrowIfCancellationRequested();
                var (lon, lat) = points[i];
                var (tileX, tileY, pixelX, pixelY) = TerrariumMath.LonLatToTilePixel(lon, lat, zoom);

                if (!decodedTiles.TryGetValue((tileX, tileY), out var image))
                {
                    // Teto de tiles distintas por chamada (mesmo limite de PrefetchTilesAsync):
                    // sem isso, uma malha grande/esparsa (ex.: domínio sísmico com epicentro
                    // distante) poderia disparar milhares de downloads sequenciais. Pontos além
                    // do teto caem no mesmo fallback de tile indisponível (elevação 0).
                    if (decodedTiles.Count >= options.MaxPrefetchTiles)
                    {
                        image = null;
                    }
                    else
                    {
                        var bytes = await GetTileBytesAsync(zoom, tileX, tileY, ct);
                        image = bytes is null ? null : Image.Load<Rgba32>(bytes);
                    }

                    decodedTiles[(tileX, tileY)] = image;
                }

                if (image is null)
                {
                    elevations[i] = 0;
                    continue;
                }

                var pixel = image[pixelX, pixelY];
                var elevation = TerrariumMath.DecodeElevation(pixel.R, pixel.G, pixel.B);
                // Rejeita nodata/absurdos; edifícios abaixo do nível do mar existem (ex.: Holanda).
                elevations[i] = elevation is > -430 and < 9000 ? Math.Round(elevation, 1) : 0;
            }

            foreach (var image in decodedTiles.Values) image?.Dispose();

            var sampled = decodedTiles.Values.Count(v => v is not null);
            if (sampled == 0) return null;
            logger.LogInformation(
                "Sampled ground elevation for {Points} points from {Tiles} terrarium tiles (z{Zoom})",
                points.Count, sampled, zoom);
            return elevations;
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogWarning(ex, "Elevation sampling unavailable; keeping flat terrain.");
            return null;
        }
    }

    public async Task<int> PrefetchTilesAsync(BoundingBox area, CancellationToken ct)
    {
        if (!options.Enabled) return 0;
        var ensured = 0;

        try
        {
            for (var z = options.MinRenderZoom; z <= options.MaxRenderZoom; z++)
            {
                var (minX, minY, maxX, maxY) = TerrariumMath.TileRange(
                    area.West, area.South, area.East, area.North, z);
                // Margem de 1 tile: o usuário sempre navega um pouco além do boundary.
                for (var x = minX - 1; x <= maxX + 1; x++)
                {
                    for (var y = minY - 1; y <= maxY + 1; y++)
                    {
                        if (x < 0 || y < 0 || x >= 1 << z || y >= 1 << z) continue;
                        if (ensured >= options.MaxPrefetchTiles) return ensured;
                        ct.ThrowIfCancellationRequested();
                        if (await GetTileBytesAsync(z, x, y, ct) is not null) ensured++;
                    }
                }
            }
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogWarning(ex, "Terrain prefetch interrupted after {Count} tiles.", ensured);
        }

        return ensured;
    }

    /// <summary>Object storage primeiro (offline); rede como fallback com persistência.</summary>
    private async Task<byte[]?> GetTileBytesAsync(int z, int x, int y, CancellationToken ct)
    {
        var key = StorageKey(z, x, y);
        var cached = await storage.GetAsync(key, ct);
        if (cached is not null) return cached;

        var baseUri = new Uri(options.BaseUrl);
        if (!limits.AllowedImportHosts.Contains(baseUri.Host, StringComparer.OrdinalIgnoreCase))
        {
            logger.LogWarning("Terrain host {Host} not in allowlist; skipping download.", baseUri.Host);
            return null;
        }

        try
        {
            var bytes = await httpClient.GetByteArrayAsync(
                $"{options.BaseUrl.TrimEnd('/')}/{z}/{x}/{y}.png", ct);
            await storage.PutAsync(key, bytes, "image/png", ct);
            return bytes;
        }
        catch (HttpRequestException)
        {
            return null;
        }
        catch (TaskCanceledException) when (!ct.IsCancellationRequested)
        {
            return null; // timeout do HttpClient
        }
    }
}
