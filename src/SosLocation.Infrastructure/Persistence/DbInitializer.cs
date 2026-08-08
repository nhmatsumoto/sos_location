using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using NetTopologySuite.Geometries;
using SosLocation.Application.Import;
using SosLocation.Domain.Disasters;
using SosLocation.Domain.Jobs;

namespace SosLocation.Infrastructure.Persistence;

/// <summary>
/// Aplica migrations de forma resiliente e semeia o job de importação da fixture
/// de demonstração quando o banco está vazio (execução offline garantida).
/// </summary>
public static class DbInitializer
{
    public static async Task InitializeAsync(SosDbContext context, ILogger logger, CancellationToken ct)
    {
        const int maxAttempts = 10;
        for (var attempt = 1; ; attempt++)
        {
            try
            {
                await context.Database.MigrateAsync(ct);
                break;
            }
            catch (Exception ex) when (attempt < maxAttempts && ex is not OperationCanceledException)
            {
                logger.LogWarning(ex, "Database not ready (attempt {Attempt}/{Max}); retrying in 3s...",
                    attempt, maxAttempts);
                await Task.Delay(TimeSpan.FromSeconds(3), ct);
            }
        }

        await SeedDemoFixtureJobAsync(context, logger, ct);
        // SeedKumamotoScenarioAsync não é mais chamado: o foco da plataforma passou
        // para o Brasil (Sul/Sudeste); o método fica preservado (não apagado) caso
        // um cenário no Japão volte a ser relevante no futuro.
        await SeedBrazilCityImportJobsAsync(context, logger, ct);
    }

    private static async Task SeedDemoFixtureJobAsync(SosDbContext context, ILogger logger, CancellationToken ct)
    {
        var hasFixtureJob = await context.ImportJobs.AnyAsync(j => j.JobType == "fixture-import", ct);
        if (hasFixtureJob) return;

        var request = new ImportRequest
        {
            Name = "Demo District",
            Source = ImportSources.Fixture,
            ReconstructionProfile = "osm-basic-v1",
        };

        await context.ImportJobs.AddAsync(new ImportJob
        {
            JobType = "fixture-import",
            Request = JsonSerializer.Serialize(request, new JsonSerializerOptions(JsonSerializerDefaults.Web)),
        }, ct);
        await context.SaveChangesAsync(ct);
        logger.LogInformation("Seeded demo fixture import job (offline demo city).");
    }

    /// <summary>
    /// Semeia imports OSM de áreas centrais de cidades do Sul e Sudeste do Brasil,
    /// servidas pelos extratos .osm.pbf locais (ver <c>OsmPbf</c> em appsettings e
    /// <c>HybridOsmSource</c>) — sem depender de rede/Overpass. Bounding boxes de
    /// área central (não o município inteiro) para ficar dentro de
    /// <c>ImportLimits.MaximumImportAreaKm2</c>, no mesmo espírito da fixture
    /// "Demo District" (um distrito, não uma cidade inteira).
    /// </summary>
    private static async Task SeedBrazilCityImportJobsAsync(SosDbContext context, ILogger logger, CancellationToken ct)
    {
        var cities = new[]
        {
            new
            {
                JobType = "osm-import-curitiba",
                Name = "Curitiba (Centro)",
                Region = "Paraná",
                BoundingBox = new BoundingBoxDto(-49.30, -25.45, -49.24, -25.40),
            },
            new
            {
                JobType = "osm-import-sao-paulo",
                Name = "São Paulo (Centro)",
                Region = "São Paulo",
                BoundingBox = new BoundingBoxDto(-46.68, -23.57, -46.61, -23.51),
            },
        };

        foreach (var city in cities)
        {
            if (await context.ImportJobs.AnyAsync(j => j.JobType == city.JobType, ct)) continue;

            var request = new ImportRequest
            {
                Name = city.Name,
                CountryCode = "BR",
                Region = city.Region,
                Source = ImportSources.OpenStreetMap,
                ReconstructionProfile = "osm-basic-v1",
                BoundingBox = city.BoundingBox,
            };
            await context.ImportJobs.AddAsync(new ImportJob
            {
                JobType = city.JobType,
                Request = JsonSerializer.Serialize(request, new JsonSerializerOptions(JsonSerializerDefaults.Web)),
            }, ct);
            logger.LogInformation("Seeded Brazil OSM import job for {City} ({Region}).", city.Name, city.Region);
        }

        await context.SaveChangesAsync(ct);
    }

