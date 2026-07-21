using System.Text.Json;
using FluentValidation;
using SosLocation.Application.Abstractions;
using SosLocation.Application.Dto;
using SosLocation.Domain.Jobs;

namespace SosLocation.Api.Endpoints;

public static class ImportsEndpoints
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public static RouteGroupBuilder MapImportsEndpoints(this RouteGroupBuilder group)
    {
        group.MapPost("/imports", async (
            SosLocation.Application.Import.ImportRequest request,
            IValidator<SosLocation.Application.Import.ImportRequest> validator,
            IImportJobStore jobs,
            IUnitOfWork unitOfWork,
            CancellationToken ct) =>
        {
            var validation = await validator.ValidateAsync(request, ct);
            if (!validation.IsValid)
                return Results.ValidationProblem(validation.ToDictionary());

            var job = new ImportJob
            {
                JobType = $"{request.Source}-import",
                Request = JsonSerializer.Serialize(request, JsonOptions),
            };
            await jobs.AddAsync(job, ct);
            await unitOfWork.SaveChangesAsync(ct);

            return Results.Accepted($"/api/v1/imports/{job.Id}", ToDto(job));
        }).WithName("CreateImport");

        group.MapGet("/imports", async (IImportJobStore jobs, CancellationToken ct) =>
        {
            var list = await jobs.ListRecentAsync(50, ct);
            return Results.Ok(list.Select(ToDto));
        }).WithName("ListImports");

        group.MapGet("/imports/{jobId:guid}", async (Guid jobId, IImportJobStore jobs, CancellationToken ct) =>
        {
            var job = await jobs.FindByIdAsync(jobId, ct);
            return job is null ? Results.NotFound() : Results.Ok(ToDto(job));
        }).WithName("GetImport");

        group.MapGet("/imports/{jobId:guid}/issues", async (Guid jobId, IImportJobStore jobs, CancellationToken ct) =>
        {
            var job = await jobs.FindByIdAsync(jobId, ct);
            if (job is null) return Results.NotFound();
            var issues = await jobs.ListIssuesAsync(jobId, ct);
            return Results.Ok(issues.Select(i => new
            {
                i.Id,
                i.FeatureId,
                Severity = i.Severity.ToString().ToLowerInvariant(),
                i.Code,
                i.Message,
                i.CreatedAt,
            }));
        }).WithName("ListImportIssues");

        group.MapPost("/imports/{jobId:guid}/cancel", async (
            Guid jobId, IImportJobStore jobs, IUnitOfWork unitOfWork, CancellationToken ct) =>
        {
            var job = await jobs.FindByIdAsync(jobId, ct);
            if (job is null) return Results.NotFound();
            if (!job.TryCancel(DateTimeOffset.UtcNow))
                return Results.Conflict(new { error = $"Job is already {job.Status} and cannot be cancelled." });
            await unitOfWork.SaveChangesAsync(ct);
            return Results.Ok(ToDto(job));
        }).WithName("CancelImport");

        return group;
    }

    internal static ImportJobDto ToDto(ImportJob job) => new(
        job.Id, job.CityId, job.CityRevisionId, job.JobType,
        job.Status.ToString().ToLowerInvariant(),
        job.Progress,
        job.CurrentStage?.ToString(),
        job.StageMessage,
        job.Error,
        job.Attempts,
        job.NextAttemptAt,
        job.StartedAt, job.CompletedAt, job.CreatedAt);
}
