namespace SosLocation.GeoProcessing.Terrain;

/// <summary>
/// Matemática dos tiles de elevação no encoding Terrarium (AWS Terrain Tiles):
/// elevação(m) = (R × 256 + G + B / 256) − 32768.
/// </summary>
public static class TerrariumMath
{
    public const int TileSize = 256;

    public static double DecodeElevation(byte r, byte g, byte b)
        => r * 256.0 + g + b / 256.0 - 32768.0;

    /// <summary>Tile XYZ e pixel dentro do tile para uma coordenada WGS84.</summary>
    public static (int TileX, int TileY, int PixelX, int PixelY) LonLatToTilePixel(
        double lon, double lat, int zoom)
    {
        var n = 1 << zoom;
        var x = (lon + 180.0) / 360.0 * n;
        var latRad = lat * Math.PI / 180.0;
        var y = (1.0 - Math.Log(Math.Tan(latRad) + 1.0 / Math.Cos(latRad)) / Math.PI) / 2.0 * n;

        var tileX = Math.Clamp((int)Math.Floor(x), 0, n - 1);
        var tileY = Math.Clamp((int)Math.Floor(y), 0, n - 1);
        var pixelX = Math.Clamp((int)((x - tileX) * TileSize), 0, TileSize - 1);
        var pixelY = Math.Clamp((int)((y - tileY) * TileSize), 0, TileSize - 1);
        return (tileX, tileY, pixelX, pixelY);
    }

    /// <summary>Intervalo de tiles XYZ que cobre um bounding box no zoom dado.</summary>
    public static (int MinX, int MinY, int MaxX, int MaxY) TileRange(
        double west, double south, double east, double north, int zoom)
    {
        var (minX, maxY, _, _) = LonLatToTilePixel(west, south, zoom);
        var (maxX, minY, _, _) = LonLatToTilePixel(east, north, zoom);
        return (minX, minY, maxX, maxY);
    }
}
