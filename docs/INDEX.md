# SOS Location — Documentação Técnica

> Plataforma de comando e coordenação para prevenção, preparação e resposta a desastres naturais.

---

## Navegação

| Documento | Descrição |
|-----------|-----------|
| [VISION_AND_GOALS.md](VISION_AND_GOALS.md) | Visão, missão e princípios orientadores |
| [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md) | Arquitetura do sistema (C4, componentes, sequências) |
| [CLASS_DIAGRAMS.md](CLASS_DIAGRAMS.md) | Diagramas de classe — Domain, Application, Frontend |
| [DATA_FLOW.md](DATA_FLOW.md) | Fluxos de dados — pipeline GIS, simulação, tempo real |
| [REQUIREMENTS.md](REQUIREMENTS.md) | Requisitos funcionais e não funcionais |
| [TECHNOLOGY_STACK.md](TECHNOLOGY_STACK.md) | Inventário de tecnologias |
| [FEATURES.md](FEATURES.md) | Catálogo de funcionalidades |
| [ANALYTICAL_MODELS_AND_PHYSICS.md](ANALYTICAL_MODELS_AND_PHYSICS.md) | Modelos matemáticos, físicos e notação AsciiMath |
| [FRONTEND_TOTAL_REFACTOR_PLAN.md](FRONTEND_TOTAL_REFACTOR_PLAN.md) | Plano diretor da refatoração total do frontend |
| [3D_ENGINE_AUDIT.md](3D_ENGINE_AUDIT.md) | Auditoria do motor 3D ativo, riscos e bugs corrigidos |
| [3D_CITY_RENDERING_ARCHITECTURE.md](3D_CITY_RENDERING_ARCHITECTURE.md) | Arquitetura alvo para renderização 3D de cidades |
| [3D_DATA_SOURCES_BRAZIL_JAPAN.md](3D_DATA_SOURCES_BRAZIL_JAPAN.md) | Fontes geoespaciais e estratégia Brasil/Japão |
| [3D_DISASTER_OVERLAY_CONTRACT.md](3D_DISASTER_OVERLAY_CONTRACT.md) | Contrato de overlays de desastre para simulações futuras |
| [API_ENDPOINT_MAP.md](API_ENDPOINT_MAP.md) | Mapa de endpoints da API |
| [AUTHZ_ROLES.md](AUTHZ_ROLES.md) | Controle de acesso e papéis (RBAC) |
| [DOMAIN_SPECIFICATION.md](DOMAIN_SPECIFICATION.md) | Especificação do domínio DDD |
| [INTEGRATIONS.md](INTEGRATIONS.md) | Integrações com sistemas externos |
| [GOVERNANCE.md](GOVERNANCE.md) | Governança, conformidade e privacidade |
| [DECISIONS.md](DECISIONS.md) | Registro de decisões arquiteturais (ADR) |

---

## Estrutura do Repositório

```
sos_location/
├── backend-dotnet/          # ASP.NET Core — Clean Architecture + DDD
│   ├── SOSLocation.API/     # Controllers, Hubs SignalR, Middlewares
│   ├── SOSLocation.Application/ # Use Cases, Commands, Queries (MediatR)
│   ├── SOSLocation.Domain/  # Entidades, Aggregates, Value Objects
│   ├── SOSLocation.Infrastructure/ # EF Core, Dapper, GIS providers
│   └── SOSLocation.ML/      # Modelos analíticos heurísticos e simulação multi-hazard (.NET)
├── frontend-react/          # React 19 + TypeScript + SPA operacional
│   └── src/
│       ├── pages/           # 28 páginas de rotas
│       ├── components/      # UI atoms, features, WebGL
│       ├── hooks/           # 23 hooks personalizados
│       ├── lib/             # WebGL pipeline, análise GIS, blueprints
│       └── services/        # 30+ clientes de API
├── risk-analysis-unit/      # Serviço legado/experimental em Python
├── infra/                   # Docker Compose, backups, Keycloak
└── docs/                    # Esta documentação
```

---

## Módulos Principais

### Backend — SOSLocation.API
Organizado por domínios verticais (Slices):

| Módulo | Responsabilidade |
|--------|-----------------|
| `SimulationController` | Orquestração de simulações de desastres e pipeline GIS |
| `IncidentController` | CRUD de incidentes multi-hazard |
| `RescueController` | Coordenação de equipes e áreas de busca |
| `PublicController` | Dados públicos anonimizados |
| `AlertController` | Geração e distribuição de alertas |
| `HydraHub` (SignalR) | Streaming em tempo real para o frontend |

### Frontend — SPA Operacional
Camada React para transparência pública, comando tático, analytics e simulações:

| Módulo | Responsabilidade |
|--------|-----------------|
| `CityScaleWebGL` | Renderizador 3D principal com overlays de engenharia e desastre |
| `PublicPortalMap` | Mapa 2D Leaflet público interativo |
| `SimulationsPage` | Interface de controle de simulações e camadas 3D |
| `HydrologicalAnalyzer` | Análise D8 de fluxo hidrológico a partir de DEM |
| `SemanticTileProcessor` | Segmentação semântica de imagens de satélite |
| `CityBlueprintBuilder` | Orquestrador do pipeline de dados de cena |

### Risk Analysis Unit
Camada analítica atual:

| Componente | Função |
|-----------|--------|
| `SOSLocation.ML` | Modelos heurísticos .NET para risco, segmentação, declividade e simulação |
| `risk-analysis-unit` | Serviço legado/experimental em Python ainda referenciado por partes da infraestrutura |

---

## Quick Start

```bash
# Iniciar todos os serviços
docker compose up -d --build

# Acessar a aplicação
# Frontend:      http://localhost:8088
# API:           http://localhost:8000
# Swagger:       http://localhost:8000/swagger
# Keycloak:      http://localhost:8080
# Risk Analysis: http://localhost:8001
# Dozzle Logs:   http://localhost:8888
```
