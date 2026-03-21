# SOS Location — Arquitetura do Sistema

> Versão: 2.0 | Data: 2026-03-22

---

## 1. Visão Geral — Diagrama C4 (Nível 1: Contexto)

```mermaid
C4Context
    title SOS Location — Contexto do Sistema

    Person(operador, "Operador de Defesa Civil", "Coordena respostas a desastres")
    Person(cidadao, "Cidadão / Vítima", "Acessa portal público de situação")
    Person(pesquisador, "Pesquisador / Analista", "Analisa dados geoespaciais")

    System(sos, "SOS Location", "Plataforma de comando e coordenação para desastres naturais")

    System_Ext(osm, "OpenStreetMap / Overpass", "Dados de edificações, vias, hidrografia")
    System_Ext(dem, "OpenTopography", "Modelos digitais de elevação (DEM)")
    System_Ext(meteo, "Open-Meteo / INMET", "Dados meteorológicos em tempo real")
    System_Ext(gdacs, "GDACS / Defesa Civil", "Alertas globais de desastres")
    System_Ext(nasa, "NASA GIBS / WorldCover", "Imagens de satélite e cobertura da terra")
    System_Ext(keycloak, "Keycloak IAM", "Identidade e controle de acesso")

    Rel(operador, sos, "Usa", "HTTPS / WebSocket")
    Rel(cidadao, sos, "Consulta", "HTTPS")
    Rel(pesquisador, sos, "Analisa", "HTTPS / API")
    Rel(sos, osm, "Consulta features urbanas", "REST")
    Rel(sos, dem, "Obtém dados de elevação", "REST")
    Rel(sos, meteo, "Obtém dados meteorológicos", "REST")
    Rel(sos, gdacs, "Recebe alertas globais", "RSS / REST")
    Rel(sos, nasa, "Obtém tiles de satélite", "XYZ / REST")
    Rel(sos, keycloak, "Autentica usuários", "OIDC / JWT")
```

---

## 2. Diagrama de Containers (Nível 2)

```mermaid
C4Container
    title SOS Location — Containers

    Person(operador, "Operador")
    Person(cidadao, "Cidadão")

    Container_Boundary(frontend, "Frontend") {
        Container(spa, "React SPA", "React 19, TypeScript, Vite", "Interface web — mapa tático 2D, renderizador 3D WebGL, dashboards")
    }

    Container_Boundary(backend, "Backend .NET") {
        Container(api, "SOSLocation.API", "ASP.NET Core, .NET 10", "REST API + SignalR Hubs — orquestração de domínio")
        Container(domain, "SOSLocation.Domain", ".NET 10", "Entidades, Aggregates, regras de negócio (DDD)")
        Container(app, "SOSLocation.Application", "MediatR, FluentValidation", "Use Cases: Commands, Queries, Handlers")
        Container(infra, "SOSLocation.Infrastructure", "EF Core, Dapper, Npgsql", "Persistência e integrações externas")
        Container(ml, "SOSLocation.ML", ".NET 10, ML.NET", "Inferência de modelos de ML no backend")
    }

    Container_Boundary(rau, "Risk Analysis Unit") {
        Container(rau_api, "FastAPI", "Python, FastAPI, Uvicorn", "Análise de risco e segmentação semântica")
        Container(pytorch, "PyTorch Models", "Python, PyTorch, Scikit-learn", "Modelos de ML para classificação e predição")
    }

    Container_Boundary(infra_layer, "Infraestrutura") {
        ContainerDb(pg, "PostgreSQL 15", "Banco relacional", "Incidentes, usuários, logs de auditoria, dados GIS")
        Container(kc, "Keycloak 26", "IAM / SSO", "Autenticação OIDC, tokens JWT, RBAC")
        Container(backup, "DB Backup", "Shell + cron", "Backup automático do PostgreSQL")
    }

    Rel(operador, spa, "Usa", "HTTPS")
    Rel(cidadao, spa, "Usa", "HTTPS")
    Rel(spa, api, "Chama", "REST / WebSocket SignalR")
    Rel(spa, kc, "Autentica", "OIDC")
    Rel(spa, rau_api, "Solicita análise", "REST")
    Rel(api, domain, "Usa")
    Rel(api, app, "Despacha Commands/Queries")
    Rel(app, infra, "Usa repositórios")
    Rel(app, ml, "Invoca inferência")
    Rel(infra, pg, "Lê/Escreve", "SQL")
    Rel(api, kc, "Valida JWT", "OIDC introspection")
    Rel(rau_api, pytorch, "Executa modelos")
```

