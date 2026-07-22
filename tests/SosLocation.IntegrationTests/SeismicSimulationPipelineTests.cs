using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using NetTopologySuite.Geometries;
using SosLocation.Application.Abstractions;
using SosLocation.Application.Dto;
using SosLocation.Application.Options;
using SosLocation.Domain.Cities;
using SosLocation.Domain.Disasters;
using SosLocation.Domain.Features;
using SosLocation.GeoProcessing.Seismic;
using SosLocation.Infrastructure.External;
using SosLocation.Infrastructure.Persistence;
using SosLocation.Infrastructure.Tiles;
using Xunit;

namespace SosLocation.IntegrationTests;

/// <summary>
/// Testa o motor sísmico de ponta a ponta contra PostGIS real. Não valida
/// valores físicos absolutos (a calibração de amplitude é uma aproximação de
/// engenharia documentada em <see cref="SeismicOptions.SourceAmplitudeScale"/>)
/// — valida invariantes que devem valer independentemente da constante: o
/// motion decai com a distância do epicentro e cresce com a magnitude.
/// </summary>
[Collection("postgis")]
public class SeismicSimulationPipelineTests(PostgisContainerFixture fixture)
{
    private static readonly GeometryFactory Wgs84Factory =
        NetTopologySuite.NtsGeometryServices.Instance.CreateGeometryFactory(4326);
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private const double EpicenterLon = 139.00;
    private const double EpicenterLat = 35.00;

    /// <summary>Malha pequena e run curto — testa a integração, não a resolução física de produção.</summary>
    private static SeismicOptions FastTestOptions() => new()
    {
        MinSpacingMeters = 150.0,
        MaxGridCells = 2_500,
        CourantNumber = 0.5,
        MinShearVelocityMps = 150.0,
        MaxShearVelocityMps = 1500.0,
        DampingRatio = 0.05,
        DomainMarginKm = 1.0,
        MaxSimulationSeconds = 6.0,
        MaxSimulationSteps = 300,
        MaxReplayFrames = 8,
        SourceAmplitudeScale = 1.0e-18,
    };

    private async Task<(CityRevision Revision, List<Building> Buildings)> SeedCityAsync(SosDbContext context)
    {
        var city = new City { Name = "Test City", Slug = $"test-city-{Guid.NewGuid():N}" };
        await context.Cities.AddAsync(city);

        var revision = new CityRevision
        {
            CityId = city.Id,
            RevisionNumber = 1,
            ReconstructionProfile = "osm-basic-v1",
        };
        revision.MarkProcessing();
        revision.MarkReady();
        revision.Publish(DateTimeOffset.UtcNow);
        await context.CityRevisions.AddAsync(revision);

        // Edifícios em linha reta a partir do epicentro, a distâncias crescentes.
        var buildings = new List<Building>();
        var offsets = new[] { 0.002, 0.006, 0.012, 0.02 }; // ~0.2km, 0.6km, 1.2km, 2km em longitude
        for (var i = 0; i < offsets.Length; i++)
        {
            var lon = EpicenterLon + offsets[i];
            var lat = EpicenterLat;
            var point = Wgs84Factory.CreatePoint(new Coordinate(lon, lat));
            var footprint = Wgs84Factory.CreatePolygon([
                new Coordinate(lon - 0.0001, lat - 0.0001),
                new Coordinate(lon + 0.0001, lat - 0.0001),
                new Coordinate(lon + 0.0001, lat + 0.0001),
                new Coordinate(lon - 0.0001, lat + 0.0001),
                new Coordinate(lon - 0.0001, lat - 0.0001),
            ]);
            buildings.Add(new Building
            {
                CityRevisionId = revision.Id,
                ExternalId = $"test-building-{i}",
                Footprint = footprint,
                Centroid = point,
                HeightMeters = 20.0,
                MinHeightMeters = 0.0,
                GroundElevationMeters = 0.0,
                BuildingType = "residential",
                HeightSource = HeightSource.Inferred,
            });
        }

        await context.Buildings.AddRangeAsync(buildings);
        await context.SaveChangesAsync();

        return (revision, buildings);
    }

    private static SimulationRun NewRun(Guid revisionId, double momentMagnitude, double depthKm = 10.0)
    {
        var parameters = new EarthquakeParameters
        {
            EpicenterLon = EpicenterLon,
            EpicenterLat = EpicenterLat,
            DepthKm = depthKm,
            MomentMagnitude = momentMagnitude,
        };
        return new SimulationRun
        {
            CityRevisionId = revisionId,
            DisasterType = DisasterType.Earthquake,
            Parameters = JsonSerializer.Serialize(parameters, JsonOptions),
        };
    }

