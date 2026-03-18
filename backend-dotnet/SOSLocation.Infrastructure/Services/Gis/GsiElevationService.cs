using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using System.Net.Http;
using System.IO;
using System.Threading.Tasks;
using SOSLocation.Domain.Interfaces;
using Microsoft.Extensions.Logging;

namespace SOSLocation.Infrastructure.Services.Gis
{
    public class GsiElevationService : IGsiElevationConnector
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<GsiElevationService> _logger;
        // URL base para os tiles de elevação do Japão (DEM5A)
        private const string GsiDemUrl = "https://cyberjapandata.gsi.go.jp/xyz/dem5a_png/{z}/{x}/{y}.png";

        public string ProviderName => "GSI_Japan_DEM";

        public GsiElevationService(HttpClient httpClient, ILogger<GsiElevationService> logger)
        {
            _httpClient = httpClient;
            _logger = logger;
        }

        public async Task<CrawlerTaskResult> FetchDataAsync(CrawlerTaskRequest request)
        {
            // Placeholder: Em uma implementação completa, calcularíamos x,y,z a partir da BBOX.
            // Aqui estamos seguindo a lógica da GSI sugerida.
            _logger.LogInformation("GsiElevationService fetching data for region: {RegionCode}", request.RegionCode);
            
            // Exemplo Simplificado: Supondo z=15 para a área de interesse
            int z = 15;
            // Cálculo manual de tile para demonstração (Tenri, Nara)
            // Longitude: 135.84, Latitude: 34.60
            // Converter para Google Maps / GSI tile coordinates (Web Mercator)
            int x = LonToTileX(135.84, z);
            int y = LatToTileY(34.60, z);

            var heightmap = await GetHeightmapImageAsync(z, x, y);
            
            return new CrawlerTaskResult {
                Success = heightmap != null,
                Provider = ProviderName,
                Data = heightmap,
                Message = heightmap != null ? "Heightmap generated successfully from GSI Tiles" : "Failed to fetch tiles from GSI"
            };
        }

        public async Task<byte[]?> GetHeightmapImageAsync(int z, int x, int y)
        {
            var url = GsiDemUrl.Replace("{z}", z.ToString())
                               .Replace("{x}", x.ToString())
                               .Replace("{y}", y.ToString());

            _logger.LogDebug("Fetching GSI Tile: {url}", url);

            try {
                var response = await _httpClient.GetAsync(url);
                if (!response.IsSuccessStatusCode) {
                    _logger.LogWarning("GSI Tile not found at {z}/{x}/{y}. Trying fallback.", z, x, y);
                    return null;
                }

                using var inputStream = await response.Content.ReadAsStreamAsync();
                using var image = Image.Load<Rgb24>(inputStream);
                
                // Criamos uma nova imagem em tons de cinza de 16-bit (L16) para maior precisão
                using var heightmap = new Image<L16>(image.Width, image.Height);

                for (int py = 0; py < image.Height; py++)
                {
                    for (int px = 0; px < image.Width; px++)
                    {
                        var pixel = image[px, py];
                        
                        // Fórmula de decodificação da GSI para converter RGB em Altitude (metros)
                        double altitude = DecodeGsiAltitude(pixel.R, pixel.G, pixel.B);

                        // Normalização para 16-bit (Exemplo: mapeando de 0m a 4000m)
                        ushort grayValue = ConvertAltitudeTo16Bit(altitude, 0, 4000);
                        heightmap[px, py] = new L16(grayValue);
                    }
                }

                using var outputStream = new MemoryStream();
                await heightmap.SaveAsPngAsync(outputStream);
                return outputStream.ToArray();
            } catch (System.Exception ex) {
                _logger.LogError(ex, "Error processing GSI tile elevation mapping.");
                return null;
            }
        }

        private double DecodeGsiAltitude(byte r, byte g, byte b)
        {
            // A GSI utiliza uma lógica baseada em potências de 2 para codificar a elevação
            int x = (r << 16) + (g << 8) + b;
            if (x == 8388608) return 0; // Valor inválido ou mar

            double h = (x < 8388608) ? x : x - 16777216;
            return h * 0.01; // Resolução de 1cm
        }

        private ushort ConvertAltitudeTo16Bit(double altitude, double min, double max)
        {
            if (altitude < min) altitude = min;
            if (altitude > max) altitude = max;
            
            return (ushort)((altitude - min) / (max - min) * 65535);
        }

        private int LonToTileX(double lon, int z) 
            => (int)System.Math.Floor((lon + 180.0) / 360.0 * System.Math.Pow(2.0, z));

        private int LatToTileY(double lat, int z) 
            => (int)System.Math.Floor((1.0 - System.Math.Log(System.Math.Tan(lat * System.Math.PI / 180.0) + 1.0 / System.Math.Cos(lat * System.Math.PI / 180.0)) / System.Math.PI) / 2.0 * System.Math.Pow(2.0, z));
    }
}
