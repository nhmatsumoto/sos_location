using System.Text.Json;
using Microsoft.Extensions.Logging;
using OsmSharp;
using OsmSharp.Streams;
using OsmSharp.Tags;
using SosLocation.Application.Abstractions;
using SosLocation.Application.Serialization;
using SosLocation.Domain.ValueObjects;

namespace SosLocation.Infrastructure.External;

public sealed class OsmPbfExtractOptions
{
    /// <summary>Identificador do extrato (ex.: "brazil-south"), só para logging/SourceUri.</summary>
    public string Name { get; set; } = "";
    /// <summary>Caminho do .osm.pbf, absoluto ou relativo (resolvido como em <see cref="FileFixtureSource"/>).</summary>
    public string Path { get; set; } = "";
    public double West { get; set; }
    public double South { get; set; }
    public double East { get; set; }
    public double North { get; set; }

    internal BoundingBox ToBoundingBox() => new(West, South, East, North);
}

public sealed class OsmPbfOptions
{
    public const string SectionName = "OsmPbf";
    public bool Enabled { get; set; } = true;
    public List<OsmPbfExtractOptions> Extracts { get; set; } = [];
}

/// <summary>
/// Lê edifícios/vias/hidrografia/uso do solo diretamente de extratos .osm.pbf
/// regionais locais (ex.: Geofabrik "sul"/"sudeste" do Brasil), sem depender do
/// Overpass API. Produz o mesmo formato de payload (Overpass JSON com
/// "out tags geom") que <see cref="OverpassOsmSource"/>, reaproveitando o
/// <c>OverpassNormalizer</c> já testado em vez de escrever um normalizador novo.
///
/// Extração em 3 passes sequenciais sobre o arquivo (streaming, sem carregar o
/// grafo inteiro em memória — extratos regionais chegam a ~800 MB):
///   1. Relações relevantes (multipolygon com tag de interesse) → ids dos ways membros.
///   2. Nós dentro do bounding box (com margem) → dicionário id → coordenada.
///   3. Ways relevantes (próprios ou membros de relação) → geometria resolvida
///      a partir do dicionário de nós; nós fora da margem ficam ausentes e o
///      ponto é simplesmente omitido (mesmo efeito de recorte por bbox que o
///      Overpass já produz nas bordas da área pedida).
///
/// O filtro de tags espelha a query Overpass QL em <see cref="OverpassOsmSource"/> —
/// mudar um dos dois exige revisar o outro.
/// </summary>
public sealed class LocalPbfOsmSource(OsmPbfOptions options, ILogger<LocalPbfOsmSource> logger)
{
    /// <summary>Margem ao redor do bbox pedido, para não perder nós de ways que cruzam a borda.</summary>
    private const double NodeBufferDegrees = 0.02; // ~2 km na latitude do Brasil

    public OsmPbfExtractOptions? FindExtractFor(BoundingBox area)
    {
        if (!options.Enabled) return null;
        return options.Extracts.FirstOrDefault(extract =>
        {
            var coverage = extract.ToBoundingBox();
            return area.West >= coverage.West && area.East <= coverage.East
                && area.South >= coverage.South && area.North <= coverage.North;
        });
    }

    public Task<SourcePayload> DownloadAreaAsync(OsmPbfExtractOptions extract, BoundingBox area, CancellationToken ct)
    {
        var path = RelativePathResolver.Resolve(extract.Path)
            ?? throw new FileNotFoundException(
                $"Local OSM extract '{extract.Name}' not found at '{extract.Path}' " +
                "(searched relative to the app base and working directory).");

        return Task.Run(() =>
        {
            logger.LogInformation(
                "Extracting bbox {West},{South},{East},{North} from local PBF extract '{Extract}' ({Path})",
                area.West, area.South, area.East, area.North, extract.Name, path);

            var extracted = ExtractElements(path, area, ct);
            var content = BuildOverpassJson(extracted);

            logger.LogInformation(
                "Local PBF extraction produced {Ways} standalone ways and {Relations} relations from '{Extract}'",
                extracted.StandaloneWays.Count, extracted.Relations.Count, extract.Name);

            return new SourcePayload
            {
                Content = content,
                Format = SourcePayloadFormat.OverpassJson,
                SourceName = "openstreetmap",
                SourceUri = $"local-pbf:{extract.Name}:{System.IO.Path.GetFileName(path)}",
                ContentType = "application/json",
            };
        }, ct);
    }