---

## 3. Diagrama de Componentes — Backend API (Nível 3)

```mermaid
graph TB
    subgraph API["SOSLocation.API"]
        direction TB
        SimCtrl["SimulationController\n/api/simulation/v1"]
        IncCtrl["IncidentController\n/api/incidents"]
        RescCtrl["RescueController\n/api/rescue"]
        PubCtrl["PublicController\n/api/public"]
        AlertCtrl["AlertController\n/api/alerts"]
        HydraHub["HydraHub\n(SignalR)"]
        IntCtrl["IntegrationConfigController\n/api/integrations"]
    end

    subgraph Application["SOSLocation.Application"]
        direction TB
        SimCmd["SimulationCommands\n(RunSimulation, BuildScene)"]
        IncCmd["IncidentCommands\n(Create, Update, Close)"]
        Queries["Queries\n(GetIncident, GetSnapshot)"]
        Validators["FluentValidation\nValidators"]
    end

    subgraph Domain["SOSLocation.Domain"]
        direction TB
        Incident["Incident\n(Aggregate Root)"]
        Alert["Alert\n(Entity)"]
        Rescue["SearchArea, Assignment\n(Entities)"]
        Support["Campaign, Donation\n(Entities)"]
        AuditLog["AuditLog\n(Append-only)"]
    end

    subgraph Infra["SOSLocation.Infrastructure"]
        direction TB
        GisService["GisService\n(OSM, OpenTopo, Meteo)"]
        Repos["Repositories\n(EF Core + Dapper)"]
        ExtProviders["External Providers\n(HTTP Resilience)"]
    end

    SimCtrl --> SimCmd
    IncCtrl --> IncCmd
    RescCtrl --> Queries
    PubCtrl --> Queries
    AlertCtrl --> IncCmd
    SimCmd --> GisService
    SimCmd --> Repos
    IncCmd --> Incident
    Queries --> Repos
    GisService --> ExtProviders
```

---

## 4. Diagrama de Componentes — Frontend WebGL Pipeline (Nível 3)

```mermaid
graph TB
    subgraph Pages["Pages"]
        SimPage["SimulationsPage\n(controle de camadas, simData)"]
        PubMap["PublicMapPage\n(portal público)"]
        DataHub["DataHubPage\n(analytics)"]
    end

    subgraph WebGL["WebGL Engine — CityScaleWebGL"]
        direction TB
        BP["CityBlueprintBuilder\n(orquestrador)"]
        Shaders["cityShaders.ts\n(GLSL — terrain, infra, flood, zone)"]
        HydroA["HydrologicalAnalyzer\n(D8 flow + water cells)"]
        SemProc["SemanticTileProcessor\n(WorldCover classification)"]
        TileLoad["TileLoader\n(XYZ satellite tiles)"]
        GISMath["GISMath\n(lat/lon ↔ world-space cm)"]
        Camera["CameraController\n(FPS + orbit)"]
    end

    subgraph Lib["Lib — Analysis & Segmentation"]
        SemanticTypes["SemanticTypes\n(SemanticClass enum)"]
        CanvasCache["SatelliteCanvasCache\n(module-level cache)"]
    end

    subgraph Services["API Services"]
        SceneAPI["sceneDataApi\n(POST /scenes/data)"]
        SimAPI["simulationApi\n(POST /simulate)"]
        PublicAPI["publicApi\n(GET /public/*)"]
    end

    SimPage --> WebGL
    SimPage --> Services
    WebGL --> BP
    BP --> TileLoad
    BP --> SemProc
    BP --> HydroA
    BP --> CanvasCache
    SemProc --> SemanticTypes
    HydroA --> SemanticTypes
    WebGL --> Shaders
    WebGL --> GISMath
    WebGL --> Camera
    Services --> SceneAPI
    Services --> SimAPI
```

