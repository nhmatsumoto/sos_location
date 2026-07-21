# Changelog

## [3.0.0] — 2026-07-16

Reboot completo do repositório como **SOS_LOCATION City Reconstruction Platform**.

### Adicionado
- Monolito modular .NET 10 (`Domain`, `Application`, `GeoProcessing`,
  `Infrastructure`, `Api`, `Worker`) com fronteiras verificadas por NetArchTest.
- PostGIS autoritativo (SRID 4326) + vector tiles MVT gerados no banco
  (`ST_AsMVT`) com simplificação e atributos por zoom.
- Pipeline de importação em 10 estágios idempotentes com fila durável no
  PostgreSQL (`FOR UPDATE SKIP LOCKED`), revisões urbanas imutáveis
  (`CityRevision`) e proveniência completa (`Dataset`/`DatasetVersion` + MinIO).
- Adapters Nominatim (pesquisa) e Overpass (importação por bbox) com allowlist,
  timeout e limites de tamanho; importação GeoJSON inline.
- Frontend React 19 + MapLibre + deck.gl interleaved atrás da classe `GeoScene`:
  edifícios extrudados selecionáveis, painéis de camadas/importação/inspeção,
  diagnóstico (FPS, tiles, câmera). Renderização 100% sem texturas (ADR 0004).
- Fixture offline "Demo District" (66 edifícios, vias, rio, parque) semeada
  automaticamente no primeiro boot — a aplicação funciona sem APIs externas.
- Testes: 84 unit + 4 arquitetura + 5 integração (PostGIS real via
  Testcontainers) + 15 frontend (Vitest) + 4 cenários E2E (Playwright).
- Docker Compose completo (web/nginx, api, worker, postgis, minio) com health
  checks, migrations automáticas e seed.

### Removido
- Todo o código da plataforma anterior (v2.x) — histórico preservado no git.
