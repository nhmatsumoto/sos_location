namespace SosLocation.Domain.BuildingIntelligence;

public enum ModelBundleStage
{
    Development,
    Evaluation,
    Shadow,
    Approved,
    Champion,
    Deprecated
}

/// <summary>Conjunto versionado de pesos/config/métricas de um modelo (model registry). Não pode
/// ser promovido a Approved/Champion sem passar por Evaluation (ou Shadow) primeiro.</summary>
public class ModelBundle
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public required string Name { get; init; }
    public required string Version { get; init; }
    public ModelBundleStage Stage { get; private set; } = ModelBundleStage.Development;
    public required string ArtifactUri { get; init; }
    public Guid? TrainingDatasetId { get; init; }
    public string? MetricsJson { get; set; }
    public string? ConfigurationJson { get; set; }
    public DateTimeOffset CreatedAt { get; init; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? ApprovedAt { get; private set; }
    public string? ApprovedBy { get; private set; }

    public void MoveToEvaluation()
    {
        if (Stage != ModelBundleStage.Development)
            throw new InvalidOperationException($"Cannot start evaluation for a bundle in stage {Stage}.");
        Stage = ModelBundleStage.Evaluation;
    }

    public void MoveToShadow()
    {
        if (Stage != ModelBundleStage.Evaluation)
            throw new InvalidOperationException($"Cannot move to shadow a bundle in stage {Stage}.");
        Stage = ModelBundleStage.Shadow;
    }

    public void Approve(string approvedBy, DateTimeOffset now)
    {
        if (Stage is not (ModelBundleStage.Evaluation or ModelBundleStage.Shadow))
            throw new InvalidOperationException($"Cannot approve a bundle in stage {Stage}.");
        Stage = ModelBundleStage.Approved;
        ApprovedAt = now;
        ApprovedBy = approvedBy;
    }

    public void PromoteToChampion()
    {
        if (Stage != ModelBundleStage.Approved)
            throw new InvalidOperationException($"Cannot promote to champion a bundle in stage {Stage}.");
        Stage = ModelBundleStage.Champion;
    }

    public void Deprecate()
    {
        if (Stage == ModelBundleStage.Deprecated)
            throw new InvalidOperationException("Bundle is already deprecated.");
        Stage = ModelBundleStage.Deprecated;
    }
}
