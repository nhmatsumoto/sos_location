using SosLocation.Domain.ValueObjects;
using SosLocation.GeoProcessing.Seismic;
using Xunit;

namespace SosLocation.UnitTests;

public class SiteVs30EstimatorTests
{
    [Fact]
    public void Vs30FromSlope_FlatGround_ReturnsLowestBreakpoint()
    {
        Assert.Equal(180.0, SiteVs30Estimator.Vs30FromSlope(0.0));
    }

    [Fact]
    public void Vs30FromSlope_VerySteep_ReturnsHighestBreakpoint()
    {
        Assert.Equal(760.0, SiteVs30Estimator.Vs30FromSlope(1.0));
    }

    [Fact]
    public void Vs30FromSlope_IsMonotonicNonDecreasing()
    {
        var slopes = new[] { 0.0, 5.0e-4, 3.0e-3, 1.0e-2, 3.0e-2, 7.0e-2, 0.5 };
        var previous = 0.0;
        foreach (var slope in slopes)
        {
            var vs30 = SiteVs30Estimator.Vs30FromSlope(slope);
            Assert.True(vs30 >= previous, $"Vs30({slope}) = {vs30} should be >= previous {previous}");
            previous = vs30;
        }
    }

    [Fact]
    public void BuildShearVelocityField_FlatElevation_YieldsUniformLowestVs()
    {
        var area = new BoundingBox(139.70, 35.68, 139.71, 35.69);
        var grid = new SeismicGrid(area, spacingMeters: 100);
        var flatElevation = new double[grid.CellCount]; // tudo zero => slope zero em todo lugar

        var vsField = SiteVs30Estimator.BuildShearVelocityField(flatElevation, grid, minVs: 150, maxVs: 1500);

        Assert.All(vsField, vs => Assert.Equal(180.0, vs));
    }

    [Fact]
    public void BuildShearVelocityField_ClampsToConfiguredRange()
    {
        var area = new BoundingBox(139.70, 35.68, 139.71, 35.69);
        var grid = new SeismicGrid(area, spacingMeters: 50);
        var flatElevation = new double[grid.CellCount];

        // minVs acima do breakpoint mais baixo (180) força o clamp.
        var vsField = SiteVs30Estimator.BuildShearVelocityField(flatElevation, grid, minVs: 300, maxVs: 1500);

        Assert.All(vsField, vs => Assert.Equal(300.0, vs));
    }

    [Fact]
    public void BuildShearVelocityField_LinearSlope_DoesNotHalveSlopeAtEdges()
    {
        var area = new BoundingBox(139.70, 35.68, 139.71, 35.69);
        var grid = new SeismicGrid(area, spacingMeters: 100);
        var elevation = new double[grid.CellCount];
        for (var row = 0; row < grid.Rows; row++)
            for (var col = 0; col < grid.Cols; col++)
                elevation[grid.Index(col, row)] = col * 0.3; // slope constante = 0,003

        var vsField = SiteVs30Estimator.BuildShearVelocityField(elevation, grid, minVs: 150, maxVs: 1500);

        Assert.All(vsField, vs => Assert.Equal(300.0, vs));
    }
}
