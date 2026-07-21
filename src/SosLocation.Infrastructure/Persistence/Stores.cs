using Microsoft.EntityFrameworkCore;
using SosLocation.Application.Abstractions;
using SosLocation.Domain.Catalog;
using SosLocation.Domain.Cities;
using SosLocation.Domain.Disasters;
using SosLocation.Domain.Features;
using SosLocation.Domain.Jobs;

namespace SosLocation.Infrastructure.Persistence;

public sealed class EfUnitOfWork(SosDbContext context) : IUnitOfWork
{
    public Task SaveChangesAsync(CancellationToken ct) => context.SaveChangesAsync(ct);
}

public sealed class CityStore(SosDbContext context) : ICityStore
{
    public Task<City?> FindByIdAsync(Guid id, CancellationToken ct)
        => context.Cities.FirstOrDefaultAsync(c => c.Id == id, ct);

    public Task<City?> FindBySlugAsync(string slug, CancellationToken ct)
        => context.Cities.FirstOrDefaultAsync(c => c.Slug == slug, ct);

    public async Task<IReadOnlyList<City>> ListAsync(CancellationToken ct)
        => await context.Cities
            .Where(c => context.CityRevisions.Any(r =>
                r.CityId == c.Id && r.Status == CityRevisionStatus.Published))
            .OrderBy(c => c.Name)
            .ToListAsync(ct);

    public async Task AddAsync(City city, CancellationToken ct)
        => await context.Cities.AddAsync(city, ct);
}

public sealed class RevisionStore(SosDbContext context) : IRevisionStore
{
    public Task<CityRevision?> FindByIdAsync(Guid id, CancellationToken ct)
        => context.CityRevisions.FirstOrDefaultAsync(r => r.Id == id, ct);

    public async Task<IReadOnlyList<CityRevision>> ListByCityAsync(Guid cityId, CancellationToken ct)
        => await context.CityRevisions
            .Where(r => r.CityId == cityId && r.Status == CityRevisionStatus.Published)
            .OrderByDescending(r => r.RevisionNumber)
            .ToListAsync(ct);

    public async Task<int> NextRevisionNumberAsync(Guid cityId, CancellationToken ct)
    {
        var max = await context.CityRevisions
            .Where(r => r.CityId == cityId)
            .MaxAsync(r => (int?)r.RevisionNumber, ct);
        return (max ?? 0) + 1;
    }

    public async Task AddAsync(CityRevision revision, CancellationToken ct)
        => await context.CityRevisions.AddAsync(revision, ct);
}

public sealed class DatasetStore(SosDbContext context) : IDatasetStore
{
    public Task<Dataset?> FindByNameAsync(string name, CancellationToken ct)
        => context.Datasets.FirstOrDefaultAsync(d => d.Name == name, ct);

    public Task<DatasetVersion?> FindVersionByChecksumAsync(
        Guid datasetId, string checksum, CancellationToken ct)
        => context.DatasetVersions.FirstOrDefaultAsync(
            version => version.DatasetId == datasetId && version.Checksum == checksum, ct);

    public async Task AddAsync(Dataset dataset, CancellationToken ct)
        => await context.Datasets.AddAsync(dataset, ct);

    public async Task AddVersionAsync(DatasetVersion version, CancellationToken ct)
        => await context.DatasetVersions.AddAsync(version, ct);

    public async Task<IReadOnlyList<(Dataset Dataset, DatasetVersion Version)>> ListVersionsForRevisionAsync(
        Guid revisionId, CancellationToken ct)
    {
        var versionIds = await context.Buildings
            .Where(b => b.CityRevisionId == revisionId && b.SourceDatasetVersionId != null)
            .Select(b => b.SourceDatasetVersionId!.Value)
            .Union(context.Roads
                .Where(r => r.CityRevisionId == revisionId && r.SourceDatasetVersionId != null)
                .Select(r => r.SourceDatasetVersionId!.Value))
            .Union(context.WaterFeatures
                .Where(w => w.CityRevisionId == revisionId && w.SourceDatasetVersionId != null)
                .Select(w => w.SourceDatasetVersionId!.Value))
            .Union(context.LandUseAreas
                .Where(l => l.CityRevisionId == revisionId && l.SourceDatasetVersionId != null)
                .Select(l => l.SourceDatasetVersionId!.Value))
            .Distinct()
            .ToListAsync(ct);

        var pairs = await context.DatasetVersions
            .Where(v => versionIds.Contains(v.Id))
            .Join(context.Datasets, v => v.DatasetId, d => d.Id, (v, d) => new { d, v })
            .ToListAsync(ct);

        return pairs.Select(p => (p.d, p.v)).ToList();
    }
}

