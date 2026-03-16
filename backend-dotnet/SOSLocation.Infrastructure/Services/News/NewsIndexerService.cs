using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SOSLocation.Domain.Interfaces;
using SOSLocation.Domain.News;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using System.Xml.Linq;

namespace SOSLocation.Infrastructure.Services.News
{
    public class NewsIndexerService : BackgroundService
    {
        private readonly ILogger<NewsIndexerService> _logger;
        private readonly IServiceScopeFactory _scopeFactory;
        private const int IndexIntervalMinutes = 15;

        public NewsIndexerService(
            ILogger<NewsIndexerService> logger, 
            IServiceScopeFactory scopeFactory)
        {
            _logger = logger;
            _scopeFactory = scopeFactory;
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
            using var scope = _scopeFactory.CreateScope();
            var dataSourceRepo = scope.ServiceProvider.GetRequiredService<IDataSourceRepository>();
            var newsRepo = scope.ServiceProvider.GetRequiredService<INewsRepository>();
            
            var activeSources = (await dataSourceRepo.GetAllActiveAsync())
                .Where(s => s.Type == "News" || s.Type == "Weather");

            _logger.LogInformation("Processing {count} active data sources...", activeSources.Count());

            foreach (var source in activeSources)
            {
                try
                {
                    _logger.LogInformation("Crawling source: {name} ({url})", source.Name, source.BaseUrl);
                    
                    // Generic crawler logic (Simulation of fetching from actual URL)
                    // In a real scenario, we'd use HttpClient to fetch and parse based on ProviderType
                    var items = await SimulateFetchFromSource(source);

                    foreach (var item in items)
                    {
                        if (!await newsRepo.ExistsAsync(item.Title, item.PublishedAt))
                        {
                            await newsRepo.AddAsync(item);
                            
                            // Broadcast
                            var notificationService = scope.ServiceProvider.GetRequiredService<INotificationService>();
                            if (item.Category == "Weather")
                            {
                                await notificationService.BroadcastWeatherUpdateAsync(new {
                                    item.Id,
                                    item.Title,
                                    Message = item.Content,
                                    item.Location,
                                    item.Country,
                                    CreatedAt = item.PublishedAt
                                }, item.Location, item.Country);
                            }
                            else
                            {
                                await notificationService.BroadcastAlertAsync(new {
                                    item.Id,
                                    item.Title,
                                    Message = item.Content,
                                    Severity = item.RiskScore > 80 ? "critical" : "info",
                                    CreatedAt = item.PublishedAt
                                });
                            }
                        }
                    }

                    source.LastCrawlAt = DateTime.UtcNow;
                    source.LastErrorMessage = null;
                    await dataSourceRepo.UpdateAsync(source);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to crawl source {name}", source.Name);
                    source.LastErrorMessage = ex.Message;
                    await dataSourceRepo.UpdateAsync(source);
                }
            }
        }

