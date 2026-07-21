namespace SosLocation.Application.Abstractions;

/// <summary>
/// Port de codificação de imagem — mantém bibliotecas de imaging fora do
/// Application layer (implementação real via ImageSharp fica na Infrastructure,
/// no mesmo espírito de <see cref="IObjectStorage"/>/<see cref="IElevationProvider"/>).
/// </summary>
public interface IRasterImageEncoder
{
    /// <summary>Codifica um raster RGB (row-major, 3 bytes por pixel: R,G,B) como PNG.</summary>
    byte[] EncodeRgbPng(int width, int height, byte[] rgb);
}
