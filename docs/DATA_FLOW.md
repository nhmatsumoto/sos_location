# SOS Location — Fluxos de Dados

> Versão: 1.0 | Data: 2026-03-22

---

## 1. Pipeline GIS — Da Requisição ao Blueprint 3D

```mermaid
flowchart TD
    A([Operador seleciona bbox]) --> B[SimulationsPage]
    B --> C[POST /api/simulation/v1/simulate]

    subgraph Backend_Sim["Backend — SimulationController"]
        C --> D[RunSimulationHandler]
        D --> E[GisService.FetchUrbanFeatures]
        D --> F[GisService.FetchElevationGrid]
        E --> G[(Overpass API\nBuildings/Highways/Waterways)]
        F --> H[(OpenTopography\nDEM Grid)]
        G --> I[UrbanSimulationResult]
        H --> I
        D --> J[RiskAnalysisClient\nPOST /analyze]
        J --> K[(Risk Analysis Unit\nPyTorch Models)]
        K --> L[RiskScores]
        I --> M[SimulationResponse]
        L --> M
    end

    M --> N[Frontend — simData state]
    N --> O[POST /api/simulation/v1/scenes/data]

    subgraph Backend_Scene["Backend — SceneData Pipeline"]
        O --> P[SceneData Builder]
        P --> Q[SemanticSegmentation\n.NET WorldCover]
        P --> R[ElevationNormalization]
        P --> S[OSMFeatureExtraction]
        Q --> T[SceneData JSON]
        R --> T
        S --> T
    end

    T --> U[CityBlueprintBuilder.buildFromSceneData]

    subgraph Frontend_Blueprint["Frontend — Blueprint Pipeline"]
        U --> V[TileLoader\nXYZ Satellite Tiles]
        U --> W[SemanticGrid mapping\nfrom SceneData.semantics]
        U --> X[Elevation resample\nbilinear interpolation]
        V --> Y[HTMLCanvasElement\ncached in SatelliteCanvasCache]
        W --> Z[CityBlueprint]
        X --> Z
        Y --> Z
    end

    Z --> AA[CityScaleWebGL.buildScene]

    subgraph WebGL_Scene["WebGL — Scene Build"]
        AA --> BB[HydrologicalAnalyzer.analyze\nD8 flow + WATER cells]
        AA --> CC[Terrain VBO\nElevation displacement]
        AA --> DD[Buildings VBO\nOSM extrusion]
        AA --> EE[Waterways VBO\nOSM + D8 streams + WATER quads]
        AA --> FF[Zone VBO\nNaturalAreas/LandUse/Paving]
        AA --> GG[Highway VBO\nOSM roads]
        BB --> EE
    end

    CC & DD & EE & FF & GG --> HH([GPU Render Loop\n60fps WebGL 2.0])
```

---

## 2. Fluxo de Dados — Alertas em Tempo Real

```mermaid
flowchart LR
    subgraph Sources["Fontes Externas"]
        G[GDACS RSS]
        DC[Defesa Civil API]
        IN[INMET/CEMADEN]
        MN[Operador Manual]
    end

    subgraph Backend["Backend .NET"]
        PL[Alert Polling\nAPScheduler-like]
        AH[AlertHandler\nMediatR]
        DB[(PostgreSQL\nalerts table)]
        HB[HydraHub\nSignalR]
    end

    subgraph Frontend["Frontend SPA"]
        SR[useSignalR hook\nHubConnection]
        AS[AlertStore\nZustand]
        TN[Toast Notifications\nChakra UI]
        LF[Leaflet Map\nAlert Markers]
        ET[EventTimeline\nLOG Panel]
    end

    G --> PL
    DC --> PL
    IN --> PL
    MN --> AH
    PL --> AH
    AH --> DB
    AH --> HB
    HB -->|WebSocket Push| SR
    SR --> AS
    AS --> TN
    AS --> LF
    AS --> ET
```

---

## 3. Fluxo de Autenticação — OIDC com Keycloak

```mermaid
sequenceDiagram
    participant Browser
    participant SPA as React SPA
    participant KC as Keycloak
    participant API as .NET API

    Browser->>SPA: Acessa rota protegida
    SPA->>KC: Redirect para login (OIDC Authorization Code Flow)
    KC-->>Browser: Formulário de login
    Browser->>KC: Credenciais
    KC-->>SPA: Authorization Code + redirect_uri
    SPA->>KC: Troca code por tokens (access_token, refresh_token)
    KC-->>SPA: JWT access_token (roles, sub, exp)
    SPA->>SPA: Armazena token (keycloak-js)

    loop Cada requisição autenticada
        SPA->>API: HTTP request + Authorization: Bearer <token>
        API->>KC: Introspect token (ou valida assinatura RS256)
        KC-->>API: Token válido + claims
        API-->>SPA: Response (200/401/403)
    end

    Note over SPA,KC: Token renovado automaticamente via refresh_token
```

