# Arquitetura do sistema

## Contexto e fronteiras

O SOS_LOCATION é um monólito modular com dois processos .NET e uma SPA. A API
serve contratos síncronos e artefatos; o worker executa importações e simulações
assíncronas; PostgreSQL/PostGIS mantém o estado transacional e geoespacial;
MinIO guarda objetos binários. Nginx publica a SPA e atua como proxy/cache.

```mermaid
flowchart LR
    USER["Usuário\npesquisa, importa, navega e simula"] -->|HTTP| SOS["SOS_LOCATION\nreconstrução urbana e análise sísmica"]
    SOS -->|pesquisa lugares| NOM["Nominatim\ngeocodificação"]
    SOS -->|baixa features por bbox| OVP["Overpass API\ndados OpenStreetMap"]
    SOS -->|cache-through de elevação| TERR["AWS Terrain Tiles\nDEM Terrarium"]
```

## Containers executáveis

```mermaid
flowchart TB
    subgraph Browser["Navegador"]
        SPA["React 19 + TypeScript"]
        MAP["GeoScene / MapLibre\ndeck.gl sob demanda"]
        SPA <--> MAP
    end

    subgraph Host["Docker Compose no host"]
        NG["Nginx\nSPA + proxy + cache"]
        API["SosLocation.Api\nMinimal APIs"]
        WRK["SosLocation.Worker\n2 BackgroundServices"]
        PG[("PostgreSQL 18\nPostGIS 3.6")]
        S3[("MinIO\nS3 compatível")]
    end

    Browser -->|":8080"| NG
    NG -->|"/api/*"| API
    API --> PG
    API --> S3
    WRK --> PG
    WRK --> S3
    API -.-> NOM["Nominatim"]
    WRK -.-> OVP["Overpass"]
    WRK -.-> DEM["AWS Terrain"]
```

No `docker-compose.yml`, API, worker e web usam `network_mode: host`. PostgreSQL
e MinIO publicam portas do bridge para o host, e os processos os acessam em
`127.0.0.1`. Essa topologia foi escolhida para dar a Nominatim e Overpass o
mesmo DNS/egress da máquina. Ela pressupõe um ambiente em que host networking
esteja disponível.

## Camadas internas .NET

```mermaid
flowchart TD
    API[SosLocation.Api] --> APP[SosLocation.Application]
    API --> GEO[SosLocation.GeoProcessing]
    API --> INF[SosLocation.Infrastructure]
    WORKER[SosLocation.Worker] --> APP
    WORKER --> GEO
    WORKER --> INF
    INF --> APP
    INF --> GEO
    GEO --> APP
    APP --> DOMAIN[SosLocation.Domain]
    GEO --> DOMAIN
    INF --> DOMAIN

    classDef core fill:#153047,stroke:#55b4e9,color:#fff;
    class DOMAIN,APP core;
```

As regras arquiteturais automatizadas garantem que:

- Domain não conhece Application, GeoProcessing, Infrastructure, API ou Worker;
- Domain não conhece EF Core, Npgsql, MinIO ou HTTP;
- Application não conhece Infrastructure, EF Core, Npgsql ou MinIO;
- GeoProcessing não conhece Infrastructure, EF Core, Npgsql ou HTTP.

`NetTopologySuite` é uma dependência intencional do Domain porque geometrias são
parte do modelo de negócio atual. Infrastructure referencia GeoProcessing para
registrar normalizadores e o pipeline sísmico no contêiner de DI.

## Portas e adapters

```mermaid
flowchart LR
    subgraph Core["Application ports"]
        GEOC[IGeocoder]
        OSM[IOsmSource]
        ELEV[IElevationProvider]
        OBJ[IObjectStorage]
        STORES[IStores / IUnitOfWork]
        TILE[ITileReader]
        PNG[IRasterImageEncoder]
    end

    GEOC --> NOM[NominatimGeocoder]
    OSM --> OVP[OverpassOsmSource]
    ELEV --> TERR[TerrariumElevationProvider]
    OBJ --> MINIO[MinioObjectStorage]
    STORES --> EF[EF Core stores]
    TILE --> MVT[MvtTileReader]
    PNG --> IMG[ImageSharpRasterEncoder]
```

O core orquestra operações por interfaces. Aquisição HTTP, serialização PNG,
SQL MVT, persistência EF e S3 ficam nos adapters.

## Fluxo síncrono de leitura

```mermaid
sequenceDiagram
    actor User as Navegador
    participant N as Nginx
    participant A as API
    participant P as PostGIS

    User->>N: GET /api/v1/tiles/{revision}/{layer}/{z}/{x}/{y}.mvt
    alt cache Nginx válido
        N-->>User: MVT em cache
    else cache miss
        N->>A: Repassa requisição
        A->>P: Valida revisão publicada
        A->>P: ST_TileEnvelope + ST_AsMVTGeom + ST_AsMVT
        P-->>A: bytes MVT
        A-->>N: 200 + ETag + immutable
        N-->>User: MVT
    end
```

Metadados e inspeção são JSON. Vector tiles vêm do PostGIS. Tiles Terrarium e
PNG de intensidade vêm do MinIO por meio da API. A UI nunca consulta provedores
GIS diretamente.

## Fluxos assíncronos

```mermaid
sequenceDiagram
    actor UI
    participant API
    participant DB as PostgreSQL
    participant W as Worker
    participant EXT as Fontes externas
    participant S3 as MinIO

    UI->>API: POST /imports ou /simulations
    API->>DB: INSERT status=Queued
    API-->>UI: 202 Accepted + Location
    loop polling a cada 2 s enquanto ativo
        UI->>API: GET job/run
        API->>DB: SELECT estado
        API-->>UI: progresso e estágio
    end
    W->>DB: SELECT ... FOR UPDATE SKIP LOCKED
    DB-->>W: item reservado como Running
    opt importação
        W->>EXT: Overpass / AWS Terrain
        W->>S3: raw e tiles Terrarium
    end
    W->>DB: resultados e transições persistidas
    opt simulação
        W->>S3: simulations/{id}/intensity.png
    end
```

Os dois consumidores são `JobProcessorService` e
`SimulationProcessorService`. Cada um cria um escopo DI por item reservado.

## Decisões de distribuição de responsabilidades

| Responsabilidade | Local atual | Motivo observado no código |
|---|---|---|
| Regras de estado e classificação de dano | Domain | São invariantes independentes de transporte/persistência |
| Orquestração de importação | Application | Opera apenas ports e objetos do domínio |
| Algoritmos geoespaciais e sísmicos | GeoProcessing | São computação pura, sem EF/HTTP |
| SQL, EF, HTTP externo, MinIO e PNG | Infrastructure | São detalhes de adapter |
| Validação HTTP, DTO e cache de request | API | Fronteira de transporte |
| Polling e execução longa | Worker | Não ocupa requisições HTTP |
| Renderização e interação | `apps/web` | Runtime WebGL isolado pela `GeoScene` |

## Rastreabilidade no código

- Composição da API: `src/SosLocation.Api/Program.cs`
- Composição e adapters: `src/SosLocation.Infrastructure/DependencyInjection.cs`
- Processos do worker: `src/SosLocation.Worker/*.cs`
- Regras de dependência: `tests/SosLocation.ArchitectureTests/LayerDependencyTests.cs`
- Containers: `docker-compose.yml` e `infra/docker/`
- Proxy/cache: `infra/nginx/default.conf`
