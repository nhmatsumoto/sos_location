namespace SosLocation.Api;

/// <summary>
/// Nomes de política de rate limiting compartilhados entre <c>Program.cs</c> (onde as
/// políticas são configuradas) e os endpoints (onde são aplicadas via
/// <c>RequireRateLimiting</c>) — evita strings mágicas divergirem entre os dois lados.
/// </summary>
public static class RateLimitPolicies
{
    /// <summary>/places/search faz proxy para o Nominatim, cuja política de uso pede
    /// no máximo 1 req/s; protege o serviço externo de abuso por um único cliente.</summary>
    public const string PlacesSearch = "places-search";

    /// <summary>POST /imports dispara todo o pipeline de reconstrução (download +
    /// normalização + reconstrução); limita quantos jobs um cliente pode enfileirar.</summary>
    public const string ImportsWrite = "imports-write";
}
