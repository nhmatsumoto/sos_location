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
                    Title = "Alerta de Inundação Gradual - Bacia do Rio Uruguai",
                    Content = "Níveis do rio atingiram cota de alerta. Defesa Civil recomenda evacuação preventiva em áreas ribeirinhas.",
                    Source = "Defesa Civil RS",
                    Country = "Brasil",
                    Location = "Rio Grande do Sul",
                    Latitude = -30.0346,
                    Longitude = -51.2177,
                    PublishedAt = DateTime.UtcNow,
                    Category = "Flood",
                    ExternalUrl = "https://www.defesacivil.rs.gov.br/",
                    ClimateInfo = "Temp: 22°C | Umidade: 85% | Vento: 15km/h",
                    RiskScore = 85.5
                },
                new NewsNotification
                {
                    Id = Guid.NewGuid(),
                    Title = "Earthquake Early Warning: Miyagi Prefecture",
                    Content = "Magnitude 6.2 earthquake detected. Strong shaking expected in Sendai area. Stay away from windows.",
                    Source = "JMA (Japan Meteorological Agency)",
                    Country = "Japão",
                    Location = "Miyagi",
                    Latitude = 38.2682,
                    Longitude = 140.8694,
                    PublishedAt = DateTime.UtcNow.AddMinutes(-5),
                    Category = "Earthquake",
                    ExternalUrl = "https://www.jma.go.jp/jma/indexe.html",
                    RiskScore = 92.0
                },
                new NewsNotification
                {
                    Id = Guid.NewGuid(),
                    Title = "Alerta de Baixa Umidade e Risco de Incêndios",
                    Content = "Umidade relativa do ar abaixo de 20%. Risco extremo de incêndios florestais na região central.",
                    Source = "INMET",
                    Country = "Brasil",
                    Location = "Goiás",
                    Latitude = -16.6869,
                    Longitude = -49.2648,
                    PublishedAt = DateTime.UtcNow.AddHours(-1),
                    Category = "Wildfire",
                    ExternalUrl = "https://portal.inmet.gov.br/",
                    RiskScore = 78.4
                },
                new NewsNotification
                {
                    Id = Guid.NewGuid(),
                    Title = "Tsunami Advisory: Ishikawa Prefecture",
                    Content = "Tsunami waves of up to 1m expected following seismic activity. Vacate coastal areas immediately.",
                    Source = "NHK World-Japan",
                    Country = "Japão",
                    Location = "Ishikawa",
                    Latitude = 36.5613,
                    Longitude = 136.6562,
                    PublishedAt = DateTime.UtcNow.AddHours(-2),
                    Category = "Tsunami",
                    ExternalUrl = "https://www3.nhk.or.jp/nhkworld/",
                    RiskScore = 65.0
                }
            };

            foreach (var news in newsItems)
            {
                try
                {
                    if (!await repository.ExistsAsync(news.Title, news.PublishedAt))
                    {
                        await repository.AddAsync(news);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to persist news item: {title}", news.Title);
                }
            }

            // Clean up old news (simulation: older than 7 days)
            await repository.DeleteOldNewsAsync(DateTime.UtcNow.AddDays(-7));

            _logger.LogInformation("Successfully indexed {count} news items.", newsItems.Count);
        }
    }
}
