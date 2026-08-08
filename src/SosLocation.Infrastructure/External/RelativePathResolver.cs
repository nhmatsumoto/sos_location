namespace SosLocation.Infrastructure.External;

/// <summary>
/// Resolve um caminho configurado (absoluto ou relativo) contra os diretórios
/// prováveis de execução — compartilhado entre fontes locais (fixture offline,
/// extratos .osm.pbf) para não duplicar a mesma lista de candidatos em cada uma.
/// </summary>
internal static class RelativePathResolver
{
    public static string? Resolve(string configured)
    {
        if (Path.IsPathRooted(configured))
            return File.Exists(configured) ? configured : null;

        string[] candidates =
        [
            Path.Combine(AppContext.BaseDirectory, configured),
            Path.Combine(Directory.GetCurrentDirectory(), configured),
            Path.Combine(Directory.GetCurrentDirectory(), "..", "..", configured),
        ];
        return candidates.FirstOrDefault(File.Exists);
    }
}
