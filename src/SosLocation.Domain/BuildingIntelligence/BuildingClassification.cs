using SosLocation.Domain.ValueObjects;

namespace SosLocation.Domain.BuildingIntelligence;

public enum BuildingType
{
    Unknown,
    ResidentialHouse,
    Apartment,
    Commercial,
    Industrial,
    Warehouse,
    School,
    Hospital,
    Government,
    Religious,
    Garage,
    Other
}

/// <summary>Classificação probabilística do tipo/uso de uma construção — imutável, produzida por
/// um modelo em um instante específico. Referencia BuildingId e/ou CandidateId (a validação de
/// exclusividade entre os dois é responsabilidade da camada de Application).</summary>
public class BuildingClassification
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public Guid? BuildingId { get; init; }
    public Guid? CandidateId { get; init; }
    public required BuildingType BuildingType { get; init; }
    public required DataConfidence Probability { get; init; }
    public int? EstimatedLevels { get; init; }
    public double? EstimatedHeightM { get; init; }
    public required string ModelName { get; init; }
    public required string ModelVersion { get; init; }
    public DateTimeOffset CreatedAt { get; init; } = DateTimeOffset.UtcNow;
}
