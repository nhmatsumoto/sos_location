using System.Collections.Concurrent;
using System.Globalization;
using System.Net;
using System.Text.Json.Serialization;
using System.Xml.Linq;
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

builder.Services.AddHttpClient();
builder.Services.AddSingleton<NewsStore>();
builder.Services.AddSingleton<MissingPersonStore>();
builder.Services.AddHostedService<NewsCrawlerService>();

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

app.MapGet("/api/news-updates", (HttpRequest request, NewsStore store) =>
{
    var city = request.Query["city"].ToString();
    var updates = store.GetLatest(city);
    return Results.Ok(updates);
});

app.MapGet("/api/missing-persons", (MissingPersonStore store) => Results.Ok(store.GetAll()));

app.MapPost("/api/missing-persons", async (HttpRequest request, MissingPersonStore store) =>
{
    var payload = await request.ReadFromJsonAsync<MissingPersonCreateRequest>();
    if (payload is null)
    {
        return Results.BadRequest(new { error = "Payload inválido." });
    }

    if (string.IsNullOrWhiteSpace(payload.PersonName) || string.IsNullOrWhiteSpace(payload.City) || string.IsNullOrWhiteSpace(payload.ContactName) || string.IsNullOrWhiteSpace(payload.ContactPhone))
    {
        return Results.BadRequest(new { error = "Nome da pessoa, cidade e dados de contato são obrigatórios." });
    }

    var created = store.Add(payload);
    return Results.Created($"/api/missing-persons/{created.Id}", created);
});

app.MapPost("/api/location/flow-simulation", async (HttpRequest request) =>
{
    var payload = await request.ReadFromJsonAsync<FlowSimulationRequest>();
    if (payload is null)
    {
        return Results.BadRequest(new { error = "Payload inválido para simulação." });
    }

    if (payload.Steps < 5 || payload.Steps > 400 || payload.GridSize < 12 || payload.GridSize > 120)
    {
        return Results.BadRequest(new { error = "Parâmetros fora do intervalo permitido (steps: 5-400, gridSize: 12-120)." });
    }

    var result = RunFlowSimulation(payload);
    return Results.Ok(result);
});

app.Run("http://localhost:5031");

static double? ParseDouble(string raw)
{
    return double.TryParse(raw, NumberStyles.Float, CultureInfo.InvariantCulture, out var parsed)
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

record NewsUpdate(
    string Id,
    string City,
    string Title,
    string Source,
    string Url,
    string Summary,
    DateTimeOffset PublishedAtUtc,
    DateTimeOffset CrawledAtUtc
);

record MissingPerson(
    string Id,
    string PersonName,
    int? Age,
    string City,
    string LastSeenLocation,
    string PhysicalDescription,
    string AdditionalInfo,
    string ContactName,
    string ContactPhone,
    DateTimeOffset ReportedAtUtc
);

record MissingPersonCreateRequest(
    string PersonName,
    int? Age,
    string City,
    string LastSeenLocation,
    string PhysicalDescription,
    string AdditionalInfo,
    string ContactName,
    string ContactPhone
);

record FlowSimulationRequest(
    double SourceLat,
    double SourceLng,
    double RainfallMmPerHour,
    double InitialVolume,
    int Steps,
    int GridSize,
    double CellSizeMeters,
    double ManningCoefficient,
    double InfiltrationRate
);

record FlowCellResult(
    double Lat,
    double Lng,
    double Depth,
    double Terrain,
    double Velocity
);

record FlowPathPoint(
    double Lat,
    double Lng,
    int Step,
    double Depth
);

record FlowSimulationResponse(
    DateTimeOffset GeneratedAtUtc,
    FlowSimulationRequest Parameters,
    IReadOnlyList<FlowCellResult> FloodedCells,
    IReadOnlyList<FlowPathPoint> MainPath,
    double MaxDepth,
    double EstimatedAffectedAreaM2,
    string Disclaimer
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
        LocationName: "Encosta Rua Projetada",
        Latitude: -21.1222,
        Longitude: -42.9441,
        Description: "Vídeo de referência para validação do pipeline de reconstrução 3D.",
        ReporterName: "Equipe de Campo",
        ReporterPhone: "+55 32 99999-0000",
        VideoFileName: "Teste.mp4",
        StoredVideoPath: seededFilePath,
        SourceVideoUrl: $"/uploads/{seededFileName}",
        VideoSizeBytes: seededInfo.Length,
        UploadedAtUtc: DateTimeOffset.UtcNow.AddMinutes(-35),
        ProcessingStatus: SplattingProcessingStatus.Published,
        SplatPipelineHint: "Snapshot de demonstração publicado",
        SplatUrl: "https://huggingface.co/datasets/dylanebert/3dgs/resolve/main/bonsai/bonsai-7k.splat"
    ));
}

