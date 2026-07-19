namespace SosLocation.Domain.Jobs;

public enum JobStatus
{
    Queued,
    Running,
    Completed,
    Failed,
    Cancelled,
    Retrying
}

/// <summary>Estágios do pipeline de importação, executados em ordem.</summary>
public enum ImportStage
{
    ResolveBoundary,
    DownloadSource,
    PersistRawData,
    Validate,
    Normalize,
    Reconstruct,
    CalculateQuality,
    PublishRevision,
    InvalidateCache,
    Complete
}

/// <summary>Processo de aquisição e reconstrução de um ou mais datasets.</summary>
public class ImportJob
{
    public const int MaxAttempts = 3;

    public Guid Id { get; init; } = Guid.NewGuid();
    public Guid? CityId { get; set; }
    public Guid? CityRevisionId { get; set; }
    public required string JobType { get; init; }
    public JobStatus Status { get; private set; } = JobStatus.Queued;
    public int Progress { get; private set; }
    public ImportStage? CurrentStage { get; private set; }
    public string? StageMessage { get; private set; }
    /// <summary>Payload JSON original da solicitação.</summary>
    public required string Request { get; init; }
    public string? Error { get; private set; }
    public int Attempts { get; private set; }
    public string? WorkerId { get; private set; }
    public DateTimeOffset? StartedAt { get; private set; }
    public DateTimeOffset? CompletedAt { get; private set; }
    public DateTimeOffset CreatedAt { get; init; } = DateTimeOffset.UtcNow;

    public bool IsTerminal => Status is JobStatus.Completed or JobStatus.Failed or JobStatus.Cancelled;

    public void Start(string workerId, DateTimeOffset now)
    {
        if (Status is not (JobStatus.Queued or JobStatus.Retrying))
            throw new InvalidOperationException($"Cannot start a job in status {Status}.");
        Status = JobStatus.Running;
        WorkerId = workerId;
        Attempts++;
        StartedAt ??= now;
        Error = null;
    }

    public void AdvanceStage(ImportStage stage, int progress, string? message = null)
    {
        if (Status != JobStatus.Running)
            throw new InvalidOperationException($"Cannot advance stage of a job in status {Status}.");
        CurrentStage = stage;
        Progress = Math.Clamp(progress, 0, 100);
        StageMessage = message;
    }

    public void Complete(DateTimeOffset now)
    {
        if (Status != JobStatus.Running)
            throw new InvalidOperationException($"Cannot complete a job in status {Status}.");
        Status = JobStatus.Completed;
        CurrentStage = ImportStage.Complete;
        Progress = 100;
        CompletedAt = now;
    }

    public void Fail(string error, DateTimeOffset now)
    {
        Error = error;
        if (Attempts < MaxAttempts)
        {
            Status = JobStatus.Retrying;
        }
        else
        {
            Status = JobStatus.Failed;
            CompletedAt = now;
        }
    }

    public bool TryCancel(DateTimeOffset now)
    {
        if (IsTerminal) return false;
        Status = JobStatus.Cancelled;
        CompletedAt = now;
        return true;
    }
}
