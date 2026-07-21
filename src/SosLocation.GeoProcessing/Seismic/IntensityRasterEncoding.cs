namespace SosLocation.GeoProcessing.Seismic;

/// <summary>
/// Codificação de PGA (g) em dois canais (R,G) de um PNG, no mesmo espírito do
/// encoding Terrarium usado para elevação (<see cref="Terrain.TerrariumMath"/>):
/// valor = (R×256+G)/1000 — resolução de 0.001g até ~65g, bem acima de
/// qualquer PGA realista.
/// </summary>
public static class IntensityRasterEncoding
{
    private const double Scale = 1000.0;

    public static (byte R, byte G) EncodePgaG(double pgaG)
    {
        var scaled = Math.Clamp((int)Math.Round(Math.Max(pgaG, 0) * Scale), 0, ushort.MaxValue);
        return ((byte)(scaled >> 8), (byte)(scaled & 0xFF));
    }

    public static double DecodePgaG(byte r, byte g)
        => (r * 256 + g) / Scale;
}
