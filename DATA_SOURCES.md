# DATA_SOURCES.md — City-Scale GIS Simulation Catalog (v3.0)

A comprehensive catalog of all data sources used for city simulation, disaster
monitoring, and humanitarian coordination across **Brazil** and **Japan**.

---

## GIS / Topography

| Source | Type | Coverage | Provider Class |
|---|---|---|---|
| [OpenTopography SRTMGL1](https://portal.opentopography.org) | DEM 30m | Global | `OpenTopographyProvider` |
| [OpenStreetMap / Overpass](https://overpass-api.de) | Buildings, Roads, Parks | Global | `OverpassProvider` |
| [GSI Japan Tiles](https://cyberjapandata.gsi.go.jp) | Topo tiles | Japan | Planned |
| [Kokudo Suuchi](https://nlftp.mlit.go.jp) | Shapefiles, Cadastre | Japan | Planned |
| [Atlas Registry (SOS)](/api/integrations/atlas/sources) | Curated multi-source registry | Global | `IntegrationsController` |
| [OpenTopography Catalog](https://portal.opentopography.org/apidocs/#/Public/getOtCatalog) | DEM dataset catalog | Global | `IntegrationsController` |
| [GeoSampa SBC](https://geosampa.prefeitura.sp.gov.br/PaginasPublicas/_SBC.aspx) | Urban cadastre layers | São Paulo (BR) | Planned ingestion |
| [INDE Visualizador](https://visualizador.inde.gov.br/) | Official BR SDI layers | Brazil | Planned ingestion |

---

## Climate & Weather

| Source | Endpoint | Coverage | Provider Class |
|---|---|---|---|
| [Open-Meteo](https://api.open-meteo.com) | `/v1/forecast` | Global | `OpenMeteoProvider` |
| [INMET](https://portal.inmet.gov.br) | CAP/RSS Alerts | Brazil | `InmetAlertProvider` |
| [JMA 気象庁](https://www.jma.go.jp) | Alerts, Forecast | Japan | Planned |

---

## Disaster Monitoring

| Source | Type | Provider Class |
|---|---|---|
| [CEMADEN](https://cemaden.gov.br) | Hydrological risk | `CemadenAlertProvider` |
| [Defesa Civil](https://www.defesacivil.sc.gov.br) | Civil protection | `DefesaCivilAlertProvider` |
| [GDACS](https://gdacs.org) | Global disaster alerts | `GlobalDisastersService` |
| [USGS Earthquake](https://earthquake.usgs.gov) | Seismic events | `GlobalDisastersService` |

---

## Administrative / Cadastral

| Source | URL | Coverage | Status |
|---|---|---|---|
| IBGE API | https://servicodados.ibge.gov.br | Brazil municipalities | ✅ Active |
| Portal da Transparência | https://api.portaldatransparencia.gov.br | Federal funds | ✅ Active |
| Prefeituras Municipais | varies | Building cadastre BR | 🔄 Planned |
| G-XML (Japan) | — | Building data JP | 🔄 Planned |

---

## Satellite

| Source | Data | Usage |
|---|---|---|
| NASA GIBS | MODIS, VIIRS, GOES-East | Base satellite layer |
| STAC Planetary Computer | Sentinel-2, Landsat | Multi-spectral overlays |

---

## People Data (Historical / Research Refs)
- [Brumadinho Missing](https://overpass-turbo.eu/s/FBC) — Overpass map reference
- [Vale Óbitos](http://brumadinho.vale.com/listagem-pessoas-sem-contato.html) — Historical reference