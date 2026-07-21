using SosLocation.GeoProcessing.Terrain;
using Xunit;

namespace SosLocation.UnitTests;

public class TerrariumMathTests
{
    [Fact]
    public void DecodeElevation_FollowsTerrariumFormula()
    {
        // (R×256 + G + B/256) − 32768
        Assert.Equal(0.0, TerrariumMath.DecodeElevation(128, 0, 0), 3);          // nível do mar
        Assert.Equal(1696.0, TerrariumMath.DecodeElevation(134, 160, 0), 3);     // montanha
        Assert.Equal(-32768.0, TerrariumMath.DecodeElevation(0, 0, 0), 3);       // nodata típico
        Assert.Equal(0.5, TerrariumMath.DecodeElevation(128, 0, 128), 3);        // fração via canal B
    }

    [Fact]
    public void LonLatToTilePixel_CenterOfWorldAtZoom0()
    {
        var (tileX, tileY, pixelX, pixelY) = TerrariumMath.LonLatToTilePixel(0, 0, 0);
        Assert.Equal((0, 0), (tileX, tileY));
        Assert.Equal(128, pixelX);
        Assert.Equal(128, pixelY);
    }

    [Fact]
    public void LonLatToTilePixel_MatchesKnownTokyoTile()
    {
        // Shinjuku em z12 cai no tile ~(3637, 1612) (validado contra o tile real da AWS).
        var (tileX, tileY, _, _) = TerrariumMath.LonLatToTilePixel(139.70, 35.69, 12);
        Assert.Equal(3637, tileX);
        Assert.InRange(tileY, 1611, 1613);
    }

    [Fact]
    public void TileRange_CoversBoundingBox()
    {
        var (minX, minY, maxX, maxY) = TerrariumMath.TileRange(136.87, 35.16, 136.935, 35.31, 12);
        Assert.True(minX <= maxX);
        Assert.True(minY <= maxY);
        // Komaki+Nagoya cabem em poucos tiles no z12.
        Assert.InRange((maxX - minX + 1) * (maxY - minY + 1), 1, 16);
    }

    [Fact]
    public void LonLatToTilePixel_ClampsAtWorldEdges()
    {
        var (tileX, tileY, pixelX, pixelY) = TerrariumMath.LonLatToTilePixel(180, -85.05, 4);
        Assert.InRange(tileX, 0, 15);
        Assert.InRange(tileY, 0, 15);
        Assert.InRange(pixelX, 0, 255);
        Assert.InRange(pixelY, 0, 255);
    }
}
