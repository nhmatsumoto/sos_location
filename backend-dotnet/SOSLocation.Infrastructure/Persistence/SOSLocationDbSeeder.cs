using SOSLocation.Domain.Entities;
using SOSLocation.Domain.Incidents;
using SOSLocation.Domain.News;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;

namespace SOSLocation.Infrastructure.Persistence
{
    public static class SOSLocationDbSeeder
    {
        public static void Seed(SOSLocationDbContext context)
        {
            try
            {
                var seedPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Persistence", "SEED.json");
                if (!File.Exists(seedPath))
                {
                    // Fallback to project source path if base directory doesn't have it (for dev)
                    seedPath = Path.Combine(Directory.GetCurrentDirectory(), "..", "SOSLocation.Infrastructure", "Persistence", "SEED.json");
                }

                if (!File.Exists(seedPath)) return;

                var json = File.ReadAllText(seedPath);
                var seedData = JsonSerializer.Deserialize<SeedData>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                if (seedData == null) return;

                // Seed DisasterTypes
                if (!context.DisasterTypes.Any() && seedData.DisasterTypes != null)
                {
                    context.DisasterTypes.AddRange(seedData.DisasterTypes);
                    context.SaveChanges();
                }

                // Seed Incidents
                if (!context.Incidents.Any() && seedData.Incidents != null)
                {
                    context.Incidents.AddRange(seedData.Incidents);
                    context.SaveChanges();
                }

                // Seed News
                if (!context.NewsNotifications.Any() && seedData.News != null)
                {
                    context.NewsNotifications.AddRange(seedData.News);
                    context.SaveChanges();
                }

                // Seed Weather
                if (!context.MeteorologicalData.Any() && seedData.Weather != null)
                {
                    context.MeteorologicalData.AddRange(seedData.Weather);
                    context.SaveChanges();
                }

                // Seed DisasterEvents
                if (!context.DisasterEvents.Any() && seedData.DisasterEvents != null)
                {
                    var types = context.DisasterTypes.ToList();
                    foreach (var dEvent in seedData.DisasterEvents)
                    {
                        var type = types.FirstOrDefault(t => t.Code.Equals(dEvent.EventType, StringComparison.OrdinalIgnoreCase) 
                                                          || t.Name.Equals(dEvent.EventType, StringComparison.OrdinalIgnoreCase));
                        if (type != null)
                        {
                            dEvent.DisasterTypeId = type.Id;
                        }
                    }
                    context.DisasterEvents.AddRange(seedData.DisasterEvents);
                    context.SaveChanges();
                }

                // Seed RiskAnalysis
                if (!context.RiskAnalysis.Any() && seedData.RiskAnalysis != null)
                {
                    context.RiskAnalysis.AddRange(seedData.RiskAnalysis);
                    context.SaveChanges();
                }

                // Seed DataSources
                if (!context.DataSources.Any() && seedData.DataSources != null)
                {
                    context.DataSources.AddRange(seedData.DataSources);
                    context.SaveChanges();
                }
            }
            catch (Exception)
            {
                // In a real seeder, we might log this, but we'll keep it silent to avoid breaking startup
            }
        }

        private class SeedData
        {
            public List<DisasterType>? DisasterTypes { get; set; }
            public List<Incident>? Incidents { get; set; }
            public List<NewsNotification>? News { get; set; }
            public List<MeteorologicalData>? Weather { get; set; }
            public List<RiskAnalysis>? RiskAnalysis { get; set; }
            public List<DisasterEvent>? DisasterEvents { get; set; }
            public List<DataSource>? DataSources { get; set; }
        }
    }
}
