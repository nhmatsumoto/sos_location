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
    public class WeatherIndexerService : BackgroundService
    {
        private readonly ILogger<WeatherIndexerService> _logger;
        private readonly IServiceProvider _serviceProvider;
        private const int IndexIntervalMinutes = 20;

        public WeatherIndexerService(ILogger<WeatherIndexerService> logger, IServiceProvider serviceProvider)
        {
            _logger = logger;
            _serviceProvider = serviceProvider;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Starting Weather Indexer Service...");
            
            await IndexWeatherAsync();

            while (!stoppingToken.IsCancellationRequested)
            {
                await Task.Delay(TimeSpan.FromMinutes(IndexIntervalMinutes), stoppingToken);
                await IndexWeatherAsync();
            }
        }

        private async Task IndexWeatherAsync()
        {
            _logger.LogInformation("Indexing weather alerts from climatic agencies...");

            using var scope = _serviceProvider.CreateScope();
            var repository = scope.ServiceProvider.GetRequiredService<INewsRepository>();

            var weatherItems = new List<NewsNotification>
            {
                new NewsNotification
                {
                    Id = Guid.NewGuid(),
                    Title = "Heavy Rain Warning: Tokyo Metropolitan Area",
                    Content = "Sudden localized heavy rain expected. Risk of flash floods in urban areas and rising river levels.",
                    Source = "JMA",
                    Country = "Japão",
                    Location = "Tokyo",
                    Latitude = 35.6895,
                    Longitude = 139.6917,
                    PublishedAt = DateTime.UtcNow,
                    Category = "Storm",
                    ExternalUrl = "https://www.jma.go.jp/jma/indexe.html",
                    ClimateInfo = "Precipitação: 45mm/h | Vento: 60km/h",
                    RiskScore = 72.5
                },
                new NewsNotification
                {
                    Id = Guid.NewGuid(),
                    Title = "Alerta de Onda de Calor - Interior de São Paulo",
                    Content = "Temperaturas 5°C acima da média por mais de 5 dias consecutivos. Hidrate-se e evite exposição ao sol.",
                    Source = "INMET",
                    Country = "Brasil",
                    Location = "São Paulo",
                    Latitude = -23.5505,
                    Longitude = -46.6333,
                    PublishedAt = DateTime.UtcNow.AddHours(-1),
                    Category = "Weather",
                    ExternalUrl = "https://portal.inmet.gov.br/",
                    RiskScore = 45.0
                }
            };

            foreach (var item in weatherItems)
            {
                if (!await repository.ExistsAsync(item.Title, item.PublishedAt))
                {
                    await repository.AddAsync(item);
                }
            }

            _logger.LogInformation("Successfully indexed {count} weather alerts.", weatherItems.Count);
        }
    }
}
