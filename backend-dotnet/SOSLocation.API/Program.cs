using Microsoft.EntityFrameworkCore;
using Serilog;
using SOSLocation.API.Extensions;
using SOSLocation.API.Middleware;
using SOSLocation.API.Filters;
using SOSLocation.Domain.Interfaces;
using SOSLocation.Infrastructure.Persistence;
using SOSLocation.API.Hubs;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc.Authorization;
using Microsoft.AspNetCore.OutputCaching;
using Microsoft.AspNetCore.RateLimiting;
using System;
using System.Linq;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using HealthChecks.UI.Client;

using Microsoft.AspNetCore.HttpOverrides;

var builder = WebApplication.CreateBuilder(args);

// Configure Forwarded Headers for Reverse Proxy (Coolify/Traefik)
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
});

// Professional Logging with Serilog
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .WriteTo.File("logs/sos-location-.log", rollingInterval: RollingInterval.Day)
    .CreateLogger();

builder.Host.UseSerilog();

// Observability: OpenTelemetry
builder.Services.AddOpenTelemetry()
    .WithTracing(tracing => tracing
        .AddSource("SOSLocation.API")
        .SetResourceBuilder(ResourceBuilder.CreateDefault().AddService("SOSLocation.API"))
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddEntityFrameworkCoreInstrumentation()
        .AddConsoleExporter());

// Health Monitoring
builder.Services.AddHealthChecks()
    .AddNpgSql(builder.Configuration.GetConnectionString("DefaultConnection")!)
    .AddCheck("Self", () => Microsoft.Extensions.Diagnostics.HealthChecks.HealthCheckResult.Healthy());

// Add services to the container.
builder.Services.AddControllers(options =>
{
    options.Filters.Add<ResultActionFilter>();
}).AddJsonOptions(options =>
{
    options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddSignalR();
builder.Services.AddHttpClient();

builder.Services.AddOutputCache(options =>
{
    options.AddPolicy("Cache1Min", builder => builder.Expire(TimeSpan.FromMinutes(1)));
    options.AddPolicy("Cache5Min", builder => builder.Expire(TimeSpan.FromMinutes(5)));
    options.AddPolicy("CacheLongLived", builder => builder.Expire(TimeSpan.FromMinutes(10)));
});

// Clean Architecture DI Extensions
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddFixedWindowLimiter("PublicApi", opt =>
    {
        opt.Window = TimeSpan.FromMinutes(1);
        opt.PermitLimit = 100;
        opt.QueueLimit = 20;
    });
});

// builder.Services.AddScoped<INotificationService, SOSLocation.API.Services.NotificationService>(); (Now in Infrastructure)

builder.Services.AddCors(options =>
{
    var allowedOrigins = builder.Configuration.GetSection("AllowedOrigins")
        .Get<string[]>()?
        .Where(origin => !string.IsNullOrWhiteSpace(origin) && origin != "*")
        .Distinct()
        .ToArray()
        ?? new[] { "http://localhost:8088" };

    options.AddPolicy("SOSPolicy", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

// builder.Services.AddDbContext (Now handled in Infrastructure extension)

// JWT Authentication Configuration
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        var validateAudience = builder.Configuration.GetValue("Keycloak:VerifyAudience", true);

        options.Authority = builder.Configuration["Keycloak:Authority"];
        options.Audience = builder.Configuration["Keycloak:Audience"];
        options.RequireHttpsMetadata = builder.Configuration.GetValue<bool>("Keycloak:RequireHttpsMetadata");

        var audiences = builder.Configuration
            .GetSection("Keycloak:Audiences")
            .Get<string[]>()
            ?? new[] { builder.Configuration["Keycloak:Audience"] ?? "sos-location-frontend" };

        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = !builder.Environment.IsDevelopment(),
            ValidIssuers = new[] {
                builder.Configuration["Keycloak:Authority"],
                "https://localhost:8080/realms/sos-location",
                "http://localhost:8080/realms/sos-location"
            },
            ValidateAudience = validateAudience,
            ValidAudiences = audiences,
            ValidateLifetime = true
        };

        if (builder.Environment.IsDevelopment())
        {
            options.BackchannelHttpHandler = new HttpClientHandler
            {
                ServerCertificateCustomValidationCallback = (message, cert, chain, errors) => true
            };
        }

        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs/notifications"))
                {
                    context.Token = accessToken;
                }
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

var app = builder.Build();

app.UseForwardedHeaders();

var applyMigrationsOnStartup = builder.Configuration.GetValue("Database:ApplyMigrationsOnStartup", true);
var seedOnStartup = builder.Configuration.GetValue("Database:SeedOnStartup", true);

using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<SOSLocationDbContext>();

    if (applyMigrationsOnStartup)
    {
        Log.Information("Applying database migrations on startup.");
        context.Database.Migrate();
    }
    else
    {
        Log.Information("Skipping database migrations on startup.");
        if (app.Environment.IsDevelopment())
        {
            context.Database.EnsureCreated();
        }
    }

    if (seedOnStartup)
    {
        Log.Information("Seeding database on startup.");
        SOSLocationDbSeeder.Seed(context);
    }
    else
    {
        Log.Information("Skipping database seed on startup.");
    }
}


// Web API Pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    app.UseHsts();
}

// Only redirect to HTTPS in development (Nginx handles TLS termination in production/Docker)
if (app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}
app.UseMiddleware<SecurityHeadersMiddleware>();
app.UseMiddleware<ExceptionHandlingMiddleware>();

app.UseCors("SOSPolicy");
app.UseRateLimiter();
app.UseOutputCache();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<NotificationHub>("/api/hubs/notifications");

// Health Check Endpoints
app.MapHealthChecks("/health", new HealthCheckOptions
{
    Predicate = _ => true,
    ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse
});

app.Run();
