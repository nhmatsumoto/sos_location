using Microsoft.EntityFrameworkCore;
using NpgsqlTypes;
using SosLocation.Application.Abstractions;
using SosLocation.Domain.BuildingIntelligence;
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
            .AsNoTracking()
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
            .AsNoTracking()
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

    public async Task DeleteAsync(Guid revisionId, CancellationToken ct)
        => await context.CityRevisions.Where(r => r.Id == revisionId).ExecuteDeleteAsync(ct);
}

public sealed class RiskZoneStore(SosDbContext context) : IRiskZoneStore
{
    public Task<RiskZone?> FindByIdAsync(Guid id, CancellationToken ct)
        => context.RiskZones.FirstOrDefaultAsync(z => z.Id == id, ct);

    public async Task<IReadOnlyList<RiskZone>> ListByRevisionAsync(Guid revisionId, CancellationToken ct)
        => await context.RiskZones
            .AsNoTracking()
            .Where(z => z.CityRevisionId == revisionId)
            .OrderByDescending(z => z.CreatedAt)
            .ToListAsync(ct);

    public async Task AddAsync(RiskZone zone, CancellationToken ct)
        => await context.RiskZones.AddAsync(zone, ct);

    public async Task DeleteAsync(Guid zoneId, CancellationToken ct)
        => await context.RiskZones.Where(z => z.Id == zoneId).ExecuteDeleteAsync(ct);

    public async Task<RiskZoneExposure> ComputeExposureAsync(RiskZone zone, CancellationToken ct)
    {
        // .Intersects() traduz para ST_Intersects via Npgsql.EntityFrameworkCore.PostgreSQL.NetTopologySuite,
        // usando o índice GiST de buildings.footprint. Soma de altura por grupo em vez
        // de Count/Average/GroupBy separados: uma única ida ao banco em vez de três,
        // com a contagem e a média totais recompostas a partir dos grupos.
        var grouped = await context.Buildings
            .AsNoTracking()
            .Where(b => b.CityRevisionId == zone.CityRevisionId && b.Footprint.Intersects(zone.Geometry))
            .GroupBy(b => b.BuildingType)
            .Select(g => new { Type = g.Key, Count = g.Count(), TotalHeight = g.Sum(b => b.HeightMeters) })
            .OrderByDescending(t => t.Count)
            .ToListAsync(ct);

        if (grouped.Count == 0) return new RiskZoneExposure(0, 0, []);

        var totalCount = grouped.Sum(g => g.Count);
        var avgHeight = grouped.Sum(g => g.TotalHeight) / totalCount;
        var byType = grouped.Select(g => new BuildingTypeCount(g.Type, g.Count)).ToList();

        return new RiskZoneExposure(totalCount, avgHeight, byType);
    }
}

