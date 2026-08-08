using FluentValidation;
using SosLocation.Application.Abstractions;
using SosLocation.Application.Dto;
using SosLocation.Application.RiskZones;
using SosLocation.Domain.Disasters;
using SosLocation.GeoProcessing.Geometry;

namespace SosLocation.Api.Endpoints;

public static class RiskZonesEndpoints
{
    public static RouteGroupBuilder MapRiskZonesEndpoints(this RouteGroupBuilder group)
    {
        group.MapPost("/revisions/{revisionId:guid}/risk-zones", async (
            Guid revisionId,
            RiskZoneRequest request,
            IValidator<RiskZoneRequest> validator,
            IRevisionStore revisions,
            IRiskZoneStore zones,
            IUnitOfWork unitOfWork,
            CancellationToken ct) =>
        {
            var validation = await validator.ValidateAsync(request, ct);
            if (!validation.IsValid)
                return Results.ValidationProblem(validation.ToDictionary());

            if (await revisions.FindByIdAsync(revisionId, ct) is null)
                return Results.NotFound(new { error = "City revision not found." });

            // Repara auto-interseções/validade (GeoProcessing) — a camada Application
            // não referencia GeoProcessing, então o reparo acontece aqui na API.
            var repaired = GeometryRepair.SanitizeAreal(request.Geometry, RiskZoneRequestValidator.MaxVertices);
            if (repaired.Geometry is null)
                return Results.UnprocessableEntity(new { error = repaired.IssueMessage });

            var zone = new RiskZone
            {
                CityRevisionId = revisionId,
                Name = request.Name,
                HazardType = Enum.Parse<DisasterType>(request.HazardType, ignoreCase: true),
                Level = Enum.Parse<RiskLevel>(request.Level, ignoreCase: true),
                Notes = request.Notes,
                Geometry = repaired.Geometry,
            };
            await zones.AddAsync(zone, ct);
            await unitOfWork.SaveChangesAsync(ct);

            return Results.Created($"/api/v1/revisions/{revisionId}/risk-zones", ToDto(zone));
        }).WithName("CreateRiskZone");

        group.MapGet("/revisions/{revisionId:guid}/risk-zones", async (
            Guid revisionId, IRiskZoneStore zones, CancellationToken ct) =>
            Results.Ok((await zones.ListByRevisionAsync(revisionId, ct)).Select(ToDto))
        ).WithName("ListRiskZones");

        group.MapDelete("/risk-zones/{zoneId:guid}", async (
            Guid zoneId, IRiskZoneStore zones, CancellationToken ct) =>
        {
            if (await zones.FindByIdAsync(zoneId, ct) is null) return Results.NotFound();
            await zones.DeleteAsync(zoneId, ct);
            return Results.NoContent();
        }).WithName("DeleteRiskZone");

        group.MapGet("/risk-zones/{zoneId:guid}/exposure", async (
            Guid zoneId, IRiskZoneStore zones, CancellationToken ct) =>
        {
            var zone = await zones.FindByIdAsync(zoneId, ct);
            if (zone is null) return Results.NotFound();
            var exposure = await zones.ComputeExposureAsync(zone, ct);
            return Results.Ok(new RiskZoneExposureDto(
                zoneId, exposure.BuildingCount, exposure.AverageHeightMeters,
                exposure.ByType.Select(t => new BuildingTypeCountDto(t.BuildingType, t.Count)).ToList()));
        }).WithName("GetRiskZoneExposure");

        return group;
    }

    internal static RiskZoneDto ToDto(RiskZone zone) => new(
        zone.Id, zone.CityRevisionId, zone.Name,
        zone.HazardType.ToString().ToLowerInvariant(),
        zone.Level.ToString().ToLowerInvariant(),
        zone.Notes, zone.Geometry, zone.CreatedAt);
}
