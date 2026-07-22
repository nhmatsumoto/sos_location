using SosLocation.Domain.Catalog;
using SosLocation.Domain.Cities;
using SosLocation.Domain.Disasters;
using SosLocation.Domain.Features;
using SosLocation.Domain.Jobs;

namespace SosLocation.Application.Abstractions;

public interface ICityStore
{
    Task<City?> FindByIdAsync(Guid id, CancellationToken ct);
    Task<City?> FindBySlugAsync(string slug, CancellationToken ct);
    Task<IReadOnlyList<City>> ListAsync(CancellationToken ct);
    Task AddAsync(City city, CancellationToken ct);
}

public interface IRevisionStore
{
    Task<CityRevision?> FindByIdAsync(Guid id, CancellationToken ct);
    Task<IReadOnlyList<CityRevision>> ListByCityAsync(Guid cityId, CancellationToken ct);
    Task<int> NextRevisionNumberAsync(Guid cityId, CancellationToken ct);
    Task AddAsync(CityRevision revision, CancellationToken ct);
}

public interface IDatasetStore
{
    Task<Dataset?> FindByNameAsync(string name, CancellationToken ct);
    Task<DatasetVersion?> FindVersionByChecksumAsync(Guid datasetId, string checksum, CancellationToken ct);
    Task AddAsync(Dataset dataset, CancellationToken ct);
    Task AddVersionAsync(DatasetVersion version, CancellationToken ct);
    Task<IReadOnlyList<(Dataset Dataset, DatasetVersion Version)>> ListVersionsForRevisionAsync(
        Guid revisionId, CancellationToken ct);
}

public interface IImportJobStore
{
    Task<ImportJob?> FindByIdAsync(Guid id, CancellationToken ct);
    /// <summary>Lista somente jobs úteis para acompanhamento; falhas definitivas e cancelamentos ficam nos logs.</summary>
    Task<IReadOnlyList<ImportJob>> ListRecentAsync(int limit, CancellationToken ct);
    Task AddAsync(ImportJob job, CancellationToken ct);
    Task AddIssueAsync(ProcessingIssue issue, CancellationToken ct);
    Task ClearIssuesAsync(Guid jobId, CancellationToken ct);
    Task<IReadOnlyList<ProcessingIssue>> ListIssuesAsync(Guid jobId, CancellationToken ct);

    /// <summary>
    /// Reserva o próximo job disponível usando bloqueio pessimista
    /// (FOR UPDATE SKIP LOCKED) e o marca como Running. Retorna null se não houver jobs.
    /// </summary>
    Task<ImportJob?> ReserveNextAsync(string workerId, CancellationToken ct);
}

public interface ISimulationRunStore
{
    Task<SimulationRun?> FindByIdAsync(Guid id, CancellationToken ct);
    Task<IReadOnlyList<SimulationRun>> ListRecentAsync(int limit, CancellationToken ct);
    Task AddAsync(SimulationRun run, CancellationToken ct);
    Task BulkInsertResponsesAsync(IReadOnlyList<BuildingSeismicResponse> responses, CancellationToken ct);
    Task<IReadOnlyList<BuildingSeismicResponse>> ListResponsesAsync(Guid runId, CancellationToken ct);
    Task<BuildingSeismicResponse?> FindResponseAsync(Guid runId, Guid buildingId, CancellationToken ct);

    /// <summary>
    /// Leitura sem tracking do status atual — usada por um watcher concorrente
    /// (em seu próprio DbContext/scope) para detectar cancelamento solicitado
    /// por outro processo (a API) enquanto o pipeline está em execução.
    /// </summary>
    Task<SimulationRunStatus?> GetStatusAsync(Guid id, CancellationToken ct);

    /// <summary>
    /// Reserva o próximo run disponível usando bloqueio pessimista
    /// (FOR UPDATE SKIP LOCKED) e o marca como Running. Retorna null se não houver runs.
    /// </summary>
    Task<SimulationRun?> ReserveNextAsync(string workerId, CancellationToken ct);
}

public interface IFeatureWriter
{
    /// <summary>Remove todas as features de uma revisão (usado para reexecução idempotente de rascunhos).</summary>
    Task DeleteRevisionFeaturesAsync(Guid revisionId, CancellationToken ct);
    Task BulkInsertBuildingsAsync(IReadOnlyList<Building> buildings, CancellationToken ct);
    Task BulkInsertRoadsAsync(IReadOnlyList<Road> roads, CancellationToken ct);
    Task BulkInsertWaterAsync(IReadOnlyList<WaterFeature> water, CancellationToken ct);
    Task BulkInsertLandUseAsync(IReadOnlyList<LandUseArea> landUse, CancellationToken ct);
}

public interface IFeatureReader
{
    Task<Building?> FindBuildingAsync(Guid id, CancellationToken ct);
    Task<Road?> FindRoadAsync(Guid id, CancellationToken ct);
    Task<WaterFeature?> FindWaterAsync(Guid id, CancellationToken ct);
    /// <summary>Ferrovias da revisão (para a camada de simulação de trens).</summary>
    Task<IReadOnlyList<Road>> ListRailwaysAsync(Guid revisionId, CancellationToken ct);
    /// <summary>
    /// Projeção mínima dos edifícios usada pela simulação. Não carrega footprint,
    /// tags ou tracking do EF para centenas de milhares de entidades.
    /// </summary>
    Task<IReadOnlyList<SimulationBuildingInput>> ListSimulationBuildingsAsync(
        Guid revisionId, CancellationToken ct);
    Task<(int Buildings, int Roads, int Water, int LandUse)> CountByRevisionAsync(Guid revisionId, CancellationToken ct);
    Task<double> ObservedHeightRatioAsync(Guid revisionId, CancellationToken ct);
}

public sealed record SimulationBuildingInput(
    Guid Id,
    double Longitude,
    double Latitude,
    double HeightMeters);

/// <summary>Unidade de persistência compartilhada pelos stores baseados em EF Core.</summary>
public interface IUnitOfWork
{
    Task SaveChangesAsync(CancellationToken ct);
}