public sealed class ImportJobStore(SosDbContext context) : IImportJobStore
{
    public Task<ImportJob?> FindByIdAsync(Guid id, CancellationToken ct)
        => context.ImportJobs.FirstOrDefaultAsync(j => j.Id == id, ct);

    public async Task<IReadOnlyList<ImportJob>> ListRecentAsync(int limit, CancellationToken ct)
        => await context.ImportJobs
            .OrderByDescending(j => j.CreatedAt)
            .Take(limit)
            .ToListAsync(ct);

    public async Task AddAsync(ImportJob job, CancellationToken ct)
        => await context.ImportJobs.AddAsync(job, ct);

    public async Task AddIssueAsync(ProcessingIssue issue, CancellationToken ct)
        => await context.ProcessingIssues.AddAsync(issue, ct);

    public Task ClearIssuesAsync(Guid jobId, CancellationToken ct)
        => context.ProcessingIssues.Where(issue => issue.JobId == jobId).ExecuteDeleteAsync(ct);

    public async Task<IReadOnlyList<ProcessingIssue>> ListIssuesAsync(Guid jobId, CancellationToken ct)
        => await context.ProcessingIssues
            .Where(i => i.JobId == jobId)
            .OrderBy(i => i.CreatedAt)
            .ToListAsync(ct);

    public async Task<ImportJob?> ReserveNextAsync(string workerId, CancellationToken ct)
    {
        // Reserva durável: FOR UPDATE SKIP LOCKED garante que dois workers
        // nunca peguem o mesmo job, sem depender de estado em memória.
        await using var transaction = await context.Database.BeginTransactionAsync(ct);

        var ids = await context.Database
            .SqlQuery<Guid>($@"
                SELECT id AS ""Value"" FROM import_jobs
                WHERE status IN ('Queued', 'Retrying')
                  AND (next_attempt_at IS NULL OR next_attempt_at <= CURRENT_TIMESTAMP)
                ORDER BY COALESCE(next_attempt_at, created_at), created_at
                LIMIT 1
                FOR UPDATE SKIP LOCKED")
            .ToListAsync(ct);

        if (ids.Count == 0)
        {
            await transaction.RollbackAsync(ct);
            return null;
        }

        var job = await context.ImportJobs.FirstAsync(j => j.Id == ids[0], ct);
        job.Start(workerId, DateTimeOffset.UtcNow);
        await context.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return job;
    }
}

public sealed class SimulationRunStore(SosDbContext context) : ISimulationRunStore
{
    public Task<SimulationRun?> FindByIdAsync(Guid id, CancellationToken ct)
        => context.SimulationRuns.FirstOrDefaultAsync(r => r.Id == id, ct);

    public async Task<IReadOnlyList<SimulationRun>> ListRecentAsync(int limit, CancellationToken ct)
        => await context.SimulationRuns
            .OrderByDescending(r => r.CreatedAt)
            .Take(limit)
            .ToListAsync(ct);

    public async Task AddAsync(SimulationRun run, CancellationToken ct)
        => await context.SimulationRuns.AddAsync(run, ct);