static FlowSimulationResponse RunFlowSimulation(FlowSimulationRequest payload)
{
    var grid = payload.GridSize;
    var center = grid / 2;
    var terrain = new double[grid, grid];
    var water = new double[grid, grid];
    var nextWater = new double[grid, grid];

    var metersPerLat = 111_320d;
    var metersPerLng = Math.Cos(payload.SourceLat * Math.PI / 180d) * 111_320d;

    for (var y = 0; y < grid; y++)
    {
        for (var x = 0; x < grid; x++)
        {
            var dx = (x - center) / (double)center;
            var dy = (y - center) / (double)center;
            var radial = Math.Sqrt(dx * dx + dy * dy);

            // Modelo simplificado de relevo (vale + ondulações topográficas).
            var valley = 45d * radial;
            var undulations = 8d * Math.Sin(dx * 5d) + 6d * Math.Cos(dy * 4d);
            var downhillBias = 10d * dy;
            terrain[y, x] = 180d + valley + undulations + downhillBias;
        }
    }

    water[center, center] = payload.InitialVolume;

    var path = new List<FlowPathPoint>();
    var pathX = center;
    var pathY = center;

    for (var step = 0; step < payload.Steps; step++)
    {
        Array.Copy(water, nextWater, water.Length);
        var rainPerStep = payload.RainfallMmPerHour / 1000d / 3600d;

        for (var y = 1; y < grid - 1; y++)
        {
            for (var x = 1; x < grid - 1; x++)
            {
                var depth = water[y, x];
                if (depth <= 1e-5)
                {
                    continue;
                }

                var head = terrain[y, x] + depth;
                var neighbors = new (int nx, int ny)[] { (x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1) };
                var positiveDrops = new List<(int nx, int ny, double drop)>();

                foreach (var (nx, ny) in neighbors)
                {
                    var neighborHead = terrain[ny, nx] + water[ny, nx];
                    var drop = head - neighborHead;
                    if (drop > 0)
                    {
                        positiveDrops.Add((nx, ny, drop));
                    }
                }

                if (positiveDrops.Count == 0)
                {
                    nextWater[y, x] = Math.Max(0, nextWater[y, x] - payload.InfiltrationRate * 0.1);
                    continue;
                }

                var totalDrop = positiveDrops.Sum(p => p.drop);
                var slope = totalDrop / (positiveDrops.Count * payload.CellSizeMeters);
                var velocity = Math.Pow(Math.Max(depth, 0.01), 2d / 3d) * Math.Sqrt(Math.Max(slope, 0.0001)) / Math.Max(payload.ManningCoefficient, 0.01);
                var transferable = Math.Min(depth * 0.45, velocity * 0.04);

                nextWater[y, x] -= transferable;

                foreach (var (nx, ny, drop) in positiveDrops)
                {
                    nextWater[ny, nx] += transferable * (drop / totalDrop);
                }

                nextWater[y, x] = Math.Max(0, nextWater[y, x] - payload.InfiltrationRate * 0.1 + rainPerStep);
            }
        }

        Array.Copy(nextWater, water, water.Length);

        var best = new (int x, int y, double head)[]
        {
            (pathX + 1, pathY, GetHead(pathX + 1, pathY, terrain, water)),
            (pathX - 1, pathY, GetHead(pathX - 1, pathY, terrain, water)),
            (pathX, pathY + 1, GetHead(pathX, pathY + 1, terrain, water)),
            (pathX, pathY - 1, GetHead(pathX, pathY - 1, terrain, water)),
        }
        .Where(candidate => candidate.x > 0 && candidate.y > 0 && candidate.x < grid - 1 && candidate.y < grid - 1)
        .OrderBy(candidate => candidate.head)
        .FirstOrDefault();

        if (best != default)
        {
            pathX = best.x;
            pathY = best.y;
        }

        path.Add(new FlowPathPoint(
            Lat: payload.SourceLat + ((pathY - center) * payload.CellSizeMeters / metersPerLat),
            Lng: payload.SourceLng + ((pathX - center) * payload.CellSizeMeters / metersPerLng),
            Step: step,
            Depth: water[pathY, pathX]
        ));
    }

    var floodedCells = new List<FlowCellResult>();
    var maxDepth = 0d;

    for (var y = 0; y < grid; y++)
    {
        for (var x = 0; x < grid; x++)
        {
            var depth = water[y, x];
            maxDepth = Math.Max(maxDepth, depth);
            if (depth < 0.02)
            {
                continue;
            }

            var localSlope = Math.Abs(terrain[y, x] - terrain[Math.Max(0, y - 1), x]) / payload.CellSizeMeters;
            var velocity = Math.Pow(Math.Max(depth, 0.01), 2d / 3d) * Math.Sqrt(Math.Max(localSlope, 0.0001)) / Math.Max(payload.ManningCoefficient, 0.01);

            floodedCells.Add(new FlowCellResult(
                Lat: payload.SourceLat + ((y - center) * payload.CellSizeMeters / metersPerLat),
                Lng: payload.SourceLng + ((x - center) * payload.CellSizeMeters / metersPerLng),
                Depth: depth,
                Terrain: terrain[y, x],
                Velocity: velocity
            ));
        }
    }

    return new FlowSimulationResponse(
        GeneratedAtUtc: DateTimeOffset.UtcNow,
        Parameters: payload,
        FloodedCells: floodedCells.OrderByDescending(c => c.Depth).Take(1200).ToList(),
        MainPath: path,
        MaxDepth: maxDepth,
        EstimatedAffectedAreaM2: floodedCells.Count * payload.CellSizeMeters * payload.CellSizeMeters,
        Disclaimer: "Simulação didática inspirada em princípios de CFD/Navier-Stokes e não substitui modelagem hidrodinâmica calibrada de engenharia."
    );
}

