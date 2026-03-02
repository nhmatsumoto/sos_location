# Integrações externas (MG Location)

## Visão geral
O backend expõe um módulo unificado em `/api/integrations/*` para consumo no frontend.

Providers atuais:
- **Weather:** Open-Meteo (forecast + archive)
- **Alerts:** INMET CAP (via registry)
- **Transparency:** Portal Transparência/CGU (com chave)
- **Satellite:** NASA GIBS (+ STAC/GOES em rotas complementares)

## Configuração (.env)
- `TRANSPARENCIA_API_KEY`
- `TRANSPARENCIA_BASE_URL`
- `TRANSPARENCIA_TRANSFERS_PATH`
- `TRANSPARENCIA_SEARCH_PATH`
- `CACHE_DIR`
- `ENABLE_GOES`
- `ENABLE_STAC`
- `CAP_ALERT_FEEDS`

## Endpoints principais
- `GET /api/integrations/weather/forecast?lat=&lon=&days=`
- `GET /api/integrations/weather/history?lat=&lon=&start=&end=`
- `GET /api/integrations/alerts?bbox=minLon,minLat,maxLon,maxLat&since=`
- `GET /api/integrations/transparency/transfers?start=&end=&uf=&municipio=`
- `GET /api/integrations/transparency/summary?start=&end=`
- `GET /api/integrations/satellite/layers`

## Observabilidade e resiliência
- Retry com backoff para fontes externas (HTTP client interno)
- Circuit breaker simples por provider
- Cache TTL por endpoint/provedor
- Log estruturado com `source`, `status`, `durationMs`, `cacheHit`

## Limitações
- Algumas fontes públicas possuem disponibilidade variável.
- Para produção, recomenda-se monitorar erros por provider e ajustar TTL por volume e SLA.
