using System.Text.Json.Serialization;

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
    new Hotspot(
        Id: "HS-001",
        Lat: -21.1215,
        Lng: -42.9427,
        Score: 98.5,
        Confidence: 0.95,
        Type: "Landslide",
        RiskFactors: ["Alta declividade (35°)", "Solo encharcado (>200mm/72h)", "Histórico de deslizamento"],
        HumanExposure: "Alta",
        EstimatedAffected: 45,
        Urgency: "Imediata (Tier 1)"
    ),
    new Hotspot(
        Id: "HS-002",
        Lat: -21.1198,
        Lng: -42.9372,
        Score: 92.1,
        Confidence: 0.88,
        Type: "Flood",
        RiskFactors: ["Rio transbordou (+2.5m)", "Área de planície", "Corte de energia relatado"],
        HumanExposure: "Extrema",
        EstimatedAffected: 120,
        Urgency: "Imediata (Tier 1)"
    ),
    new Hotspot(
        Id: "HS-003",
        Lat: -21.1350,
        Lng: -42.9510,
        Score: 85.3,
        Confidence: 0.75,
        Type: "Landslide",
        RiskFactors: ["Cicatriz antiga detectada via SAR", "Chuva moderada continuada"],
        HumanExposure: "Média",
        EstimatedAffected: 15,
        Urgency: "Alta (Tier 2)"
    ),
    new Hotspot(
        Id: "HS-004",
        Lat: -21.1120,
        Lng: -42.9450,
        Score: 95.0,
        Confidence: 0.90,
        Type: "Flood",
        RiskFactors: ["Rede de drenagem saturada", "Colapso estrutural reportado (Áudio NLP)"],
        HumanExposure: "Alta",
        EstimatedAffected: 60,
        Urgency: "Imediata (Tier 1)"
    ),
    new Hotspot(
        Id: "HS-005",
        Lat: -21.1250,
        Lng: -42.9400,
        Score: 78.0,
        Confidence: 0.80,
        Type: "Flood",
        RiskFactors: ["Acessibilidade bloqueada", "Ponte submersa"],
        HumanExposure: "Baixa",
        EstimatedAffected: 5,
        Urgency: "Moderada (Tier 3)"
    )
};

var uploadsDirectory = Path.Combine(app.Environment.ContentRootPath, "uploads");
Directory.CreateDirectory(uploadsDirectory);

var collapseReports = new List<CollapseReport>();

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
        VideoSizeBytes: video.Length,
        UploadedAtUtc: DateTimeOffset.UtcNow,
        ProcessingStatus: SplattingProcessingStatus.Pending,
        SplatPipelineHint: "Pronto para ingestão em gaussian-splatting/convert.py e train.py"
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
    long VideoSizeBytes,
    DateTimeOffset UploadedAtUtc,
    SplattingProcessingStatus ProcessingStatus,
    string SplatPipelineHint
);

enum SplattingProcessingStatus
{
    Pending,
    Ingested,
    Trained,
    Published
}
