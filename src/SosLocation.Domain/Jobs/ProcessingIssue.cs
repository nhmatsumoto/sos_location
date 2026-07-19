namespace SosLocation.Domain.Jobs;

public enum IssueSeverity
{
    Info,
    Warning,
    Error
}

/// <summary>Problema registrado durante o processamento de um job (ex.: geometria descartada).</summary>
public class ProcessingIssue
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public required Guid JobId { get; init; }
    public string? FeatureId { get; init; }
    public IssueSeverity Severity { get; init; } = IssueSeverity.Warning;
    public required string Code { get; init; }
    public required string Message { get; init; }
    public string? Details { get; init; }
    public DateTimeOffset CreatedAt { get; init; } = DateTimeOffset.UtcNow;
}
