namespace SosLocation.GeoProcessing.Seismic;

/// <summary>
/// Paleta fixa para visualizar a magnitude da aceleração instantânea. A escala
/// é estável entre quadros e execuções (0–1 g), portanto a animação não muda de
/// contraste artificialmente a cada passo.
/// </summary>
public static class WaveRasterColorizer
{
    private static readonly Stop[] Stops =
    [
        new(0.000, 0, 0, 0),
        new(0.005, 10, 22, 64),
        new(0.020, 24, 92, 170),
        new(0.080, 25, 190, 205),
        new(0.200, 246, 213, 70),
        new(0.400, 245, 125, 32),
        new(0.700, 218, 45, 35),
        new(1.000, 255, 244, 230),
    ];

    public static (byte R, byte G, byte B) ColorizeAccelerationG(double accelerationG)
    {
        var value = Math.Clamp(Math.Abs(accelerationG), 0.0, 1.0);
        for (var i = 1; i < Stops.Length; i++)
        {
            if (value > Stops[i].Value) continue;
            var lower = Stops[i - 1];
            var upper = Stops[i];
            var span = upper.Value - lower.Value;
            var fraction = span <= 0 ? 0 : (value - lower.Value) / span;
            return (
                Interpolate(lower.R, upper.R, fraction),
                Interpolate(lower.G, upper.G, fraction),
                Interpolate(lower.B, upper.B, fraction));
        }

        var last = Stops[^1];
        return (last.R, last.G, last.B);
    }

    private static byte Interpolate(byte from, byte to, double fraction)
        => (byte)Math.Clamp((int)Math.Round(from + (to - from) * fraction), 0, 255);

    private readonly record struct Stop(double Value, byte R, byte G, byte B);
}