    private static async Task SeedKumamotoScenarioAsync(SosDbContext context, ILogger logger, CancellationToken ct)
    {
        const string key = "kumamoto-2026-07-28-m68";
        if (await context.DisasterScenarios.AnyAsync(s => s.ScenarioKey == key, ct)) return;

        var origin = DateTimeOffset.Parse("2026-07-28T07:27:15Z");
        var geometry = NetTopologySuite.NtsGeometryServices.Instance.CreateGeometryFactory(srid: 4326);
        var scenario = new DisasterScenario
        {
            ScenarioKey = key,
            Name = "Kumamoto earthquake — preliminary operational snapshot",
            HazardType = DisasterType.Earthquake,
            CanonicalEventId = "jp-jma-20260728162718",
            SimulationClockOrigin = origin,
            Epicenter = geometry.CreatePoint(new Coordinate(130.722, 32.682)),
            DepthKm = 10,
            MomentMagnitude = 6.8,
            MagnitudeType = "Mww",
        };
        await context.DisasterScenarios.AddAsync(scenario, ct);
        await context.SourceObservations.AddAsync(new SourceObservation
        {
            DisasterScenarioId = scenario.Id,
            SourceId = "operator-snapshot-kumamoto-2026-07-28",
            SourceUrl = "about:operator-provided-snapshot",
            Kind = "operator-supplied-snapshot",
            Payload = JsonSerializer.Serialize(new
            {
                jmaEventId = "20260728162718", usgsEventId = "us6000tgb9", jmaMagnitude = 7.1,
                usgsMagnitude = 6.8, maximumIntensity = "Shindo 7", status = "preliminary",
            }),
            ObservedAt = origin, Confidence = 0.7, VerificationStatus = VerificationStatus.Reported,
        }, ct);

        // Círculo de triagem, não uma fronteira administrativa nem um mapa de
        // intensidade: é publicado como estimado até chegarem malhas oficiais JMA/GSI.
        var ring = geometry.CreateLinearRing(Enumerable.Range(0, 73).Select(i =>
        {
            var angle = i * Math.PI / 36d;
            return new Coordinate(130.722 + 0.32 * Math.Cos(angle), 32.682 + 0.23 * Math.Sin(angle));
        }).ToArray());
        await context.OperationalMapFeatures.AddRangeAsync([
            new OperationalMapFeature
            {
                DisasterScenarioId = scenario.Id, FeatureType = "epicenter", Name = "USGS epicenter (10 km depth)",
                Geometry = scenario.Epicenter, Properties = "{\"usgsEventId\":\"us6000tgb9\",\"depthKm\":10}",
                VerificationStatus = VerificationStatus.Reported, EffectiveFrom = origin,
            },
            new OperationalMapFeature
            {
                DisasterScenarioId = scenario.Id, FeatureType = "assessment-perimeter", Name = "Initial 30 km assessment perimeter (estimated)",
                Geometry = geometry.CreatePolygon(ring), Properties = "{\"purpose\":\"prioritize field assessment; not an intensity boundary\"}",
                VerificationStatus = VerificationStatus.Reported, EffectiveFrom = origin,
            },
        ], ct);
        await context.ImpactObservations.AddRangeAsync([
            new ImpactObservation { DisasterScenarioId = scenario.Id, Kind = "ground-motion", Subject = "Uki City; Hikawa Town", Value = "{\"shindo\":\"7\",\"preliminary\":true}", ObservedAt = origin, Confidence = .7, VerificationStatus = VerificationStatus.Reported },
            new ImpactObservation { DisasterScenarioId = scenario.Id, Kind = "utility-outage", Subject = "Kumamoto Prefecture", Value = "{\"affectedHouseholds\":48000,\"preliminary\":true}", ObservedAt = origin, Confidence = .55, VerificationStatus = VerificationStatus.Reported },
            new ImpactObservation { DisasterScenarioId = scenario.Id, Kind = "evacuation", Subject = "Kumamoto Prefecture", Value = "{\"peopleAdvised\":300000,\"preliminary\":true}", ObservedAt = origin, Confidence = .55, VerificationStatus = VerificationStatus.Reported },
        ], ct);
        await context.SaveChangesAsync(ct);
        logger.LogInformation("Seeded preliminary Kumamoto operational scenario {ScenarioKey}.", key);
    }
}
