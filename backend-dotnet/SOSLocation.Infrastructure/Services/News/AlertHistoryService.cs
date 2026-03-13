using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SOSLocation.Domain.Interfaces;
using SOSLocation.Domain.News;
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace SOSLocation.Infrastructure.Services.News
{
    public class AlertHistoryService : BackgroundService
    {
        private readonly ILogger<AlertHistoryService> _logger;
        private readonly IServiceProvider _serviceProvider;

        public AlertHistoryService(ILogger<AlertHistoryService> logger, IServiceProvider serviceProvider)
        {
            _logger = logger;
            _serviceProvider = serviceProvider;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Starting Alert History Service...");
            
            // This service runs once to seed historical data or periodically to maintain it
            await SeedHistoryAsync();
        }

        private async Task SeedHistoryAsync()
        {
            _logger.LogInformation("Seeding historical disaster data for context...");

            using var scope = _serviceProvider.CreateScope();
            var repository = scope.ServiceProvider.GetRequiredService<INewsRepository>();

            var historicalItems = new List<NewsNotification>
            {
                new NewsNotification
                {
                    Id = Guid.NewGuid(),
                    Title = "HISTORICAL: Great East Japan Earthquake (2011)",
                    Content = "Archive Data: Magnitude 9.1 earthquake followed by a massive tsunami affecting the Tohoku region.",
                    Source = "Historical Archive",
                    Country = "Japão",
                    Location = "Tohoku Region",
                    Latitude = 38.297,
                    Longitude = 142.373,
                    PublishedAt = new DateTime(2011, 3, 11),
                    Category = "History",
                    ExternalUrl = "https://www.jma.go.jp/jma/en/2011_Earthquake/2011_Earthquake.html"
                },
                new NewsNotification
                {
                    Id = Guid.NewGuid(),
                    Title = "HISTÓRICO: Enchentes Históricas no Rio Grande do Sul (2024)",
                    Content = "Dados de Arquivo: Evento climático extremo resultando em inundações sem precedentes em todo o estado.",
                    Source = "Arquivo Defesa Civil",
                    Country = "Brasil",
                    Location = "Rio Grande do Sul",
                    Latitude = -30.01,
                    Longitude = -51.22,
                    PublishedAt = new DateTime(2024, 5, 1),
                    Category = "History",
                    ExternalUrl = "https://www.defesacivil.rs.gov.br/"
                }
            };

            foreach (var item in historicalItems)
            {
                try
                {
                    if (!await repository.ExistsAsync(item.Title, item.PublishedAt))
                    {
                        await repository.AddAsync(item);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to persist historical item: {title}", item.Title);
                }
            }

            _logger.LogInformation("Successfully seeded {count} historical alerts.", historicalItems.Count);
        }
    }
}
