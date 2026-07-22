using Microsoft.EntityFrameworkCore;
using SosLocation.Application.Abstractions;
using SosLocation.Application.Import;
using SosLocation.Domain.Jobs;
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
            var now = DateTimeOffset.UtcNow;
            var retryAt = job.Attempts < ImportJob.MaxAttempts
                ? now.Add(RetryDelay(job.Attempts))
                : (DateTimeOffset?)null;

            if (retryAt is null)
            {
                logger.LogError(ex,
                    "Import job {JobId} ({JobType}) failed permanently after {Attempt}/{MaxAttempts} attempts at stage {Stage}; city {CityId}, revision {RevisionId}",
                    job.Id, job.JobType, job.Attempts, ImportJob.MaxAttempts,
                    job.CurrentStage, job.CityId, job.CityRevisionId);
            }
            else
            {
                logger.LogWarning(ex,
                    "Import job {JobId} ({JobType}) failed on attempt {Attempt}/{MaxAttempts} at stage {Stage}",
                    job.Id, job.JobType, job.Attempts, ImportJob.MaxAttempts, job.CurrentStage);
            }

            job.Fail(ex.Message, now, retryAt);

            if (retryAt is null && job.CityRevisionId is { } revisionId)
            {
                var revisions = scope.ServiceProvider.GetRequiredService<IRevisionStore>();
                var revision = await revisions.FindByIdAsync(revisionId, CancellationToken.None);
                if (revision is not null && revision.Status is not
                    (SosLocation.Domain.Cities.CityRevisionStatus.Published
                    or SosLocation.Domain.Cities.CityRevisionStatus.Archived))
                {
                    revision.MarkFailed();
                }
            }

            await unitOfWork.SaveChangesAsync(CancellationToken.None);

            if (retryAt is not null)
                logger.LogWarning("Job {JobId} scheduled for retry at {RetryAt}", job.Id, retryAt);
        }

        return true;
    }

    private static TimeSpan RetryDelay(int attempts)
    {
        var exponentialSeconds = 5 * Math.Pow(3, Math.Max(0, attempts - 1));
        var jitterSeconds = Random.Shared.NextDouble() * 3;
        return TimeSpan.FromSeconds(exponentialSeconds + jitterSeconds);
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
