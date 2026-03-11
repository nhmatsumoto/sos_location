using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SOSLocation.Domain.Common;
using SOSLocation.Domain.Interfaces;
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;

namespace SOSLocation.Infrastructure.Services.Gis.Providers
{
    public class InmetAlertProvider : IAlertProvider
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<InmetAlertProvider> _logger;
        private readonly string _inmetUrl;

        public string Name => "INMET";

        public InmetAlertProvider(HttpClient httpClient, ILogger<InmetAlertProvider> logger, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _logger = logger;
            _inmetUrl = configuration["ExternalIntegrations:InmetUrl"] ?? "https://apiprevmet3.inmet.gov.br/avisos/ativos";
        }

        public async Task<IEnumerable<ExternalAlertDto>> FetchAlertsAsync()
        {
            _logger.LogInformation("Fetching INMET alerts from {url}", _inmetUrl);
            var alerts = new List<ExternalAlertDto>();

            try
            {
                var response = await _httpClient.GetAsync(_inmetUrl);
                response.EnsureSuccessStatusCode();
                var json = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;

                if (root.TryGetProperty("hoje", out var hoje))
                {
                    alerts.AddRange(ParseInmetSection(hoje));
                }
                if (root.TryGetProperty("futuro", out var futuro))
                {
                    alerts.AddRange(ParseInmetSection(futuro));
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to fetch INMET alerts");
            }

            return alerts;
        }

        private List<ExternalAlertDto> ParseInmetSection(JsonElement section)
        {
            var result = new List<ExternalAlertDto>();
            if (section.ValueKind != JsonValueKind.Array) return result;

            foreach (var item in section.EnumerateArray())
            {
                try
                {
                    result.Add(new ExternalAlertDto
                    {
                        Id = item.TryGetProperty("aviso_id", out var id) ? id.GetString() ?? Guid.NewGuid().ToString() : Guid.NewGuid().ToString(),
                        Title = item.TryGetProperty("titulo", out var t) ? t.GetString() ?? "Alerta de Risco" : "Alerta de Risco",
                        Severity = item.TryGetProperty("cor", out var c) ? MapInmetSeverity(c.GetString()) : "Warning",
                        Description = item.TryGetProperty("descricao", out var d) ? d.GetString() ?? "" : "",
                        Source = "INMET",
                        Timestamp = DateTime.UtcNow,
                        SourceUrl = _inmetUrl
                    });
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to parse individual INMET alert item");
                }
            }
            return result;
        }

        private string MapInmetSeverity(string? color)
        {
            return color?.ToLower() switch
            {
                "vermelho" => "Critical",
                "laranja" => "Warning",
                "amarelo" => "Info",
                _ => "Warning"
            };
        }
    }
}
