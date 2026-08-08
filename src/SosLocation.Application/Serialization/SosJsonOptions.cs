using System.Text.Json;

namespace SosLocation.Application.Serialization;

/// <summary>
/// Instância única de <see cref="JsonSerializerOptions"/> (defaults "Web") usada por
/// toda a serialização manual do backend (payloads de job/run, DTOs serializados fora
/// do pipeline HTTP). Evita que cada classe instancie a sua própria cópia e diverja
/// silenciosamente caso um conversor precise ser adicionado no futuro.
/// </summary>
public static class SosJsonOptions
{
    public static readonly JsonSerializerOptions Web = new(JsonSerializerDefaults.Web);
}
