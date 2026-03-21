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
│   └── SOSLocation.ML/      # Módulo de Machine Learning (.NET)
├── frontend-react/          # React 19 + TypeScript + WebGL 2.0
│   └── src/
│       ├── pages/           # 28 páginas de rotas
│       ├── components/      # UI atoms, features, WebGL
│       ├── hooks/           # 23 hooks personalizados
│       ├── lib/             # WebGL pipeline, análise GIS, blueprints
│       └── services/        # 30+ clientes de API
├── risk-analysis-unit/      # Python FastAPI + PyTorch
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

### Frontend — Hydra Engine
Motor de renderização tático puro WebGL 2.0:

| Módulo | Responsabilidade |
|--------|-----------------|
| `CityScaleWebGL` | Renderizador 3D — terreno, edifícios, água, zonas |
| `PublicPortalMap` | Mapa 2D Leaflet público interativo |
| `SimulationsPage` | Interface de controle de simulações e camadas 3D |
| `HydrologicalAnalyzer` | Análise D8 de fluxo hidrológico a partir de DEM |
| `SemanticTileProcessor` | Segmentação semântica de imagens de satélite |
| `CityBlueprintBuilder` | Orquestrador do pipeline de dados de cena |

### Risk Analysis Unit
Microsserviço Python com modelos de ML:

| Endpoint | Função |
|----------|--------|
| `POST /analyze` | Análise de risco multi-hazard |
| `POST /semantic-segmentation` | Segmentação semântica de cenas urbanas |
| `GET /health` | Health check do serviço |

---

## Quick Start

```bash
# Iniciar todos os serviços
docker compose up -d --build

# Acessar a aplicação
# Frontend:      http://localhost:5173
# API:           http://localhost:5000
# Swagger:       http://localhost:5000/swagger
# Keycloak:      http://localhost:8080
# Risk Analysis: http://localhost:8001
# Dozzle Logs:   http://localhost:8888
```
