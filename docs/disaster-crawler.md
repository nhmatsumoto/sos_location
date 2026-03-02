# Disaster Crawler 24/7

## Visão geral
Crawler contínuo para eventos globais de desastres usando fontes públicas/oficiais:
- GDACS
- USGS Earthquake
- INMET (quando disponível)

Os eventos são normalizados, deduplicados (`provider + provider_event_id`), enriquecidos com país e persistidos em `DisasterEvent`.

## Execução 24/7
Ative no backend:
- `DISASTERS_CRAWLER_ENABLED=true`
- `DISASTERS_CRAWLER_INTERVAL_SECONDS=900` (opcional)

Também existe endpoint para disparo manual:
- `POST /api/disasters/crawl-trigger`

## Endpoints
- `GET /api/disasters/events`
- `GET /api/disasters/stats/by-country`
- `GET /api/disasters/stats/timeseries`

## Filtros
- `from`, `to` (ISO datetime)
- `country` (ISO2)
- `types` (csv)
- `minSeverity`
- `providers` (csv)
- `bbox=minLon,minLat,maxLon,maxLat`
- `page`, `pageSize`

## Retenção
- Eventos mais antigos que 90 dias são removidos durante o ciclo de ingestão.

## Limitações atuais
- Resolução de país usa heurística/cache (fallback para `XX/Unknown` em casos não resolvidos).
- INMET pode variar em disponibilidade/formato.
