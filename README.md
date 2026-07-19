# SOS_LOCATION — City Reconstruction Platform

> "This project is my purpose in life: to save lives using the knowledge I have." — *Author's Vision*

Reconstrução tridimensional **procedural** de cidades a partir de dados
geoespaciais abertos: pesquise uma cidade, importe OpenStreetMap, acompanhe o
processamento e navegue pelos edifícios extrudados no navegador — **sem
texturas, sem tokens comerciais, funcionando offline** com a cidade de
demonstração incluída. Fundação técnica para futuras camadas de simulação
(enchente, terremoto, incêndio, evacuação) sobre revisões urbanas versionadas.

```text
pesquisa → boundary → import job → download → normalização → PostGIS
→ CityRevision publicada → vector tiles (MVT) → deck.gl 3D → inspeção
```

## Stack

| Camada | Tecnologias |
|---|---|
| Frontend | React 19 · TypeScript (strict) · Vite · MapLibre GL · deck.gl (interleaved) · Zustand · TanStack Query · Zod · Tailwind · Vitest · Playwright |
| Backend | .NET 10 · ASP.NET Core Minimal APIs · EF Core + Npgsql + NetTopologySuite · FluentValidation · Serilog · OpenTelemetry |
| Dados | PostgreSQL 18 + PostGIS (autoritativo, SRID 4326) · MinIO (dados brutos) · MVT gerado com `ST_AsMVT` |
| Infra | Docker Compose (web/nginx · api · worker · postgres · minio) |

## Executar do zero

Pré-requisito: Docker + Docker Compose.

```bash
git clone <repo> && cd sos_location
docker compose up --build
```

Aguarde os health checks. A UI fica em **http://localhost:8080**.
No primeiro boot a API semeia um job de importação da fixture offline
(**Demo District**, ~66 edifícios, vias, rio, parque); o worker o processa em
segundos. Clique na cidade no painel **Cities** → a câmera voa até o distrito
e os edifícios 3D carregam progressivamente por tiles.

- Clique em um edifício → painel de inspeção (altura, níveis, fonte da altura,
  confiança, proveniência do dataset, tags).
- Painel **Layers**: Buildings / Roads / Water / Land Use / Boundary / Debug Tiles.
- Barra inferior: FPS, tiles carregados/pendentes, zoom, lon/lat, pitch, bearing.

Portas: web `8080`, API direta `5080`, PostGIS `5432`, MinIO `9000` (console `9001`).
Variáveis: veja `.env.example` (defaults de desenvolvimento embutidos).

## Importar uma cidade real (OSM)

Na UI: pesquisar (ex.: *Komaki, Aichi*) → selecionar → **Import from
OpenStreetMap** → acompanhar progresso → **open revision**.

Via API:

```bash
curl -X POST http://localhost:8080/api/v1/imports \
  -H 'Content-Type: application/json' \
  -d '{"name":"Komaki Center","boundingBox":{"west":136.895,"south":35.275,"east":136.935,"north":35.305},"source":"openstreetmap","reconstructionProfile":"osm-basic-v1"}'
```

Áreas são limitadas (`ImportLimits`, padrão 250 km²) — para cidades grandes o
caminho previsto é PBF por worker (reservado, fase futura). O geocodificador
(Nominatim) e o Overpass são acessados **somente pelo backend**, com
User-Agent, timeout, allowlist de hosts e limite de resposta.

## Desenvolvimento local

```bash
docker compose up postgres minio -d   # só os dados
make api-dev                          # API em :5080 (migra e semeia)
make worker-dev                       # processa jobs
make web-dev                          # Vite em :5173 (proxy /api -> :5080)
```

## Testes

```bash
make test-unit          # alturas, tags OSM, bbox, reparo de geometria, jobs, normalização
make test-arch          # NetArchTest: domínio não conhece EF/Npgsql/infra
make test-integration   # PostGIS real via Testcontainers: pipeline completo, MVT, idempotência, fila
make test-web           # Vitest: tema sem-textura, store, schemas
make e2e                # Playwright (requer stack no ar: docker compose up)
```

## API (prefixo `/api/v1`)

| Endpoint | Descrição |
|---|---|
| `GET /places/search?q=` | Pesquisa de cidades (geocoder atrás de adapter) |
| `GET /cities` · `/cities/{id}` · `/cities/{id}/revisions[/{revId}]` | Catálogo |
| `POST /imports` · `GET /imports[/{id}]` · `POST /imports/{id}/cancel` · `GET /imports/{id}/issues` | Jobs de importação |
| `GET /tiles/{revisionId}/{buildings\|roads\|water\|land-use}/{z}/{x}/{y}.mvt` | Vector tiles (ETag, immutable, brotli) |
| `GET /features/buildings/{id}` · `/roads/{id}` · `/water/{id}` | Inspeção com proveniência (`?includeGeometry=true` para GeoJSON) |
| `GET /revisions/{id}/manifest` | Manifesto de fontes/licenças da revisão |
| `GET /health` · `/health/ready` · `/health/live` · `GET /openapi/v1.json` | Diagnóstico |

## Documentação

- [Arquitetura + diagramas](docs/architecture/overview.md)
- [Modelo de dados](docs/domain/data-model.md)
- [Pipeline de importação e segurança](docs/data-pipeline/import-pipeline.md)
- ADRs: [monolito modular](docs/adr/0001-modular-monolith.md) ·
  [PostGIS/MVT](docs/adr/0002-postgis-authoritative-mvt.md) ·
  [GeoScene](docs/adr/0003-maplibre-deckgl-geoscene.md) ·
  [sem texturas](docs/adr/0004-no-textures.md) ·
  [fila no Postgres](docs/adr/0005-postgres-job-queue.md)

## Limitações conhecidas

- Terreno plano (sem DEM): `ground_elevation_m = 0`, declarado como estimado.
- `min_height` ainda não desloca a base da extrusão no deck.gl.
- Boundary renderizada como bounding box (polígono real fica no PostGIS).
- PLATEAU / CityGML / 3D Tiles: fase 6 (adapters previstos no domínio).
- Picking de topos de edifícios em vista estritamente top-down (pitch 0) é
  instável sob WebGL por software (SwiftShader); em perspectiva funciona
  normalmente — cenário coberto pelo E2E.
- Hosts cujo firewall bloqueia o egress da rede bridge do Docker impedem
  Nominatim/Overpass a partir dos containers (o modo offline não é afetado;
  `make api-dev` na máquina host funciona). O compose já configura
  `dns: [1.1.1.1, 8.8.8.8]` para o caso comum de systemd-resolved.
- Sem simulações de desastre nesta versão — a arquitetura (revisões imutáveis
  + camadas registráveis na GeoScene) foi desenhada para recebê-las como
  camadas temporais.

## Licenças

Código: MIT. Dados importados do OpenStreetMap: © OpenStreetMap contributors
(ODbL 1.0) — proveniência e atribuição preservadas por `DatasetVersion` e
expostas no manifesto de cada revisão.
