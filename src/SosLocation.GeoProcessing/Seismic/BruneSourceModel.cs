namespace SosLocation.GeoProcessing.Seismic;

/// <summary>
/// Fonte sísmica pontual (modelo de Brune, 1970/1971): converte magnitude de
/// momento em momento sísmico escalar e função-fonte no tempo, e fornece a
/// correção analítica de profundidade/espalhamento geométrico usada para
/// injetar um hipocentro 3D (com profundidade) numa malha 2D em planta
/// ("técnica 2.5D" — a propagação lateral real é resolvida pela equação de
/// onda; só o decaimento geométrico com a distância hipocentral é corrigido
/// analiticamente).
/// </summary>
public static class BruneSourceModel
{
    private const double AssumedStressDropBars = 30.0;
    private const double AssumedSourceShearVelocityKmPerSec = 3.5;

    /// <summary>Momento sísmico escalar (N·m) a partir da magnitude de momento (Kanamori, 1977).</summary>
    public static double SeismicMomentNewtonMeters(double momentMagnitude)
        => Math.Pow(10.0, 1.5 * momentMagnitude + 9.1);

    /// <summary>Frequência de canto de Brune (Hz).</summary>
    public static double CornerFrequencyHz(double momentMagnitude)
    {
        var m0DyneCm = SeismicMomentNewtonMeters(momentMagnitude) * 1.0e7;
        return 4.9e6 * AssumedSourceShearVelocityKmPerSec * Math.Cbrt(AssumedStressDropBars / m0DyneCm);
    }

    /// <summary>
    /// Função-fonte no tempo (pulso de Brune): taxa de deslizamento
    /// proporcional a t·exp(-ωc·t), escalada pelo momento sísmico. Retorna a
    /// taxa de momento (N·m/s) no instante <paramref name="timeSeconds"/>
    /// desde a chegada da onda naquele ponto.
    /// </summary>
    public static double SourceTimeFunction(double timeSeconds, double momentMagnitude)
    {
        if (timeSeconds < 0) return 0.0;
        var omegaC = 2.0 * Math.PI * CornerFrequencyHz(momentMagnitude);
        var m0 = SeismicMomentNewtonMeters(momentMagnitude);
        return m0 * omegaC * omegaC * timeSeconds * Math.Exp(-omegaC * timeSeconds);
    }

    /// <summary>Distância hipocentral real (m), incluindo profundidade.</summary>
    public static double HypocentralDistanceMeters(double horizontalDistanceMeters, double depthMeters)
        => Math.Sqrt(horizontalDistanceMeters * horizontalDistanceMeters + depthMeters * depthMeters);

    /// <summary>Atraso de chegada (moveout, s) da onda até a distância hipocentral dada.</summary>
    public static double MoveoutSeconds(double hypocentralDistanceMeters, double shearVelocityMps)
        => hypocentralDistanceMeters / Math.Max(shearVelocityMps, 1.0);

    /// <summary>
    /// Fator de correção a aplicar sobre o movimento do solo EXTRAÍDO do campo
    /// simulado (não sobre a injeção da fonte): a equação de onda 2D em planta
    /// espalha energia como 1/√r (cilíndrico), enquanto a física real é 1/r
    /// (esférico, 3D). Multiplicar a amplitude extraída à distância hipocentral
    /// r por √(r0/r) converte o decaimento nativo 1/√r do solver 2D no
    /// decaimento físico 1/r correto, mantendo a variação lateral (refração,
    /// amplificação de sítio) que a equação de onda de fato resolveu.
    /// </summary>
    public static double GeometricSpreadingCorrection(double hypocentralDistanceMeters, double referenceDistanceMeters = 1000.0)
    {
        var r = Math.Max(hypocentralDistanceMeters, 1.0);
        var r0 = Math.Max(referenceDistanceMeters, 1.0);
        return Math.Sqrt(r0 / r);
    }
}
