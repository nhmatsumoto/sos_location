namespace SosLocation.GeoProcessing.Seismic;

/// <summary>
/// Estima Vs30 (velocidade de cisalhamento média nos 30m superiores) a partir
/// da inclinação topográfica local — método Wald &amp; Allen (2007, BSSA),
/// usado pelo próprio USGS ShakeMap quando não há sondagem geotécnica.
/// Breakpoints representativos da tabela publicada para regiões tectonicamente
/// ativas (aplicável ao Japão).
/// </summary>
public static class SiteVs30Estimator
{
    private static readonly (double MaxSlope, double Vs30Mps)[] ActiveTectonicBreakpoints =
    [
        (1.0e-4, 180.0),
        (2.2e-3, 240.0),
        (6.3e-3, 300.0),
        (1.8e-2, 360.0),
        (5.0e-2, 490.0),
        (1.0e-1, 620.0),
        (double.PositiveInfinity, 760.0),
    ];

    public static double Vs30FromSlope(double slope)
    {
        var absSlope = Math.Abs(slope);
        foreach (var (maxSlope, vs30) in ActiveTectonicBreakpoints)
        {
            if (absSlope <= maxSlope) return vs30;
        }
        return ActiveTectonicBreakpoints[^1].Vs30Mps;
    }

    /// <summary>
    /// Campo de Vs (m/s) por célula da malha, a partir do campo de elevação
    /// (mesma dimensão/ordem de <paramref name="elevationMeters"/>) e do slope
    /// local (diferenças centrais), limitado a [minVs, maxVs].
    /// </summary>
    public static double[] BuildShearVelocityField(
        double[] elevationMeters, SeismicGrid grid, double minVs, double maxVs)
    {
        var vs = new double[elevationMeters.Length];
        for (var row = 0; row < grid.Rows; row++)
        {
            for (var col = 0; col < grid.Cols; col++)
            {
                var slope = LocalSlope(elevationMeters, grid, col, row);
                var vs30 = Vs30FromSlope(slope);
                vs[grid.Index(col, row)] = Math.Clamp(vs30, minVs, maxVs);
            }
        }
        return vs;
    }

    private static double LocalSlope(double[] elevation, SeismicGrid grid, int col, int row)
    {
        var left = elevation[grid.Index(Math.Max(col - 1, 0), row)];
        var right = elevation[grid.Index(Math.Min(col + 1, grid.Cols - 1), row)];
        var down = elevation[grid.Index(col, Math.Max(row - 1, 0))];
        var up = elevation[grid.Index(col, Math.Min(row + 1, grid.Rows - 1))];
        var dzdx = (right - left) / (2.0 * grid.SpacingMeters);
        var dzdy = (up - down) / (2.0 * grid.SpacingMeters);
        return Math.Sqrt(dzdx * dzdx + dzdy * dzdy);
    }
}
