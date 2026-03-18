# Data Hub de Integrações (v3.0)

Documenta todas as integrações externas utilizadas para coleta de dados
geoespaciais, climáticos, alertas e transparência. A v3.0 adiciona suporte
a fontes para simulação 3D de cidades (Brasil e Japão).

---

## 1. GIS / Dados para Simulação 3D de Cidades

### OpenTopography (DEM / Elevação)
- **URL**: `https://portal.opentopography.org/API/globaldem`
- **Dataset**: SRTMGL1 (30m de resolução)
- **Uso**: Grade de elevação para renderização de terreno 3D
- **Cache TTL**: 15 min
- **Implementação**: `OpenTopographyProvider`
- **Config**: `ExternalIntegrations__OpenTopographyUrl`

### Overpass API (OpenStreetMap)
- **URL**: `https://overpass-api.de/api/interpreter`
- **Dados**: Edifícios (height, levels, usage), vias (highway, lanes), parques, florestas
- **Uso**: Geometria 3D de edificações, rede viária, vegetação
- **Cache TTL**: 15 min
- **Implementação**: `OverpassProvider`
- **Config**: `ExternalIntegrations__OverpassUrl`

### Atlas Integration Registry (curadoria de fontes externas)
- **URL**: `GET /api/integrations/atlas/sources`
- **Dados**: catálogo de fontes Atlas (GSI Japan, QGIS API, GeoSampa, OpenTopography Catalog, INDE, NASA Earthdata)
- **Uso**: descoberta e governança de fontes para modelos de risco e renderização 3D
- **Cache TTL**: Long lived

### OpenTopography Catalog (via Atlas)
- **URL**: `GET /api/integrations/atlas/opentopography/catalog`
- **Dados**: catálogo público de datasets do OpenTopography
- **Uso**: seleção dinâmica de datasets de elevação para cenários de risco e terreno
- **Cache TTL**: 5 min

### Open-Meteo (Clima em tempo real)
- **URL**: `https://api.open-meteo.com/v1/forecast`
- **Dados**: Temperatura, umidade, precipitação, velocidade do vento
- **Uso**: Sistema de partículas climáticas no renderizador 3D
- **Cache TTL**: 30 min
- **Implementação**: `OpenMeteoProvider`
- **Config**: `ExternalIntegrations__OpenMeteoUrl`

---

## 2. Fontes Específicas por País

### Brasil
| Fonte | URL | Dados | Status |
|---|---|---|---|
| IBGE API | https://servicodados.ibge.gov.br | Municípios, limites, censo | ✅ Ativo |
| INMET | https://apiprevmet3.inmet.gov.br | Alertas meteorológicos | ✅ Ativo |
| CEMADEN | https://cemaden.gov.br | Alertas de desastres | ✅ Ativo |
| Portal da Transparência CGU | https://api.portaldatransparencia.gov.br | Transferências e recursos | ✅ Ativo |
| Prefeituras Municipais | variável | Plantas cadastrais, gabaritos | 🔄 Planejado |

### Japão
| Fonte | URL | Dados | Status |
|---|---|---|---|
| GSI Tiles (国土地理院) | https://cyberjapandata.gsi.go.jp | Tiles topográficos | 🔄 Planejado |
| Kokudo Suuchi (国土数値情報) | https://nlftp.mlit.go.jp | Shapefiles, cadastro | 🔄 Planejado |
| G-XML Format | — | Cadastro de edificações | 🔄 Planejado |
| JMA (気象庁) | https://www.jma.go.jp | Alertas meteorológicos JP | 🔄 Planejado |

---

## 3. Alertas e Monitoramento

### Endpoints de Alertas

- Compatibilidade de rota de inteligência: `GET /api/integrations/alerts/intelligence` (principal) e `GET /api/alerts/intelligence` (alias legado).
- `GET /api/alerts?bbox=minLon,minLat,maxLon,maxLat&since=ISO8601`
  - Agrega: INMET CAP/RSS, CEMADEN, DefesaCivil
  - Feed configurável via `CAP_ALERT_FEEDS` env var

### Provedores Implementados
| Provedor | Classe .NET | Dados |
|---|---|---|
| INMET | `InmetAlertProvider` | Avisos meteorológicos nacionais |
| Defesa Civil | `DefesaCivilAlertProvider` | Alertas de desastre estaduais |
| CEMADEN | `CemadenAlertProvider` | Pluviometria e risco hidrológico |

---

## 4. Dados Climáticos e Meteorológicos

### Previsão e Arquivo
- `GET /api/weather/forecast?lat=&lon=&days=` → Open-Meteo
- `GET /api/weather/archive?lat=&lon=&start=&end=` → Open-Meteo

### Cache TTLs
| Endpoint | TTL |
|---|---|
| GIS / DEM | 15 min |
| GIS / Urban Features | 15 min |
| Clima / Open-Meteo | 30 min |
| Solo / Vegetação | 60 min |
| Alertas | 3 min |
| Transparência | 6 h |

---

## 5. Satélite

- **NASA GIBS WMTS**: `MODIS_Terra_CorrectedReflectance_TrueColor`, `VIIRS_SNPP`, `GOES-East_ABI_GeoColor`
- **STAC Planetary Computer**: Sentinel-2, Landsat (bbox + data range)
- `GET /api/satellite/layers` — lista todas as camadas disponíveis

---

## 6. Transparência Pública

- Portal da Transparência CGU — transferências e repasses federais
- Chave de API via `TRANSPARENCIA_API_KEY` no `.env`

---

## 7. Resiliência das Integrações

- **Fallback sintético**: todos os providers GIS geram dados sintéticos realísticos quando o serviço externo falha
- **Circuit breaker**: timeout configurado por provider (15s OpenTopography, 30s Overpass, 10s Open-Meteo)
- **Health check**: `IGisDataProvider.CheckHealthAsync()` exposto via Settings dashboard
- **Retry**: HttpClient com política de retry via Polly (planejado)

---

## 8. Variáveis de Ambiente

```env
# GIS (City-Scale Simulation)
OPENTOPOGRAPHY_URL=https://portal.opentopography.org/API/globaldem
OVERPASS_URL=https://overpass-api.de/api/interpreter
OPENMETEO_URL=https://api.open-meteo.com/v1/forecast
GIS_CACHE_EXPIRATION_MINUTES=15
GIS_INDEXING_INTERVAL_MINUTES=30

# Alertas BR
INMET_URL=https://apiprevmet3.inmet.gov.br/avisos/ativos
CAP_ALERT_FEEDS=https://apiprevmet3.inmet.gov.br/avisos/rss

# Transparência
TRANSPARENCIA_API_KEY=sua-chave
TRANSPARENCIA_BASE_URL=https://api.portaldatransparencia.gov.br/api-de-dados

# Satélite
ENABLE_GOES=false
ENABLE_STAC=true
```
