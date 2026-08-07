using SosLocation.Application.Abstractions;
using SosLocation.Infrastructure.External;

namespace SosLocation.Worker;

public sealed class DisasterCollectionOptions
{
    public const string SectionName = "DisasterCollection";
    public bool Enabled { get; set; } = true;
    public int IntervalMinutes { get; set; } = 30;
}

/// <summary>Atualiza cenários ativos em segundo plano. É idempotente: dados
/// iguais permanecem no cache e não duplicam observações no PostgreSQL.</summary>
public sealed class DisasterCollectionWorkerService(
    IServiceScopeFactory scopeFactory,
    DisasterCollectionOptions options,
    ILogger<DisasterCollectionWorkerService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!options.Enabled)
        {
            logger.LogInformation("Disaster collection worker is disabled.");
            return;
        }
        var interval = TimeSpan.FromMinutes(Math.Max(1, options.IntervalMinutes));
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                var store = scope.ServiceProvider.GetRequiredService<IDisasterScenarioStore>();
                var service = scope.ServiceProvider.GetRequiredService<DisasterCollectionService>();
                foreach (var scenario in await store.ListAsync(stoppingToken))
                {
                    var result = await service.CollectAsync(scenario, stoppingToken);
                    logger.LogInformation("Collected {Added} new and reused {Reused} source documents for {ScenarioKey}",
                        result.Added, result.Reused, scenario.ScenarioKey);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception ex) { logger.LogError(ex, "Disaster collection cycle failed."); }
            await Task.Delay(interval, stoppingToken);
        }
    }
}
