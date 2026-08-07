using System.Text.Json;
using FluentValidation;
using NetTopologySuite.Geometries;
using NetTopologySuite.Features;
using SosLocation.Application.Abstractions;
using SosLocation.Application.Disasters;
using SosLocation.Domain.Disasters;
using SosLocation.GeoProcessing.Geometry;
using SosLocation.Infrastructure.External;

namespace SosLocation.Api.Endpoints;

public static class DisasterScenariosEndpoints
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public static RouteGroupBuilder MapDisasterScenariosEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/disaster-scenarios", async (IDisasterScenarioStore store, CancellationToken ct) =>
            Results.Ok((await store.ListAsync(ct)).Select(ToDto))).WithName("ListDisasterScenarios");

        group.MapGet("/disaster-scenarios/{scenarioKey}", async (string scenarioKey, IDisasterScenarioStore store, CancellationToken ct) =>
        {
            var scenario = await store.FindByKeyAsync(scenarioKey, ct);
            return scenario is null ? Results.NotFound() : Results.Ok(ToDto(scenario));
        }).WithName("GetDisasterScenario");

        group.MapGet("/disaster-scenarios/{scenarioKey}/map.geojson", async (string scenarioKey, IDisasterScenarioStore store, CancellationToken ct) =>
        {
            var scenario = await store.FindByKeyAsync(scenarioKey, ct);
            if (scenario is null) return Results.NotFound();
            var features = await store.ListMapFeaturesAsync(scenario.Id, ct);
            var collection = new FeatureCollection();
            foreach (var feature in features)
            {
                var properties = ReadProperties(feature);
                collection.Add(new Feature(feature.Geometry, new AttributesTable
                {
                    ["id"] = feature.Id, ["type"] = feature.FeatureType, ["name"] = feature.Name,
                    ["priority"] = properties.Priority,
                    ["status"] = properties.Status,
                    ["confirmedVictims"] = properties.ConfirmedVictims,
                    ["estimatedVictims"] = properties.EstimatedVictims,
                    ["peopleRescued"] = properties.PeopleRescued,
                    ["assignedTeam"] = properties.AssignedTeam,
                    ["capacity"] = properties.Capacity,
                    ["resources"] = properties.Resources,
                    ["notes"] = properties.Notes,
                    ["verificationStatus"] = feature.VerificationStatus.ToString().ToLowerInvariant(),
                }));
            }
            return Results.Json(collection, contentType: "application/geo+json");
        }).WithName("GetDisasterScenarioMap");

        group.MapGet("/disaster-scenarios/{scenarioKey}/operations", async (
            string scenarioKey, IDisasterScenarioStore store, CancellationToken ct) =>
        {
            var scenario = await store.FindByKeyAsync(scenarioKey, ct);
            if (scenario is null) return Results.NotFound();
            return Results.Ok((await store.ListMapFeaturesAsync(scenario.Id, ct)).Select(ToOperationalDto));
        }).WithName("ListOperationalFeatures");

        group.MapGet("/operational-features/{featureId:guid}", async (
            Guid featureId, IDisasterScenarioStore store, CancellationToken ct) =>
        {
            var feature = await store.FindMapFeatureAsync(featureId, ct);
            return feature is null ? Results.NotFound() : Results.Ok(ToOperationalDto(feature));
        }).WithName("GetOperationalFeature");

        group.MapPost("/disaster-scenarios/{scenarioKey}/operations", async (
            string scenarioKey,
            OperationalFeatureRequest request,
            IValidator<OperationalFeatureRequest> validator,
            IDisasterScenarioStore store,
            IUnitOfWork unitOfWork,
            CancellationToken ct) =>
        {
            var validation = await validator.ValidateAsync(request, ct);
            if (!validation.IsValid)
                return Results.ValidationProblem(validation.ToDictionary());

            var scenario = await store.FindByKeyAsync(scenarioKey, ct);
            if (scenario is null) return Results.NotFound(new { error = "Disaster scenario not found." });

            var geometry = SanitizeGeometry(request.Geometry);
            if (geometry is null)
                return Results.UnprocessableEntity(new { error = "Geometry is invalid and could not be repaired." });

            var now = DateTimeOffset.UtcNow;
            var feature = new OperationalMapFeature
            {
                DisasterScenarioId = scenario.Id,
                FeatureType = request.FeatureType,
                Name = request.Name.Trim(),
                Geometry = geometry,
                Properties = JsonSerializer.Serialize(ToProperties(request, now), JsonOptions),
                VerificationStatus = ParseVerification(request.VerificationStatus),
                EffectiveFrom = now,
            };
            await store.AddMapFeatureAsync(feature, ct);
            await AddAuditAsync(store, scenario.Id, feature, "created", now, ct);
            await unitOfWork.SaveChangesAsync(ct);
            return Results.Created(
                $"/api/v1/operational-features/{feature.Id}",
                ToOperationalDto(feature));
        }).WithName("CreateOperationalFeature");

        group.MapPut("/disaster-scenarios/{scenarioKey}/operations/{featureId:guid}", async (
            string scenarioKey,
            Guid featureId,
            OperationalFeatureRequest request,
            IValidator<OperationalFeatureRequest> validator,
            IDisasterScenarioStore store,
            IUnitOfWork unitOfWork,
            CancellationToken ct) =>
        {
            var validation = await validator.ValidateAsync(request, ct);
            if (!validation.IsValid)
                return Results.ValidationProblem(validation.ToDictionary());

            var scenario = await store.FindByKeyAsync(scenarioKey, ct);
            if (scenario is null) return Results.NotFound(new { error = "Disaster scenario not found." });
            var feature = await store.FindMapFeatureAsync(featureId, ct);
            if (feature is null || feature.DisasterScenarioId != scenario.Id || feature.EffectiveTo is not null)
                return Results.NotFound(new { error = "Active operational feature not found." });
            if (!string.Equals(feature.FeatureType, request.FeatureType, StringComparison.Ordinal))
                return Results.Conflict(new { error = "Feature type cannot be changed after creation." });

            var geometry = SanitizeGeometry(request.Geometry);
            if (geometry is null)
                return Results.UnprocessableEntity(new { error = "Geometry is invalid and could not be repaired." });

            var now = DateTimeOffset.UtcNow;
            feature.Name = request.Name.Trim();
            feature.Geometry = geometry;
            feature.Properties = JsonSerializer.Serialize(ToProperties(request, now), JsonOptions);
            feature.VerificationStatus = ParseVerification(request.VerificationStatus);
            await AddAuditAsync(store, scenario.Id, feature, "updated", now, ct);
            await unitOfWork.SaveChangesAsync(ct);
            return Results.Ok(ToOperationalDto(feature));
        }).WithName("UpdateOperationalFeature");

        // Exclusão operacional é um encerramento lógico: preserva o histórico
        // para auditoria, mas remove imediatamente a marcação do mapa ativo.
        group.MapDelete("/disaster-scenarios/{scenarioKey}/operations/{featureId:guid}", async (
            string scenarioKey,
            Guid featureId,
            IDisasterScenarioStore store,
            IUnitOfWork unitOfWork,
            CancellationToken ct) =>
        {
            var scenario = await store.FindByKeyAsync(scenarioKey, ct);
            if (scenario is null) return Results.NotFound();
            var feature = await store.FindMapFeatureAsync(featureId, ct);
            if (feature is null || feature.DisasterScenarioId != scenario.Id || feature.EffectiveTo is not null)
                return Results.NotFound();

            var now = DateTimeOffset.UtcNow;
            await store.CloseMapFeatureAsync(featureId, now, ct);
            await AddAuditAsync(store, scenario.Id, feature, "closed", now, ct);
            await unitOfWork.SaveChangesAsync(ct);
            return Results.NoContent();
        }).WithName("CloseOperationalFeature");

        group.MapGet("/disaster-scenarios/{scenarioKey}/operations-summary", async (
            string scenarioKey, IDisasterScenarioStore store, CancellationToken ct) =>
        {
            var scenario = await store.FindByKeyAsync(scenarioKey, ct);
            if (scenario is null) return Results.NotFound();
            var features = (await store.ListMapFeaturesAsync(scenario.Id, ct))
                .Where(feature => OperationalFeatureTypes.All.Contains(feature.FeatureType));
            var mapped = features.Select(feature => (Feature: feature, Properties: ReadProperties(feature))).ToList();
            return Results.Ok(new
            {
                activeFeatures = mapped.Count,
                priorityOne = mapped.Count(item => item.Properties.Priority == 1),
                confirmedVictims = mapped.Sum(item => item.Properties.ConfirmedVictims),
                estimatedVictims = mapped.Sum(item => item.Properties.EstimatedVictims),
                peopleRescued = mapped.Sum(item => item.Properties.PeopleRescued),
                riskAreas = mapped.Count(item => item.Feature.FeatureType == OperationalFeatureTypes.RiskArea),
                safeAreas = mapped.Count(item => item.Feature.FeatureType == OperationalFeatureTypes.SafeArea),
                searchSectors = mapped.Count(item => item.Feature.FeatureType == OperationalFeatureTypes.SearchSector),
                supportPoints = mapped.Count(item => item.Feature.FeatureType == OperationalFeatureTypes.SupportPoint),
                trafficInterruptions = mapped.Count(item => item.Feature.FeatureType == OperationalFeatureTypes.TrafficInterruption),
                alerts = mapped.Count(item => item.Feature.FeatureType == OperationalFeatureTypes.Alert),
                rescueRoutes = mapped.Count(item => item.Feature.FeatureType == OperationalFeatureTypes.RescueRoute),
                assignedTeams = mapped
                    .Select(item => item.Properties.AssignedTeam)
                    .Where(team => !string.IsNullOrWhiteSpace(team))
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .Count(),
                lastUpdatedAt = mapped.Select(item => item.Properties.UpdatedAt ?? item.Feature.CreatedAt)
                    .DefaultIfEmpty(scenario.CreatedAt)
                    .Max(),
            });
        }).WithName("GetOperationalSummary");

        group.MapGet("/disaster-scenarios/{scenarioKey}/impacts", async (string scenarioKey, IDisasterScenarioStore store, CancellationToken ct) =>
        {
            var scenario = await store.FindByKeyAsync(scenarioKey, ct);
            return scenario is null ? Results.NotFound() : Results.Ok((await store.ListImpactsAsync(scenario.Id, ct).ConfigureAwait(false))
                .Select(i => new { i.Id, i.Kind, i.Subject, i.Value, i.ObservedAt, i.CapturedAt, i.Confidence, verificationStatus = i.VerificationStatus.ToString().ToLowerInvariant() }));
        }).WithName("ListDisasterScenarioImpacts");

        group.MapGet("/disaster-scenarios/{scenarioKey}/data-status", async (string scenarioKey, IDisasterScenarioStore store, CancellationToken ct) =>
        {
            var scenario = await store.FindByKeyAsync(scenarioKey, ct);
            if (scenario is null) return Results.NotFound();
            var observations = await store.ListSourceObservationsAsync(scenario.Id, ct);
            return Results.Ok(KumamotoDataProfile.Requirements.Select(requirement => new
            {
                requirement.Id, requirement.Category, requirement.Name, requirement.Priority, requirement.Purpose,
                captured = observations.Any(o => o.SourceId == requirement.Id),
                latestCapturedAt = observations.Where(o => o.SourceId == requirement.Id).Select(o => (DateTimeOffset?)o.CapturedAt).Max(),
            }));
        }).WithName("GetDisasterScenarioDataStatus");

        group.MapPost("/disaster-scenarios/{scenarioKey}/collect", async (
            string scenarioKey, IDisasterScenarioStore store, DisasterCollectionService collectionService, CancellationToken ct) =>
        {
            var scenario = await store.FindByKeyAsync(scenarioKey, ct);
            if (scenario is null) return Results.NotFound();
            var result = await collectionService.CollectAsync(scenario, ct);
            return Results.Accepted($"/api/v1/disaster-scenarios/{scenarioKey}", result);
        }).WithName("CollectDisasterScenarioSources");
        return group;
    }

    private static object ToOperationalDto(OperationalMapFeature feature)
    {
        var properties = ReadProperties(feature);
        return new
        {
            feature.Id,
            feature.DisasterScenarioId,
            feature.FeatureType,
            feature.Name,
            feature.Geometry,
            properties.Priority,
            properties.Status,
            properties.ConfirmedVictims,
            properties.EstimatedVictims,
            properties.PeopleRescued,
            properties.AssignedTeam,
            properties.Capacity,
            properties.Resources,
            properties.Notes,
            verificationStatus = feature.VerificationStatus.ToString().ToLowerInvariant(),
            feature.EffectiveFrom,
            feature.EffectiveTo,
            feature.CreatedAt,
            updatedAt = properties.UpdatedAt ?? feature.CreatedAt,
        };
    }

    private static OperationalProperties ToProperties(
        OperationalFeatureRequest request,
        DateTimeOffset updatedAt) => new()
    {
        Priority = request.Priority,
        Status = request.Status,
        ConfirmedVictims = request.ConfirmedVictims,
        EstimatedVictims = request.EstimatedVictims,
        PeopleRescued = request.PeopleRescued,
        AssignedTeam = NullIfWhiteSpace(request.AssignedTeam),
        Capacity = request.Capacity,
        Resources = NullIfWhiteSpace(request.Resources),
        Notes = NullIfWhiteSpace(request.Notes),
        UpdatedAt = updatedAt,
    };

    private static OperationalProperties ReadProperties(OperationalMapFeature feature)
    {
        OperationalProperties? properties = null;
        if (!string.IsNullOrWhiteSpace(feature.Properties))
        {
            try
            {
                properties = JsonSerializer.Deserialize<OperationalProperties>(feature.Properties, JsonOptions);
            }
            catch (JsonException)
            {
                // Dados antigos ou coletados externamente continuam visíveis
                // com valores operacionais conservadores.
            }
        }

        properties ??= new OperationalProperties();
        return properties with
        {
            Priority = properties.Priority is >= 1 and <= 4 ? properties.Priority : 3,
            Status = OperationalStatuses.All.Contains(properties.Status)
                ? properties.Status
                : OperationalStatuses.Reported,
        };
    }

    private static Geometry? SanitizeGeometry(Geometry geometry)
    {
        Geometry? sanitized;
        if (geometry is Polygon)
        {
            sanitized = GeometryRepair
                .SanitizeAreal(geometry, OperationalFeatureRequestValidator.MaximumVertices)
                .Geometry;
        }
        else if (geometry is Point or LineString)
        {
            sanitized = geometry.Copy();
        }
        else
        {
            return null;
        }

        if (sanitized is null || sanitized.IsEmpty) return null;
        sanitized.SRID = 4326;
        return sanitized;
    }

    private static VerificationStatus ParseVerification(string value) => value switch
    {
        OperationalVerificationStatuses.Official => VerificationStatus.Official,
        OperationalVerificationStatuses.Corroborated => VerificationStatus.Corroborated,
        _ => VerificationStatus.Reported,
    };

    private static async Task AddAuditAsync(
        IDisasterScenarioStore store,
        Guid scenarioId,
        OperationalMapFeature feature,
        string action,
        DateTimeOffset observedAt,
        CancellationToken ct)
    {
        await store.AddImpactAsync(new ImpactObservation
        {
            DisasterScenarioId = scenarioId,
            Kind = $"operational-feature-{action}",
            Subject = feature.Name,
            Value = JsonSerializer.Serialize(new
            {
                featureId = feature.Id,
                feature.FeatureType,
                action,
                geometryWkt = feature.Geometry.AsText(),
                properties = feature.Properties,
            }, JsonOptions),
            ObservedAt = observedAt,
            Confidence = feature.VerificationStatus switch
            {
                VerificationStatus.Official => 1,
                VerificationStatus.Corroborated => .8,
                _ => .5,
            },
            VerificationStatus = feature.VerificationStatus,
        }, ct);
    }

    private static string? NullIfWhiteSpace(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private sealed record OperationalProperties
    {
        public int Priority { get; init; } = 3;
        public string Status { get; init; } = OperationalStatuses.Reported;
        public int ConfirmedVictims { get; init; }
        public int EstimatedVictims { get; init; }
        public int PeopleRescued { get; init; }
        public string? AssignedTeam { get; init; }
        public int? Capacity { get; init; }
        public string? Resources { get; init; }
        public string? Notes { get; init; }
        public DateTimeOffset? UpdatedAt { get; init; }
    }

    private static object ToDto(DisasterScenario scenario) => new
    {
        scenario.Id, scenario.ScenarioKey, scenario.Name, hazardType = scenario.HazardType.ToString().ToLowerInvariant(),
        scenario.CanonicalEventId, scenario.SimulationClockOrigin, scenario.DepthKm, scenario.MomentMagnitude, scenario.MagnitudeType,
        epicenter = scenario.Epicenter is null ? null : new { lon = scenario.Epicenter.X, lat = scenario.Epicenter.Y }, scenario.CreatedAt,
    };
}

