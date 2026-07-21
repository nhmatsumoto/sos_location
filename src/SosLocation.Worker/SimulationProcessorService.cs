using SosLocation.Application.Abstractions;
using SosLocation.GeoProcessing.Seismic;

namespace SosLocation.Worker;

/// <summary>
/// Consome a fila durável de simulações de desastre no PostgreSQL. Mesmo
/// padrão de <see cref="JobProcessorService"/> (FOR UPDATE SKIP LOCKED via
/// ISimulationRunStore), mantido como serviço separado — SimulationRun é uma
/// entidade separada de ImportJob por design, não uma variação da mesma.
/// </summary>
public sealed class SimulationProcessorService(
    IServiceScopeFactory scopeFactory,
    ILogger<SimulationProcessorService> logger) : BackgroundService
{
    private static readonly TimeSpan IdleDelay = TimeSpan.FromSeconds(2);
    private readonly string _workerId = $"{Environment.MachineName}-{Guid.NewGuid():N}"[..32];

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("Simulation worker {WorkerId} polling for runs.", _workerId);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var processed = await ProcessNextRunAsync(stoppingToken);
                if (!processed)
                    await Task.Delay(IdleDelay, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Unexpected error in simulation loop; backing off.");
                await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
            }
        }
    }

    private async Task<bool> ProcessNextRunAsync(CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var runs = scope.ServiceProvider.GetRequiredService<ISimulationRunStore>();
        var unitOfWork = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();

        var run = await runs.ReserveNextAsync(_workerId, ct);
        if (run is null) return false;

        logger.LogInformation("Processing simulation {RunId} ({DisasterType}), attempt {Attempt}",
            run.Id, run.DisasterType, run.Attempts);

        try
        {
            var pipeline = scope.ServiceProvider.GetRequiredService<SeismicSimulationPipeline>();
            await pipeline.ExecuteAsync(run, ct);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Simulation {RunId} failed on attempt {Attempt}", run.Id, run.Attempts);
            run.Fail(ex.Message, DateTimeOffset.UtcNow);
            await unitOfWork.SaveChangesAsync(CancellationToken.None);
        }

        return true;
    }
}
