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

app.MapGet("/api/hotspots", () =>
{
    // Simulando o Output de DataFusionRanking
    // Filtro e Rank
    return Results.Ok(hotspots.OrderByDescending(h => h.Score));
});

app.Run("http://localhost:5031");

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
