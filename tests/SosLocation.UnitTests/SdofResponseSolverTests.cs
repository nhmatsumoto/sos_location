using SosLocation.GeoProcessing.Seismic;
using Xunit;

namespace SosLocation.UnitTests;

public class SdofResponseSolverTests
{
    [Fact]
    public void EstimatePeriodSeconds_IncreasesWithHeight()
    {
        var t10 = SdofResponseSolver.EstimatePeriodSeconds(10);
        var t50 = SdofResponseSolver.EstimatePeriodSeconds(50);
        var t100 = SdofResponseSolver.EstimatePeriodSeconds(100);
        Assert.True(t10 < t50);
        Assert.True(t50 < t100);
    }

    [Fact]
    public void Integrate_EmptyInput_ReturnsZero()
    {
        var result = SdofResponseSolver.Integrate(Array.Empty<double>(), 0.01, 1.0);
        Assert.Equal(0, result.PeakRelativeDisplacementMeters);
        Assert.Equal(0, result.PeakAbsoluteAccelerationMps2);
    }

    [Fact]
    public void Integrate_NoExcitation_StaysAtRest()
    {
        var ground = new double[500]; // tudo zero
        var result = SdofResponseSolver.Integrate(ground, dtSeconds: 0.01, periodSeconds: 1.0);
        Assert.Equal(0.0, result.PeakRelativeDisplacementMeters, 9);
    }

    [Fact]
    public void FreeVibration_DecaysAtTheoreticalLogarithmicDecrement()
    {
        const double period = 1.0;
        const double dampingRatio = 0.05;
        const double dt = 0.001;
        const int steps = 6000; // 6 segundos, 6 ciclos

        // Pulso curto no primeiro passo (kick), depois zero: excita vibração livre.
        var ground = new double[steps];
        ground[0] = -50.0;

        var history = new double[steps];
        SdofResponseSolver.Integrate(ground, dt, period, dampingRatio,
            onStep: (i, x) => history[i] = x);

        var peaks = new List<double>();
        for (var i = 1; i < history.Length - 1; i++)
        {
            if (Math.Abs(history[i]) > Math.Abs(history[i - 1]) && Math.Abs(history[i]) >= Math.Abs(history[i + 1]))
            {
                peaks.Add(Math.Abs(history[i]));
            }
        }

        Assert.True(peaks.Count >= 4, $"Expected several oscillation peaks, found {peaks.Count}.");

        // Decremento logarítmico teórico por ciclo completo: exp(-2*pi*zeta/sqrt(1-zeta^2)).
        var theoreticalRatio = Math.Exp(-2.0 * Math.PI * dampingRatio / Math.Sqrt(1 - dampingRatio * dampingRatio));

        // Picos consecutivos (meio-ciclo) devem seguir a raiz do decremento por ciclo completo.
        var theoreticalHalfCycleRatio = Math.Sqrt(theoreticalRatio);

        for (var i = 1; i < Math.Min(peaks.Count, 5); i++)
        {
            var ratio = peaks[i] / peaks[i - 1];
            Assert.InRange(ratio, theoreticalHalfCycleRatio * 0.7, theoreticalHalfCycleRatio * 1.3);
        }
    }

    [Fact]
    public void RigidVeryShortPeriod_TracksGroundAccelerationClosely()
    {
        // Um oscilador extremamente rígido (T -> 0) deve responder quase
        // estaticamente: aceleração absoluta de pico ~ aceleração do solo de pico.
        const double dt = 0.001;
        var ground = new double[2000];
        for (var i = 0; i < ground.Length; i++)
        {
            ground[i] = 2.0 * Math.Sin(2.0 * Math.PI * 0.5 * i * dt); // 0.5 Hz, amplitude 2 m/s^2
        }

        var result = SdofResponseSolver.Integrate(ground, dt, periodSeconds: 0.01, dampingRatio: 0.05);

        Assert.InRange(result.PeakAbsoluteAccelerationMps2, 1.8, 2.4);
    }
}
