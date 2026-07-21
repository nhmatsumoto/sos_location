using SosLocation.Domain.Disasters;
using Xunit;

namespace SosLocation.UnitTests;

public class DamageStateClassifierTests
{
    [Fact]
    public void FromPeakDriftRatio_Zero_ReturnsNone()
    {
        Assert.Equal(DamageState.None, DamageStateClassifier.FromPeakDriftRatio(0.0));
    }

    [Fact]
    public void FromPeakDriftRatio_LargeValue_ReturnsComplete()
    {
        Assert.Equal(DamageState.Complete, DamageStateClassifier.FromPeakDriftRatio(10.0));
    }

    [Theory]
    [InlineData(0.0039)]
    [InlineData(0.001)]
    public void FromPeakDriftRatio_BelowSlightThreshold_ReturnsNone(double peakDriftRatio)
    {
        Assert.Equal(DamageState.None, DamageStateClassifier.FromPeakDriftRatio(peakDriftRatio));
    }

    [Theory]
    [InlineData(0.004)]
    [InlineData(0.0099)]
    public void FromPeakDriftRatio_AtOrAboveSlightThreshold_BelowModerate_ReturnsSlight(double peakDriftRatio)
    {
        Assert.Equal(DamageState.Slight, DamageStateClassifier.FromPeakDriftRatio(peakDriftRatio));
    }

    [Theory]
    [InlineData(0.01)]
    [InlineData(0.0199)]
    public void FromPeakDriftRatio_AtOrAboveModerateThreshold_BelowExtensive_ReturnsModerate(double peakDriftRatio)
    {
        Assert.Equal(DamageState.Moderate, DamageStateClassifier.FromPeakDriftRatio(peakDriftRatio));
    }

    [Theory]
    [InlineData(0.02)]
    [InlineData(0.0399)]
    public void FromPeakDriftRatio_AtOrAboveExtensiveThreshold_BelowComplete_ReturnsExtensive(double peakDriftRatio)
    {
        Assert.Equal(DamageState.Extensive, DamageStateClassifier.FromPeakDriftRatio(peakDriftRatio));
    }

    [Theory]
    [InlineData(0.04)]
    [InlineData(0.05)]
    public void FromPeakDriftRatio_AtOrAboveCompleteThreshold_ReturnsComplete(double peakDriftRatio)
    {
        Assert.Equal(DamageState.Complete, DamageStateClassifier.FromPeakDriftRatio(peakDriftRatio));
    }
}
