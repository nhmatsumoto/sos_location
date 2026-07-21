namespace SosLocation.Domain.Disasters;

public enum SimulationRunStatus
{
    Queued,
    Running,
    Completed,
    Failed,
    Cancelled,
    Retrying
}

/// <summary>
/// Estágios do pipeline de simulação, genéricos o bastante para servir os três
/// motores de desastre (cada um interpreta PropagatingField/ComputingImpact
/// com sua própria física).
/// </summary>
public enum SimulationStage
{
    PreparingDomain,
    PropagatingField,
    ComputingImpact,
    PersistingResults,
    Complete
}

/// <summary>
/// Execução de uma simulação de desastre sobre uma revisão de cidade publicada.
/// Espelha o ciclo de vida de <see cref="Jobs.ImportJob"/> (mesmo padrão de
/// setters privados + métodos de transição guardados), mas como entidade
/// separada: os estágios de importação (DownloadSource, PublishRevision) não
/// fazem sentido para uma simulação.
/// </summary>
public class SimulationRun
{
    public const int MaxAttempts = 3;

    public Guid Id { get; init; } = Guid.NewGuid();
    public required Guid CityRevisionId { get; init; }
    public required DisasterType DisasterType { get; init; }
    public SimulationRunStatus Status { get; private set; } = SimulationRunStatus.Queued;
    public int Progress { get; private set; }
    public SimulationStage? CurrentStage { get; private set; }
    public string? StageMessage { get; private set; }
    /// <summary>Payload JSON dos parâmetros originais da solicitação (ex.: EarthquakeParameters).</summary>
    public required string Parameters { get; init; }
    public string? Error { get; private set; }
    public int Attempts { get; private set; }
    public string? WorkerId { get; private set; }
    public DateTimeOffset? StartedAt { get; private set; }
    public DateTimeOffset? CompletedAt { get; private set; }
    public DateTimeOffset CreatedAt { get; init; } = DateTimeOffset.UtcNow;

    /// <summary>Extensão geográfica do raster de intensidade (definida ao final de PreparingDomain), para o frontend posicionar o overlay sem round-trip extra.</summary>
    public double? IntensityWest { get; private set; }
    public double? IntensitySouth { get; private set; }
    public double? IntensityEast { get; private set; }
    public double? IntensityNorth { get; private set; }

    public bool IsTerminal => Status is SimulationRunStatus.Completed or SimulationRunStatus.Failed or SimulationRunStatus.Cancelled;

    public void Start(string workerId, DateTimeOffset now)
    {
        if (Status is not (SimulationRunStatus.Queued or SimulationRunStatus.Retrying))
            throw new InvalidOperationException($"Cannot start a simulation run in status {Status}.");
        Status = SimulationRunStatus.Running;
        WorkerId = workerId;
        Attempts++;
        StartedAt ??= now;
        Error = null;
    }

    public void AdvanceStage(SimulationStage stage, int progress, string? message = null)
    {
        if (Status != SimulationRunStatus.Running)
            throw new InvalidOperationException($"Cannot advance stage of a simulation run in status {Status}.");
        CurrentStage = stage;
        Progress = Math.Clamp(progress, 0, 100);
        StageMessage = message;
    }

    public void SetIntensityBounds(double west, double south, double east, double north)
    {
        if (Status != SimulationRunStatus.Running)
            throw new InvalidOperationException($"Cannot set intensity bounds of a simulation run in status {Status}.");
        IntensityWest = west;
        IntensitySouth = south;
        IntensityEast = east;
        IntensityNorth = north;
    }

    public void Complete(DateTimeOffset now)
    {
        if (Status != SimulationRunStatus.Running)
            throw new InvalidOperationException($"Cannot complete a simulation run in status {Status}.");
        Status = SimulationRunStatus.Completed;
        CurrentStage = SimulationStage.Complete;
        Progress = 100;
        CompletedAt = now;
    }

    public void Fail(string error, DateTimeOffset now)
    {
        Error = error;
        if (Attempts < MaxAttempts)
        {
            Status = SimulationRunStatus.Retrying;
        }
        else
        {
            Status = SimulationRunStatus.Failed;
            CompletedAt = now;
        }
    }

    public bool TryCancel(DateTimeOffset now)
    {
        if (IsTerminal) return false;
        Status = SimulationRunStatus.Cancelled;
        CompletedAt = now;
        return true;
    }
}
