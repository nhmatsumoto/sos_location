# Arquitetura do sistema

## Contexto e containers

```mermaid
flowchart TB
  subgraph Client[Cliente]
    B[Browser]
    UI[React + Zustand + TanStack Query]
    MAP[GeoScene: MapLibre + deck.gl]
    B --> UI --> MAP
  end
  subgraph Runtime[Runtime SOS_LOCATION]
    NG[Nginx: SPA + proxy]
    API[ASP.NET Core API]
    WK[.NET Worker]
    PG[(PostgreSQL/PostGIS)]
    S3[(MinIO/S3)]
  end
  subgraph Sources[Fontes]
    OSM[Overpass/OSM]
    GEO[Nominatim]
    USGS[USGS sísmico]
    JMA[JMA]
    WX[Open-Meteo]
    DEM[AWS Terrain]
  end
  UI --> NG --> API
  API --> PG
  API --> S3
  WK --> PG
  WK --> S3
  API -.-> GEO
  API -.-> WX
  WK -.-> OSM
  WK -.-> USGS
  WK -.-> JMA
  WK -.-> DEM
```

## Dependências de camadas

```mermaid
flowchart LR
  API[Api] --> APP[Application]
  WK[Worker] --> APP
  INF[Infrastructure] --> APP
  INF --> DOM[Domain]
  APP --> DOM
  GEO[GeoProcessing] --> APP
  INF --> GEO
```

O domínio não conhece EF Core, Npgsql, HTTP ou providers. Application define ports (`IStores`, `IObjectStorage`, `IOsmSource`, `IGeocoder`, `IElevationProvider`, `IDisasterSimulationEngine`); Infrastructure fornece adapters; API e Worker apenas compõem casos de uso.

## Filas e processamento

```mermaid
sequenceDiagram
  participant C as Cliente
  participant A as API
  participant Q as PostgreSQL queue
  participant W as Worker
  participant O as Object storage
  C->>A: POST import/simulation
  A->>Q: grava estado queued
  loop polling com SKIP LOCKED
    W->>Q: reserva uma execução
    W->>W: processa estágios/modelo
    W->>O: grava payload e artefatos
    W->>Q: atualiza progresso/resultado
  end
  C->>A: GET status/resultados
  A-->>C: DTO, MVT, PNG ou replay
```

## Extensão científica

Um novo desastre fornece um `IDisasterSimulationEngine` com `DisasterType`, validação, execução e manifesto. O registry resolve o motor sem `if` espalhado; a UI registra ferramentas por tipo em `scientificToolRegistry`. Assim o mesmo workspace pode receber enchente, incêndio ou outros motores quando implementados.

## Imutabilidade e cache

City revisions publicadas e artefatos concluídos não são sobrescritos. MVT usa revisão/camada/zoom/x/y; rasters e frames são identificados por `runId`. O cache público só deve ser aplicado a objetos efetivamente imutáveis.
