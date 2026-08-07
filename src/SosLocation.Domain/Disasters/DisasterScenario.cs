using NetTopologySuite.Geometries;

namespace SosLocation.Domain.Disasters;

/// <summary>
/// Incidente real ou exercício operacional. Os fatos recebidos de fontes
/// externas nunca são gravados no cenário diretamente: ficam em observações
/// imutáveis para que a visão operacional possa ser reproduzida no tempo.
/// </summary>
public class DisasterScenario
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public required string ScenarioKey { get; init; }
    public required string Name { get; set; }
    public required DisasterType HazardType { get; init; }
    public required string CanonicalEventId { get; init; }
    public DateTimeOffset SimulationClockOrigin { get; init; }
    public Point? Epicenter { get; set; }
    public double? DepthKm { get; set; }
    public double? MomentMagnitude { get; set; }
    public string? MagnitudeType { get; set; }
    public DateTimeOffset CreatedAt { get; init; } = DateTimeOffset.UtcNow;
}

public enum VerificationStatus { Reported, Corroborated, Official, Retracted }

/// <summary>Registro bruto e auditável vindo de um coletor ou de uma fonte humana.</summary>
public class SourceObservation
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public required Guid DisasterScenarioId { get; init; }
    public required string SourceId { get; init; }
    public required string SourceUrl { get; init; }
    public required string Kind { get; init; }
    public required string Payload { get; init; }
    public string? PayloadSha256 { get; init; }
    public DateTimeOffset ObservedAt { get; init; }
    public DateTimeOffset CapturedAt { get; init; } = DateTimeOffset.UtcNow;
    public double Confidence { get; init; }
    public VerificationStatus VerificationStatus { get; init; } = VerificationStatus.Reported;
}

/// <summary>Observação temporal de dano, vítimas, operação ou infraestrutura.</summary>
public class ImpactObservation
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public required Guid DisasterScenarioId { get; init; }
    public Guid? SourceObservationId { get; init; }
    public Guid? PreviousObservationId { get; init; }
    public required string Kind { get; init; }
    public required string Subject { get; init; }
    public required string Value { get; init; }
    public DateTimeOffset ObservedAt { get; init; }
    public DateTimeOffset CapturedAt { get; init; } = DateTimeOffset.UtcNow;
    public double Confidence { get; init; }
    public VerificationStatus VerificationStatus { get; init; } = VerificationStatus.Reported;
}

/// <summary>Feature operacional independente de uma CityRevision: intensidade,
/// abrigo, área segura, interdição, posto de apoio ou perímetro de busca.</summary>
public class OperationalMapFeature
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public required Guid DisasterScenarioId { get; init; }
    public required string FeatureType { get; init; }
    public required string Name { get; set; }
    public required Geometry Geometry { get; set; }
    public string? Properties { get; set; }
    public VerificationStatus VerificationStatus { get; set; } = VerificationStatus.Reported;
    public DateTimeOffset EffectiveFrom { get; init; }
    public DateTimeOffset? EffectiveTo { get; set; }
    public DateTimeOffset CreatedAt { get; init; } = DateTimeOffset.UtcNow;
}
