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

            // GIS Services
            services.AddHttpClient<IGisService, GisService>();

            // Register AlertsBackgroundService as both IAlertsService and HostedService
            services.AddSingleton<AlertsBackgroundService>();
            services.AddSingleton<IAlertsService>(sp => sp.GetRequiredService<AlertsBackgroundService>());
            services.AddHostedService(sp => sp.GetRequiredService<AlertsBackgroundService>());

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