public sealed class DisasterScenarioStore(SosDbContext context) : IDisasterScenarioStore
{
    public Task<DisasterScenario?> FindByKeyAsync(string scenarioKey, CancellationToken ct)
        => context.DisasterScenarios.FirstOrDefaultAsync(s => s.ScenarioKey == scenarioKey, ct);
    public Task<DisasterScenario?> FindByIdAsync(Guid id, CancellationToken ct)
        => context.DisasterScenarios.FirstOrDefaultAsync(s => s.Id == id, ct);
    public Task<OperationalMapFeature?> FindMapFeatureAsync(Guid featureId, CancellationToken ct)
        => context.OperationalMapFeatures.FirstOrDefaultAsync(f => f.Id == featureId, ct);
    public async Task<IReadOnlyList<DisasterScenario>> ListAsync(CancellationToken ct)
        => await context.DisasterScenarios.AsNoTracking().OrderByDescending(s => s.SimulationClockOrigin).ToListAsync(ct);
    public async Task<IReadOnlyList<OperationalMapFeature>> ListMapFeaturesAsync(Guid scenarioId, CancellationToken ct)
        => await context.OperationalMapFeatures.AsNoTracking().Where(f => f.DisasterScenarioId == scenarioId && f.EffectiveTo == null)
            .OrderBy(f => f.FeatureType).ThenBy(f => f.Name).ToListAsync(ct);
    public async Task<IReadOnlyList<ImpactObservation>> ListImpactsAsync(Guid scenarioId, CancellationToken ct)
        => await context.ImpactObservations.AsNoTracking().Where(o => o.DisasterScenarioId == scenarioId)
            .OrderByDescending(o => o.ObservedAt).ThenByDescending(o => o.CapturedAt).ToListAsync(ct);
    public async Task AddAsync(DisasterScenario scenario, CancellationToken ct) => await context.DisasterScenarios.AddAsync(scenario, ct);
    public async Task AddMapFeatureAsync(OperationalMapFeature feature, CancellationToken ct) => await context.OperationalMapFeatures.AddAsync(feature, ct);
    public async Task CloseMapFeatureAsync(Guid featureId, DateTimeOffset closedAt, CancellationToken ct)
        => await context.OperationalMapFeatures
            .Where(f => f.Id == featureId && f.EffectiveTo == null)
            .ExecuteUpdateAsync(setters => setters.SetProperty(f => f.EffectiveTo, closedAt), ct);
    public async Task AddObservationAsync(SourceObservation observation, CancellationToken ct) => await context.SourceObservations.AddAsync(observation, ct);
    public async Task AddImpactAsync(ImpactObservation observation, CancellationToken ct) => await context.ImpactObservations.AddAsync(observation, ct);
    public Task<bool> HasSourceObservationAsync(Guid scenarioId, string sourceId, string payloadSha256, CancellationToken ct)
        => context.SourceObservations.AnyAsync(o => o.DisasterScenarioId == scenarioId && o.SourceId == sourceId && o.PayloadSha256 == payloadSha256, ct);
    public async Task<IReadOnlyList<SourceObservation>> ListSourceObservationsAsync(Guid scenarioId, CancellationToken ct)
        => await context.SourceObservations.AsNoTracking().Where(o => o.DisasterScenarioId == scenarioId)
            .OrderByDescending(o => o.CapturedAt).ToListAsync(ct);
}

public sealed class DatasetStore(SosDbContext context) : IDatasetStore
{
    public Task<Dataset?> FindByNameAsync(string name, CancellationToken ct)
        => context.Datasets.FirstOrDefaultAsync(d => d.Name == name, ct);

    public Task<DatasetVersion?> FindVersionByChecksumAsync(
        Guid datasetId, string checksum, CancellationToken ct)
        => context.DatasetVersions.FirstOrDefaultAsync(
            version => version.DatasetId == datasetId && version.Checksum == checksum, ct);

    public Task<DatasetVersion?> FindVersionByIdAsync(Guid versionId, CancellationToken ct)
        => context.DatasetVersions.FirstOrDefaultAsync(version => version.Id == versionId, ct);

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
            .AsNoTracking()
            // Falhas terminais permanecem visíveis para expor o diagnóstico ao
            // usuário; cancelamentos voluntários continuam fora da listagem.
            .Where(j => j.Status != JobStatus.Cancelled)
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

    public async Task DeleteAsync(Guid jobId, CancellationToken ct)
        => await context.ImportJobs.Where(j => j.Id == jobId).ExecuteDeleteAsync(ct);

    public Task<ImportJob?> ReserveNextAsync(string workerId, CancellationToken ct)
    {
        // EnableRetryOnFailure exige que transações explícitas rodem dentro da
        // execution strategy — do contrário o EF Core lança em runtime.
        var strategy = context.Database.CreateExecutionStrategy();
        return strategy.ExecuteAsync(async () =>
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
        });
    }
}

public sealed class SimulationRunStore(SosDbContext context) : ISimulationRunStore
{
    // O COMMIT do COPY precisa atualizar FKs/índices de uma cidade inteira e
    // pode exceder os 30 s padrão do Npgsql. Mantemos um teto explícito e
    // restrito a esta operação pesada, sem relaxar timeouts das consultas web.
    private static readonly TimeSpan BulkCopyTimeout = TimeSpan.FromMinutes(5);

