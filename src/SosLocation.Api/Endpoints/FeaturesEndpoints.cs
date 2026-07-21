using System.Text.Json;
using SosLocation.Application.Abstractions;
using SosLocation.Application.Dto;

namespace SosLocation.Api.Endpoints;

public static class FeaturesEndpoints
{
    public static RouteGroupBuilder MapFeaturesEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/features/buildings/{buildingId:guid}", async (
            Guid buildingId, bool? includeGeometry,
            IFeatureReader features, IDatasetStore datasets, IRevisionStore revisions,
            CancellationToken ct) =>
        {
            var building = await features.FindBuildingAsync(buildingId, ct);
            if (building is null) return Results.NotFound();

            var provenance = await BuildProvenanceAsync(datasets, building.CityRevisionId, ct);
            var revision = await revisions.FindByIdAsync(building.CityRevisionId, ct);

            return Results.Ok(new
            {
                feature = new BuildingDetailDto(
                    building.Id, building.CityRevisionId, building.ExternalId,
                    building.HeightMeters, building.MinHeightMeters, building.GroundElevationMeters,
                    building.BuildingLevels, building.RoofLevels, building.BuildingType, building.RoofShape,
                    building.HeightSource.ToString().ToLowerInvariant(),
                    building.Confidence.Value,
                    DeserializeTags(building.Tags),
                    includeGeometry == true ? building.Footprint : null),
                revision = revision is null ? null : CitiesEndpoints.ToDto(revision),
                provenance,
                elevationNote = building.GroundElevationMeters == 0
                    ? "Ground elevation is unavailable or at sea level; 0 m is used."
                    : "Ground elevation was sampled from the revision's DEM source.",
            });
        }).WithName("GetBuilding");

        group.MapGet("/features/roads/{roadId:guid}", async (
            Guid roadId, bool? includeGeometry,
            IFeatureReader features, IDatasetStore datasets, IRevisionStore revisions,
            CancellationToken ct) =>
        {
            var road = await features.FindRoadAsync(roadId, ct);
            if (road is null) return Results.NotFound();

            var provenance = await BuildProvenanceAsync(datasets, road.CityRevisionId, ct);
            var revision = await revisions.FindByIdAsync(road.CityRevisionId, ct);

            return Results.Ok(new
            {
                feature = new RoadDetailDto(
                    road.Id, road.CityRevisionId, road.ExternalId, road.RoadClass, road.Name,
                    road.WidthMeters, road.Lanes, road.IsBridge, road.IsTunnel,
                    road.Confidence.Value,
                    DeserializeTags(road.Tags),
                    includeGeometry == true ? road.Geometry : null),
                revision = revision is null ? null : CitiesEndpoints.ToDto(revision),
                provenance,
            });
        }).WithName("GetRoad");

        group.MapGet("/features/water/{waterFeatureId:guid}", async (
            Guid waterFeatureId, bool? includeGeometry,
            IFeatureReader features, IDatasetStore datasets, IRevisionStore revisions,
            CancellationToken ct) =>
        {
            var water = await features.FindWaterAsync(waterFeatureId, ct);
            if (water is null) return Results.NotFound();

            var provenance = await BuildProvenanceAsync(datasets, water.CityRevisionId, ct);
            var revision = await revisions.FindByIdAsync(water.CityRevisionId, ct);

            return Results.Ok(new
            {
                feature = new WaterDetailDto(
                    water.Id, water.CityRevisionId, water.ExternalId, water.WaterType, water.Name,
                    water.Confidence.Value,
                    DeserializeTags(water.Tags),
                    includeGeometry == true ? water.Geometry : null),
                revision = revision is null ? null : CitiesEndpoints.ToDto(revision),
                provenance,
            });
        }).WithName("GetWaterFeature");

        // Ferrovias da revisão em GeoJSON (payload pequeno) para a simulação de trens.
        group.MapGet("/revisions/{revisionId:guid}/railways", async (
            Guid revisionId, IFeatureReader features, CancellationToken ct) =>
        {
            var railways = await features.ListRailwaysAsync(revisionId, ct);
            return Results.Ok(new
            {
                type = "FeatureCollection",
                features = railways.Select(r => new
                {
                    type = "Feature",
                    properties = new { id = r.Id, name = r.Name },
                    geometry = r.Geometry,
                }),
            });
        }).WithName("GetRevisionRailways");

        // Manifesto de fontes de uma revisão (licenciamento e atribuição).
        group.MapGet("/revisions/{revisionId:guid}/manifest", async (
            Guid revisionId, IRevisionStore revisions, IDatasetStore datasets, CancellationToken ct) =>
        {
            var revision = await revisions.FindByIdAsync(revisionId, ct);
            if (revision is null) return Results.NotFound();
            var provenance = await BuildProvenanceAsync(datasets, revisionId, ct);
            return Results.Ok(new
            {
                revision = CitiesEndpoints.ToDto(revision),
                sources = provenance,
            });
        }).WithName("GetRevisionManifest");

        return group;
    }

    private static async Task<IReadOnlyList<ProvenanceDto>> BuildProvenanceAsync(
        IDatasetStore datasets, Guid revisionId, CancellationToken ct)
    {
        var pairs = await datasets.ListVersionsForRevisionAsync(revisionId, ct);
        return pairs.Select(p => new ProvenanceDto(
            p.Dataset.Name, p.Dataset.Provider, p.Dataset.License, p.Dataset.Attribution,
            p.Dataset.LicenseUri, p.Version.Version, p.Version.Checksum, p.Version.CapturedAt)).ToList();
    }

    private static IReadOnlyDictionary<string, string>? DeserializeTags(string? tags)
        => tags is null
            ? null
            : JsonSerializer.Deserialize<Dictionary<string, string>>(tags);
}