---

## 4. Pipeline de Segmentação Semântica de Satélite

```mermaid
flowchart TD
    A[XYZ Tile URLs\nNASA GIBS / OSM] --> B[TileLoader.loadSatelliteTiles]
    B --> C[Fetch tiles em paralelo\nbrowser fetch API]
    C --> D[Composição em HTMLCanvasElement]
    D --> E[SatelliteCanvasCache\narmazenamento em memória]

    E --> F{WorldCover\ndisponível?}
    F -- Sim --> G[SemanticTileProcessor\n.classifyWithLandCover]
    F -- Não --> H[SemanticTileProcessor\n.classify]

    G --> I[Amostragem por tile\ncellW × cellH pixels]
    H --> I

    I --> J[Cálculo NDVI-like\nR/G/B ratios]
    J --> K{Classificação}
    K -- R<80, G>100 --> L[VEGETATION]
    K -- B>R+G --> M[WATER]
    K -- high R+G+B --> N[URBAN]
    K -- B>G, G>R --> O[ROAD]
    K -- default --> P[BARE_GROUND]

    L & M & N & O & P --> Q[SemanticGrid\nrows × cols × SemanticCell]
    Q --> R[SemanticMetadata\nvegetationPct, waterPct, etc]
```

---

## 5. Fluxo de Análise Hidrológica (D8)

```mermaid
flowchart TD
    A[ElevationGrid\n normalized 0..1] --> B[HydrologicalAnalyzer.analyze]

    subgraph D8["D8 Flow Direction"]
        B --> C[Para cada célula\nencontrar vizinho mais baixo]
        C --> D[flowTo array\nInt32Array n células]
    end

    subgraph Accum["Flow Accumulation — Topological Sort"]
        D --> E[Calcular in-degree\nde cada célula]
        E --> F[Queue: células com inDeg=0\nfonte / divisor de águas]
        F --> G[Processar queue\npropagando accum downstream]
        G --> H[accum Float32Array\ndrenagem acumulada por célula]
    end

    subgraph Stream["Stream Network"]
        H --> I[threshold = max 5 cells\nou 4% do maxAccum]
        I --> J[isStream Uint8Array\ncélulas acima do limiar]
        J --> K[Identificar heads\nsem upstream stream]
        K --> L[Traçar polylines\ncm world-space]
        L --> M[streamPolylines\n StreamPolyline array]
    end

    subgraph Water["Satellite WATER Cells"]
        N[SemanticCells\n SemanticGrid] --> O{cell.class\n=== WATER?}
        O -- Sim --> P[WaterCellQuad\nx0,z0,x1,z1 em cm]
        P --> Q[waterCellQuads array]
    end

    M & Q --> R[HydroResult]
    R --> S[WebGL — Waterways VBO\nstream polylines + water quads]
```

---

## 6. Fluxo de Dados — Portal Público

```mermaid
flowchart LR
    subgraph Public["Portal Público (sem autenticação)"]
        PM[PublicMapPage\nLeaflet Map]
        DH[DataHubPage\nAnalytics]
    end

    subgraph API_Public["API — /api/public"]
        PI[GET /incidents\nlista paginada]
        PS[GET /incidents/:id/snapshot/latest]
        SA[GET /incidents/:id/support/summary]
        RA[GET /incidents/:id/rescue/search-areas]
    end

    subgraph DB["PostgreSQL"]
        IT[(Incidents)]
        SN[(PublicSnapshots)]
        SP[(Support Campaigns)]
        SR[(SearchAreas)]
    end

    PM --> PI
    PM --> PS
    DH --> SA
    DH --> RA
    PI --> IT
    PS --> SN
    SA --> SP
    RA --> SR

    IT & SN & SP & SR -->|Dados anonimizados\nSem PII| PM & DH
```

---

## 7. Ciclo de Vida de um Incidente

```mermaid
stateDiagram-v2
    [*] --> Active : CreateIncident
    Active --> Monitoring : UpdateStatus(Monitoring)
    Active --> Contained : UpdateStatus(Contained)
    Monitoring --> Active : Escalation
    Monitoring --> Contained : UpdateStatus(Contained)
    Contained --> Active : Reactivation
    Contained --> Closed : CloseIncident
    Closed --> [*]

    Active : Active\n- Alertas em tempo real\n- Equipes em campo\n- Campanhas abertas
    Monitoring : Monitoring\n- Vigilância contínua\n- Equipes de prontidão
    Contained : Contained\n- Situação controlada\n- Relatório final em elaboração
    Closed : Closed\n- Incidente encerrado\n- Snapshot público gerado\n- Auditoria completa
```