    public Task<SimulationRun?> FindByIdAsync(Guid id, CancellationToken ct)
        => context.SimulationRuns.FirstOrDefaultAsync(r => r.Id == id, ct);

    public async Task<IReadOnlyList<SimulationRun>> ListRecentAsync(int limit, CancellationToken ct)
        => await context.SimulationRuns
            .AsNoTracking()
            .OrderByDescending(r => r.CreatedAt)
            .Take(limit)
            .ToListAsync(ct);

    public async Task AddAsync(SimulationRun run, CancellationToken ct)
        => await context.SimulationRuns.AddAsync(run, ct);

    public async Task BulkInsertResponsesAsync(IReadOnlyList<BuildingSeismicResponse> responses, CancellationToken ct)
    {
        if (responses.Count == 0) return;

        // Torna um retry do mesmo run idempotente caso uma tentativa anterior
        // tenha persistido resultados antes de falhar numa etapa posterior.
        var runId = responses[0].SimulationRunId;
        await context.BuildingSeismicResponses
            .Where(response => response.SimulationRunId == runId)
            .ExecuteDeleteAsync(ct);

        // COPY binário evita criar/tracking de centenas de milhares de entries
        // no ChangeTracker e reduz a persistência a um único fluxo PostgreSQL.
        await PostgresBulkCopy.WriteAsync(context, """
            COPY building_seismic_responses
                (id, simulation_run_id, building_id, natural_period_seconds,
                 peak_ground_acceleration_g, peak_ground_velocity_cms,
                 spectral_acceleration_g, peak_drift_ratio, damage_state, created_at)
            FROM STDIN (FORMAT BINARY)
            """, responses, static async (writer, response, token) =>
        {
            await writer.WriteAsync(response.Id, NpgsqlDbType.Uuid, token);
            await writer.WriteAsync(response.SimulationRunId, NpgsqlDbType.Uuid, token);
            await writer.WriteAsync(response.BuildingId, NpgsqlDbType.Uuid, token);
            await writer.WriteAsync(response.NaturalPeriodSeconds, NpgsqlDbType.Double, token);
            await writer.WriteAsync(response.PeakGroundAccelerationG, NpgsqlDbType.Double, token);
            await writer.WriteAsync(response.PeakGroundVelocityCms, NpgsqlDbType.Double, token);
            await writer.WriteAsync(response.SpectralAccelerationG, NpgsqlDbType.Double, token);
            await writer.WriteAsync(response.PeakDriftRatio, NpgsqlDbType.Double, token);
            await writer.WriteAsync(response.DamageState.ToString(), NpgsqlDbType.Varchar, token);
            await writer.WriteAsync(response.CreatedAt, NpgsqlDbType.TimestampTz, token);
        }, ct, BulkCopyTimeout);
    }

    public async Task<IReadOnlyList<BuildingSeismicResponse>> ListResponsesAsync(Guid runId, CancellationToken ct)
        => await context.BuildingSeismicResponses
            .AsNoTracking()
            .Where(r => r.SimulationRunId == runId)
            .ToListAsync(ct);

    public Task<BuildingSeismicResponse?> FindResponseAsync(
        Guid runId, Guid buildingId, CancellationToken ct)
        => context.BuildingSeismicResponses
            .AsNoTracking()
            .FirstOrDefaultAsync(
                response => response.SimulationRunId == runId && response.BuildingId == buildingId,
                ct);

    public Task<SimulationRunStatus?> GetStatusAsync(Guid id, CancellationToken ct)
        => context.SimulationRuns.AsNoTracking()
            .Where(r => r.Id == id)
            .Select(r => (SimulationRunStatus?)r.Status)
            .FirstOrDefaultAsync(ct);

