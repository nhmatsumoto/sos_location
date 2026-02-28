# Data Hub de Integrações (desastres: enchentes/deslizamentos)

Este módulo adiciona endpoints internos em `apps/api` para consolidar clima, alertas oficiais, transparência e satélite.

## Endpoints implementados

- `GET /api/weather/forecast?lat=&lon=&days=`
- `GET /api/weather/archive?lat=&lon=&start=&end=`
- `GET /api/alerts?bbox=minLon,minLat,maxLon,maxLat&since=ISO8601`
- `GET /api/transparency/transfers?uf=&municipio=&start=&end=`
- `GET /api/transparency/search?query=&start=&end=`
- `GET /api/satellite/layers`
- `GET /api/satellite/stac/search?collection=&bbox=&start=&end=&limit=`
- `GET /api/satellite/goes/recent?minutes=`

## Fontes e adaptadores

- Clima: Open-Meteo (forecast + archive).
- Alertas: feed CAP/RSS via `AlertFeedRegistry` (INMET por default, extensível por env).
- Transparência: CGU Portal da Transparência (header `chave-api-dados`).
- Satélite:
  - A) manifest de layers NASA GIBS (WMTS/WMS);
  - B) STAC Planetary Computer (Sentinel/Landsat);
  - C) metadados de referência NOAA GOES Open Data (AWS Registry).

## Como obter a chave do Portal da Transparência

1. Acesse a área da **API de Dados** do Portal da Transparência (CGU).
2. Realize o cadastro de e-mail para emissão da chave gratuita.
3. Configure no `.env`:

```env
TRANSPARENCIA_API_KEY=sua-chave
```

Sem a chave, os endpoints `/api/transparency/*` retornam erro 400 com mensagem explícita.

## Camadas GIBS habilitadas

- `MODIS_Terra_CorrectedReflectance_TrueColor`
- `VIIRS_SNPP_CorrectedReflectance_TrueColor`
- `GOES-East_ABI_GeoColor`

Retornadas por `/api/satellite/layers` com `{id,title,type,templateUrl,attribution,timeSupport}`.

## Como trocar/estender feeds CAP

Use variável de ambiente com lista CSV:

```env
CAP_ALERT_FEEDS=https://apiprevmet3.inmet.gov.br/avisos/rss,https://outro-feed-cap.xml
```

A classe `AlertFeedRegistry` busca todos os feeds configurados, normaliza e aplica filtros opcionais (`bbox` e `since`).

## Cache, resiliência e observabilidade

- Cache em memória + file-cache opcional (via `CACHE_DIR`), com TTL por endpoint:
  - Forecast: 15 min
  - Alerts: 3 min
  - Transparência: 6 h
  - GIBS Layers: 24 h
- Retry com backoff exponencial para timeouts/5xx (`HttpClient`).
- Circuit breaker simples por fonte (`HttpClient`, evita martelar origem indisponível).
- Logging estruturado no wrapper HTTP (`source`, `durationMs`, `status`, `cacheHit`).

## Flags por ambiente

```env
ENABLE_GOES=false
ENABLE_STAC=true
CACHE_DIR=.cache
```

- `ENABLE_GOES=false`: endpoint GOES retorna 403 por padrão (opcional).
- `ENABLE_STAC=true`: habilita busca STAC.


## Configuração avançada (CGU)

Se o Portal da Transparência alterar os caminhos de endpoint, você pode sobrescrever por env:

```env
TRANSPARENCIA_TRANSFERS_PATH=/transferencias
TRANSPARENCIA_SEARCH_PATH=/busca-livre
```

## Testes rápidos sem dependência de Django

Execute:

```bash
python -m unittest apps.api.integrations.tests.test_integrations_unit
```


## Cadastros e integração com banco (Missing Persons)

O formulário de cadastro no mapa foi simplificado para usar apenas os campos essenciais:

- `personName`
- `lastSeenLocation`
- coordenadas (`lat`, `lng`) selecionadas no mapa

A API `POST /api/missing-persons` agora aceita payload simplificado e completa defaults de plataforma para campos não informados (`city`, `contactName`, `contactPhone`), persistindo no banco via model `MissingPerson`.

A listagem de `GET /api/missing-persons` retorna também `lat` e `lng`, permitindo renderização direta no mapa.