static double GetHead(int x, int y, double[,] terrain, double[,] water)
{
    if (x < 0 || y < 0 || x >= terrain.GetLength(1) || y >= terrain.GetLength(0))
    {
        return double.MaxValue;
    }

    return terrain[y, x] + water[y, x];
}

sealed class NewsStore
{
    private readonly object _sync = new();
    private readonly List<NewsUpdate> _updates = [];

    public void Upsert(IEnumerable<NewsUpdate> incoming)
    {
        lock (_sync)
        {
            foreach (var item in incoming)
            {
                if (_updates.Any(existing => string.Equals(existing.Url, item.Url, StringComparison.OrdinalIgnoreCase)))
                {
                    continue;
                }

                _updates.Add(item);
            }

            _updates.Sort((a, b) => b.PublishedAtUtc.CompareTo(a.PublishedAtUtc));

            if (_updates.Count > 200)
            {
                _updates.RemoveRange(200, _updates.Count - 200);
            }
        }
    }

    public IReadOnlyList<NewsUpdate> GetLatest(string? city)
    {
        lock (_sync)
        {
            var query = _updates.AsEnumerable();
            if (!string.IsNullOrWhiteSpace(city))
            {
                query = query.Where(item => string.Equals(item.City, city, StringComparison.OrdinalIgnoreCase));
            }

            return query.Take(60).ToList();
        }
    }
}

sealed class MissingPersonStore
{
    private readonly ConcurrentDictionary<string, MissingPerson> _entries = new();

