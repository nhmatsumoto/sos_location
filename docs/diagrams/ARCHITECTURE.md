# Arquitetura SOS Location

> **Este arquivo foi consolidado.** Consulte a documentação atualizada:
>
> - [SYSTEM_ARCHITECTURE.md](../SYSTEM_ARCHITECTURE.md) — Diagramas C4, componentes e sequências
> - [CLASS_DIAGRAMS.md](../CLASS_DIAGRAMS.md) — Diagramas de classe (Domain, Application, Frontend)
> - [DATA_FLOW.md](../DATA_FLOW.md) — Fluxos de dados GIS, simulação e tempo real
> - [INDEX.md](../INDEX.md) — Índice completo da documentação

---

## Visão de Alto Nível (resumo)

```mermaid
graph TD
    subgraph Frontend["Frontend (React 19 + WebGL 2.0)"]
        SIM[SimulationsPage\nCena 3D WebGL]
        MAP[PublicMapPage\nLeaflet 2D]
        DASH[DataHubPage\nAnalytics]
    end

    subgraph Backend[".NET Backend (ASP.NET Core 10)"]
        API[REST API\nClean Architecture + DDD]
        HUB[HydraHub\nSignalR]
        GIS[GisService\nOSM + OpenTopo + Meteo]
    end

    subgraph RAU["Risk Analysis Unit (FastAPI + PyTorch)"]
        RISK[Risk Analyzer]
        SEG[Semantic Segmentor]
    end

    subgraph Infra["Infrastructure"]
        PG[(PostgreSQL 15)]
        KC[Keycloak 26\nIAM / SSO]
    end

    SIM & MAP & DASH -->|REST / WS| API
    SIM & MAP -->|OIDC| KC
    SIM -->|REST| RISK
    SIM -->|REST| SEG
    API --> GIS
    API --> PG
    HUB -->|WebSocket Push| SIM & MAP
```