---

## 5. Sequência — Pipeline Completo de Simulação

```mermaid
sequenceDiagram
    actor Op as Operador
    participant SPA as Frontend SPA
    participant API as .NET API
    participant GIS as GisService
    participant OSM as Overpass/OpenTopo
    participant RAU as Risk Analysis Unit
    participant DB as PostgreSQL
    participant WGL as WebGL Engine

    Op->>SPA: Seleciona bbox + parâmetros de desastre
    SPA->>API: POST /api/simulation/v1/simulate
    API->>GIS: FetchUrbanFeatures(bbox)
    GIS->>OSM: Query buildings, highways, waterways
    OSM-->>GIS: GeoJSON features
    GIS->>OSM: Query DEM elevation grid
    OSM-->>GIS: Elevation data
    GIS-->>API: UrbanSimulationResult
    API->>RAU: POST /analyze (risk params)
    RAU-->>API: Risk scores
    API->>DB: Persist simulation record
    DB-->>API: OK
    API-->>SPA: SimulationResponse (features + risk)

    SPA->>API: POST /api/simulation/v1/scenes/data
    API->>GIS: BuildSceneData(bbox)
    GIS-->>API: SceneData (semantics, elevation, OSM)
    API-->>SPA: SceneData JSON

    SPA->>WGL: CityBlueprintBuilder.buildFromSceneData()
    WGL->>WGL: TileLoader.loadSatelliteTiles() (XYZ parallel)
    WGL->>WGL: HydrologicalAnalyzer.analyze() (D8 flow)
    WGL->>WGL: Upload VBOs → GPU render loop
    WGL-->>SPA: Cena 3D renderizada
```

---

## 6. Sequência — Alertas em Tempo Real (SignalR)

```mermaid
sequenceDiagram
    participant Ext as Fonte Externa (GDACS/Defesa Civil)
    participant API as .NET API (HydraHub)
    participant SPA as Frontend SPA
    participant Leaflet as Mapa Leaflet

    Ext->>API: Webhook / polling alert
    API->>API: AlertHandler.Handle() → persist + classify
    API->>SPA: SignalR Push "NewAlert" event
    SPA->>SPA: useSignalR hook → Zustand store update
    SPA->>Leaflet: Render alert marker / toast notification
    SPA->>SPA: EventTimeline update (LOG panel)
```

---

## 7. Arquitetura de Deploy (Docker Compose)

```mermaid
graph LR
    subgraph Docker["Docker Compose Network"]
        FE["frontend\n:5173\n(Vite + React)"]
        BE["backend\n:5000\n(ASP.NET Core)"]
        RAU["risk-analysis\n:8001\n(FastAPI)"]
        PG["postgres\n:5432\n(PostgreSQL 15)"]
        KC["keycloak\n:8080\n(Keycloak 26)"]
        BK["db-backup\n(cron diário)"]
        DZ["dozzle\n:8888\n(log viewer)"]
    end

    FE -->|REST/WS| BE
    FE -->|OIDC| KC
    FE -->|REST| RAU
    BE -->|SQL| PG
    BE -->|OIDC introspect| KC
    RAU -->|REST (opcional)| BE
    BK -->|pg_dump| PG
    DZ -->|Docker API| Docker
```

---

## 8. Princípios Arquiteturais

| Princípio | Implementação |
|-----------|--------------|
| **Clean Architecture** | Backend em camadas: Domain → Application → Infrastructure → API |
| **Domain-Driven Design** | Aggregates, Entities, Value Objects, Domain Events em `SOSLocation.Domain` |
| **CQRS** | Commands (escrita) e Queries (leitura) separados via MediatR |
| **Resilience by Default** | Circuit breakers e retries para todos os provedores GIS externos |
| **Offline-First** | IndexedDB + service worker para operação sem conectividade |
| **Pure WebGL 2.0** | Sem Three.js no pipeline 3D — controle total de shaders e buffers |
| **Satellite-Driven Semantics** | Posicionamento de features (árvores, água) baseado em análise de imagem real |
| **Zero-Trust Auth** | JWT validado a cada request; Keycloak como IdP centralizado |
