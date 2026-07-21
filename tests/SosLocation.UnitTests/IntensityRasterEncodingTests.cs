using SosLocation.GeoProcessing.Seismic;
using Xunit;

namespace SosLocation.UnitTests;

public class IntensityRasterEncodingTests
{
    [Theory]
    [InlineData(0.0)]
    [InlineData(0.001)]
    [InlineData(0.123)]
    [InlineData(1.0)]
    [InlineData(2.5)]
    public void EncodeDecode_RoundTrips(double pgaG)
    {
        var (r, g) = IntensityRasterEncoding.EncodePgaG(pgaG);
        var decoded = IntensityRasterEncoding.DecodePgaG(r, g);
        Assert.Equal(pgaG, decoded, 3);
    }

    [Fact]
    public void EncodePgaG_ClampsNegativeToZero()
    {
        var (r, g) = IntensityRasterEncoding.EncodePgaG(-1.0);
        Assert.Equal(0.0, IntensityRasterEncoding.DecodePgaG(r, g));
    }
}
