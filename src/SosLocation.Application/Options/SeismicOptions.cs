namespace SosLocation.Application.Options;

/// <summary>Limites e parâmetros de calibração do motor de simulação sísmica (seção "Seismic").</summary>
public sealed class SeismicOptions
{
    public const string SectionName = "Seismic";

    /// <summary>Espaçamento mínimo da malha (m) — nunca refina além disto, mesmo para domínios pequenos.</summary>
    public double MinSpacingMeters { get; set; } = 30.0;
    /// <summary>Teto de células da malha (cols*rows) — protege o worker de domínios grandes/epicentros distantes.</summary>
    public int MaxGridCells { get; set; } = 40_000;
    /// <summary>Número de Courant do esquema explícito (deve estar em (0,1]; 0.5 dá margem de estabilidade confortável).</summary>
    public double CourantNumber { get; set; } = 0.5;
    public double MinShearVelocityMps { get; set; } = 150.0;
    public double MaxShearVelocityMps { get; set; } = 1500.0;
    /// <summary>Razão de amortecimento do oscilador SDOF de cada edifício (fração do crítico).</summary>
    public double DampingRatio { get; set; } = 0.05;
    /// <summary>Margem ao redor de (edifícios ∪ epicentro) usada para dimensionar o domínio simulado.</summary>
    public double DomainMarginKm { get; set; } = 2.0;
    /// <summary>
    /// Diagonal máxima do domínio simulado (km). SeismicGrid é uma aproximação
    /// válida para domínios urbanos de ~10-20km; um epicentro distante NÃO deve
    /// esticar o domínio até incluí-lo (isso explodiria o número de tiles de
    /// elevação amostrados e o custo do FDTD) — a fonte é injetada na borda do
    /// domínio mais próxima do epicentro real, e a correção de distância
    /// (BruneSourceModel.GeometricSpreadingCorrection) usa a distância
    /// hipocentral verdadeira, não a posição clampada.
    /// </summary>
    public double MaxDomainDiagonalKm { get; set; } = 40.0;
    /// <summary>Teto de tempo físico simulado (s) — evita runs longos para domínios grandes/Vs baixo.</summary>
    public double MaxSimulationSeconds { get; set; } = 40.0;
    /// <summary>Teto absoluto de passos de tempo, independente do teto de segundos.</summary>
    public int MaxSimulationSteps { get; set; } = 6_000;
    /// <summary>
    /// Quantidade máxima de quadros persistidos para a reprodução temporal.
    /// Os quadros são amostras uniformes da própria integração FDTD/SDOF, não
    /// uma animação reconstruída depois da simulação.
    /// </summary>
    public int MaxReplayFrames { get; set; } = 48;
    /// <summary>
    /// Fator de calibração de engenharia entre a taxa de momento de Brune (N·m/s)
    /// e o termo de força injetado na equação de onda (que não modela massa/
    /// rigidez explicitamente). Ajustado para que o PGA próximo à fonte caia em
    /// uma faixa plausível (não uma conversão física rigorosa — ver ADR sobre o
    /// motor sísmico).
    /// </summary>
    public double SourceAmplitudeScale { get; set; } = 1.0e-18;
}
