using SOSLocation.Domain.Interfaces;
using Microsoft.Extensions.Logging;
using System.Net.Http;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace SOSLocation.Infrastructure.Services.Gis.Crawlers
{
    public class WfsCrawlerProvider : IWfsConnector
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<WfsCrawlerProvider> _logger;

        // URLs base oficiais para o GeoSampa (São Paulo) e INDE (Brasil)
        private const string GeoSampaWfsUrl = "http://geosampa.prefeitura.sp.gov.br/geoserver/geosampa/wfs";
        private const string IndeWfsUrl = "https://geoinfo.inde.gov.br/geoserver/wfs";

        public string ProviderName => "GeoSampa_INDE_WFS";

        public WfsCrawlerProvider(HttpClient httpClient, ILogger<WfsCrawlerProvider> logger)
        {
            _httpClient = httpClient;
            _logger = logger;
        }

        public async Task<CrawlerTaskResult> FetchDataAsync(CrawlerTaskRequest request)
        {
            _logger.LogInformation("WfsCrawlerProvider fetching layer: {Layer}", request.Layers[0]);

            // Exemplo para São Paulo (GeoSampa)
            // Filtro BBOX (MinLon, MinLat, MaxLon, MaxLat)
            string bbox = $"{request.MinLon},{request.MinLat},{request.MaxLon},{request.MaxLat}";
            string layerName = request.Layers.Count > 0 ? request.Layers[0] : "logradouro"; // Default logradouro
            
            // Query string GetFeature
            string query = $"?service=WFS&version=1.0.0&request=GetFeature&typeName={layerName}&outputFormat=application/json&bbox={bbox},EPSG:4326";

            // Na implementação completa, buscaríamos de ambos os serviços ou priorizando GeoSampa p/ SP
            string url = (request.RegionCode == "SP" ? GeoSampaWfsUrl : IndeWfsUrl) + query;

            _logger.LogDebug("Calling WFS: {Url}", url);

            try {
                var response = await _httpClient.GetAsync(url);
                if (!response.IsSuccessStatusCode) return new CrawlerTaskResult { Success = false, Message = "Failed to fetch from WFS server" };

                var json = await response.Content.ReadAsStringAsync();
                
                // Em um workflow real, o GML/GeoJSON seria parseado via NetTopologySuite GeoJsonReader
                return new CrawlerTaskResult {
                    Success = true,
                    Provider = ProviderName,
                    Data = json,
                    Message = $"Fetched {layerName} features from WFS"
                };
            } catch (System.Exception ex) {
                _logger.LogError(ex, "Error fetching from OGC WFS service.");
                return new CrawlerTaskResult { Success = false, Message = ex.Message };
            }
        }
    }
}