    private sealed record PbfWayElement(long Id, Dictionary<string, string> Tags, List<(double Lon, double Lat)> Coordinates);

    private sealed record PbfRelationElement(long Id, Dictionary<string, string> Tags, (long WayId, string Role)[] Members);

    private sealed record ExtractedElements(
        List<PbfWayElement> StandaloneWays,
        List<PbfRelationElement> Relations,
        Dictionary<long, List<(double Lon, double Lat)>> WayGeometries);

    private static ExtractedElements ExtractElements(string path, BoundingBox area, CancellationToken ct)
    {
        // Pass 1/3: relações relevantes → quais ways membros precisamos resolver.
        var relations = new List<PbfRelationElement>();
        var neededWayIds = new HashSet<long>();
        using (var stream = File.OpenRead(path))
        {
            foreach (var element in new PBFOsmStreamSource(stream))
            {
                ct.ThrowIfCancellationRequested();
                if (element is not Relation relation || relation.Id is null || relation.Tags is null) continue;
                if (!IsMultipolygon(relation.Tags) || !IsRelevantTag(relation.Tags)) continue;

                var members = (relation.Members ?? [])
                    .Where(m => m.Type == OsmGeoType.Way)
                    .Select(m => (m.Id, m.Role ?? "outer"))
                    .ToArray();
                if (members.Length == 0) continue;

                relations.Add(new PbfRelationElement(relation.Id.Value, ToDictionary(relation.Tags), members));
                foreach (var member in members) neededWayIds.Add(member.Id);
            }
        }

        // Pass 2/3: nós dentro do bbox (com margem) → coordenadas.
        var west = area.West - NodeBufferDegrees;
        var south = area.South - NodeBufferDegrees;
        var east = area.East + NodeBufferDegrees;
        var north = area.North + NodeBufferDegrees;
        var nodeCoordinates = new Dictionary<long, (double Lon, double Lat)>();
        using (var stream = File.OpenRead(path))
        {
            foreach (var element in new PBFOsmStreamSource(stream))
            {
                ct.ThrowIfCancellationRequested();
                if (element is not Node node || node.Id is null
                    || node.Latitude is not { } lat || node.Longitude is not { } lon) continue;
                if (lon < west || lon > east || lat < south || lat > north) continue;
                nodeCoordinates[node.Id.Value] = (lon, lat);
            }
        }

        // Pass 3/3: ways próprios ou membros de relação → geometria resolvida.
        var standaloneWays = new List<PbfWayElement>();
        var wayGeometries = new Dictionary<long, List<(double Lon, double Lat)>>();
        using (var stream = File.OpenRead(path))
        {
            foreach (var element in new PBFOsmStreamSource(stream))
            {
                ct.ThrowIfCancellationRequested();
                if (element is not Way way || way.Id is null) continue;

                var isRelationMember = neededWayIds.Contains(way.Id.Value);
                var hasOwnTags = way.Tags is not null && IsRelevantTag(way.Tags);
                if (!isRelationMember && !hasOwnTags) continue;

                var coordinates = new List<(double Lon, double Lat)>(way.Nodes?.Length ?? 0);
                foreach (var nodeId in way.Nodes ?? [])
                    if (nodeCoordinates.TryGetValue(nodeId, out var coordinate))
                        coordinates.Add(coordinate);
                // Menos de 2 pontos conhecidos: o way inteiro caiu fora da margem
                // do bbox pedido (comum para ways de relação distantes da área).
                if (coordinates.Count < 2) continue;

                if (isRelationMember) wayGeometries[way.Id.Value] = coordinates;
                if (hasOwnTags) standaloneWays.Add(new PbfWayElement(way.Id.Value, ToDictionary(way.Tags!), coordinates));
            }
        }

        return new ExtractedElements(standaloneWays, relations, wayGeometries);
    }