    public Task<SimulationRun?> ReserveNextAsync(string workerId, CancellationToken ct)
    {
        // EnableRetryOnFailure exige que transações explícitas rodem dentro da
        // execution strategy — do contrário o EF Core lança em runtime.
        var strategy = context.Database.CreateExecutionStrategy();
        return strategy.ExecuteAsync(async () =>
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
        });
    }
}

public sealed class FeatureStore(SosDbContext context) : IFeatureWriter, IFeatureReader
{
    // Sem override, o COPY herda o CommandTimeout padrão do Npgsql (~30s), curto
    // demais para uma cidade densa (ex.: centro de São Paulo produziu timeout real
    // em produção — "Timeout during writing attempt" em pleno BulkInsertBuildingsAsync).
    // Mesmo raciocínio já aplicado a SimulationRunStore.BulkInsertResponsesAsync.
    private static readonly TimeSpan BulkCopyTimeout = TimeSpan.FromMinutes(10);

    public async Task DeleteRevisionFeaturesAsync(Guid revisionId, CancellationToken ct)
    {
        await context.Buildings.Where(b => b.CityRevisionId == revisionId).ExecuteDeleteAsync(ct);
        await context.Roads.Where(r => r.CityRevisionId == revisionId).ExecuteDeleteAsync(ct);
        await context.WaterFeatures.Where(w => w.CityRevisionId == revisionId).ExecuteDeleteAsync(ct);
        await context.LandUseAreas.Where(l => l.CityRevisionId == revisionId).ExecuteDeleteAsync(ct);
    }

    // COPY binário em vez de AddRangeAsync/SaveChangesAsync: uma importação OSM de
    // cidade grande facilmente produz dezenas/centenas de milhares de features, e
    // popular o ChangeTracker do EF Core com todas elas é o mesmo custo que já
    // motivou o COPY em SimulationRunStore.BulkInsertResponsesAsync.
    public Task BulkInsertBuildingsAsync(IReadOnlyList<Building> buildings, CancellationToken ct)
        => PostgresBulkCopy.WriteAsync(context, """
            COPY buildings
                (id, city_revision_id, external_id, footprint, centroid, height_m, min_height_m,
                 ground_elevation_m, roof_height_m, building_levels, roof_levels, building_type,
                 roof_shape, height_source, confidence, source_dataset_version_id, tags, created_at)
            FROM STDIN (FORMAT BINARY)
            """, buildings, static async (writer, b, token) =>
        {
            await writer.WriteAsync(b.Id, NpgsqlDbType.Uuid, token);
            await writer.WriteAsync(b.CityRevisionId, NpgsqlDbType.Uuid, token);
            await writer.WriteAsync(b.ExternalId, NpgsqlDbType.Varchar, token);
            await writer.WriteAsync(b.Footprint, token); // tipo plugin (NetTopologySuite) — sem NpgsqlDbType explícito
            await writer.WriteAsync(b.Centroid, token);
            await writer.WriteAsync(b.HeightMeters, NpgsqlDbType.Double, token);
            await writer.WriteAsync(b.MinHeightMeters, NpgsqlDbType.Double, token);
            await writer.WriteAsync(b.GroundElevationMeters, NpgsqlDbType.Double, token);
            await writer.WriteAsync(b.RoofHeightMeters, NpgsqlDbType.Double, token);
            await writer.WriteNullableAsync(b.BuildingLevels, NpgsqlDbType.Integer, token);
            await writer.WriteNullableAsync(b.RoofLevels, NpgsqlDbType.Integer, token);
            await writer.WriteAsync(b.BuildingType, NpgsqlDbType.Varchar, token);
            await writer.WriteNullableAsync(b.RoofShape, NpgsqlDbType.Varchar, token);
            await writer.WriteAsync(b.HeightSource.ToString(), NpgsqlDbType.Varchar, token);
            await writer.WriteAsync(b.Confidence.Value, NpgsqlDbType.Double, token);
            await writer.WriteNullableAsync(b.SourceDatasetVersionId, NpgsqlDbType.Uuid, token);
            await writer.WriteNullableAsync(b.Tags, NpgsqlDbType.Jsonb, token);
            await writer.WriteAsync(b.CreatedAt, NpgsqlDbType.TimestampTz, token);
        }, ct, BulkCopyTimeout);