internal static class KumamotoDataProfile
{
    internal sealed record Requirement(string Id, string Category, string Name, int Priority, string Purpose);
    internal static readonly Requirement[] Requirements =
    [
        new("jma-earthquake-volcano-feed", "hazard", "JMA earthquake, EEW, tsunami and aftershock feed", 1, "event timeline and alerts"),
        new("usgs-earthquake-feed", "hazard", "USGS reviewed event feed", 1, "international magnitude reconciliation"),
        new("usgs-comcat-products", "science", "USGS ComCat event products", 1, "origins, phases, focal mechanism and moment tensor"),
        new("usgs-shakemap", "science", "USGS ShakeMap ground-motion grids", 1, "validate simulated PGA, PGV and intensity"),
        new("usgs-finite-fault", "science", "USGS finite-fault model", 2, "rupture geometry, slip and propagation direction"),
        new("usgs-vs30", "science", "USGS global Vs30 mosaic", 2, "calibrate site response and shear velocity"),
        new("jma-earthquake", "hazard", "JMA earthquake information", 1, "observed intensity and event revisions"),
        new("jma-tsunami", "hazard", "JMA tsunami warnings/advisories", 1, "coastal evacuation state"),
        new("jma-long-period", "hazard", "JMA long-period ground motion", 1, "high-rise structural demand"),
        new("jma-risk-maps", "hazard", "JMA risk maps", 2, "rain, landslide and flood context"),
        new("jma-precipitation-nowcast", "hazard", "JMA precipitation nowcast", 2, "field-access weather"),
        new("jma-weather-warnings", "hazard", "JMA weather warnings", 2, "secondary-hazard alerts"),
        new("jshis-soil-and-hazard", "hazard", "J-SHIS soil, amplification and hazard mesh", 2, "site response and liquefaction"),
        new("gsi-shelters", "response", "GSI designated shelters and emergency evacuation sites", 1, "capacity and routing"),
        new("osm-buildings-roads", "exposure", "OSM buildings, roads and rail", 1, "exposure and access network"),
        new("kumamoto-municipal-operations", "response", "Kumamoto municipal damage and operations", 1, "field operations and needs"),
        new("utilities-transport-status", "lifelines", "Power, telecom, rail, road and airport status", 1, "service continuity"),
    ];
}
