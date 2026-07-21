using System.IO.Compression;
using FluentValidation;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.Extensions.Logging.Abstractions;
using NetTopologySuite.IO.Converters;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using Serilog;
using SosLocation.Api.Endpoints;
using SosLocation.Application.Import;
using SosLocation.Application.Simulation;
using SosLocation.Infrastructure;
using SosLocation.Infrastructure.Persistence;

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateBootstrapLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);

    builder.Host.UseSerilog((context, services, configuration) => configuration
        .ReadFrom.Configuration(context.Configuration)
        .Enrich.FromLogContext()
        .Enrich.WithProperty("service", "sos-location-api")
        .WriteTo.Console());

    builder.Services.AddSosInfrastructure(builder.Configuration);
    builder.Services.AddScoped<IValidator<ImportRequest>>(sp =>
        new ImportRequestValidator(
            sp.GetRequiredService<SosLocation.Application.Options.ImportLimits>(),
            sp.GetRequiredService<SosLocation.Application.Profiles.ReconstructionProfileRegistry>()));
    builder.Services.AddScoped<IValidator<SimulationRequest>, SimulationRequestValidator>();

    builder.Services.AddOpenApi();
    builder.Services.AddProblemDetails(); // Erros padronizados, sem stack traces expostos.
    builder.Services.AddMemoryCache();

    builder.Services.ConfigureHttpJsonOptions(options =>
        options.SerializerOptions.Converters.Add(new GeoJsonConverterFactory()));

    builder.Services.AddResponseCompression(options =>
    {
        options.EnableForHttps = true;
        options.Providers.Add<BrotliCompressionProvider>();
        options.Providers.Add<GzipCompressionProvider>();
        options.MimeTypes = ResponseCompressionDefaults.MimeTypes.Concat(
            ["application/vnd.mapbox-vector-tile", "application/geo+json"]);
    });
    builder.Services.Configure<BrotliCompressionProviderOptions>(o => o.Level = CompressionLevel.Fastest);

    builder.Services.AddCors(options => options.AddDefaultPolicy(policy => policy
        .WithOrigins(builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
                     ?? ["http://localhost:5173", "http://localhost:8080"])
        .AllowAnyHeader()
        .AllowAnyMethod()));

    var connectionString = builder.Configuration.GetConnectionString("Postgres")!;
    builder.Services.AddHealthChecks()
        .AddNpgSql(connectionString, name: "postgres", tags: ["ready"]);

    builder.Services.AddOpenTelemetry()
        .ConfigureResource(resource => resource.AddService("sos-location-api"))
        .WithTracing(tracing =>
        {
            tracing.AddAspNetCoreInstrumentation().AddHttpClientInstrumentation();
            if (builder.Configuration["OTEL_EXPORTER_OTLP_ENDPOINT"] is not null)
                tracing.AddOtlpExporter();
        })
        .WithMetrics(metrics =>
        {
            metrics.AddAspNetCoreInstrumentation().AddHttpClientInstrumentation();
            if (builder.Configuration["OTEL_EXPORTER_OTLP_ENDPOINT"] is not null)
                metrics.AddOtlpExporter();
        });

    var app = builder.Build();

    app.UseSerilogRequestLogging();
    app.UseExceptionHandler();
    app.UseStatusCodePages();
    app.UseResponseCompression();
    app.UseCors();

    app.MapOpenApi();

    app.MapHealthChecks("/health");
    app.MapHealthChecks("/health/ready", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
    {
        Predicate = check => check.Tags.Contains("ready"),
    });
    app.MapHealthChecks("/health/live", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
    {
        Predicate = _ => false,
    });

    var api = app.MapGroup("/api/v1");
    api.MapPlacesEndpoints();
    api.MapCitiesEndpoints();
    api.MapImportsEndpoints();
    api.MapTilesEndpoints();
    api.MapTerrainEndpoints();
    api.MapFeaturesEndpoints();
    api.MapSimulationsEndpoints();

    // Migrations automáticas controladas + seed da fixture offline.
    if (!app.Configuration.GetValue("SkipMigrations", false))
    {
        using var scope = app.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<SosDbContext>();
        var logger = scope.ServiceProvider.GetService<ILogger<Program>>()
                     ?? NullLogger<Program>.Instance;
        await DbInitializer.InitializeAsync(context, logger, CancellationToken.None);
    }

    app.Run();
}
catch (Exception ex) when (ex is not HostAbortedException)
{
    Log.Fatal(ex, "SOS_LOCATION API terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}

public partial class Program;