    public Task BulkInsertRoadsAsync(IReadOnlyList<Road> roads, CancellationToken ct)
        => PostgresBulkCopy.WriteAsync(context, """
            COPY roads
                (id, city_revision_id, external_id, geometry, road_class, name, width_m, lanes,
                 is_bridge, is_tunnel, confidence, source_dataset_version_id, tags, created_at)
            FROM STDIN (FORMAT BINARY)
            """, roads, static async (writer, r, token) =>
        {
            await writer.WriteAsync(r.Id, NpgsqlDbType.Uuid, token);
            await writer.WriteAsync(r.CityRevisionId, NpgsqlDbType.Uuid, token);
            await writer.WriteAsync(r.ExternalId, NpgsqlDbType.Varchar, token);
            await writer.WriteAsync(r.Geometry, token);
            await writer.WriteAsync(r.RoadClass, NpgsqlDbType.Varchar, token);
            await writer.WriteNullableAsync(r.Name, NpgsqlDbType.Varchar, token);
            await writer.WriteNullableAsync(r.WidthMeters, NpgsqlDbType.Double, token);
            await writer.WriteNullableAsync(r.Lanes, NpgsqlDbType.Integer, token);
            await writer.WriteAsync(r.IsBridge, NpgsqlDbType.Boolean, token);
            await writer.WriteAsync(r.IsTunnel, NpgsqlDbType.Boolean, token);
            await writer.WriteAsync(r.Confidence.Value, NpgsqlDbType.Double, token);
            await writer.WriteNullableAsync(r.SourceDatasetVersionId, NpgsqlDbType.Uuid, token);
            await writer.WriteNullableAsync(r.Tags, NpgsqlDbType.Jsonb, token);
            await writer.WriteAsync(r.CreatedAt, NpgsqlDbType.TimestampTz, token);
        }, ct, BulkCopyTimeout);

    public Task BulkInsertWaterAsync(IReadOnlyList<WaterFeature> water, CancellationToken ct)
        => PostgresBulkCopy.WriteAsync(context, """
            COPY water_features
                (id, city_revision_id, external_id, geometry, water_type, name,
                 confidence, source_dataset_version_id, tags, created_at)
            FROM STDIN (FORMAT BINARY)
            """, water, static async (writer, w, token) =>
        {
            await writer.WriteAsync(w.Id, NpgsqlDbType.Uuid, token);
            await writer.WriteAsync(w.CityRevisionId, NpgsqlDbType.Uuid, token);
            await writer.WriteAsync(w.ExternalId, NpgsqlDbType.Varchar, token);
            await writer.WriteAsync(w.Geometry, token);
            await writer.WriteAsync(w.WaterType, NpgsqlDbType.Varchar, token);
            await writer.WriteNullableAsync(w.Name, NpgsqlDbType.Varchar, token);
            await writer.WriteAsync(w.Confidence.Value, NpgsqlDbType.Double, token);
            await writer.WriteNullableAsync(w.SourceDatasetVersionId, NpgsqlDbType.Uuid, token);
            await writer.WriteNullableAsync(w.Tags, NpgsqlDbType.Jsonb, token);
            await writer.WriteAsync(w.CreatedAt, NpgsqlDbType.TimestampTz, token);
        }, ct, BulkCopyTimeout);

