using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Testcontainers.PostgreSql;
using SosLocation.Application.Abstractions;
using SosLocation.Application.Import;
using SosLocation.Application.Options;
using SosLocation.Application.Profiles;
using SosLocation.Domain.Cities;
using SosLocation.Domain.Jobs;
using SosLocation.Domain.ValueObjects;
using SosLocation.GeoProcessing.Normalizers;
using SosLocation.Infrastructure.External;
using SosLocation.Infrastructure.Persistence;
using SosLocation.Infrastructure.Tiles;
using Xunit;

namespace SosLocation.IntegrationTests;

public sealed class PostgisContainerFixture : IAsyncLifetime
{
    public PostgreSqlContainer Container { get; } = new PostgreSqlBuilder()
        .WithImage("postgis/postgis:18-3.6")
        .WithDatabase("sos_test")
        .WithUsername("sos")
        .WithPassword("sos_test_password")
        .Build();

    public string ConnectionString => Container.GetConnectionString();

    public async Task InitializeAsync()
    {
        await Container.StartAsync();
        await using var context = CreateContext();
        await context.Database.MigrateAsync();
    }

    public Task DisposeAsync() => Container.DisposeAsync().AsTask();

    public SosDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<SosDbContext>()
            .UseNpgsql(ConnectionString, npgsql => npgsql.UseNetTopologySuite())
            .Options;
        return new SosDbContext(options);
    }
}

/// <summary>Armazenamento em memória para os testes (o dado bruto real vai para MinIO).</summary>
internal sealed class InMemoryObjectStorage : IObjectStorage
{
    private readonly Dictionary<string, byte[]> _objects = [];
    public IReadOnlyDictionary<string, byte[]> Objects => _objects;

    public Task PutAsync(string key, byte[] content, string contentType, CancellationToken ct)
    {
        _objects[key] = content;
        return Task.CompletedTask;
    }

    public Task<byte[]?> GetAsync(string key, CancellationToken ct)
        => Task.FromResult(_objects.GetValueOrDefault(key));

    public Task<bool> ExistsAsync(string key, CancellationToken ct)
        => Task.FromResult(_objects.ContainsKey(key));
}

internal sealed class UnusedGeocoder : IGeocoder
{
    public Task<IReadOnlyList<PlaceSearchResult>> SearchAsync(string query, CancellationToken ct)
        => throw new NotSupportedException("Geocoder must not be called in fixture imports.");
    public Task<PlaceSearchResult?> ResolveAsync(string providerId, CancellationToken ct)
        => throw new NotSupportedException("Geocoder must not be called in fixture imports.");
}

internal sealed class UnusedOsmSource : IOsmSource
{
    public Task<SourcePayload> DownloadAreaAsync(BoundingBox area, CancellationToken ct)
        => throw new NotSupportedException("OSM source must not be called in fixture imports.");
}

[CollectionDefinition("postgis")]
public class PostgisCollection : ICollectionFixture<PostgisContainerFixture>;