    public MissingPersonStore()
    {
        var seed = new MissingPerson(
            Id: "MP-SEED-001",
            PersonName: "Marcos Vinícius (exemplo)",
            Age: 34,
            City: "Juiz de Fora",
            LastSeenLocation: "Bairro Linhares - próximo ao córrego",
            PhysicalDescription: "Camisa azul, calça jeans, mochila preta",
            AdditionalInfo: "Necessita medicação contínua.",
            ContactName: "Ana Paula",
            ContactPhone: "+55 32 98888-1212",
            ReportedAtUtc: DateTimeOffset.UtcNow.AddHours(-2)
        );

        _entries.TryAdd(seed.Id, seed);
    }

    public MissingPerson Add(MissingPersonCreateRequest payload)
    {
        var id = $"MP-{DateTimeOffset.UtcNow:yyyyMMddHHmmss}-{Random.Shared.Next(100, 999)}";
        var item = new MissingPerson(
            Id: id,
            PersonName: payload.PersonName,
            Age: payload.Age,
            City: payload.City,
            LastSeenLocation: payload.LastSeenLocation,
            PhysicalDescription: payload.PhysicalDescription,
            AdditionalInfo: payload.AdditionalInfo,
            ContactName: payload.ContactName,
            ContactPhone: payload.ContactPhone,
            ReportedAtUtc: DateTimeOffset.UtcNow
        );

        _entries[id] = item;
        return item;
    }

    public IReadOnlyList<MissingPerson> GetAll()
    {
        return _entries.Values.OrderByDescending(v => v.ReportedAtUtc).ToList();
    }
}

sealed class NewsCrawlerService(
    IHttpClientFactory httpClientFactory,
    NewsStore newsStore,
    ILogger<NewsCrawlerService> logger) : BackgroundService
{
    private static readonly string[] Cities = ["Ubá", "Juiz de Fora", "Matias Barbosa"];

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var batch = new List<NewsUpdate>();

                foreach (var city in Cities)
                {
                    var items = await FetchCityNewsAsync(city, stoppingToken);
                    batch.AddRange(items);
                }

                newsStore.Upsert(batch);
                logger.LogInformation("Crawler atualizado com {Count} itens.", batch.Count);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Falha no crawler de notícias.");
            }

            await Task.Delay(TimeSpan.FromMinutes(15), stoppingToken);
        }
    }

    private async Task<IEnumerable<NewsUpdate>> FetchCityNewsAsync(string city, CancellationToken cancellationToken)
    {
        var client = httpClientFactory.CreateClient();
        var query = Uri.EscapeDataString($"{city} feridos desaparecidos enchente deslizamento");
        var rssUrl = $"https://news.google.com/rss/search?q={query}&hl=pt-BR&gl=BR&ceid=BR:pt-419";

        using var response = await client.GetAsync(rssUrl, cancellationToken);
        response.EnsureSuccessStatusCode();

        var xml = await response.Content.ReadAsStringAsync(cancellationToken);
        var doc = XDocument.Parse(xml);

        var items = doc.Descendants("item")
            .Take(10)
            .Select(item =>
            {
                var title = WebUtility.HtmlDecode(item.Element("title")?.Value ?? "Sem título");
                var link = item.Element("link")?.Value ?? string.Empty;
                var source = item.Element("source")?.Value ?? "Fonte não identificada";
                var description = WebUtility.HtmlDecode(item.Element("description")?.Value ?? string.Empty);
                var pubDateRaw = item.Element("pubDate")?.Value;

                var publishedAt = DateTimeOffset.TryParse(pubDateRaw, out var parsed)
                    ? parsed.ToUniversalTime()
                    : DateTimeOffset.UtcNow;

                return new NewsUpdate(
                    Id: $"NEWS-{city}-{publishedAt:yyyyMMddHHmmss}-{Math.Abs(link.GetHashCode())}",
                    City: city,
                    Title: title,
                    Source: source,
                    Url: link,
                    Summary: description,
                    PublishedAtUtc: publishedAt,
                    CrawledAtUtc: DateTimeOffset.UtcNow
                );
            })
            .Where(item => !string.IsNullOrWhiteSpace(item.Url))
            .ToList();

        return items;
    }
}
