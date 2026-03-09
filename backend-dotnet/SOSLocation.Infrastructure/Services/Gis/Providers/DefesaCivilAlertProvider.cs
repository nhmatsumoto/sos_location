using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SOSLocation.Domain.Entities;
using SOSLocation.Domain.Interfaces;
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading.Tasks;
using System.Xml;

namespace SOSLocation.Infrastructure.Services.Gis.Providers
{
    public class DefesaCivilAlertProvider : IAlertProvider
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<DefesaCivilAlertProvider> _logger;
        private readonly string _defesaCivilUrl;

        public string Name => "Defesa Civil";

        public DefesaCivilAlertProvider(HttpClient httpClient, ILogger<DefesaCivilAlertProvider> logger, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _logger = logger;
            // IDAP (Interface de Divulgação de Alertas Públicos) RSS link example
            _defesaCivilUrl = configuration["ExternalIntegrations:DefesaCivilUrl"] ?? "https://alertas24h.com.br/rss.xml";
        }

        public async Task<IEnumerable<AlertDto>> FetchAlertsAsync()
        {
            _logger.LogInformation("Fetching Defesa Civil alerts from {url}", _defesaCivilUrl);
            var alerts = new List<AlertDto>();

            try
            {
                var response = await _httpClient.GetAsync(_defesaCivilUrl);
                response.EnsureSuccessStatusCode();
                var xml = await response.Content.ReadAsStringAsync();

                XmlDocument doc = new XmlDocument();
                doc.LoadXml(xml);

                XmlNodeList? items = doc.SelectNodes("//item");
                if (items != null)
                {
                    foreach (XmlNode item in items)
                    {
                        var title = item.SelectSingleNode("title")?.InnerText ?? "Alerta Defesa Civil";
                        var description = item.SelectSingleNode("description")?.InnerText ?? "";
                        var link = item.SelectSingleNode("link")?.InnerText ?? _defesaCivilUrl;
                        var pubDateStr = item.SelectSingleNode("pubDate")?.InnerText;

                        DateTime.TryParse(pubDateStr, out var timestamp);

                        alerts.Add(new AlertDto
                        {
                            Id = Guid.NewGuid().ToString(),
                            Title = title,
                            Description = description,
                            Severity = title.Contains("EXTREMO", StringComparison.OrdinalIgnoreCase) ? "Critical" : "Warning",
                            Source = "Defesa Civil",
                            SourceUrl = link,
                            Timestamp = timestamp == default ? DateTime.UtcNow : timestamp
                        });
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to fetch Defesa Civil alerts");
            }

            return alerts;
        }
    }
}