[Collection("postgis")]
public class PostgisPipelineTests(PostgisContainerFixture fixture)
{
    private static string FindFixturePath()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null)
        {
            var candidate = Path.Combine(dir.FullName, "tools", "fixtures", "demo-district.geojson");
            if (File.Exists(candidate)) return candidate;
            dir = dir.Parent;
        }
        throw new FileNotFoundException("demo-district.geojson not found.");
    }

    private (ImportPipeline Pipeline, SosDbContext Context, InMemoryObjectStorage Storage) CreatePipeline()
    {
        var context = fixture.CreateContext();
        var featureStore = new FeatureStore(context);
        var storage = new InMemoryObjectStorage();
        var pipeline = new ImportPipeline(
            new CityStore(context),
            new RevisionStore(context),
            new DatasetStore(context),
            new ImportJobStore(context),
            featureStore,
            featureStore,
            new EfUnitOfWork(context),
            new UnusedGeocoder(),
            new UnusedOsmSource(),
            new FileFixtureSource(new FixtureOptions { Path = FindFixturePath() }),
            storage,
            [new GeoJsonNormalizer(NullLogger<GeoJsonNormalizer>.Instance),
             new OverpassNormalizer(NullLogger<OverpassNormalizer>.Instance)],
            new ReconstructionProfileRegistry(),
            new ImportLimits(),
            NullLogger<ImportPipeline>.Instance);
        return (pipeline, context, storage);
    }

    private static ImportJob NewFixtureJob() => new()
    {
        JobType = "fixture-import",
        Request = JsonSerializer.Serialize(new ImportRequest
        {
            Name = "Demo District",
            Source = ImportSources.Fixture,
            ReconstructionProfile = "osm-basic-v1",
        }, new JsonSerializerOptions(JsonSerializerDefaults.Web)),
    };

    private async Task<ImportJob> RunFixtureImportAsync()
    {
        var (pipeline, context, storage) = CreatePipeline();
        await using var _ = context;

        var job = NewFixtureJob();
        await context.ImportJobs.AddAsync(job);
        await context.SaveChangesAsync();
        job.Start("test-worker", DateTimeOffset.UtcNow);
        await context.SaveChangesAsync();

        await pipeline.ExecuteAsync(job, CancellationToken.None);

        // O dado bruto deve ter sido preservado no object storage.
        Assert.NotEmpty(storage.Objects);
        return job;
    }

    [Fact]
    public async Task FixtureImport_PublishesRevision_WithVariedBuildings()
    {
        var job = await RunFixtureImportAsync();

        await using var context = fixture.CreateContext();
        Assert.Equal(JobStatus.Completed, (await context.ImportJobs.SingleAsync(j => j.Id == job.Id)).Status);

        var revision = await context.CityRevisions.SingleAsync(r => r.Id == job.CityRevisionId);
        Assert.Equal(CityRevisionStatus.Published, revision.Status);
        Assert.True(revision.QualityLevel >= QualityLevel.L2FootprintsInferredHeights);

        var buildings = await context.Buildings.Where(b => b.CityRevisionId == revision.Id).ToListAsync();
        Assert.True(buildings.Count >= 50, $"Expected >= 50 buildings, got {buildings.Count}");

        var distinctHeights = buildings.Select(b => Math.Round(b.HeightMeters, 1)).Distinct().Count();
        Assert.True(distinctHeights >= 4, $"Heights must vary, found {distinctHeights} distinct values");

        var categories = buildings.Select(b => b.BuildingType).Distinct().ToList();
        Assert.True(categories.Count >= 3, $"Expected >= 3 categories, got: {string.Join(",", categories)}");

        Assert.Contains(buildings, b => b.HeightSource == Domain.Features.HeightSource.Observed);
        Assert.Contains(buildings, b => b.HeightSource == Domain.Features.HeightSource.Inferred);
    }

    [Fact]
    public async Task FixtureImport_IsIdempotent_NewRevisionWithoutDuplicates()
    {
        var first = await RunFixtureImportAsync();
        var second = await RunFixtureImportAsync();

        await using var context = fixture.CreateContext();
        var firstRevision = await context.CityRevisions.SingleAsync(r => r.Id == first.CityRevisionId);
        var secondRevision = await context.CityRevisions.SingleAsync(r => r.Id == second.CityRevisionId);

        Assert.NotEqual(firstRevision.Id, secondRevision.Id);
        Assert.Equal(firstRevision.CityId, secondRevision.CityId);
        Assert.True(secondRevision.RevisionNumber > firstRevision.RevisionNumber);

        // Isolamento entre revisões: mesmas contagens, nenhum vazamento entre revisões.
        var firstCount = await context.Buildings.CountAsync(b => b.CityRevisionId == firstRevision.Id);
        var secondCount = await context.Buildings.CountAsync(b => b.CityRevisionId == secondRevision.Id);
        Assert.Equal(firstCount, secondCount);

        // external_id é único por revisão (constraint verificada pelo banco).
        var duplicates = await context.Buildings
            .Where(b => b.CityRevisionId == secondRevision.Id)
            .GroupBy(b => b.ExternalId)
            .Where(g => g.Count() > 1)
            .CountAsync();
        Assert.Equal(0, duplicates);
    }

    [Fact]
    public async Task BuildingsTile_IsGenerated_AndUnder1MB()
    {
        var job = await RunFixtureImportAsync();

        await using var context = fixture.CreateContext();
        var reader = new MvtTileReader(context);

        // Centro do Demo District (~136.9113, 35.2907) no zoom 14.
        var (x, y) = TileMath(136.9113, 35.2907, 14);
        var tile = await reader.GetTileAsync(job.CityRevisionId!.Value, TileLayerKind.Buildings, 14, x, y, default);

        Assert.NotNull(tile);
        Assert.InRange(tile!.Length, 100, 1024 * 1024);

        var roadsTile = await reader.GetTileAsync(job.CityRevisionId.Value, TileLayerKind.Roads, 14, x, y, default);
        Assert.NotNull(roadsTile);

        var waterTile = await reader.GetTileAsync(job.CityRevisionId.Value, TileLayerKind.Water, 14, x, y, default);
        Assert.NotNull(waterTile);
    }

    [Fact]
    public async Task BuildingsTile_BelowMinZoomOrOutsideArea_IsEmpty()
    {
        var job = await RunFixtureImportAsync();

        await using var context = fixture.CreateContext();
        var reader = new MvtTileReader(context);

        var (x, y) = TileMath(136.9113, 35.2907, 10);
        Assert.Null(await reader.GetTileAsync(job.CityRevisionId!.Value, TileLayerKind.Buildings, 10, x, y, default));

        // Tile do outro lado do planeta.
        var (fx, fy) = TileMath(-46.63, -23.55, 14);
        Assert.Null(await reader.GetTileAsync(job.CityRevisionId.Value, TileLayerKind.Buildings, 14, fx, fy, default));

        // Coordenadas de tile inválidas.
        Assert.Null(await reader.GetTileAsync(job.CityRevisionId.Value, TileLayerKind.Buildings, 14, -1, 0, default));
        Assert.Null(await reader.GetTileAsync(job.CityRevisionId.Value, TileLayerKind.Buildings, 2, 4000, 4000, default));
    }

    [Fact]
    public async Task JobQueue_Reserve_MarksRunning_AndSkipsCancelled()
    {
        await using (var setup = fixture.CreateContext())
        {
            // Limpa a fila para este teste.
            await setup.Database.ExecuteSqlRawAsync(
                "UPDATE import_jobs SET status = 'Completed' WHERE status IN ('Queued','Retrying')");

            var cancelled = NewFixtureJob();
            cancelled.TryCancel(DateTimeOffset.UtcNow);
            var queued = NewFixtureJob();
            await setup.ImportJobs.AddRangeAsync(cancelled, queued);
            await setup.SaveChangesAsync();
        }

        await using var context = fixture.CreateContext();
        var store = new ImportJobStore(context);
        var reserved = await store.ReserveNextAsync("worker-a", default);

        Assert.NotNull(reserved);
        Assert.Equal(JobStatus.Running, reserved!.Status);
        Assert.Equal("worker-a", reserved.WorkerId);

        // Não há mais jobs disponíveis (o cancelado é ignorado).
        await using var context2 = fixture.CreateContext();
        var store2 = new ImportJobStore(context2);
        Assert.Null(await store2.ReserveNextAsync("worker-b", default));
    }

    private static (int X, int Y) TileMath(double lon, double lat, int z)
    {
        var n = 1 << z;
        var x = (int)Math.Floor((lon + 180.0) / 360.0 * n);
        var latRad = lat * Math.PI / 180.0;
        var y = (int)Math.Floor((1.0 - Math.Log(Math.Tan(latRad) + 1.0 / Math.Cos(latRad)) / Math.PI) / 2.0 * n);
        return (x, y);
    }
}