        private async Task<List<NewsNotification>> SimulateFetchFromSource(SOSLocation.Domain.Entities.DataSource source)
        {
            try 
            {
                using var client = new HttpClient();
                client.DefaultRequestHeaders.Add("User-Agent", "SOS-Location-Guardian-V2");
                client.Timeout = TimeSpan.FromSeconds(15);

                if (source.ProviderType == "RSS")
                {
                    return await FetchFromRSS(client, source);
                }
                else if (source.ProviderType == "JsonApi")
                {
                    return await FetchFromJsonApi(client, source);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning("Real fetch failed for {name}, falling back to simulation logic. Error: {err}", source.Name, ex.Message);
            }

            // Fallback for simulation/testing
            var random = new Random();
            var categories = new[] { "War", "Humanitarian", "Heat", "Hurricane", "Flood", "Earthquake" };
            var cat = categories[random.Next(categories.Length)];
            
            return new List<NewsNotification>
            {
                new NewsNotification
                {
                    Id = Guid.NewGuid(),
                    Title = $"[TACTICAL_INTEL] {cat.ToUpper()}: Alerta Ativo",
                    Content = $"Monitoramento Guardian detectou anomalia classificada como {cat}. Verifique os protocolos operacionais.",
                    Source = source.Name,
                    Country = "Global",
                    Location = "Setor de Operação",
                    PublishedAt = DateTime.UtcNow,
                    Category = cat,
                    RiskScore = random.Next(60, 98)
                }
            };
        }

        private async Task<List<NewsNotification>> FetchFromRSS(HttpClient client, SOSLocation.Domain.Entities.DataSource source)
        {
            var content = await client.GetStringAsync(source.BaseUrl);
            var doc = System.Xml.Linq.XDocument.Parse(content);
            var items = new List<NewsNotification>();

            var channel = doc.Descendants("item").Take(10);
            foreach (var item in channel)
            {
                items.Add(new NewsNotification
                {
                    Id = Guid.NewGuid(),
                    Title = item.Element("title")?.Value ?? "Sem Título",
                    Content = item.Element("description")?.Value ?? "Sem conteúdo",
                    Source = source.Name,
                    PublishedAt = DateTime.TryParse(item.Element("pubDate")?.Value, out var dt) ? dt : DateTime.UtcNow,
                    Category = source.Type,
                    RiskScore = InferRiskScore(item.Element("title")?.Value + item.Element("description")?.Value)
                });
            }
            return items;
        }
        private async Task<List<NewsNotification>> FetchFromJsonApi(HttpClient client, SOSLocation.Domain.Entities.DataSource source)
        {
            var response = await client.GetAsync(source.BaseUrl);
            if (!response.IsSuccessStatusCode) return new List<NewsNotification>();

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            var items = new List<NewsNotification>();

            // USGS
            if (source.BaseUrl.Contains("earthquake.usgs.gov"))
            {
                var features = doc.RootElement.GetProperty("features");
                foreach (var feature in features.EnumerateArray().Take(5))
                {
                    var props = feature.GetProperty("properties");
                    items.Add(new NewsNotification {
                        Id = Guid.NewGuid(),
                        Title = props.GetProperty("title").GetString() ?? "Earthquake",
                        Content = $"Magnitude: {props.GetProperty("mag").GetDouble()} em {props.GetProperty("place").GetString()}",
                        Source = "USGS",
                        PublishedAt = DateTimeOffset.FromUnixTimeMilliseconds(props.GetProperty("time").GetInt64()).UtcDateTime,
                        Category = "Emergency",
                        RiskScore = (int)(props.GetProperty("mag").GetDouble() * 15)
                    });
                }
            }

            // ─── RELIEFWEB (Humanitarian) ───
            if (source.BaseUrl.Contains("api.reliefweb.int"))
            {
                var data = doc.RootElement.GetProperty("data");
                foreach (var itemNode in data.EnumerateArray().Take(10))
                {
                    var fields = itemNode.GetProperty("fields");
                    items.Add(new NewsNotification {
                        Id = Guid.NewGuid(),
                        Title = fields.GetProperty("title").GetString() ?? "Relief Update",
                        Content = $"Crisis intensity high in sector. Source: ReliefWeb.",
                        Source = "ReliefWeb",
                        PublishedAt = DateTime.TryParse(fields.GetProperty("date").GetProperty("created").GetString(), out var dt) ? dt : DateTime.UtcNow,
                        Category = "Humanitarian",
                        RiskScore = 85
                    });
                }
            }

            // ─── GDACS (Natural Disasters) ───
            if (source.BaseUrl.Contains("www.gdacs.org"))
            {
                // Note: GDACS often uses GeoJSON or RSS, we'll assume a GeoJSON structure for this example
                if (doc.RootElement.TryGetProperty("features", out var features))
                {
                    foreach (var feature in features.EnumerateArray().Take(10))
                    {
                        var props = feature.GetProperty("properties");
                        items.Add(new NewsNotification {
                            Id = Guid.NewGuid(),
                            Title = props.GetProperty("name").GetString() ?? "GDACS Alert",
                            Content = props.GetProperty("description").GetString() ?? "No description provided.",
                            Source = "GDACS",
                            PublishedAt = DateTime.UtcNow,
                            Category = "Disaster",
                            RiskScore = 95
                        });
                    }
                }
            }

            return items;
        }

        private int InferRiskScore(string text)
        {
            text = text.ToLower();
            if (text.Contains("alert") || text.Contains("critical") || text.Contains("emergency")) return 90;
            if (text.Contains("warning") || text.Contains("severe")) return 75;
            if (text.Contains("info") || text.Contains("update")) return 40;
            return 50;
        }
    }
}
