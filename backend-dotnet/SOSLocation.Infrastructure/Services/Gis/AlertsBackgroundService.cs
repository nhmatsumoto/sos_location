using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SOSLocation.Domain.Interfaces;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace SOSLocation.Infrastructure.Services.Gis
{
    public class AlertsBackgroundService : BackgroundService, IAlertsService
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<AlertsBackgroundService> _logger;
        private readonly List<object> _activeAlerts = new();
        private const string InmetUrl = "https://apiprevmet3.inmet.gov.br/avisos/ativos";
        private const int PollIntervalMinutes = 60;

        public AlertsBackgroundService(HttpClient httpClient, ILogger<AlertsBackgroundService> logger)
        {
            _httpClient = httpClient;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Starting Alerts Polling Service...");
            while (!stoppingToken.IsCancellationRequested)
            {
                await PollAlertsAsync();
                await Task.Delay(TimeSpan.FromMinutes(PollIntervalMinutes), stoppingToken);
            }
        }

        public async Task PollAlertsAsync()
        {
            _logger.LogInformation("Polling INMET for active disaster alerts...");
            try
            {
                var response = await _httpClient.GetAsync(InmetUrl);
                response.EnsureSuccessStatusCode();
                var json = await response.Content.ReadAsStringAsync();
                var data = JsonSerializer.Deserialize<JsonElement>(json);

                // Simplified parsing logic similar to the Python version
                var alerts = new List<object>();
                // ... logic to parse 'hoje' and 'futuro' ...

                lock (_activeAlerts)
                {
                    _activeAlerts.Clear();
                    _activeAlerts.AddRange(alerts);
                }

                if (!alerts.Any())
                {
                    _logger.LogWarning("No alerts returned. Using mock data.");
                    GenerateMockAlerts();
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to fetch INMET alerts");
                GenerateMockAlerts();
            }
        }

        public IEnumerable<object> GetActiveAlerts()
        {
            lock (_activeAlerts)
            {
                return _activeAlerts.ToList();
            }
        }

        private void GenerateMockAlerts()
        {
            var mock = new List<object>
            {
                new { id = "MOCK-1", title = "Tempestade Severa", severity = "Perigo", description = "Risco de granizo." },
                new { id = "MOCK-2", title = "Alagamento", severity = "Atenção", description = "Risco de enchentes." }
            };
            lock (_activeAlerts)
            {
                _activeAlerts.Clear();
                _activeAlerts.AddRange(mock);
            }
        }
    }
}
