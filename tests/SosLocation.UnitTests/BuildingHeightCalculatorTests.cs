using SosLocation.Domain.Features;
using SosLocation.Domain.Reconstruction;
using Xunit;

namespace SosLocation.UnitTests;

public class BuildingHeightCalculatorTests
{
    private static readonly ReconstructionProfile Profile = ReconstructionProfile.OsmBasicV1;

    [Fact]
    public void ExplicitHeight_TakesPrecedence_AndIsObserved()
    {
        var result = BuildingHeightCalculator.Calculate(
            new HeightInput(25.5, 3, 1, "residential", null), Profile);

        Assert.Equal(25.5, result.HeightMeters);
        Assert.Equal(HeightSource.Observed, result.Source);
        Assert.Equal(1.0, result.Confidence.Value);
    }

    [Fact]
    public void BuildingLevels_UseProfileHeights_IncludingRoofLevels()
    {
        var result = BuildingHeightCalculator.Calculate(
            new HeightInput(null, 4, 1, null, null), Profile);

        // 4 × 3.0 + 1 × 2.0 = 14.0
        Assert.Equal(14.0, result.HeightMeters);
        Assert.Equal(HeightSource.Inferred, result.Source);
        Assert.True(result.Confidence.Value < 1.0);
    }

    [Fact]
    public void RoofLevelsAlone_AddToDefaultHeight()
    {
        var result = BuildingHeightCalculator.Calculate(
            new HeightInput(null, null, 2, null, null), Profile);

        // 9.0 + 2 × 2.0 = 13.0
        Assert.Equal(13.0, result.HeightMeters);
        Assert.Equal(HeightSource.Inferred, result.Source);
    }

    [Fact]
    public void BuildingType_FallsBackToConfiguredValue()
    {
        var result = BuildingHeightCalculator.Calculate(
            new HeightInput(null, null, null, "hospital", null), Profile);

        Assert.Equal(18.0, result.HeightMeters);
        Assert.Equal("building:type", result.Basis);
    }

    [Fact]
    public void LandUse_FallsBackWhenTypeUnknown()
    {
        var result = BuildingHeightCalculator.Calculate(
            new HeightInput(null, null, null, "not-in-profile", "industrial"), Profile);

        Assert.Equal(8.0, result.HeightMeters);
        Assert.Equal("land-use", result.Basis);
    }

    [Fact]
    public void NoData_UsesProfileDefault_WithLowConfidence()
    {
        var result = BuildingHeightCalculator.Calculate(
            new HeightInput(null, null, null, null, null), Profile);

        Assert.Equal(9.0, result.HeightMeters);
        Assert.Equal(HeightSource.Inferred, result.Source);
        Assert.True(result.Confidence.Value <= 0.3);
    }

    [Fact]
    public void ZeroOrNegativeExplicitHeight_IsIgnored()
    {
        var result = BuildingHeightCalculator.Calculate(
            new HeightInput(0, 2, null, null, null), Profile);

        Assert.Equal(6.0, result.HeightMeters);
        Assert.Equal(HeightSource.Inferred, result.Source);
    }

    [Fact]
    public void CustomProfile_ValuesAreNotHardcoded()
    {
        var custom = new ReconstructionProfile
        {
            Name = "test-profile",
            DefaultLevelHeightMeters = 4.0,
            DefaultRoofLevelHeightMeters = 1.0,
            DefaultBuildingHeightMeters = 5.0,
        };

        var levels = BuildingHeightCalculator.Calculate(new HeightInput(null, 2, 1, null, null), custom);
        Assert.Equal(9.0, levels.HeightMeters); // 2×4 + 1×1

        var fallback = BuildingHeightCalculator.Calculate(new HeightInput(null, null, null, null, null), custom);
        Assert.Equal(5.0, fallback.HeightMeters);
    }
}
