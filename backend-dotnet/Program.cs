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
    new Hotspot("HS-001", -21.1215, -42.9427, 98.5, 0.95, "Landslide", ["Alta declividade (35°)", "Solo encharcado (>200mm/72h)", "Histórico de deslizamento"], "Alta", 45, "Imediata (Tier 1)"),
    new Hotspot("HS-002", -21.1198, -42.9372, 92.1, 0.88, "Flood", ["Rio transbordou (+2.5m)", "Área de planície", "Corte de energia relatado"], "Extrema", 120, "Imediata (Tier 1)"),
    new Hotspot("HS-003", -21.1350, -42.9510, 85.3, 0.75, "Landslide", ["Cicatriz antiga detectada via SAR", "Chuva moderada continuada"], "Média", 15, "Alta (Tier 2)"),
    new Hotspot("HS-004", -21.1120, -42.9450, 95.0, 0.90, "Flood", ["Rede de drenagem saturada", "Colapso estrutural reportado (Áudio NLP)"], "Alta", 60, "Imediata (Tier 1)"),
    new Hotspot("HS-005", -21.1250, -42.9400, 78.0, 0.80, "Flood", ["Acessibilidade bloqueada", "Ponte submersa"], "Baixa", 5, "Moderada (Tier 3)")
};

var uploadsDirectory = Path.Combine(app.Environment.ContentRootPath, "uploads");
Directory.CreateDirectory(uploadsDirectory);

var collapseReports = new List<CollapseReport>();

app.MapGet("/api/hotspots", () => Results.Ok(hotspots.OrderByDescending(h => h.Score)));

app.MapGet("/api/collapse-reports", () => Results.Ok(collapseReports.OrderByDescending(report => report.UploadedAtUtc)));

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

app.MapGet("/api/rescue-support", (double? areaM2) =>
{
    var analysisAreaM2 = areaM2.GetValueOrDefault(15000);
    var support = BuildRescueSupport(analysisAreaM2, hotspots, collapseReports);
    return Results.Ok(support);
});

app.Run("http://localhost:5031");

static RescueSupportSnapshot BuildRescueSupport(double analysisAreaM2, IReadOnlyCollection<Hotspot> hotspots, IReadOnlyCollection<CollapseReport> reports)
{
    var boundedArea = Math.Max(analysisAreaM2, 3000d);
    var totalPeopleAtRisk = hotspots.Sum(h => h.EstimatedAffected);
    var severityFactor = hotspots.Count == 0 ? 0 : hotspots.Average(h => h.Score / 100d);
    var reportsBonus = Math.Max(0.15, reports.Count * 0.05);
    var estimatedTrapped = (int)Math.Round(totalPeopleAtRisk * (0.38 + severityFactor * 0.22 + reportsBonus));
    var density = Math.Round(estimatedTrapped / boundedArea, 4);

    var topHotspots = hotspots.OrderByDescending(h => h.Score).Take(3).ToList();
    var probableLocations = new List<ProbableLocation>();

    foreach (var (hotspot, index) in topHotspots.Select((value, idx) => (value, idx)))
    {
        var probability = Math.Clamp(0.9 - (index * 0.12) + (hotspot.Confidence * 0.08), 0.35, 0.97);
        probableLocations.Add(new ProbableLocation(
            Label: $"Cluster {index + 1} - {hotspot.Id}",
            Latitude: hotspot.Lat + (index * 0.0007),
            Longitude: hotspot.Lng - (index * 0.0006),
            Priority: index + 1,
            Probability: Math.Round(probability, 2),
            EstimatedPeople: Math.Max(3, (int)Math.Round(hotspot.EstimatedAffected * probability * 0.45)),
            Reasoning: $"Combinação de score {hotspot.Score:0.0}, confiança {hotspot.Confidence:P0} e gatilhos: {string.Join(", ", hotspot.RiskFactors.Take(2))}."
        ));
    }

    if (reports.Count > 0)
    {
        var latestReport = reports.OrderByDescending(r => r.UploadedAtUtc).First();
        probableLocations.Add(new ProbableLocation(
            Label: $"Upload cidadão - {latestReport.LocationName}",
            Latitude: latestReport.Latitude,
            Longitude: latestReport.Longitude,
            Priority: probableLocations.Count + 1,
            Probability: 0.64,
            EstimatedPeople: 4,
            Reasoning: "Coordenadas vieram de vídeo enviado por usuário; usar drone térmico e busca com cães no entorno de 120m."
        ));
    }

    var specialistAgents = new List<SpecialistAgent>
    {
        new SpecialistAgent(
            Name: "GeoSlope-Physics",
            Specialty: "Física geotécnica de deslizamentos",
            Mission: "Calcular velocidade de corrida do deslizamento, profundidade de deposição e zonas de soterramento.",
            Recommendation: "Priorizar talvegues e cotas baixas a jusante dos hotspots críticos para varredura de vítimas.",
            Confidence: Math.Round(0.78 + severityFactor * 0.15, 2)
        ),
        new SpecialistAgent(
            Name: "RescueDensity-AI",
            Specialty: "Dispersão populacional por metro quadrado",
            Mission: "Estimar densidade de pessoas por m² em área de impacto com base em população exposta e uploads.",
            Recommendation: $"Densidade estimada atual: {density:0.0000} pessoas/m² em {boundedArea:0} m². Ajustar grid de busca para células de 20x20m.",
            Confidence: Math.Round(0.72 + reports.Count * 0.03, 2)
        ),
        new SpecialistAgent(
            Name: "SurvivorLocator",
            Specialty: "Localização provável de sobreviventes em escombros",
            Mission: "Cruzar hotspots com relatos dos vídeos para sugerir bolsões de sobrevivência e rotas de acesso.",
            Recommendation: "Executar varredura acústica + câmera térmica primeiro nos clusters de prioridade 1 e 2.",
            Confidence: 0.74
        )
    };

    return new RescueSupportSnapshot(
        GeneratedAtUtc: DateTimeOffset.UtcNow,
        AreaAnalyzedM2: Math.Round(boundedArea, 0),
        EstimatedTrappedPeople: estimatedTrapped,
        PeopleDispersionPerSquareMeter: density,
        PotentialSurvivorClusters: probableLocations.Count,
        Agents: specialistAgents,
        ProbableLocations: probableLocations.OrderBy(p => p.Priority).ToArray()
    );
}

static double? ParseDouble(string raw)
{
    return double.TryParse(raw, System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out var parsed)
        ? parsed
        : null;
}

record Hotspot(string Id, double Lat, double Lng, double Score, double Confidence, string Type, string[] RiskFactors, string HumanExposure, int EstimatedAffected, string Urgency);

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

record RescueSupportSnapshot(
    DateTimeOffset GeneratedAtUtc,
    double AreaAnalyzedM2,
    int EstimatedTrappedPeople,
    double PeopleDispersionPerSquareMeter,
    int PotentialSurvivorClusters,
    SpecialistAgent[] Agents,
    ProbableLocation[] ProbableLocations
);

record SpecialistAgent(
    string Name,
    string Specialty,
    string Mission,
    string Recommendation,
    double Confidence
);

record ProbableLocation(
    string Label,
    double Latitude,
    double Longitude,
    int Priority,
    double Probability,
    int EstimatedPeople,
    string Reasoning
);

enum SplattingProcessingStatus
{
    Pending,
    Ingested,
    Trained,
    Published
}
