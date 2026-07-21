# Pipeline de importação

## Fontes suportadas

| Source | Formato | Caminho |
|---|---|---|
| `fixture` | GeoJSON | `tools/fixtures/demo-district.geojson` (offline, semeada no primeiro boot) |
| `openstreetmap` | Overpass JSON (`out tags geom`) | bbox ≤ `MaximumImportAreaKm2` via adapter com allowlist/timeout/limite de bytes |
| `geojson` | GeoJSON inline | `POST /api/v1/imports` com campo `geoJson` |
| `osm.pbf` | PBF | **reservado** (`SourcePayloadFormat.OsmPbf`) para grandes áreas via worker/ogr2ogr containerizado |

## Estágios (tabela import_jobs, progresso persistido)

| # | Estágio | Progresso | O que faz |
|---|---|---|---|
| 1 | resolve-boundary | 5% | Geocoder (place) ou bbox explícita; find-or-create `City` (slug) |
| 2 | download-source | 20% | Adapter da fonte; limite de bytes com aborto |
| 3 | persist-raw-data | 30% | SHA-256, chave `raw/{source}/{jobId}/{checksum}`, `DatasetVersion` |
| 4 | validate | 40% | Payload não-vazio, tamanho ≤ limites |
| 5 | normalize | 55% | Normalizador por formato; reparo de geometria; issues persistidos |
| 6 | reconstruct | 75% | Nova `CityRevision` draft; alturas pelo perfil; bulk insert |
| 7 | calculate-quality | 85% | L1 (só vias) / L2 (footprints inferidos) / L3 (≥50% observado) |
| 8 | publish-revision | 95% | ready → published (imutável, idempotente) |
| 9 | invalidate-cache | 98% | Hook (ETags derivam do revisionId imutável) |
| 10 | complete | 100% | Job concluído com `city_revision_id` |

## Segurança aplicada

- SSRF: hosts de download verificados contra `ImportLimits.AllowedImportHosts`.
- Tamanho: `MaximumUploadBytes`, `MaximumDownloadBytes` (stream abortado),
  `MaximumFeatureCount`, `MaximumVerticesPerFeature`.
- GeoJSON: `MaxDepth=32` no parser, coordenadas validadas em [-180,180]/[-90,90],
  geometrias reparadas com `GeometryFixer` ou descartadas com issue registrado.
- Erros nunca expõem stack trace (ProblemDetails padrão).

## Importando uma cidade nova (ex.: Komaki)

1. UI: pesquisar "Komaki" → selecionar → **Import from OpenStreetMap**; ou
2. API direta:

```bash
curl -X POST http://localhost:8080/api/v1/imports \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Komaki Center",
    "boundingBox": { "west": 136.895, "south": 35.275, "east": 136.935, "north": 35.305 },
    "source": "openstreetmap",
    "reconstructionProfile": "osm-basic-v1"
  }'
# acompanhar:
curl http://localhost:8080/api/v1/imports/{jobId}
```
