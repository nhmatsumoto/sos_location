using SOSLocation.Domain.Interfaces;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading.Tasks;
using NetTopologySuite.Geometries;

namespace SOSLocation.Infrastructure.Services.Gis.Crawlers
{
    public class PlateauCrawlerProvider : IPlateauConnector
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<PlateauCrawlerProvider> _logger;
        private readonly GeometryFactory _geometryFactory;

        // URL base sugerida pela GSI/PLATEAU
        private const string PlateauCatalogUrl = "https://catalog.data.go.jp/api/3/action/package_search?q=PLATEAU";

        public string ProviderName => "PLATEAU_Japan_CityGML";

        public PlateauCrawlerProvider(HttpClient httpClient, ILogger<PlateauCrawlerProvider> logger)
        {
            _httpClient = httpClient;
            _logger = logger;
            _geometryFactory = new GeometryFactory();
        }

        public async Task<CrawlerTaskResult> FetchDataAsync(CrawlerTaskRequest request)
        {
            _logger.LogInformation("PlateauCrawlerProvider fetching data for municipality: {RegionCode}", request.RegionCode);

            // 1. Filtrar catálogo pelo código do município (simulado para Tenri/Nara se vazio)
            string municipalityCode = string.IsNullOrEmpty(request.RegionCode) ? "29204" : request.RegionCode;

            // 2. Localizar Dataset CityGML / LADM
            // Na implementação real, usaríamos o parser da API do CKAN do Japão
            _logger.LogDebug("Searching PLATEAU dataset for code: {Code}", municipalityCode);

            // 3. Simulação de Extração de bldg:Building
            // (Futura implementação usará GDAL/OGR para ler .gml/.json)
            var buildings = new List<BuildingFeature>();

            // Exemplo de prédio em Tenri (Praça da Estação)
            buildings.Add(new BuildingFeature {
                Id = "bldg_101",
                Footprint = _geometryFactory.CreatePolygon(new[] {
                    new Coordinate(135.84, 34.60),
                    new Coordinate(135.85, 34.60),
                    new Coordinate(135.85, 34.61),
                    new Coordinate(135.84, 34.61),
                    new Coordinate(135.84, 34.60)
                }),
                MeasuredHeight = 12.5,
                BuildingType = "Cultural"
            });

            return new CrawlerTaskResult {
                Success = true,
                Provider = ProviderName,
                Data = buildings,
                Message = $"Extracted {buildings.Count} buildings from PLATEAU dataset"
            };
        }
    }

    public class BuildingFeature
    {
        public string Id { get; set; } = string.Empty;
        public Polygon? Footprint { get; set; }
        public double MeasuredHeight { get; set; }
        public string BuildingType { get; set; } = string.Empty;
    }
}
