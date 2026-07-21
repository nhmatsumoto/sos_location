using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SosLocation.Application.Import;
using SosLocation.Domain.Jobs;

namespace SosLocation.Infrastructure.Persistence;

/// <summary>
/// Aplica migrations de forma resiliente e semeia o job de importação da fixture
/// de demonstração quando o banco está vazio (execução offline garantida).
/// </summary>
public static class DbInitializer
{
    public static async Task InitializeAsync(SosDbContext context, ILogger logger, CancellationToken ct)
    {
        const int maxAttempts = 10;
        for (var attempt = 1; ; attempt++)
        {
            try
            {
                await context.Database.MigrateAsync(ct);
                break;
            }
            catch (Exception ex) when (attempt < maxAttempts && ex is not OperationCanceledException)
            {
                logger.LogWarning(ex, "Database not ready (attempt {Attempt}/{Max}); retrying in 3s...",
                    attempt, maxAttempts);
                await Task.Delay(TimeSpan.FromSeconds(3), ct);
            }
        }

        await SeedDemoFixtureJobAsync(context, logger, ct);
    }

    private static async Task SeedDemoFixtureJobAsync(SosDbContext context, ILogger logger, CancellationToken ct)
    {
        var hasFixtureJob = await context.ImportJobs.AnyAsync(j => j.JobType == "fixture-import", ct);
        if (hasFixtureJob) return;

        var request = new ImportRequest
        {
            Name = "Demo District",
            Source = ImportSources.Fixture,
            ReconstructionProfile = "osm-basic-v1",
        };

        await context.ImportJobs.AddAsync(new ImportJob
        {
            JobType = "fixture-import",
            Request = JsonSerializer.Serialize(request, new JsonSerializerOptions(JsonSerializerDefaults.Web)),
        }, ct);
        await context.SaveChangesAsync(ct);
        logger.LogInformation("Seeded demo fixture import job (offline demo city).");
    }
}