    public Task BulkInsertLandUseAsync(IReadOnlyList<LandUseArea> landUse, CancellationToken ct)
        => PostgresBulkCopy.WriteAsync(context, """
            COPY land_use_areas
                (id, city_revision_id, external_id, geometry, land_use_type,
                 confidence, source_dataset_version_id, tags, created_at)
            FROM STDIN (FORMAT BINARY)
            """, landUse, static async (writer, l, token) =>
        {
            await writer.WriteAsync(l.Id, NpgsqlDbType.Uuid, token);
            await writer.WriteAsync(l.CityRevisionId, NpgsqlDbType.Uuid, token);
            await writer.WriteAsync(l.ExternalId, NpgsqlDbType.Varchar, token);
            await writer.WriteAsync(l.Geometry, token);
            await writer.WriteAsync(l.LandUseType, NpgsqlDbType.Varchar, token);
            await writer.WriteAsync(l.Confidence.Value, NpgsqlDbType.Double, token);
            await writer.WriteNullableAsync(l.SourceDatasetVersionId, NpgsqlDbType.Uuid, token);
            await writer.WriteNullableAsync(l.Tags, NpgsqlDbType.Jsonb, token);
            await writer.WriteAsync(l.CreatedAt, NpgsqlDbType.TimestampTz, token);
        }, ct, BulkCopyTimeout);

    public Task<Building?> FindBuildingAsync(Guid id, CancellationToken ct)
        => context.Buildings.AsNoTracking().FirstOrDefaultAsync(b => b.Id == id, ct);

    public Task<Road?> FindRoadAsync(Guid id, CancellationToken ct)
        => context.Roads.AsNoTracking().FirstOrDefaultAsync(r => r.Id == id, ct);

    public Task<WaterFeature?> FindWaterAsync(Guid id, CancellationToken ct)
        => context.WaterFeatures.AsNoTracking().FirstOrDefaultAsync(w => w.Id == id, ct);

    public async Task<IReadOnlyList<Road>> ListRailwaysAsync(Guid revisionId, CancellationToken ct)
        => await context.Roads
            .AsNoTracking()
            .Where(r => r.CityRevisionId == revisionId && r.RoadClass == "rail")
            .OrderBy(r => r.ExternalId)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<SimulationBuildingInput>> ListSimulationBuildingsAsync(
        Guid revisionId, CancellationToken ct)
        => await context.Buildings
            .AsNoTracking()
            .Where(b => b.CityRevisionId == revisionId)
            .Select(b => new SimulationBuildingInput(
                b.Id, b.Centroid.X, b.Centroid.Y, b.HeightMeters))
            .ToListAsync(ct);

    // Uma única ida ao banco (4 subconsultas escalares) em vez de 4 CountAsync
    // sequenciais na mesma conexão — não paralelizável de qualquer forma, já
    // que DbContext não é thread-safe para operações concorrentes.
    public async Task<(int Buildings, int Roads, int Water, int LandUse)> CountByRevisionAsync(
        Guid revisionId, CancellationToken ct)
    {
        var row = await context.Database.SqlQuery<FeatureCounts>($"""
            SELECT
                (SELECT COUNT(*)::int FROM buildings WHERE city_revision_id = {revisionId}) AS "Buildings",
                (SELECT COUNT(*)::int FROM roads WHERE city_revision_id = {revisionId}) AS "Roads",
                (SELECT COUNT(*)::int FROM water_features WHERE city_revision_id = {revisionId}) AS "Water",
                (SELECT COUNT(*)::int FROM land_use_areas WHERE city_revision_id = {revisionId}) AS "LandUse"
            """).SingleAsync(ct);
        return (row.Buildings, row.Roads, row.Water, row.LandUse);
    }

    private sealed record FeatureCounts(int Buildings, int Roads, int Water, int LandUse);

    public async Task<double> ObservedHeightRatioAsync(Guid revisionId, CancellationToken ct)
    {
        var total = await context.Buildings.CountAsync(b => b.CityRevisionId == revisionId, ct);
        if (total == 0) return 0;
        var observed = await context.Buildings.CountAsync(
            b => b.CityRevisionId == revisionId && b.HeightSource == HeightSource.Observed, ct);
        return (double)observed / total;
    }
}

