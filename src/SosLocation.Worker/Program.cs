using Serilog;
using SosLocation.Infrastructure;
using SosLocation.Worker;

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateBootstrapLogger();

try
{
    var builder = Host.CreateApplicationBuilder(args);

    builder.Services.AddSerilog((services, configuration) => configuration
        .ReadFrom.Configuration(builder.Configuration)
        .Enrich.FromLogContext()
        .Enrich.WithProperty("service", "sos-location-worker")
        .WriteTo.Console());

    builder.Services.AddSosInfrastructure(builder.Configuration);
    builder.Services.AddHostedService<JobProcessorService>();

    var host = builder.Build();
    host.Run();
}
catch (Exception ex) when (ex is not HostAbortedException)
{
    Log.Fatal(ex, "SOS_LOCATION worker terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}
