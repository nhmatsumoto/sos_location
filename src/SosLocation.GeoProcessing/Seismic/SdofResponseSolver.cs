namespace SosLocation.GeoProcessing.Seismic;

/// <summary>Resultado da integração de um oscilador SDOF sob um acelerograma.</summary>
public readonly record struct SdofResult(
    double PeakRelativeDisplacementMeters,
    double PeakAbsoluteAccelerationMps2,
    double NaturalFrequencyRadPerSec);

/// <summary>
/// Integração da resposta de um oscilador de 1 grau de liberdade (SDOF, massa
/// unitária) sob excitação de base, via método de Newmark-β (aceleração média
/// constante, γ=1/2, β=1/4 — incondicionalmente estável). Usado para simular a
/// resposta estrutural real de cada edifício ao acelerograma extraído do campo
/// de onda simulado, em vez de consultar uma curva de fragilidade tabelada.
/// </summary>
public static class SdofResponseSolver
{
    private const double Beta = 0.25;
    private const double Gamma = 0.5;

    /// <summary>Período natural estimado (s) por altura do edifício — fórmula estrutural empírica padrão T ≈ 0.05·H^0.75.</summary>
    public static double EstimatePeriodSeconds(double heightMeters)
        => 0.05 * Math.Pow(Math.Max(heightMeters, 0.1), 0.75);

    /// <param name="onStep">
    /// Callback opcional invocado a cada passo com (índice, deslocamento relativo) —
    /// usado para observar a série temporal completa (ex.: verificação de
    /// decaimento em vibração livre), sem obrigar a API principal a alocar/
    /// retornar o histórico completo quando ele não é necessário.
    /// </param>
    public static SdofResult Integrate(
        IReadOnlyList<double> groundAccelerationMps2, double dtSeconds, double periodSeconds,
        double dampingRatio = 0.05, Action<int, double>? onStep = null)
    {
        var n = groundAccelerationMps2.Count;
        if (n == 0) return new SdofResult(0, 0, 0);

        var omegaN = 2.0 * Math.PI / Math.Max(periodSeconds, 1e-3);
        var k = omegaN * omegaN;
        var c = 2.0 * dampingRatio * omegaN;
        var dt = dtSeconds;

        var a1 = 1.0 / (Beta * dt * dt) + Gamma * c / (Beta * dt);
        var a2 = 1.0 / (Beta * dt) + (Gamma / Beta) * c;
        var a3 = 1.0 / (2.0 * Beta) + dt * (Gamma / (2.0 * Beta) - 1.0) * c;
        var kHat = k + a1;

        double x = 0, v = 0;
        var a = -groundAccelerationMps2[0]; // a0 = (p0 - c v0 - k x0)/m, com p0 = -m*ag0, x0=v0=0
        var peakDisplacement = Math.Abs(x);
        var peakAbsAcceleration = Math.Abs(a + groundAccelerationMps2[0]);
        onStep?.Invoke(0, x);

        for (var i = 1; i < n; i++)
        {
            var deltaP = -(groundAccelerationMps2[i] - groundAccelerationMps2[i - 1]);
            var deltaPHat = deltaP + a2 * v + a3 * a;
            var deltaX = deltaPHat / kHat;
            var deltaV = (Gamma / (Beta * dt)) * deltaX - (Gamma / Beta) * v + dt * (1.0 - Gamma / (2.0 * Beta)) * a;
            var deltaA = deltaX / (Beta * dt * dt) - v / (Beta * dt) - a / (2.0 * Beta);

            x += deltaX;
            v += deltaV;
            a += deltaA;

            peakDisplacement = Math.Max(peakDisplacement, Math.Abs(x));
            var absAcceleration = a + groundAccelerationMps2[i];
            peakAbsAcceleration = Math.Max(peakAbsAcceleration, Math.Abs(absAcceleration));
            onStep?.Invoke(i, x);
        }

        return new SdofResult(peakDisplacement, peakAbsAcceleration, omegaN);
    }
}

/// <summary>
/// Mesma recorrência de Newmark-β de <see cref="SdofResponseSolver.Integrate"/>,
/// mas amostra a amostra (a cada passo só depende do estado anterior + o
/// próximo valor de aceleração do solo) — permite integrar simultaneamente a
/// resposta de muitos edifícios durante um loop de propagação de onda sem
/// materializar o acelerograma completo de cada um em memória (O(edifícios)
/// em vez de O(edifícios×passos)).
/// </summary>
public sealed class SdofOnlineIntegrator
{
    private const double Beta = 0.25;
    private const double Gamma = 0.5;

    private readonly double _dt;
    private readonly double _omegaN;
    private readonly double _kHat;
    private readonly double _a2;
    private readonly double _a3;

    private bool _started;
    private double _x, _v, _a, _prevGroundAccel;
    private double _peakDisplacement;
    private double _peakAbsAcceleration;

    public SdofOnlineIntegrator(double dtSeconds, double periodSeconds, double dampingRatio = 0.05)
    {
        _dt = dtSeconds;
        _omegaN = 2.0 * Math.PI / Math.Max(periodSeconds, 1e-3);
        var k = _omegaN * _omegaN;
        var c = 2.0 * dampingRatio * _omegaN;
        var a1 = 1.0 / (Beta * _dt * _dt) + Gamma * c / (Beta * _dt);
        _a2 = 1.0 / (Beta * _dt) + (Gamma / Beta) * c;
        _a3 = 1.0 / (2.0 * Beta) + _dt * (Gamma / (2.0 * Beta) - 1.0) * c;
        _kHat = k + a1;
    }

    public void AddSample(double groundAccelerationMps2)
    {
        if (!_started)
        {
            _started = true;
            _a = -groundAccelerationMps2;
            _peakDisplacement = 0.0;
            _peakAbsAcceleration = Math.Abs(_a + groundAccelerationMps2);
            _prevGroundAccel = groundAccelerationMps2;
            return;
        }

        var deltaP = -(groundAccelerationMps2 - _prevGroundAccel);
        var deltaPHat = deltaP + _a2 * _v + _a3 * _a;
        var deltaX = deltaPHat / _kHat;
        var deltaV = (Gamma / (Beta * _dt)) * deltaX - (Gamma / Beta) * _v + _dt * (1.0 - Gamma / (2.0 * Beta)) * _a;
        var deltaA = deltaX / (Beta * _dt * _dt) - _v / (Beta * _dt) - _a / (2.0 * Beta);

        _x += deltaX;
        _v += deltaV;
        _a += deltaA;

        _peakDisplacement = Math.Max(_peakDisplacement, Math.Abs(_x));
        var absAcceleration = _a + groundAccelerationMps2;
        _peakAbsAcceleration = Math.Max(_peakAbsAcceleration, Math.Abs(absAcceleration));
        _prevGroundAccel = groundAccelerationMps2;
    }

    public SdofResult Result => new(_peakDisplacement, _peakAbsAcceleration, _omegaN);
}
