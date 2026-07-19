using Microsoft.EntityFrameworkCore;
using SosLocation.Application.Abstractions;
using SosLocation.Application.Import;
using SosLocation.Infrastructure.Persistence;

namespace SosLocation.Worker;

/// <summary>
/// Consome a fila durável de jobs no PostgreSQL. Cada iteração reserva um job com
/// FOR UPDATE SKIP LOCKED (via IImportJobStore) e executa o pipeline completo.
/// Nenhum estado de processamento vive apenas em memória.
/// </summary>
public sealed class JobProcessorService(
    IServiceScopeFactory scopeFactory,
    ILogger<JobProcessorService> logger) : BackgroundService
{
    private static readonly TimeSpan IdleDelay = TimeSpan.FromSeconds(2);
    private readonly string _workerId = $"{Environment.MachineName}-{Guid.NewGuid():N}"[..32];

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("Worker {WorkerId} starting; waiting for database...", _workerId);
        await WaitForDatabaseAsync(stoppingToken);
        logger.LogInformation("Worker {WorkerId} ready; polling for jobs.", _workerId);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var processed = await ProcessNextJobAsync(stoppingToken);
                if (!processed)
                    await Task.Delay(IdleDelay, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Unexpected error in job loop; backing off.");
                await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
            }
        }
    }

    private async Task<bool> ProcessNextJobAsync(CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var jobs = scope.ServiceProvider.GetRequiredService<IImportJobStore>();
        var unitOfWork = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();

        var job = await jobs.ReserveNextAsync(_workerId, ct);
        if (job is null) return false;

        logger.LogInformation("Processing job {JobId} ({JobType}), attempt {Attempt}",
            job.Id, job.JobType, job.Attempts);

        try
        {
            var pipeline = scope.ServiceProvider.GetRequiredService<ImportPipeline>();
            await pipeline.ExecuteAsync(job, ct);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Job {JobId} failed on attempt {Attempt}", job.Id, job.Attempts);
            job.Fail(ex.Message, DateTimeOffset.UtcNow);
            await unitOfWork.SaveChangesAsync(CancellationToken.None);
        }

        return true;
    }

    /// <summary>Espera as migrations (aplicadas pela API) ficarem completas; aplica localmente como fallback.</summary>
    private async Task WaitForDatabaseAsync(CancellationToken ct)
    {
        var deadline = DateTimeOffset.UtcNow.AddSeconds(90);
        while (!ct.IsCancellationRequested)
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                var context = scope.ServiceProvider.GetRequiredService<SosDbContext>();
                var pending = await context.Database.GetPendingMigrationsAsync(ct);
                if (!pending.Any()) return;

                if (DateTimeOffset.UtcNow > deadline)
                {
                    logger.LogWarning("Migrations still pending after 90s; applying from worker.");
                    var logger2 = scope.ServiceProvider.GetRequiredService<ILogger<JobProcessorService>>();
                    await DbInitializer.InitializeAsync(context, logger2, ct);
                    return;
                }
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogInformation("Database not reachable yet: {Message}", ex.Message);
            }

            await Task.Delay(TimeSpan.FromSeconds(3), ct);
        }
    }
}
