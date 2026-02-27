using System.Text.Json.Serialization;
using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
});

var app = builder.Build();

app.UseCors();

var hotspots = new List<Hotspot>
{
    new Hotspot("HS-001", -21.1215, -42.9427, 98.5, 0.95, "Landslide", ["Alta declividade (35°)", "Solo encharcado (>200mm/72h)", "Histórico de deslizamento"], "Alta", 45, "Imediata (Tier 1)"),
    new Hotspot("HS-002", -21.1198, -42.9372, 92.1, 0.88, "Flood", ["Rio transbordou (+2.5m)", "Área de planície", "Corte de energia relatado"], "Extrema", 120, "Imediata (Tier 1)"),
    new Hotspot("HS-003", -21.1350, -42.9510, 85.3, 0.75, "Landslide", ["Cicatriz antiga detectada via SAR", "Chuva moderada continuada"], "Média", 15, "Alta (Tier 2)"),
    new Hotspot("HS-004", -21.1120, -42.9450, 95.0, 0.90, "Flood", ["Rede de drenagem saturada", "Colapso estrutural reportado (Áudio NLP)"], "Alta", 60, "Imediata (Tier 1)"),
    new Hotspot("HS-005", -21.1250, -42.9400, 78.0, 0.80, "Flood", ["Acessibilidade bloqueada", "Ponte submersa"], "Baixa", 5, "Moderada (Tier 3)")
};

var uploadsDirectory = Path.Combine(app.Environment.ContentRootPath, "uploads");
Directory.CreateDirectory(uploadsDirectory);

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(uploadsDirectory),
    RequestPath = "/uploads"
});

var collapseReports = new List<CollapseReport>();
SeedTesteVideoReport(collapseReports, uploadsDirectory);

app.MapGet("/api/hotspots", () =>
{
    return Results.Ok(hotspots.OrderByDescending(h => h.Score));
});

app.MapGet("/api/collapse-reports", () =>
{
    return Results.Ok(collapseReports.OrderByDescending(report => report.UploadedAtUtc));
});

app.MapPost("/api/collapse-reports", async (HttpRequest request) =>
{
    if (!request.HasFormContentType)
    {
        return Results.BadRequest(new { error = "Formato inválido. Use multipart/form-data." });
    }

    var form = await request.ReadFormAsync();
    var video = form.Files["video"];

    if (video is null || video.Length == 0)
    {
        return Results.BadRequest(new { error = "Envie um vídeo do celular na chave 'video'." });
    }

    var latitude = ParseDouble(form["latitude"]);
    var longitude = ParseDouble(form["longitude"]);

    if (latitude is null || longitude is null)
    {
        return Results.BadRequest(new { error = "Latitude e longitude são obrigatórias." });
    }

    var reportId = $"RP-{DateTimeOffset.UtcNow:yyyyMMddHHmmss}-{Random.Shared.Next(100, 999)}";
    var safeFileName = $"{reportId}-{Path.GetFileName(video.FileName)}";
    var filePath = Path.Combine(uploadsDirectory, safeFileName);

    await using (var stream = File.Create(filePath))
    {
        await video.CopyToAsync(stream);
    }

    var report = new CollapseReport(
        Id: reportId,
        LocationName: string.IsNullOrWhiteSpace(form["locationName"]) ? "Sem nome" : form["locationName"].ToString(),
        Latitude: latitude.Value,
        Longitude: longitude.Value,
        Description: form["description"].ToString(),
        ReporterName: form["reporterName"].ToString(),
        ReporterPhone: form["reporterPhone"].ToString(),
        VideoFileName: video.FileName,
        StoredVideoPath: filePath,
        SourceVideoUrl: $"/uploads/{safeFileName}",
        VideoSizeBytes: video.Length,
        UploadedAtUtc: DateTimeOffset.UtcNow,
        ProcessingStatus: SplattingProcessingStatus.Pending,
        SplatPipelineHint: "Pronto para ingestão em gaussian-splatting/convert.py e train.py",
        SplatUrl: null
    );

    collapseReports.Add(report);

    return Results.Created($"/api/collapse-reports/{report.Id}", report);
});

app.Run("http://localhost:5031");

static double? ParseDouble(string raw)
{
    return double.TryParse(raw, System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out var parsed)
        ? parsed
        : null;
}

record Hotspot(
    string Id,
    double Lat,
    double Lng,
    double Score,
    double Confidence,
    string Type,
    string[] RiskFactors,
    string HumanExposure,
    int EstimatedAffected,
    string Urgency
);

record CollapseReport(
    string Id,
    string LocationName,
    double Latitude,
    double Longitude,
    string Description,
    string ReporterName,
    string ReporterPhone,
    string VideoFileName,
    string StoredVideoPath,
    string SourceVideoUrl,
    long VideoSizeBytes,
    DateTimeOffset UploadedAtUtc,
    SplattingProcessingStatus ProcessingStatus,
    string SplatPipelineHint,
    string? SplatUrl
);

enum SplattingProcessingStatus
{
    Pending,
    Ingested,
    Trained,
    Published
}

static void SeedTesteVideoReport(List<CollapseReport> collapseReports, string uploadsDirectory)
{
    var repoRootPath = Path.GetFullPath(Path.Combine(uploadsDirectory, "..", ".."));
    var testeVideoPath = Path.Combine(repoRootPath, "Teste.mp4");

    if (!File.Exists(testeVideoPath))
    {
        return;
    }

    var seededFileName = "seed-Teste.mp4";
    var seededFilePath = Path.Combine(uploadsDirectory, seededFileName);

    if (!File.Exists(seededFilePath))
    {
        File.Copy(testeVideoPath, seededFilePath, overwrite: true);
    }

    var seededInfo = new FileInfo(seededFilePath);

    collapseReports.Add(new CollapseReport(
        Id: "RP-SEED-TESTE",
        LocationName: "Teste.mp4 - Centro de Ubá",
        Latitude: -21.1215,
        Longitude: -42.9427,
        Description: "Vídeo base (Teste.mp4) disponível para rodar pipeline gaussian-splatting.",
        ReporterName: "Seed do sistema",
        ReporterPhone: "",
        VideoFileName: "Teste.mp4",
        StoredVideoPath: seededFilePath,
        SourceVideoUrl: $"/uploads/{seededFileName}",
        VideoSizeBytes: seededInfo.Length,
        UploadedAtUtc: DateTimeOffset.UtcNow,
        ProcessingStatus: SplattingProcessingStatus.Ingested,
        SplatPipelineHint: "Execute convert.py e train.py no Teste.mp4 para publicar o .splat final.",
        SplatUrl: "https://huggingface.co/datasets/dylanebert/3dgs/resolve/main/bonsai/bonsai-7k.splat"
    ));
}
