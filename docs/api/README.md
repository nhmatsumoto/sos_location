# API — SOS_LOCATION

- Especificação OpenAPI gerada em runtime: `GET /openapi/v1.json`
  (ex.: http://localhost:5080/openapi/v1.json ou via nginx
  http://localhost:8080/api… — o documento OpenAPI é servido direto pela API).
- Prefixo estável: `/api/v1`. Ver tabela completa de endpoints no
  [README](../../README.md#api-prefixo-apiv1).

## Convenções

- Erros seguem RFC 9457 (ProblemDetails); stack traces nunca são expostos.
- Validação de entrada com FluentValidation → `400` com dicionário de erros.
- Tiles: `application/vnd.mapbox-vector-tile`, `ETag` forte determinístico por
  `(revisionId, layer, z, x, y)` — revisões são imutáveis —,
  `Cache-Control: public, max-age=86400, immutable`, `204` para tile vazio,
  compressão brotli/gzip por negociação.
- Importação: `POST /api/v1/imports` responde `202 Accepted` + `Location` do
  job; acompanhe por polling em `GET /api/v1/imports/{jobId}`.

## Exemplos

```bash
# Pesquisa (geocoder via backend)
curl 'http://localhost:8080/api/v1/places/search?q=Komaki'

# Cidades e revisões
curl http://localhost:8080/api/v1/cities
curl http://localhost:8080/api/v1/cities/{cityId}/revisions

# Tile de edifícios (z/x/y)
curl -H 'Accept-Encoding: br' -o tile.mvt \
  http://localhost:8080/api/v1/tiles/{revisionId}/buildings/14/14421/6484.mvt

# Inspeção com geometria GeoJSON
curl 'http://localhost:8080/api/v1/features/buildings/{id}?includeGeometry=true'

# Manifesto de fontes (licenciamento/atribuição)
curl http://localhost:8080/api/v1/revisions/{revisionId}/manifest
```
