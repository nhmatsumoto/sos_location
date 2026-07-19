using SosLocation.Domain.ValueObjects;
using Xunit;

namespace SosLocation.UnitTests;

public class BoundingBoxTests
{
    [Fact]
    public void ValidBox_ComputesApproximateArea()
    {
        // ~0.9 km × ~1.1 km perto de Komaki.
        var box = new BoundingBox(136.90, 35.28, 136.91, 35.29);
        Assert.InRange(box.AreaKm2, 0.5, 2.0);
    }

    [Fact]
    public void Center_IsMidpoint()
    {
        var box = new BoundingBox(10, 20, 12, 24);
        Assert.Equal((11.0, 22.0), box.Center);
    }

    [Theory]
    [InlineData(-200, 0, 10, 10)]   // west fora do intervalo
    [InlineData(0, -100, 10, 10)]   // south fora do intervalo
    [InlineData(10, 0, 5, 10)]      // west >= east
    [InlineData(0, 10, 10, 5)]      // south >= north
    [InlineData(170, 0, -170, 10)]  // cruzando o antimeridiano (não suportado)
    public void InvalidBox_Throws(double west, double south, double east, double north)
    {
        Assert.Throws<ArgumentException>(() => new BoundingBox(west, south, east, north));
    }

    [Fact]
    public void NaN_Throws()
    {
        Assert.Throws<ArgumentException>(() => new BoundingBox(double.NaN, 0, 10, 10));
    }

    [Fact]
    public void DataConfidence_RejectsOutOfRange()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => DataConfidence.From(1.5));
        Assert.Throws<ArgumentOutOfRangeException>(() => DataConfidence.From(-0.1));
        Assert.Equal(0.7, DataConfidence.From(0.7).Value);
    }
}
