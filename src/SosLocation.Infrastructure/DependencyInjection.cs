using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SosLocation.Application.Abstractions;
using SosLocation.Application.Import;
using SosLocation.Application.Normalization;
using SosLocation.Application.Options;
using SosLocation.Application.Profiles;
using SosLocation.GeoProcessing.Normalizers;
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
            options.UseNpgsql(connectionString, npgsql => npgsql.UseNetTopologySuite()));

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
        services.AddScoped<FeatureStore>();
        services.AddScoped<IFeatureWriter>(sp => sp.GetRequiredService<FeatureStore>());
        services.AddScoped<IFeatureReader>(sp => sp.GetRequiredService<FeatureStore>());
        services.AddScoped<ITileReader, MvtTileReader>();

        // Adapters externos.
        services.AddHttpClient<IGeocoder, NominatimGeocoder>(client =>
        {
            client.BaseAddress = new Uri(nominatimOptions.BaseUrl.TrimEnd('/') + "/");
            client.Timeout = TimeSpan.FromSeconds(30);
            client.DefaultRequestHeaders.UserAgent.ParseAdd(UserAgent);
        });
        services.AddHttpClient<IOsmSource, OverpassOsmSource>(client =>
        {
            client.Timeout = TimeSpan.FromSeconds(overpassOptions.QueryTimeoutSeconds + 30);
            client.DefaultRequestHeaders.UserAgent.ParseAdd(UserAgent);
        });
        services.AddSingleton<IFixtureSource, FileFixtureSource>();
        services.AddSingleton<IObjectStorage, MinioObjectStorage>();

        // Normalização e reconstrução.
        services.AddSingleton<ICityDataNormalizer, GeoJsonNormalizer>();
        services.AddSingleton<ICityDataNormalizer, OverpassNormalizer>();
        services.AddSingleton<ReconstructionProfileRegistry>();
        services.AddScoped<ImportPipeline>();

        return services;
    }
}
