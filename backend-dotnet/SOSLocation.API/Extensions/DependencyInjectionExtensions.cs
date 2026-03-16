using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using SOSLocation.Domain.Interfaces;
using SOSLocation.Infrastructure.Persistence;
using SOSLocation.Infrastructure.Persistence.Repositories;
using SOSLocation.Infrastructure.Services.Gis;
using SOSLocation.Infrastructure.Persistence.Dapper;
using FluentValidation;
using SOSLocation.Application.Features.Incidents.Commands.CreateIncident;
using SOSLocation.Application.Common.Behaviors;
using MediatR;
using SOSLocation.Infrastructure.Services.Gis.Providers;
using SOSLocation.Infrastructure.Services.News;

namespace SOSLocation.API.Extensions
{
    public static class DependencyInjectionExtensions
    {
        public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
        {
            var connectionString = configuration.GetConnectionString("DefaultConnection");

            services.AddDbContext<SOSLocationDbContext>(options =>
                options.UseNpgsql(connectionString));

            services.AddSingleton<DapperContext>();
            services.AddMemoryCache();

            services.AddScoped<IIncidentRepository, IncidentRepository>();
            services.AddScoped<IAttentionAlertRepository, AttentionAlertRepository>();
            services.AddScoped<IRescueGroupRepository, RescueGroupRepository>();
            services.AddScoped<ISupplyLogisticsRepository, SupplyLogisticsRepository>();
            services.AddScoped<ISearchAreaRepository, SearchAreaRepository>();
            services.AddScoped<IAssignmentRepository, AssignmentRepository>();
            services.AddScoped<IHubRepository, HubRepository>();
            services.AddScoped<ICampaignRepository, CampaignRepository>();
            services.AddScoped<IDonationRepository, DonationRepository>();
            services.AddScoped<IExpenseRepository, ExpenseRepository>();
            services.AddScoped<IGeolocationRepository, GeolocationRepository>();
            services.AddScoped<IVisitedLocationRepository, VisitedLocationRepository>();
            services.AddScoped<IFoundPeopleRepository, FoundPeopleRepository>();
            services.AddScoped<INewsRepository, NewsRepository>();
            services.AddScoped<IMapDemarcationRepository, MapDemarcationRepository>();
            services.AddScoped<IGamificationRepository, GamificationRepository>();
            services.AddScoped<IDataSourceRepository, DataSourceRepository>();

            // GIS Configuration
            services.Configure<GisOptions>(configuration.GetSection("ExternalIntegrations"));

            // GIS Data Providers (Modular Architecture)
            services.AddHttpClient<IGisDataProvider, OpenTopographyProvider>();
            services.AddHttpClient<IGisDataProvider, OverpassProvider>();
            services.AddHttpClient<IGisDataProvider, OpenMeteoProvider>();

            // GIS Facade
            services.AddScoped<IGisService, GisService>();
            services.AddScoped<IGeoCentralService, GeoCentralService>();

            // Alert Providers
            services.AddHttpClient<IAlertProvider, InmetAlertProvider>();
            services.AddHttpClient<IAlertProvider, DefesaCivilAlertProvider>();
            services.AddHttpClient<IAlertProvider, CemadenAlertProvider>();
            services.AddHttpClient<IAlertProvider, JmaAlertProvider>();

            // Enrichment
            services.AddHttpClient<IIbgeEnrichmentService, IbgeEnrichmentService>();

            // Risk Service Proxy
            services.AddHttpClient<SOSLocation.API.Controllers.RiskController>();

            // External API Named Clients (performance: shared connection pool + timeout tuning)
            services.AddHttpClient("ibge", client =>
            {
                client.BaseAddress = new Uri("https://servicodados.ibge.gov.br");
                client.Timeout = TimeSpan.FromSeconds(10);
                client.DefaultRequestHeaders.Add("Accept", "application/json");
            });
            services.AddHttpClient("transparency", client =>
            {
                client.Timeout = TimeSpan.FromSeconds(15);
                client.DefaultRequestHeaders.Add("Accept", "application/json");
            });
            services.AddHttpClient("openmeteo", client =>
            {
                client.BaseAddress = new Uri("https://api.open-meteo.com");
                client.Timeout = TimeSpan.FromSeconds(8);
            });

            // Register AlertsBackgroundService as both IAlertsService and HostedService
            services.AddSingleton<AlertsBackgroundService>();
            services.AddSingleton<IAlertsService>(sp => sp.GetRequiredService<AlertsBackgroundService>());
            services.AddHostedService(sp => sp.GetRequiredService<AlertsBackgroundService>());

            // News & Data Indexers
            services.AddHostedService<NewsIndexerService>();
            services.AddHostedService<RiskBackgroundService>();
            services.AddHostedService<WeatherIndexerService>();
            services.AddHostedService<AlertHistoryService>();
            services.AddHostedService<GisIndexerService>();

            // Broadcast & Notifications (Singleton: used by BackgroundService singletons)
            services.AddSingleton<INotificationService, SOSLocation.API.Services.NotificationService>();

            return services;
        }

        public static IServiceCollection AddApplication(this IServiceCollection services)
        {
            // MediatR with Pipeline Behaviors
            services.AddMediatR(cfg =>
            {
                cfg.RegisterServicesFromAssembly(typeof(CreateIncidentCommand).Assembly);
                cfg.AddOpenBehavior(typeof(LoggingBehavior<,>));
            });

            // FluentValidation
            services.AddValidatorsFromAssembly(typeof(CreateIncidentCommandValidator).Assembly);

            return services;
        }
    }
}