    private static byte[] BuildOverpassJson(ExtractedElements extracted)
    {
        var elements = new List<object>(extracted.StandaloneWays.Count + extracted.Relations.Count);

        foreach (var way in extracted.StandaloneWays)
        {
            elements.Add(new
            {
                type = "way",
                id = way.Id,
                tags = way.Tags,
                geometry = way.Coordinates.Select(c => new { lat = c.Lat, lon = c.Lon }).ToArray(),
            });
        }

        foreach (var relation in extracted.Relations)
        {
            var members = relation.Members
                .Where(m => extracted.WayGeometries.ContainsKey(m.WayId))
                .Select(m => new
                {
                    type = "way",
                    @ref = m.WayId,
                    role = m.Role,
                    geometry = extracted.WayGeometries[m.WayId].Select(c => new { lat = c.Lat, lon = c.Lon }).ToArray(),
                })
                .ToArray();
            // Relação sem nenhum membro resolvido (todos fora da margem do bbox) não
            // vira geometria utilizável — OverpassNormalizer já descarta o caso, mas
            // evita inflar o payload com uma relação vazia.
            if (members.Length == 0) continue;

            elements.Add(new { type = "relation", id = relation.Id, tags = relation.Tags, members });
        }

        return JsonSerializer.SerializeToUtf8Bytes(new { version = 0.6, elements }, SosJsonOptions.Web);
    }

    private static Dictionary<string, string> ToDictionary(TagsCollectionBase tags)
        => tags.ToDictionary(tag => tag.Key, tag => tag.Value, StringComparer.Ordinal);

    private static bool IsMultipolygon(TagsCollectionBase tags)
        => tags.TryGetValue("type", out var type) && type == "multipolygon";

    /// <summary>
    /// Espelha os filtros da query Overpass QL em <see cref="OverpassOsmSource.DownloadAreaAsync"/>.
    /// Ways usam este predicado sozinho; relações usam este predicado + <see cref="IsMultipolygon"/>
    /// (o subconjunto highway/railway/waterway não se aplica a relações na query original,
    /// mas isso é inofensivo aqui: relações desses tipos quase nunca são multipolygon).
    /// </summary>
    private static bool IsRelevantTag(TagsCollectionBase tags)
    {
        if (tags.ContainsKey("building") || tags.ContainsKey("building:part")) return true;
        if (tags.TryGetValue("man_made", out var manMade) && manMade is
            "tower" or "water_tower" or "silo" or "storage_tank" or "gasometer"
            or "chimney" or "works" or "wastewater_plant" or "bridge") return true;
        if (tags.ContainsKey("highway") || tags.ContainsKey("railway") || tags.ContainsKey("area:highway")) return true;
        if (tags.ContainsKey("waterway")) return true;
        if (tags.TryGetValue("natural", out var natural) && natural is
            "water" or "wood" or "grassland" or "scrub" or "heath" or "beach" or "wetland") return true;
        if (tags.ContainsKey("water")) return true;
        if (tags.TryGetValue("landuse", out var landuse) && (landuse is "reservoir" or "basin" || tags.ContainsKey("landuse"))) return true;
        if (tags.ContainsKey("leisure") || tags.ContainsKey("amenity")) return true;
        if (tags.TryGetValue("aeroway", out var aeroway) && aeroway is "aerodrome" or "apron") return true;
        if (tags.TryGetValue("place", out var place) && place == "square") return true;
        return false;
    }
}
