using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SOSLocation.Domain.Entities;
using SOSLocation.Infrastructure.Persistence;
using SOSLocation.Domain.Interfaces;
using Microsoft.Extensions.Options;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using SOSLocation.Infrastructure.Services.Gis;

namespace SOSLocation.Infrastructure.Services.News
{
    /// <summary>
    /// Indexes real meteorological data from Open-Meteo for configured cities.
    /// Replaces the previous hardcoded Tokyo/São Paulo stub.
    /// </summary>
    public class WeatherIndexerService : BackgroundService
    {
        private readonly ILogger<WeatherIndexerService> _logger;
        private readonly IServiceProvider _serviceProvider;
        private readonly INotificationService _notificationService;
        private readonly HttpClient _httpClient;
        private readonly GisOptions _options;
        private const int IndexIntervalMinutes = 20;

        // Key cities in Brazil and Japan for proactive indexing
        private static readonly (string Name, double Lat, double Lon, string Country)[] MonitoredCities =
        [
            ("São Paulo",      -23.5505, -46.6333, "Brasil"),
            ("Rio de Janeiro", -22.9068, -43.1729, "Brasil"),
            ("Porto Alegre",   -30.0346, -51.2177, "Brasil"),
            ("Curitiba",       -25.4284, -49.2733, "Brasil"),
            ("Salvador",       -12.9714, -38.5014, "Brasil"),
            ("Recife",          -8.0476, -34.8770, "Brasil"),
            ("Manaus",          -3.1190, -60.0217, "Brasil"),
            ("Tokyo",           35.6895, 139.6917, "Japan"),
            ("Osaka",           34.6937, 135.5023, "Japan"),
            ("Sapporo",         43.0618, 141.3545, "Japan"),
            ("Nagoya",          35.1815, 136.9066, "Japan"),
        ];

        public WeatherIndexerService(
            ILogger<WeatherIndexerService> logger,
            IServiceProvider serviceProvider,
            INotificationService notificationService,
            HttpClient httpClient,
            IOptions<GisOptions> options)
        {
            _logger = logger;
            _serviceProvider = serviceProvider;
            _notificationService = notificationService;
            _httpClient = httpClient;
            _options = options.Value;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("WeatherIndexerService started. Monitoring {count} cities.", MonitoredCities.Length);
            await IndexWeatherAsync(stoppingToken);

            while (!stoppingToken.IsCancellationRequested)
            {
                await Task.Delay(TimeSpan.FromMinutes(IndexIntervalMinutes), stoppingToken);
                await IndexWeatherAsync(stoppingToken);
            }
        }

        private async Task IndexWeatherAsync(CancellationToken ct)
        {
            _logger.LogInformation("Indexing real meteorological data from Open-Meteo for {n} cities...", MonitoredCities.Length);

            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<SOSLocationDbContext>();

            var records = new List<MeteorologicalData>();

            foreach (var city in MonitoredCities)
            {
                if (ct.IsCancellationRequested) break;
                try
                {
                    var data = await FetchOpenMeteoAsync(city.Lat, city.Lon, ct);
                    if (data == null) continue;

                    records.Add(new MeteorologicalData
                    {
                        LocationName = city.Name,
                        Latitude     = city.Lat,
                        Longitude    = city.Lon,
                        Temperature  = data.Temperature,
                        Humidity     = (int)data.Humidity,
                        WindSpeed    = data.WindSpeed,
                        Condition    = data.Condition,
                        CapturedAt   = DateTime.UtcNow,
                        rawDataJson  = JsonSerializer.Serialize(data)
                    });

                    _logger.LogDebug("Indexed {city}: {temp}°C, wind {wind}km/h, {cond}",
                        city.Name, data.Temperature, data.WindSpeed, data.Condition);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to fetch weather for {city}", city.Name);
                }
            }

            if (records.Count == 0) return;

            try
            {
                context.MeteorologicalData.AddRange(records);
                await context.SaveChangesAsync(ct);
                _logger.LogInformation("Persisted {n} real meteorological records.", records.Count);

                // Broadcast severe weather alerts
                foreach (var r in records.Where(r => IsSevere(r)))
                {
                    await _notificationService.BroadcastAlertAsync(new
                    {
                        Type = "SEVERE_WEATHER",
                        r.LocationName,
                        r.Temperature,
                        r.WindSpeed,
                        r.Condition,
                        r.CapturedAt
                    });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to persist meteorological data.");
            }
        }

        private async Task<OpenMeteoCurrentData?> FetchOpenMeteoAsync(double lat, double lon, CancellationToken ct)
        {
            var baseUrl = _options.OpenMeteoUrl ?? "https://api.open-meteo.com/v1/forecast";
            var url = $"{baseUrl}?latitude={lat:F4}&longitude={lon:F4}" +
                      "&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,precipitation" +
                      "&timezone=auto&forecast_days=1";

            using var response = await _httpClient.GetAsync(url, ct);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Open-Meteo returned {status} for ({lat},{lon})", response.StatusCode, lat, lon);
                return null;
            }

            using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct));
            var current = doc.RootElement.GetProperty("current");

            double temp     = current.GetProperty("temperature_2m").GetDouble();
            double humidity = current.GetProperty("relative_humidity_2m").GetDouble();
            double wind     = current.GetProperty("wind_speed_10m").GetDouble();
            int    code     = current.GetProperty("weather_code").GetInt32();

            return new OpenMeteoCurrentData(temp, humidity, wind, WeatherCodeToCondition(code));
        }

        private static string WeatherCodeToCondition(int code) => code switch
        {
            0 => "Céu limpo",
            1 or 2 or 3 => "Parcialmente nublado",
            45 or 48 => "Neblina",
            51 or 53 or 55 => "Garoa",
            61 or 63 or 65 => "Chuvoso",
            71 or 73 or 75 => "Neve",
            80 or 81 or 82 => "Aguaceiro",
            95 => "Trovoada",
            96 or 99 => "Trovoada com granizo",
            _ => "Variável"
        };

        private static bool IsSevere(MeteorologicalData r) =>
            r.WindSpeed > 60 || r.Temperature > 40 || r.Temperature < -10;

        private record OpenMeteoCurrentData(double Temperature, double Humidity, double WindSpeed, string Condition);
    }
}
