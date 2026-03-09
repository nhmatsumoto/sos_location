using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SOSLocation.Domain.Entities;
using SOSLocation.Domain.Interfaces;
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;

namespace SOSLocation.Infrastructure.Services.Gis.Providers
{
    public class CemadenAlertProvider : IAlertProvider
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<CemadenAlertProvider> _logger;
        private readonly string _cemadenUrl;

        public string Name => "CEMADEN";

        public CemadenAlertProvider(HttpClient httpClient, ILogger<CemadenAlertProvider> logger, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _logger = logger;
            // Plataforma de Entrega de Dados (PED) CEMADEN
            _cemadenUrl = configuration["ExternalIntegrations:CemadenUrl"] ?? "https://sws.cemaden.gov.br/PED/rest/pcds-acum/acumulados-recentes";
        }

        public async Task<IEnumerable<AlertDto>> FetchAlertsAsync()
        {
            _logger.LogInformation("Fetching CEMADEN risk data from {url}", _cemadenUrl);
            var alerts = new List<AlertDto>();

            try
            {
                var response = await _httpClient.GetAsync(_cemadenUrl);
                response.EnsureSuccessStatusCode();
                var json = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;

                if (root.ValueKind == JsonValueKind.Array)
                {
                    foreach (var item in root.EnumerateArray())
                    {
                        var municipio = item.TryGetProperty("municipio", out var m) ? m.GetString() : "Unknown";
                        var uf = item.TryGetProperty("uf", out var u) ? u.GetString() : "";
                        var valor = item.TryGetProperty("valor", out var v) ? v.GetDouble() : 0.0;

                        // Create alert if precipitation is high
                        if (valor > 50.0) // Example threshold for 50mm recent rain
                        {
                            alerts.Add(new AlertDto
                            {
                                Id = Guid.NewGuid().ToString(),
                                Title = $"Risco Hidrológico: {municipio} ({uf})",
                                Description = $"Precipitação recente de {valor:F1}mm detectada pelas estações CEMADEN.",
                                Severity = valor > 100.0 ? "Critical" : "Warning",
                                Source = "CEMADEN",
                                SourceUrl = _cemadenUrl,
                                Timestamp = DateTime.UtcNow
                            });
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to fetch CEMADEN alerts");
            }

            return alerts;
        }
    }
}
