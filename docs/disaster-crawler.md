# Disaster Crawler 24/7

Serviço contínuo de ingestão de desastres com providers plugáveis (GDACS, USGS, INMET).

## Como rodar

- One-shot:
  - `python manage.py crawl_disasters`
- Loop 24/7:
  - `python manage.py crawl_disasters --loop --interval 300`

## Endpoints

- `GET /api/disasters/events`
  - filtros: `from`, `to`, `country`, `types`, `minSeverity`, `providers`, `bbox`, `page`, `pageSize`
- `GET /api/disasters/stats/by-country`
- `GET /api/disasters/stats/timeseries`

## Providers

- GDACS (global multi-hazard)
- USGS Earthquake
- INMET RSS
- FIRMS: reservado por feature flag

## Persistência e deduplicação

- tabela `DisasterEvent` (`provider`, `provider_event_id`) único
- upsert em cada ciclo
- retenção de 90 dias

## Resolução de país

- `lat/lon` resolvido via Nominatim com cache LRU em memória.

