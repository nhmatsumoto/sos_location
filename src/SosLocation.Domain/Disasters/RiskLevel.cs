namespace SosLocation.Domain.Disasters;

/// <summary>Severidade declarada pelo usuário ao desenhar a zona — juízo qualitativo,
/// não um score calculado (sem correlação climática/probabilística no v1).</summary>
public enum RiskLevel
{
    Low,
    Moderate,
    High,
    Severe
}
