using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SOSLocation.Domain.Common;
using SOSLocation.Domain.Incidents;
using SOSLocation.Domain.Interfaces;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace SOSLocation.Infrastructure.Services.Gis
{
    public class AlertsBackgroundService : BackgroundService, IAlertsService
    {
        private readonly ILogger<AlertsBackgroundService> _logger;
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly List<ExternalAlert> _activeAlerts = new();
        private const int PollIntervalMinutes = 30;

        public AlertsBackgroundService(
            ILogger<AlertsBackgroundService> logger,
            IServiceScopeFactory scopeFactory)
        {
            _logger = logger;
            _scopeFactory = scopeFactory;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Starting Multi-Provider Alerts Polling Service...");
            while (!stoppingToken.IsCancellationRequested)
            {
                await PollAlertsAsync();
                await Task.Delay(TimeSpan.FromMinutes(PollIntervalMinutes), stoppingToken);
            }
        }

        public async Task PollAlertsAsync()
        {
            using var scope = _scopeFactory.CreateScope();
            var providers = scope.ServiceProvider.GetServices<IAlertProvider>();
            var enrichmentService = scope.ServiceProvider.GetRequiredService<IIbgeEnrichmentService>();

            _logger.LogInformation("Polling {count} providers for active disaster alerts...", providers.Count());

            var allAlerts = new List<ExternalAlert>();

            foreach (var provider in providers)
            {
                try
                {
                    var providerAlerts = await provider.FetchAlertsAsync();
                    allAlerts.AddRange(providerAlerts);
                    _logger.LogInformation("Fetched {count} alerts from {provider}", providerAlerts.Count(), provider.Name);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to fetch alerts from provider {provider}", provider.Name);
                }
            }

            // Emergency Seeding for requested critical regions
            allAlerts.Add(new ExternalAlert
            {
                Id = "seed-uba-001",
                Title = "Ubá: Emergência por Alagamento",
                Description = "Fortes chuvas causaram o transbordamento de rios na região central de Ubá. Risco alto de deslizamentos.",
                Severity = "Extremo",
                Source = "DEFESA_CIVIL",
                Timestamp = DateTime.UtcNow,
                Lat = -21.1215f,
                Lon = -42.9427f,
                SourceUrl = "https://www.uba.mg.gov.br/"
            });

            allAlerts.Add(new ExternalAlert
            {
                Id = "seed-jf-001",
                Title = "Juiz de Fora: Alerta de Inundação",
                Description = "Nível do Rio Paraibuna em estado de alerta. Possibilidade de inundações em áreas ribeirinhas.",
                Severity = "Perigo",
                Source = "CEMADEN",
                Timestamp = DateTime.UtcNow,
                Lat = -21.7595f,
                Lon = -43.3502f,
                SourceUrl = "https://www.pjf.mg.gov.br/"
            });

            try
            {
                await enrichmentService.EnrichAlertsAsync(allAlerts);
                _logger.LogInformation("Enriched {count} alerts with IBGE/Demographic data", allAlerts.Count);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to enrichment alerts with demographic data");
            }

            // Persistence
            var repository = scope.ServiceProvider.GetRequiredService<IAttentionAlertRepository>();
            var existingAlerts = await repository.GetAllAsync();
            var existingIds = existingAlerts.Select(a => a.ExternalId).ToHashSet();

            foreach (var extAlert in allAlerts)
            {
                try
                {
                    if (!existingIds.Contains(extAlert.Id))
                    {
                        await repository.AddAsync(new AttentionAlert
                        {
                            ExternalId = extAlert.Id,
                            Title = extAlert.Title,
                            Message = extAlert.Description,
                            Severity = extAlert.Severity.ToLower(),
                            Lat = extAlert.Lat ?? 0,
                            Lng = extAlert.Lon ?? 0,
                            CreatedAt = DateTime.UtcNow
                        });
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to persist alert {id}", extAlert.Id);
                }
            }

            lock (_activeAlerts)
            {
                _activeAlerts.Clear();
                _activeAlerts.AddRange(allAlerts);
            }

            _logger.LogInformation("Total active alerts available: {count}", allAlerts.Count);
        }

        public IEnumerable<ExternalAlert> GetActiveAlerts()
        {
            lock (_activeAlerts)
            {
                return _activeAlerts.ToList();
            }
        }
    }
}
