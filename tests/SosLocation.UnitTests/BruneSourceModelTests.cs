using SosLocation.GeoProcessing.Seismic;
using Xunit;

namespace SosLocation.UnitTests;

public class BruneSourceModelTests
{
    [Fact]
    public void SeismicMoment_M6_MatchesPublishedOrderOfMagnitude()
    {
        // M0 real para M6.0 ~ 1.1-1.3e18 N.m (Kanamori, 1977).
        var m0 = BruneSourceModel.SeismicMomentNewtonMeters(6.0);
        Assert.InRange(m0, 1.0e18, 1.5e18);
    }

    [Fact]
    public void SeismicMoment_IncreasesWithMagnitude()
    {
        var m6 = BruneSourceModel.SeismicMomentNewtonMeters(6.0);
        var m7 = BruneSourceModel.SeismicMomentNewtonMeters(7.0);
        var m8 = BruneSourceModel.SeismicMomentNewtonMeters(8.0);
        Assert.True(m7 > m6);
        Assert.True(m8 > m7);
        // Cada unidade de magnitude ~ 31.6x mais momento (10^1.5).
        Assert.InRange(m7 / m6, 25.0, 40.0);
    }

    [Fact]
    public void CornerFrequency_DecreasesWithMagnitude()
    {
        var fc6 = BruneSourceModel.CornerFrequencyHz(6.0);
        var fc7 = BruneSourceModel.CornerFrequencyHz(7.0);
        var fc8 = BruneSourceModel.CornerFrequencyHz(8.0);
        Assert.True(fc7 < fc6, "Eventos maiores rompem área maior e têm frequência de canto menor.");
        Assert.True(fc8 < fc7);
    }

    [Fact]
    public void SourceTimeFunction_IsZeroBeforeArrival()
    {
        Assert.Equal(0.0, BruneSourceModel.SourceTimeFunction(-1.0, 6.0));
        Assert.Equal(0.0, BruneSourceModel.SourceTimeFunction(0.0, 6.0));
    }

    [Fact]
    public void SourceTimeFunction_IsPositiveAfterArrival()
    {
        var fc = BruneSourceModel.CornerFrequencyHz(6.0);
        var value = BruneSourceModel.SourceTimeFunction(1.0 / fc, 6.0);
        Assert.True(value > 0);
    }

    [Fact]
    public void HypocentralDistance_PythagoreanTriangle()
    {
        var distance = BruneSourceModel.HypocentralDistanceMeters(horizontalDistanceMeters: 3000, depthMeters: 4000);
        Assert.Equal(5000.0, distance, 6);
    }

    [Fact]
    public void MoveoutSeconds_IsDistanceOverVelocity()
    {
        var moveout = BruneSourceModel.MoveoutSeconds(hypocentralDistanceMeters: 5000, shearVelocityMps: 1000);
        Assert.Equal(5.0, moveout, 6);
    }

    [Fact]
    public void GeometricSpreadingCorrection_IsOneAtReferenceDistance()
    {
        var correction = BruneSourceModel.GeometricSpreadingCorrection(1000, referenceDistanceMeters: 1000);
        Assert.Equal(1.0, correction, 6);
    }

    [Fact]
    public void GeometricSpreadingCorrection_DecreasesWithDistance()
    {
        var correction = BruneSourceModel.GeometricSpreadingCorrection(4000, referenceDistanceMeters: 1000);
        Assert.Equal(0.5, correction, 6); // sqrt(1000/4000) = 0.5
    }
}
