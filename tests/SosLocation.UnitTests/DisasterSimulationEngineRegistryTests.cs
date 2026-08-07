using SosLocation.Application.Simulation;
using SosLocation.Domain.Disasters;
using Xunit;

namespace SosLocation.UnitTests;

public class DisasterSimulationEngineRegistryTests
{
    [Fact]
    public void Registry_ResolvesEngineByDisasterType()
    {
        var earthquake = new StubEngine(DisasterType.Earthquake, "earthquake-test");
        var flood = new StubEngine(DisasterType.Flood, "flood-test");
        var registry = new DisasterSimulationEngineRegistry([earthquake, flood]);

        Assert.Same(earthquake, registry.Resolve(DisasterType.Earthquake));
        Assert.Same(flood, registry.Resolve(DisasterType.Flood));
        Assert.Equal(2, registry.SupportedDisasterTypes.Count);
    }

    [Fact]
    public void Registry_RejectsDuplicateAndMissingEngines()
    {
        Assert.Throws<InvalidOperationException>(() =>
            new DisasterSimulationEngineRegistry(
            [
                new StubEngine(DisasterType.Earthquake, "first"),
                new StubEngine(DisasterType.Earthquake, "second"),
            ]));

        var registry = new DisasterSimulationEngineRegistry([]);
        Assert.Throws<NotSupportedException>(() => registry.Resolve(DisasterType.Fire));
    }

    private sealed class StubEngine(DisasterType disasterType, string modelId)
        : IDisasterSimulationEngine
    {
        public DisasterType DisasterType { get; } = disasterType;
        public string ModelId { get; } = modelId;

        public Task ExecuteAsync(SimulationRun run, CancellationToken cancellationToken)
            => Task.CompletedTask;
    }
}
