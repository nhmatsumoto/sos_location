using System.Text.Json;
using FluentValidation;
using Microsoft.Net.Http.Headers;
using SosLocation.Application.Abstractions;
using SosLocation.Application.Dto;
using SosLocation.Application.Simulation;
using SosLocation.Domain.Cities;
using SosLocation.Domain.Disasters;

namespace SosLocation.Api.Endpoints;

public static class SimulationsEndpoints
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public static RouteGroupBuilder MapSimulationsEndpoints(this RouteGroupBuilder group)
    {
        group.MapPost("/simulations", async (
            SimulationRequest request,
            IValidator<SimulationRequest> validator,
            IRevisionStore revisions,
            ISimulationRunStore runs,
            IUnitOfWork unitOfWork,
            CancellationToken ct) =>
        {
            var validation = await validator.ValidateAsync(request, ct);
            if (!validation.IsValid)
                return Results.ValidationProblem(validation.ToDictionary());

            var revision = await revisions.FindByIdAsync(request.CityRevisionId, ct);
            if (revision is null)
                return Results.NotFound(new { error = "City revision not found." });
            if (revision.Status != CityRevisionStatus.Published)
                return Results.Conflict(new { error = "Simulations require a published city revision." });

            var parameters = new EarthquakeParameters
            {
                EpicenterLon = request.EpicenterLon,
                EpicenterLat = request.EpicenterLat,
                DepthKm = request.DepthKm,
                MomentMagnitude = request.MomentMagnitude,
            };

            var run = new SimulationRun
            {
                CityRevisionId = request.CityRevisionId,
                DisasterType = DisasterType.Earthquake,
                Parameters = JsonSerializer.Serialize(parameters, JsonOptions),
            };
            await runs.AddAsync(run, ct);
            await unitOfWork.SaveChangesAsync(ct);

            return Results.Accepted($"/api/v1/simulations/{run.Id}", ToDto(run));
        }).WithName("CreateSimulation");

        group.MapGet("/simulations", async (ISimulationRunStore runs, CancellationToken ct) =>
        {
            var list = await runs.ListRecentAsync(50, ct);
            return Results.Ok(list.Select(ToDto));
        }).WithName("ListSimulations");

        group.MapGet("/simulations/{runId:guid}", async (Guid runId, ISimulationRunStore runs, CancellationToken ct) =>
        {
            var run = await runs.FindByIdAsync(runId, ct);
            return run is null ? Results.NotFound() : Results.Ok(ToDto(run));
        }).WithName("GetSimulation");

        group.MapGet("/simulations/{runId:guid}/buildings", async (
            Guid runId, ISimulationRunStore runs, CancellationToken ct) =>
        {
            var run = await runs.FindByIdAsync(runId, ct);
            if (run is null) return Results.NotFound();
            var responses = await runs.ListResponsesAsync(runId, ct);
            return Results.Ok(responses.Select(ToDto));
        }).WithName("ListSimulationBuildingResponses");

        group.MapGet("/simulations/{runId:guid}/buildings/{buildingId:guid}", async (
            Guid runId, Guid buildingId, ISimulationRunStore runs, CancellationToken ct) =>
        {
            var response = await runs.FindResponseAsync(runId, buildingId, ct);
            return response is null ? Results.NotFound() : Results.Ok(ToDto(response));
        }).WithName("GetSimulationBuildingResponse");

        group.MapPost("/simulations/{runId:guid}/cancel", async (
            Guid runId, ISimulationRunStore runs, IUnitOfWork unitOfWork, CancellationToken ct) =>
        {
            var run = await runs.FindByIdAsync(runId, ct);
            if (run is null) return Results.NotFound();
            if (!run.TryCancel(DateTimeOffset.UtcNow))
                return Results.Conflict(new { error = $"Simulation is already {run.Status} and cannot be cancelled." });
            await unitOfWork.SaveChangesAsync(ct);
            return Results.Ok(ToDto(run));
        }).WithName("CancelSimulation");

        group.MapGet("/simulations/{runId:guid}/intensity.png", async (
            Guid runId, ISimulationRunStore runs, IObjectStorage storage, HttpContext http, CancellationToken ct) =>
        {
            var run = await runs.FindByIdAsync(runId, ct);
            if (run is null || run.Status != SimulationRunStatus.Completed) return Results.NotFound();

            var bytes = await storage.GetAsync($"simulations/{runId}/intensity.png", ct);
            if (bytes is null) return Results.NotFound();

            http.Response.Headers[HeaderNames.CacheControl] = "public, max-age=2592000, immutable";
            return Results.Bytes(bytes, "image/png");
        }).WithName("GetSimulationIntensity");

        group.MapGet("/simulations/{runId:guid}/replay", async (
            Guid runId, ISimulationRunStore runs, IObjectStorage storage, HttpContext http, CancellationToken ct) =>
        {
            var run = await runs.FindByIdAsync(runId, ct);
            if (run is null || run.Status != SimulationRunStatus.Completed) return Results.NotFound();

            var bytes = await storage.GetAsync($"simulations/{runId}/replay.json", ct);
            if (bytes is null) return Results.NotFound();

            http.Response.Headers[HeaderNames.CacheControl] = "public, max-age=2592000, immutable";
            return Results.Bytes(bytes, "application/json");
        }).WithName("GetSimulationReplay");

        group.MapGet("/simulations/{runId:guid}/replay/{frameIndex:int}.png", async (
            Guid runId, int frameIndex, ISimulationRunStore runs, IObjectStorage storage,
            HttpContext http, CancellationToken ct) =>
        {
            if (frameIndex < 0) return Results.NotFound();
            var run = await runs.FindByIdAsync(runId, ct);
            if (run is null || run.Status != SimulationRunStatus.Completed) return Results.NotFound();

            var bytes = await storage.GetAsync($"simulations/{runId}/replay/{frameIndex:D4}.png", ct);
            if (bytes is null) return Results.NotFound();

            http.Response.Headers[HeaderNames.CacheControl] = "public, max-age=2592000, immutable";
            return Results.Bytes(bytes, "image/png");
        }).WithName("GetSimulationReplayFrame");

        return group;
    }

    internal static SimulationRunDto ToDto(SimulationRun run) => new(
        run.Id, run.CityRevisionId,
        run.DisasterType.ToString().ToLowerInvariant(),
        run.Status.ToString().ToLowerInvariant(),
        run.Progress,
        run.CurrentStage?.ToString(),
        run.StageMessage,
        run.Error,
        run.Attempts,
        run.IntensityWest, run.IntensitySouth, run.IntensityEast, run.IntensityNorth,
        run.StartedAt, run.CompletedAt, run.CreatedAt);

    internal static BuildingSeismicResponseDto ToDto(BuildingSeismicResponse response) => new(
        response.Id, response.BuildingId,
        response.NaturalPeriodSeconds,
        response.PeakGroundAccelerationG,
        response.PeakGroundVelocityCms,
        response.SpectralAccelerationG,
        response.PeakDriftRatio,
        response.DamageState.ToString().ToLowerInvariant());
}
