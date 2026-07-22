namespace SosLocation.Domain.Catalog;

/// <summary>
/// Vocabulário canônico das fontes de dados urbanos reconhecidas pela plataforma
/// e a hierarquia de prioridade entre elas (PLATEAU > OpenStreetMap > e-Stat).
/// </summary>
public static class UrbanDataSources
{
    public const string Plateau = "plateau";
    public const string OpenStreetMap = "openstreetmap";
    public const string EStat = "e-stat";
    public const string Derived = "derived";
    public const string Simulation = "simulation";

    /// <summary>Prioridade padrão de fusão entre fontes sobrepostas; maior vence.</summary>
    public static int DefaultPriority(string sourceKey) => sourceKey switch
    {
        Plateau => 100,
        OpenStreetMap => 50,
        EStat => 10,
        _ => 0, // Derived, Simulation e fontes fora da hierarquia principal
    };
}