    public async Task BulkInsertResponsesAsync(IReadOnlyList<BuildingSeismicResponse> responses, CancellationToken ct)
    {
        await context.BuildingSeismicResponses.AddRangeAsync(responses, ct);
        await context.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<BuildingSeismicResponse>> ListResponsesAsync(Guid runId, CancellationToken ct)
        => await context.BuildingSeismicResponses
            .Where(r => r.SimulationRunId == runId)
            .ToListAsync(ct);

    public Task<SimulationRunStatus?> GetStatusAsync(Guid id, CancellationToken ct)
        => context.SimulationRuns.AsNoTracking()
            .Where(r => r.Id == id)
            .Select(r => (SimulationRunStatus?)r.Status)
            .FirstOrDefaultAsync(ct);

    public async Task<SimulationRun?> ReserveNextAsync(string workerId, CancellationToken ct)
    {
        // Reserva durável: FOR UPDATE SKIP LOCKED garante que dois workers
        // nunca peguem o mesmo run, sem depender de estado em memória.
        await using var transaction = await context.Database.BeginTransactionAsync(ct);

        var ids = await context.Database
            .SqlQuery<Guid>($@"
                SELECT id AS ""Value"" FROM simulation_runs
                WHERE status IN ('Queued', 'Retrying')
                ORDER BY created_at
                LIMIT 1
                FOR UPDATE SKIP LOCKED")
            .ToListAsync(ct);

        if (ids.Count == 0)
        {
            await transaction.RollbackAsync(ct);
            return null;
        }

        var run = await context.SimulationRuns.FirstAsync(r => r.Id == ids[0], ct);
        run.Start(workerId, DateTimeOffset.UtcNow);
        await context.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return run;
    }
}

public sealed class FeatureStore(SosDbContext context) : IFeatureWriter, IFeatureReader
{
    public async Task DeleteRevisionFeaturesAsync(Guid revisionId, CancellationToken ct)
    {
        await context.Buildings.Where(b => b.CityRevisionId == revisionId).ExecuteDeleteAsync(ct);
        await context.Roads.Where(r => r.CityRevisionId == revisionId).ExecuteDeleteAsync(ct);
        await context.WaterFeatures.Where(w => w.CityRevisionId == revisionId).ExecuteDeleteAsync(ct);
        await context.LandUseAreas.Where(l => l.CityRevisionId == revisionId).ExecuteDeleteAsync(ct);
    }

    public async Task BulkInsertBuildingsAsync(IReadOnlyList<Building> buildings, CancellationToken ct)
    {
        await context.Buildings.AddRangeAsync(buildings, ct);
        await context.SaveChangesAsync(ct);
    }

    public async Task BulkInsertRoadsAsync(IReadOnlyList<Road> roads, CancellationToken ct)
    {
        await context.Roads.AddRangeAsync(roads, ct);
        await context.SaveChangesAsync(ct);
    }

    public async Task BulkInsertWaterAsync(IReadOnlyList<WaterFeature> water, CancellationToken ct)
    {
        await context.WaterFeatures.AddRangeAsync(water, ct);
        await context.SaveChangesAsync(ct);
    }

    public async Task BulkInsertLandUseAsync(IReadOnlyList<LandUseArea> landUse, CancellationToken ct)
    {
        await context.LandUseAreas.AddRangeAsync(landUse, ct);
        await context.SaveChangesAsync(ct);
    }

    public Task<Building?> FindBuildingAsync(Guid id, CancellationToken ct)
        => context.Buildings.FirstOrDefaultAsync(b => b.Id == id, ct);

    public Task<Road?> FindRoadAsync(Guid id, CancellationToken ct)
        => context.Roads.FirstOrDefaultAsync(r => r.Id == id, ct);

    public Task<WaterFeature?> FindWaterAsync(Guid id, CancellationToken ct)
        => context.WaterFeatures.FirstOrDefaultAsync(w => w.Id == id, ct);

    public async Task<IReadOnlyList<Road>> ListRailwaysAsync(Guid revisionId, CancellationToken ct)
        => await context.Roads
            .Where(r => r.CityRevisionId == revisionId && r.RoadClass == "rail")
            .OrderBy(r => r.ExternalId)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<Building>> ListBuildingsAsync(Guid revisionId, CancellationToken ct)
        => await context.Buildings
            .Where(b => b.CityRevisionId == revisionId)
            .ToListAsync(ct);

    public async Task<(int Buildings, int Roads, int Water, int LandUse)> CountByRevisionAsync(
        Guid revisionId, CancellationToken ct)
    {
        var buildings = await context.Buildings.CountAsync(b => b.CityRevisionId == revisionId, ct);
        var roads = await context.Roads.CountAsync(r => r.CityRevisionId == revisionId, ct);
        var water = await context.WaterFeatures.CountAsync(w => w.CityRevisionId == revisionId, ct);
        var landUse = await context.LandUseAreas.CountAsync(l => l.CityRevisionId == revisionId, ct);
        return (buildings, roads, water, landUse);
    }

    public async Task<double> ObservedHeightRatioAsync(Guid revisionId, CancellationToken ct)
    {
        var total = await context.Buildings.CountAsync(b => b.CityRevisionId == revisionId, ct);
        if (total == 0) return 0;
        var observed = await context.Buildings.CountAsync(
            b => b.CityRevisionId == revisionId && b.HeightSource == HeightSource.Observed, ct);
        return (double)observed / total;
    }
}
