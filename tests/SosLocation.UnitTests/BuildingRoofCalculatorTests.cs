using SosLocation.Domain.Reconstruction;
using Xunit;

namespace SosLocation.UnitTests;

public class BuildingRoofCalculatorTests
{
    private static readonly ReconstructionProfile Profile = ReconstructionProfile.OsmBasicV1;

    [Fact]
    public void ExplicitNonFlatShape_GetsCapped()
    {
        var result = BuildingRoofCalculator.Calculate(
            new RoofInput("hipped", null, "commercial", 9.0), Profile);

        Assert.True(result.RoofHeightMeters > 0);
        Assert.Equal("roof:shape", result.Basis);
    }

    [Fact]
    public void ExplicitFlatShape_IsNeverCapped_EvenForResidential()
    {
        var result = BuildingRoofCalculator.Calculate(
            new RoofInput("flat", 2, "residential", 12.0), Profile);

        Assert.Equal(0, result.RoofHeightMeters);
        Assert.Equal("roof:shape=flat", result.Basis);
    }

    [Fact]
    public void NoShapeTag_ResidentialDefaultsToCapped()
    {
        var result = BuildingRoofCalculator.Calculate(
            new RoofInput(null, null, "residential", 9.0), Profile);

        Assert.True(result.RoofHeightMeters > 0);
        Assert.Equal("building:type-default", result.Basis);
    }

    [Fact]
    public void NoShapeTag_CommercialDefaultsToFlat()
    {
        var result = BuildingRoofCalculator.Calculate(
            new RoofInput(null, null, "commercial", 9.0), Profile);

        Assert.Equal(0, result.RoofHeightMeters);
        Assert.Equal("default-flat", result.Basis);
    }

    [Fact]
    public void RoofLevels_MultiplyByProfileRoofLevelHeight()
    {
        var result = BuildingRoofCalculator.Calculate(
            new RoofInput("hipped", 2, "residential", 20.0), Profile);

        // 2 × 2.0 (DefaultRoofLevelHeightMeters)
        Assert.Equal(4.0, result.RoofHeightMeters);
    }

    [Fact]
    public void NoRoofLevels_UsesOneDefaultLevel()
    {
        var result = BuildingRoofCalculator.Calculate(
            new RoofInput("hipped", null, "residential", 20.0), Profile);

        Assert.Equal(Profile.DefaultRoofLevelHeightMeters, result.RoofHeightMeters);
    }

    [Fact]
    public void RoofHeight_NeverExceedsHalfOfBuildingHeight()
    {
        // roof:levels=10 × 2.0 = 20.0, mas o prédio só tem 5.0m de altura total.
        var result = BuildingRoofCalculator.Calculate(
            new RoofInput("hipped", 10, "residential", 5.0), Profile);

        Assert.Equal(2.5, result.RoofHeightMeters);
    }

    [Fact]
    public void CustomProfile_ValuesAreNotHardcoded()
    {
        var custom = new ReconstructionProfile
        {
            Name = "test-profile",
            DefaultRoofLevelHeightMeters = 1.5,
        };

        var result = BuildingRoofCalculator.Calculate(
            new RoofInput("pyramidal", 2, "residential", 20.0), custom);

        Assert.Equal(3.0, result.RoofHeightMeters); // 2 × 1.5
    }

    [Fact]
    public void JapanProfile_HouseAndApartmentUseDifferentDefaultRoofs()
    {
        var house = BuildingRoofCalculator.Calculate(
            new RoofInput(null, null, "residential", 7.4, "house"),
            ReconstructionProfile.OsmJapanUrbanV2);
        var apartment = BuildingRoofCalculator.Calculate(
            new RoofInput(null, null, "residential", 14.5, "apartment"),
            ReconstructionProfile.OsmJapanUrbanV2);

        Assert.Equal("hipped", house.RoofShape);
        Assert.True(house.RoofHeightMeters > 0);
        Assert.Equal("flat", apartment.RoofShape);
        Assert.Equal(0, apartment.RoofHeightMeters);
    }

    [Fact]
    public void ExplicitRoofHeight_TakesPrecedence()
    {
        var result = BuildingRoofCalculator.Calculate(
            new RoofInput("gabled", null, "residential", 12, "house", 3.5),
            ReconstructionProfile.OsmJapanUrbanV2);

        Assert.Equal(3.5, result.RoofHeightMeters);
        Assert.Equal("roof:height", result.Basis);
    }
}
