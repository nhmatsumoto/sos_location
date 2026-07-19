# ADR 0002 — PostGIS autoritativo e MVT gerado no banco

- **Status**: aceito (2026-07-16)

## Contexto
O navegador não pode ser a fonte oficial dos dados urbanos, e uma cidade
inteira não cabe em um único GeoJSON.

## Decisão
- Geometrias autoritativas em WGS84 (SRID 4326) no PostGIS.
- EF Core somente para metadados/catálogo/jobs; SQL espacial explícito
  (`ST_TileEnvelope`, `ST_Transform`, `ST_AsMVTGeom`, `ST_AsMVT`,
  `ST_SimplifyPreserveTopology`) para geração de tiles em 3857.
- GeoJSON restrito a intercâmbio, fixture, depuração e endpoints de inspeção.
- Atributos por tile variam com o zoom; tags OSM completas nunca vão em tiles.

## Consequências
- Tiles imutáveis por revisão → ETag determinístico e `Cache-Control: immutable`.
- Nenhum grafo de entidades gigante no EF Core; consultas de tile ficam no banco,
  perto dos índices GiST.