    private async Task<(SimulationRun Run, InMemoryObjectStorage Storage)> RunSimulationAsync(
        CityRevision revision, double momentMagnitude)
    {
        var context = fixture.CreateContext();
        await using var _ = context;

        var featureStore = new FeatureStore(context);
        var runStore = new SimulationRunStore(context);
        var storage = new InMemoryObjectStorage();

        // Watcher de cancelamento externo do pipeline: cria seu próprio DbContext
        // por scope, igual à Infrastructure real, usando o mesmo fixture de teste.
        var services = new ServiceCollection();
        services.AddScoped<ISimulationRunStore>(_ => new SimulationRunStore(fixture.CreateContext()));
        await using var serviceProvider = services.BuildServiceProvider();

        var pipeline = new SeismicSimulationPipeline(
            featureStore,
            runStore,
            new NullElevationProvider(), // testes determinísticos: terreno plano (Vs uniforme).
            storage,
            new ImageSharpRasterEncoder(),
            new EfUnitOfWork(context),
            serviceProvider.GetRequiredService<IServiceScopeFactory>(),
            FastTestOptions(),
            NullLogger<SeismicSimulationPipeline>.Instance);

        var run = NewRun(revision.Id, momentMagnitude);
        await context.SimulationRuns.AddAsync(run);
        await context.SaveChangesAsync();
        run.Start("test-worker", DateTimeOffset.UtcNow);
        await context.SaveChangesAsync();

        await pipeline.ExecuteAsync(run, CancellationToken.None);
        return (run, storage);
    }

    [Fact]
    public async Task Simulation_Completes_WithOneResponsePerBuilding_DecayingWithDistance()
    {
        await using var seedContext = fixture.CreateContext();
        var (revision, buildings) = await SeedCityAsync(seedContext);

        var (run, storage) = await RunSimulationAsync(revision, momentMagnitude: 6.5);

        await using var context = fixture.CreateContext();
        var reloaded = await context.SimulationRuns.SingleAsync(r => r.Id == run.Id);
        Assert.Equal(SimulationRunStatus.Completed, reloaded.Status);
        Assert.NotNull(reloaded.IntensityWest);

        var responses = await context.BuildingSeismicResponses
            .Where(r => r.SimulationRunId == run.Id)
            .ToListAsync();
        Assert.Equal(buildings.Count, responses.Count);

        // Ordena por distância do epicentro (edifícios já seedados em ordem crescente).
        var byBuildingId = responses.ToDictionary(r => r.BuildingId);
        var orderedByDistance = buildings.Select(b => byBuildingId[b.Id]).ToList();

        Assert.True(
            orderedByDistance[0].PeakGroundAccelerationG >= orderedByDistance[^1].PeakGroundAccelerationG,
            "PGA at the nearest building should be >= PGA at the farthest building.");
        Assert.All(responses, r => Assert.True(r.PeakDriftRatio >= 0));

        Assert.Contains(storage.Objects.Keys, k => k == $"simulations/{run.Id}/intensity.png");

        var manifestBytes = storage.Objects[$"simulations/{run.Id}/replay.json"];
        var replay = JsonSerializer.Deserialize<SeismicReplayManifestDto>(manifestBytes, JsonOptions);
        Assert.NotNull(replay);
        Assert.Equal(buildings.Count, replay.BuildingCount);
        Assert.InRange(replay.Frames.Count, 2, FastTestOptions().MaxReplayFrames);
        Assert.Equal(0, replay.Frames[0].Index);
        Assert.True(replay.Frames[^1].TimeSeconds > replay.Frames[0].TimeSeconds);
        Assert.All(replay.Frames, frame =>
        {
            Assert.Equal(
                buildings.Count,
                frame.None + frame.Slight + frame.Moderate + frame.Extensive + frame.Complete);
            Assert.Contains(
                $"simulations/{run.Id}/replay/{frame.Index:D4}.png",
                storage.Objects.Keys);
        });

        // O estado de dano é consultado junto ao MVT, evitando o download de
        // todas as respostas e milhares de setFeatureState no navegador.
        var reader = new MvtTileReader(context);
        var (tileX, tileY) = TileMath(EpicenterLon, EpicenterLat, 14);
        var baseTile = await reader.GetTileAsync(revision.Id, TileLayerKind.Buildings, 14, tileX, tileY, default);
        var simulationTile = await reader.GetTileAsync(
            revision.Id, TileLayerKind.Buildings, 14, tileX, tileY, default, run.Id);
        Assert.NotNull(baseTile);
        Assert.NotNull(simulationTile);
        Assert.False(baseTile!.SequenceEqual(simulationTile!));
    }

    [Fact]
    public async Task Simulation_HigherMagnitude_ProducesHigherPeakGroundAcceleration()
    {
        await using var seedContext = fixture.CreateContext();
        var (revision, buildings) = await SeedCityAsync(seedContext);
        var nearestBuildingId = buildings[0].Id;

        var (weakRun, _) = await RunSimulationAsync(revision, momentMagnitude: 4.5);
        var (strongRun, _) = await RunSimulationAsync(revision, momentMagnitude: 7.5);

        await using var context = fixture.CreateContext();
        var weakResponse = await context.BuildingSeismicResponses
            .SingleAsync(r => r.SimulationRunId == weakRun.Id && r.BuildingId == nearestBuildingId);
        var strongResponse = await context.BuildingSeismicResponses
            .SingleAsync(r => r.SimulationRunId == strongRun.Id && r.BuildingId == nearestBuildingId);

        Assert.True(
            strongResponse.PeakGroundAccelerationG > weakResponse.PeakGroundAccelerationG,
            "A larger magnitude at the same location must produce a larger PGA.");
    }

    private static (int X, int Y) TileMath(double lon, double lat, int zoom)
    {
        var scale = 1 << zoom;
        var x = (int)Math.Floor((lon + 180.0) / 360.0 * scale);
        var latRad = lat * Math.PI / 180.0;
        var y = (int)Math.Floor(
            (1.0 - Math.Asinh(Math.Tan(latRad)) / Math.PI) / 2.0 * scale);
        return (x, y);
    }
}
