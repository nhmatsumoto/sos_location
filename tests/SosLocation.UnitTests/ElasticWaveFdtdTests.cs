using SosLocation.GeoProcessing.Seismic;
using Xunit;

namespace SosLocation.UnitTests;

public class ElasticWaveFdtdTests
{
    [Fact]
    public void TimeStep_SatisfiesCflCondition()
    {
        const int cols = 21, rows = 21;
        const double dx = 25.0, vs = 300.0, courant = 0.5;
        var field = new double[cols * rows];
        Array.Fill(field, vs);

        var solver = new ElasticWaveFdtd(cols, rows, dx, field, courant);

        var expectedDt = courant * dx / (vs * Math.Sqrt(2.0));
        Assert.Equal(expectedDt, solver.TimeStepSeconds, 9);
    }

    [Fact]
    public void WavefrontPropagates_AtExpectedShearVelocity()
    {
        const int cols = 81, rows = 81;
        const double dx = 25.0, vs = 300.0, courant = 0.5;
        const int centerCol = cols / 2, centerRow = rows / 2;

        var field = new double[cols * rows];
        Array.Fill(field, vs);
        var solver = new ElasticWaveFdtd(cols, rows, dx, field, courant, spongeWidthCells: 12);

        // Pulso gaussiano inicial (largura finita evita o espectro de alta
        // frequência de um impulso de célula única, reduzindo dispersão numérica).
        const double sigmaCells = 2.0;
        for (var row = 0; row < rows; row++)
        {
            for (var col = 0; col < cols; col++)
            {
                var dc = col - centerCol;
                var dr = row - centerRow;
                var value = Math.Exp(-(dc * dc + dr * dr) / (2.0 * sigmaCells * sigmaCells));
                solver.SetDisplacement(col, row, value);
            }
        }

        const int steps = 60;
        for (var i = 0; i < steps; i++)
        {
            solver.Step(sourceCol: -1, sourceRow: -1, sourceForcing: 0.0); // sem fonte: só propagação livre
        }

        var expectedRadiusMeters = vs * solver.ElapsedSeconds;

        // Frente de onda: maior distância do centro onde o deslocamento ainda é
        // mensurável (causalidade — além da frente, o campo deve permanecer ~0).
        const double amplitudeThreshold = 1.0e-4;
        var maxDisturbedRadius = 0.0;
        var anyNaNOrInfinite = false;
        for (var row = 0; row < rows; row++)
        {
            for (var col = 0; col < cols; col++)
            {
                var u = solver.GetDisplacement(col, row);
                if (double.IsNaN(u) || double.IsInfinity(u)) anyNaNOrInfinite = true;

                if (Math.Abs(u) > amplitudeThreshold)
                {
                    var dc = col - centerCol;
                    var dr = row - centerRow;
                    var radius = Math.Sqrt(dc * dc + dr * dr) * dx;
                    if (radius > maxDisturbedRadius) maxDisturbedRadius = radius;
                }
            }
        }

        Assert.False(anyNaNOrInfinite, "Wavefield became NaN/Infinite — numerical instability.");
        Assert.InRange(maxDisturbedRadius, expectedRadiusMeters * 0.5, expectedRadiusMeters * 1.5);
    }

    [Fact]
    public void FreePropagation_RemainsBoundedNoBlowUp()
    {
        const int cols = 41, rows = 41;
        const double dx = 30.0, courant = 0.5;
        var field = new double[cols * rows];
        // Campo heterogêneo (varia com a posição) — exercita o caso realista, não só meio uniforme.
        for (var row = 0; row < rows; row++)
        {
            for (var col = 0; col < cols; col++)
            {
                field[row * cols + col] = 200.0 + 10.0 * col;
            }
        }

        var solver = new ElasticWaveFdtd(cols, rows, dx, field, courant, spongeWidthCells: 10);
        solver.SetDisplacement(cols / 2, rows / 2, 1.0);

        double maxAbs = 0;
        for (var i = 0; i < 300; i++)
        {
            solver.Step(-1, -1, 0.0);
            for (var row = 0; row < rows; row++)
            {
                for (var col = 0; col < cols; col++)
                {
                    var u = Math.Abs(solver.GetDisplacement(col, row));
                    Assert.False(double.IsNaN(u) || double.IsInfinity(u), $"Blew up at step {i}.");
                    if (u > maxAbs) maxAbs = u;
                }
            }
        }

        // Sem fonte contínua e com fronteira absorvente, a amplitude não deve
        // crescer acima da condição inicial (conservação/dissipação, não geração de energia).
        Assert.True(maxAbs <= 1.01, $"Energy grew unexpectedly: max |u| = {maxAbs}");
    }
}
