using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using SosLocation.Application.Abstractions;

namespace SosLocation.Infrastructure.External;

public sealed class ImageSharpRasterEncoder : IRasterImageEncoder
{
    public byte[] EncodeRgbPng(int width, int height, byte[] rgb)
    {
        if (rgb.Length != width * height * 3)
            throw new ArgumentException("RGB buffer length must equal width*height*3.", nameof(rgb));

        using var image = new Image<Rgb24>(width, height);
        image.ProcessPixelRows(accessor =>
        {
            for (var y = 0; y < height; y++)
            {
                var row = accessor.GetRowSpan(y);
                var offset = y * width * 3;
                for (var x = 0; x < width; x++)
                {
                    var i = offset + x * 3;
                    row[x] = new Rgb24(rgb[i], rgb[i + 1], rgb[i + 2]);
                }
            }
        });

        using var stream = new MemoryStream();
        image.SaveAsPng(stream);
        return stream.ToArray();
    }
}
