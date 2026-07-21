namespace SosLocation.Domain.Disasters;

/// <summary>Estado de dano estrutural, classificado a partir do drift/aceleração de pico calculado.</summary>
public enum DamageState
{
    None,
    Slight,
    Moderate,
    Extensive,
    Complete
}

/// <summary>
/// Classifica o estado de dano a partir do drift ratio de pico (deslocamento
/// relativo de pico / altura), usando bins genéricos no espírito das faixas
/// de drift do HAZUS-MH Technical Manual (não específicos de uma tipologia
/// estrutural — uma aproximação de engenharia, como as demais deste motor).
/// </summary>
public static class DamageStateClassifier
{
    public static DamageState FromPeakDriftRatio(double peakDriftRatio) => peakDriftRatio switch
    {
        >= 0.04 => DamageState.Complete,
        >= 0.02 => DamageState.Extensive,
        >= 0.01 => DamageState.Moderate,
        >= 0.004 => DamageState.Slight,
        _ => DamageState.None
    };
}

/// <summary>
/// Resposta sísmica de um edifício a uma <see cref="SimulationRun"/>: resultado
/// da integração de um oscilador SDOF sob o acelerograma extraído do campo de
/// onda simulado (não uma curva de fragilidade tabelada). Espelha o formato
/// plano das entidades de feature em <c>Features/</c> (FKs escalares, sem
/// propriedades de navegação).
/// </summary>
public class BuildingSeismicResponse
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public required Guid SimulationRunId { get; init; }
    public required Guid BuildingId { get; init; }
    public double NaturalPeriodSeconds { get; set; }
    public double PeakGroundAccelerationG { get; set; }
    public double PeakGroundVelocityCms { get; set; }
    public double SpectralAccelerationG { get; set; }
    public double PeakDriftRatio { get; set; }
    public DamageState DamageState { get; set; } = DamageState.None;
    public DateTimeOffset CreatedAt { get; init; } = DateTimeOffset.UtcNow;
}
