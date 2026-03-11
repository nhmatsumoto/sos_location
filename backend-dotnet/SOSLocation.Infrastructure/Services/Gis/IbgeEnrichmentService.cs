using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SOSLocation.Domain.Common;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading.Tasks;

namespace SOSLocation.Infrastructure.Services.Gis
{
    public interface IIbgeEnrichmentService
    {
        Task EnrichAlertsAsync(IEnumerable<ExternalAlertDto> alerts);
    }

    public class IbgeEnrichmentService : IIbgeEnrichmentService
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<IbgeEnrichmentService> _logger;
        private readonly string _ibgeApiUrl;
        private readonly ConcurrentDictionary<string, long> _populationCache = new();

        public IbgeEnrichmentService(HttpClient httpClient, ILogger<IbgeEnrichmentService> logger, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _logger = logger;
            // IBGE Malhas/Municipios API
            _ibgeApiUrl = configuration["ExternalIntegrations:IbgeApiUrl"] ?? "https://servicodados.ibge.gov.br/api/v1/localidades/municipios";
        }

        public async Task EnrichAlertsAsync(IEnumerable<ExternalAlertDto> alerts)
        {
            foreach (var alert in alerts)
            {
                // Simple heuristic: Extract city name from title or description
                var cityName = ExtractCityName(alert);
                if (string.IsNullOrEmpty(cityName)) continue;

                if (_populationCache.TryGetValue(cityName, out var population))
                {
                    alert.AffectedPopulation = population;
                    continue;
                }

                try
                {
                    // Note: Real enrichment would involve fuzzy searching the city in IBGE API
                    // For this implementation, we simulate fetching population from a known endpoint for the city
                    // In a production scenario, we'd have a local DB of IBGE codes or a more robust lookup.
                    long simulatedPop = 50000 + (cityName.Length * 1234 % 500000);
                    _populationCache.TryAdd(cityName, simulatedPop);
                    alert.AffectedPopulation = simulatedPop;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to enrich alert with IBGE data for city {city}", cityName);
                }
            }
            await Task.CompletedTask;
        }

        private string? ExtractCityName(ExternalAlertDto alert)
        {
            // CEMADEN titles usually have "Município: NM"
            if (alert.Source == "CEMADEN" && alert.Title.Contains(": "))
            {
                return alert.Title.Split(": ")[1].Split(" (")[0];
            }
            // INMET/Defesa Civil might mention the city in description
            // This is a placeholder for more complex extraction logic
            return null;
        }
    }
}
