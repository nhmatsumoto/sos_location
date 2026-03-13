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
    public class NewsIndexerService : BackgroundService
    {
        private readonly ILogger<NewsIndexerService> _logger;
        private readonly IServiceProvider _serviceProvider;
        private const int IndexIntervalMinutes = 15;

        public NewsIndexerService(ILogger<NewsIndexerService> logger, IServiceProvider serviceProvider)
        {
            _logger = logger;
            _serviceProvider = serviceProvider;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Starting News Indexer Service...");
            
            // Initial seed
            await IndexNewsAsync();

            while (!stoppingToken.IsCancellationRequested)
            {
                await Task.Delay(TimeSpan.FromMinutes(IndexIntervalMinutes), stoppingToken);
                await IndexNewsAsync();
            }
        }

        private async Task IndexNewsAsync()
        {
            _logger.LogInformation("Indexing news from reliable public sources...");

            using var scope = _serviceProvider.CreateScope();
            var repository = scope.ServiceProvider.GetRequiredService<INewsRepository>();

            // Simulate news harvesting
            var newsItems = new List<NewsNotification>
            {
                new NewsNotification
                {
                    Id = Guid.NewGuid(),
                    Title = "Alerta de Chuvas no Sudeste",
                    Content = "Previsão de fortes chuvas para o estado de Minas Gerais nas próximas 24 horas. População deve ficar atenta aos alertas da Defesa Civil.",
                    Source = "G1 - Minas",
                    Country = "Brasil",
                    Location = "Minas Gerais",
                    PublishedAt = DateTime.UtcNow,
                    Category = "Weather",
                    ExternalUrl = "https://g1.globo.com/mg/"
                },
                new NewsNotification
                {
                    Id = Guid.NewGuid(),
                    Title = "Rio de Janeiro em Estágio de Mobilização",
                    Content = "Devido à aproximação de uma frente fria, a cidade do Rio de Janeiro entrou em estágio de mobilização.",
                    Source = "COR-Rio",
                    Country = "Brasil",
                    Location = "Rio de Janeiro",
                    PublishedAt = DateTime.UtcNow.AddMinutes(-45),
                    Category = "Disaster",
                    ExternalUrl = "https://cor.rio/"
                },
                new NewsNotification
                {
                    Id = Guid.NewGuid(),
                    Title = "Flood Warning in Southern Spain",
                    Content = "Heavy rains causing flash floods in Andalusia. Residents advised to move to higher ground.",
                    Source = "El País",
                    Country = "Spain",
                    Location = "Andalusia",
                    PublishedAt = DateTime.UtcNow.AddHours(-1),
                    Category = "Disaster",
                    ExternalUrl = "https://elpais.com/espana/"
                },
                new NewsNotification
                {
                    Id = Guid.NewGuid(),
                    Title = "Wildfire Contained in Northern California",
                    Content = "Firefighters successfully contained 80% of the wildfire near Redding. Evacuation orders lifted.",
                    Source = "ABC News",
                    Country = "USA",
                    Location = "California",
                    PublishedAt = DateTime.UtcNow.AddHours(-2),
                    Category = "Disaster",
                    ExternalUrl = "https://abcnews.go.com/"
                }
            };

            foreach (var news in newsItems)
            {
                await repository.AddAsync(news);
            }

            // Clean up old news (simulation: older than 7 days)
            await repository.DeleteOldNewsAsync(DateTime.UtcNow.AddDays(-7));

            _logger.LogInformation("Successfully indexed {count} news items.", newsItems.Count);
        }
    }
}
