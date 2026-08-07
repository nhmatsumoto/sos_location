using SosLocation.Domain.Disasters;

namespace SosLocation.Application.Simulation;

/// <summary>
/// Contrato de um motor científico de desastre. Cada implementação possui seu
/// próprio modelo físico, mas participa do mesmo ciclo de vida de SimulationRun.
/// Novos motores são adicionados por DI, sem alterar o worker.
/// </summary>
public interface IDisasterSimulationEngine
{
    DisasterType DisasterType { get; }
    string ModelId { get; }
    Task ExecuteAsync(SimulationRun run, CancellationToken cancellationToken);
}

/// <summary>
/// Catálogo dos motores disponíveis. Falha cedo se duas implementações
/// reivindicarem o mesmo desastre, evitando uma escolha implícita de modelo.
/// </summary>
public sealed class DisasterSimulationEngineRegistry
{
    private readonly IReadOnlyDictionary<DisasterType, IDisasterSimulationEngine> _engines;

    public DisasterSimulationEngineRegistry(IEnumerable<IDisasterSimulationEngine> engines)
    {
        var registered = new Dictionary<DisasterType, IDisasterSimulationEngine>();
        foreach (var engine in engines)
        {
            if (!registered.TryAdd(engine.DisasterType, engine))
                throw new InvalidOperationException(
                    $"More than one simulation engine is registered for {engine.DisasterType}.");
        }

        _engines = registered;
    }

    public IReadOnlyCollection<DisasterType> SupportedDisasterTypes => _engines.Keys.ToArray();

    public IDisasterSimulationEngine Resolve(DisasterType disasterType)
        => _engines.TryGetValue(disasterType, out var engine)
            ? engine
            : throw new NotSupportedException(
                $"No scientific simulation engine is registered for {disasterType}.");
}
