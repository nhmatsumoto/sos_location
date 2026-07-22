using SosLocation.GeoProcessing.Seismic;
using Xunit;

namespace SosLocation.UnitTests;

public class WaveRasterColorizerTests
{
    [Fact]
    public void ColorScale_IsStableAndClampsToOneG()
    {
        Assert.Equal((byte)0, WaveRasterColorizer.ColorizeAccelerationG(0).R);
        Assert.Equal(
            WaveRasterColorizer.ColorizeAccelerationG(1),
            WaveRasterColorizer.ColorizeAccelerationG(4));
        Assert.NotEqual(
            WaveRasterColorizer.ColorizeAccelerationG(0.02),
            WaveRasterColorizer.ColorizeAccelerationG(0.4));
    }
}
