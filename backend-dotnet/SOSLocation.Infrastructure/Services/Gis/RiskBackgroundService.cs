using SOSLocation.Domain.Interfaces;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using SOSLocation.Domain.Entities;
using SOSLocation.Infrastructure.Persistence;
using System.Net.Http;
using System;
using System.Collections.Generic;
using System.Net.Http.Json;
using System.Threading;
using System.Threading.Tasks;

namespace SOSLocation.Infrastructure.Services.Gis
{
    public class RiskBackgroundService : BackgroundService
    {
        private readonly ILogger<RiskBackgroundService> _logger;
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly IHttpClientFactory _httpClientFactory;
        private const int PollIntervalMinutes = 5;

        public RiskBackgroundService(
            ILogger<RiskBackgroundService> logger,
            IServiceScopeFactory scopeFactory,
            IHttpClientFactory httpClientFactory)
        {
            _logger = logger;
            _scopeFactory = scopeFactory;
            _httpClientFactory = httpClientFactory;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Starting ML Risk Integration Service...");

            while (!stoppingToken.IsCancellationRequested)
            {
                await SyncRiskScoresAsync();
                await Task.Delay(TimeSpan.FromMinutes(PollIntervalMinutes), stoppingToken);
            }
        }

        private async Task SyncRiskScoresAsync()
        {
            try
            {
                var client = _httpClientFactory.CreateClient();
                var riskEngineUrl = Environment.GetEnvironmentVariable("RISK_ENGINE_URL") ?? "http://risk-analysis:8000";
                
                var response = await client.GetAsync($"{riskEngineUrl}/risk_scores");
                if (response.IsSuccessStatusCode)
                {
                    var scores = await response.Content.ReadFromJsonAsync<List<RiskScoreDto>>();
                    if (scores != null)
                    {
                        using var scope = _scopeFactory.CreateScope();
                        var context = scope.ServiceProvider.GetRequiredService<SOSLocationDbContext>();
                        var notificationService = scope.ServiceProvider.GetRequiredService<INotificationService>();

                        foreach (var risk in scores)
                        {
                            // Persist to DB for history/audit
                            var analysis = new RiskAnalysis
                            {
                                LocationName = risk.Location,
                                Latitude = 0, // In a real scenario, we'd lookup or the API would provide this
                                Longitude = 0,
                                Score = risk.Score,
                                Level = risk.Level,
                                AnalysisDate = DateTime.UtcNow,
                                FactorsJson = "{}"
                            };
                            context.RiskAnalysis.Add(analysis);

                            // Broadcast to UI
                            await notificationService.BroadcastRiskUpdateAsync(new
                            {
                                risk.Location,
                                risk.Country,
                                risk.Score,
                                risk.Level
                            });
                        }
                        
                        await context.SaveChangesAsync();
                        _logger.LogInformation("Persisted and broadcasted {count} risk scores.", scores.Count);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning("Failed to fetch risk scores from ML engine: {msg}", ex.Message);
            }
        }

        public class RiskScoreDto
        {
            public string Country { get; set; } = string.Empty;
            public string Location { get; set; } = string.Empty;
            public int Score { get; set; }
            public string Level { get; set; } = string.Empty;
        }
    }
}