public sealed class BuildingObservationStore(SosDbContext context) : IBuildingObservationStore
{
    public Task<BuildingObservation?> FindByIdAsync(Guid id, CancellationToken ct)
        => context.BuildingObservations.FirstOrDefaultAsync(o => o.Id == id, ct);

    public async Task AddAsync(BuildingObservation observation, CancellationToken ct)
        => await context.BuildingObservations.AddAsync(observation, ct);
}

public sealed class BuildingFootprintCandidateStore(SosDbContext context) : IBuildingFootprintCandidateStore
{
    public Task<BuildingFootprintCandidate?> FindByIdAsync(Guid id, CancellationToken ct)
        => context.BuildingFootprintCandidates.FirstOrDefaultAsync(c => c.Id == id, ct);

    public async Task<IReadOnlyList<BuildingFootprintCandidate>> ListByObservationAsync(Guid observationId, CancellationToken ct)
        => await context.BuildingFootprintCandidates
            .AsNoTracking()
            .Where(c => c.ObservationId == observationId)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync(ct);

    public async Task AddAsync(BuildingFootprintCandidate candidate, CancellationToken ct)
        => await context.BuildingFootprintCandidates.AddAsync(candidate, ct);
}

public sealed class BuildingFootprintStore(SosDbContext context) : IBuildingFootprintStore
{
    public Task<BuildingFootprint?> FindByIdAsync(Guid id, CancellationToken ct)
        => context.BuildingFootprints.FirstOrDefaultAsync(f => f.Id == id, ct);

    public async Task AddAsync(BuildingFootprint footprint, CancellationToken ct)
        => await context.BuildingFootprints.AddAsync(footprint, ct);
}

public sealed class BuildingClassificationStore(SosDbContext context) : IBuildingClassificationStore
{
    public async Task AddAsync(BuildingClassification classification, CancellationToken ct)
        => await context.BuildingClassifications.AddAsync(classification, ct);

    public async Task<IReadOnlyList<BuildingClassification>> ListByCandidateAsync(Guid candidateId, CancellationToken ct)
        => await context.BuildingClassifications
            .AsNoTracking()
            .Where(c => c.CandidateId == candidateId)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync(ct);
}

public sealed class BuildingReconciliationStore(SosDbContext context) : IBuildingReconciliationStore
{
    public async Task AddAsync(BuildingReconciliation reconciliation, CancellationToken ct)
        => await context.BuildingReconciliations.AddAsync(reconciliation, ct);

    public async Task<IReadOnlyList<BuildingReconciliation>> ListByCandidateAsync(Guid candidateId, CancellationToken ct)
        => await context.BuildingReconciliations
            .AsNoTracking()
            .Where(r => r.CandidateId == candidateId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync(ct);
}

public sealed class BuildingValidationStore(SosDbContext context) : IBuildingValidationStore
{
    public async Task AddAsync(BuildingValidation validation, CancellationToken ct)
        => await context.BuildingValidations.AddAsync(validation, ct);

    public async Task<IReadOnlyList<BuildingValidation>> ListByCandidateAsync(Guid candidateId, CancellationToken ct)
        => await context.BuildingValidations
            .AsNoTracking()
            .Where(v => v.CandidateId == candidateId)
            .OrderByDescending(v => v.CreatedAt)
            .ToListAsync(ct);
}

public sealed class ModelBundleStore(SosDbContext context) : IModelBundleStore
{
    public Task<ModelBundle?> FindByIdAsync(Guid id, CancellationToken ct)
        => context.ModelBundles.FirstOrDefaultAsync(m => m.Id == id, ct);

    public Task<ModelBundle?> FindByNameAndVersionAsync(string name, string version, CancellationToken ct)
        => context.ModelBundles.FirstOrDefaultAsync(m => m.Name == name && m.Version == version, ct);

    public async Task AddAsync(ModelBundle bundle, CancellationToken ct)
        => await context.ModelBundles.AddAsync(bundle, ct);
}
