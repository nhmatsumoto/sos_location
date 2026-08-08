using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SosLocation.Application.Abstractions;
using SosLocation.Application.Import;
using SosLocation.Application.Disasters;
using SosLocation.Application.Normalization;
using SosLocation.Application.Options;
using SosLocation.Application.Profiles;
using SosLocation.Application.Simulation;
using SosLocation.GeoProcessing.Normalizers;
using SosLocation.GeoProcessing.Seismic;
using SosLocation.Infrastructure.External;
using SosLocation.Infrastructure.Persistence;
using SosLocation.Infrastructure.Storage;
using SosLocation.Infrastructure.Tiles;

namespace SosLocation.Infrastructure;

public static class DependencyInjection
{
    public const string UserAgent = "SOS_LOCATION-CityReconstruction/1.0 (+https://github.com/nhmatsumoto/sos_location)";

    public static IServiceCollection AddSosInfrastructure(
        this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Postgres")
            ?? throw new InvalidOperationException("Connection string 'Postgres' is not configured.");

        services.AddDbContext<SosDbContext>(options =>
            options.UseNpgsql(connectionString, npgsql => npgsql
                .UseNetTopologySuite()
                // Reconecta em falhas transitórias (ex.: Postgres reiniciando durante
                // a subida dos containers). Os dois usos de transação explícita
                // (ImportJobStore/SimulationRunStore.ReserveNextAsync) são envolvidos
                // em CreateExecutionStrategy().ExecuteAsync — obrigatório com retry
                // habilitado, senão o EF Core lança em runtime ao ver uma transação
                // iniciada fora da execution strategy.
                .EnableRetryOnFailure(maxRetryCount: 5, maxRetryDelay: TimeSpan.FromSeconds(10), errorCodesToAdd: null)));

        // Options (bind estático — valores imutáveis durante a execução).
        var importLimits = configuration.GetSection(ImportLimits.SectionName).Get<ImportLimits>() ?? new ImportLimits();
        var nominatimOptions = configuration.GetSection(NominatimOptions.SectionName).Get<NominatimOptions>() ?? new NominatimOptions();
        var overpassOptions = configuration.GetSection(OverpassOptions.SectionName).Get<OverpassOptions>() ?? new OverpassOptions();
        var fixtureOptions = configuration.GetSection(FixtureOptions.SectionName).Get<FixtureOptions>() ?? new FixtureOptions();
        var storageOptions = configuration.GetSection(ObjectStorageOptions.SectionName).Get<ObjectStorageOptions>() ?? new ObjectStorageOptions();

        services.AddSingleton(importLimits);
        services.AddSingleton(nominatimOptions);
        services.AddSingleton(overpassOptions);
        services.AddSingleton(fixtureOptions);
        services.AddSingleton(storageOptions);

        // Stores (scoped: compartilham o DbContext da requisição/execução).
        services.AddScoped<IUnitOfWork, EfUnitOfWork>();
        services.AddScoped<ICityStore, CityStore>();
        services.AddScoped<IRevisionStore, RevisionStore>();
        services.AddScoped<IDatasetStore, DatasetStore>();
        services.AddScoped<IImportJobStore, ImportJobStore>();
        services.AddScoped<ISimulationRunStore, SimulationRunStore>();
        services.AddScoped<FeatureStore>();
        services.AddScoped<IFeatureWriter>(sp => sp.GetRequiredService<FeatureStore>());
        services.AddScoped<IFeatureReader>(sp => sp.GetRequiredService<FeatureStore>());
        services.AddScoped<ITileReader, MvtTileReader>();
        services.AddScoped<IBuildingObservationStore, BuildingObservationStore>();
        services.AddScoped<IBuildingFootprintCandidateStore, BuildingFootprintCandidateStore>();
        services.AddScoped<IBuildingFootprintStore, BuildingFootprintStore>();
        services.AddScoped<IBuildingClassificationStore, BuildingClassificationStore>();
        services.AddScoped<IBuildingReconciliationStore, BuildingReconciliationStore>();
        services.AddScoped<IBuildingValidationStore, BuildingValidationStore>();
        services.AddScoped<IModelBundleStore, ModelBundleStore>();
        services.AddScoped<IRiskZoneStore, RiskZoneStore>();
        services.AddScoped<IDisasterScenarioStore, DisasterScenarioStore>();
        services.AddScoped<DisasterCollectionService>();

        // Adapters externos.
        // AddStandardResilienceHandler (retry + circuit breaker + timeout) só é
        // aplicado a clientes sem resiliência própria já embutida no adapter:
        // Overpass já tem failover manual entre hosts (SSRF-safe allowlist) e o
        // Terrarium tem um timeout curto deliberado (comentário abaixo) — somar
        // retry automático a qualquer um dos dois contradiria o design existente.
        services.AddHttpClient<IGeocoder, NominatimGeocoder>(client =>
        {
            client.BaseAddress = new Uri(nominatimOptions.BaseUrl.TrimEnd('/') + "/");
            client.DefaultRequestHeaders.UserAgent.ParseAdd(UserAgent);
        }).AddStandardResilienceHandler(options =>
        {
            options.TotalRequestTimeout.Timeout = TimeSpan.FromSeconds(30);
            options.AttemptTimeout.Timeout = TimeSpan.FromSeconds(10);
            options.Retry.MaxRetryAttempts = 2;
        });
        // OverpassOsmSource fica registrado como classe concreta (não IOsmSource):
        // HybridOsmSource é quem decide entre ele e o extrato .pbf local por bbox.
        services.AddHttpClient<OverpassOsmSource>(client =>
        {
            client.Timeout = TimeSpan.FromSeconds(overpassOptions.QueryTimeoutSeconds + 30);
            client.DefaultRequestHeaders.UserAgent.ParseAdd(UserAgent);
        });
        var osmPbfOptions = configuration.GetSection(OsmPbfOptions.SectionName).Get<OsmPbfOptions>() ?? new OsmPbfOptions();
        services.AddSingleton(osmPbfOptions);
        services.AddSingleton<LocalPbfOsmSource>();
        services.AddScoped<IOsmSource, HybridOsmSource>();
        services.AddSingleton<IFixtureSource, FileFixtureSource>();
        services.AddSingleton<IObjectStorage, MinioObjectStorage>();

        var terrainOptions = configuration.GetSection(TerrainOptions.SectionName).Get<TerrainOptions>() ?? new TerrainOptions();
        services.AddSingleton(terrainOptions);
        services.AddHttpClient<IElevationProvider, TerrariumElevationProvider>(client =>
        {
            // Curto de propósito: um tile Terrarium em cache (CDN) responde em
            // <1s; um teto baixo faz o fallback para terreno plano/tile ausente
            // disparar rápido em vez de acumular ao longo de centenas de tiles
            // (PrefetchTilesAsync/SampleAsync já são limitados por MaxPrefetchTiles,
            // mas o custo total ainda é tiles × timeout por tile).
            client.Timeout = TimeSpan.FromSeconds(8);
            client.DefaultRequestHeaders.UserAgent.ParseAdd(UserAgent);
        });

        services.AddHttpClient<IClimateProvider, OpenMeteoClimateProvider>(client =>
        {
            client.BaseAddress = new Uri("https://api.open-meteo.com/");
            client.DefaultRequestHeaders.UserAgent.ParseAdd(UserAgent);
        }).AddStandardResilienceHandler(options =>
        {
            options.TotalRequestTimeout.Timeout = TimeSpan.FromSeconds(10);
            options.AttemptTimeout.Timeout = TimeSpan.FromSeconds(5);
            options.Retry.MaxRetryAttempts = 2;
        });
        services.AddHttpClient<IDisasterSourceCollector, UsgsEarthquakeFeedCollector>(client =>
        {
            client.DefaultRequestHeaders.UserAgent.ParseAdd(UserAgent);
        }).AddStandardResilienceHandler(options =>
        {
            options.TotalRequestTimeout.Timeout = TimeSpan.FromSeconds(20);
            options.AttemptTimeout.Timeout = TimeSpan.FromSeconds(8);
            options.Retry.MaxRetryAttempts = 2;
        });
        // JmaEarthquakeFeedCollector/JmaMenuSourceCollector (JMA — Agência Meteorológica
        // do Japão) ficam desativados: o foco da plataforma passou para o Brasil
        // (Sul/Sudeste) e não fazem sentido como fonte de desastre ativa agora.
        // Classes preservadas (não apagadas) para o caso de cenários no Japão
        // voltarem a ser relevantes; USGS continua registrado por ser uma fonte
        // global de terremotos, não específica do Japão.

        // Normalização e reconstrução.
        services.AddSingleton<ICityDataNormalizer, GeoJsonNormalizer>();
        services.AddSingleton<ICityDataNormalizer, OverpassNormalizer>();
        services.AddSingleton<ReconstructionProfileRegistry>();
        services.AddScoped<ImportPipeline>();

        // Simulação de desastres.
        var seismicOptions = configuration.GetSection(SeismicOptions.SectionName).Get<SeismicOptions>() ?? new SeismicOptions();
        services.AddSingleton(seismicOptions);
        services.AddSingleton<IRasterImageEncoder, ImageSharpRasterEncoder>();
        services.AddScoped<SeismicSimulationPipeline>();
        services.AddScoped<IDisasterSimulationEngine>(
            provider => provider.GetRequiredService<SeismicSimulationPipeline>());
        services.AddScoped<DisasterSimulationEngineRegistry>();

        return services;
    }
}
