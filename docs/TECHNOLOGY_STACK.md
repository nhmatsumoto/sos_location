# Inventário de Tecnologias — SOS Location

Este documento consolida as tecnologias identificadas a partir da análise dos principais arquivos de configuração e código do repositório.

## 1. Frontend (`frontend-react`)

- Runtime/UI: React 19, React DOM 19, TypeScript 5
- Build tooling: Vite 7, ESLint 9
- UI/UX: Chakra UI, Emotion, Framer Motion, Lucide
- Forms & validation: React Hook Form, Zod
- State management: Zustand
- Maps/GIS (2D): Leaflet, React Leaflet, react-leaflet-cluster, Supercluster
- 3D/rendering: Three.js, @react-three/fiber, @react-three/drei
- i18n: i18next, react-i18next, i18next-browser-languagedetector
- Auth client: keycloak-js
- Data transport/helpers: Axios, @microsoft/signalr, @msgpack/msgpack, idb (IndexedDB)
- Runtime engines declared: Bun (>=1.2.14), Node (25.8.1)

## 2. Backend (`backend-dotnet`)

- Plataforma: ASP.NET Core Web API em .NET 10 (net10.0)
- Arquitetura: Clean Architecture, DDD, CQRS/MediatR
- Validação: FluentValidation
- Persistência:
  - EF Core 10 + Npgsql.EntityFrameworkCore.PostgreSQL
  - Dapper
  - PostgreSQL
- API docs: Swashbuckle (Swagger)
- Observabilidade: Serilog (Console/File)
- Autenticação/autorização: JWT Bearer + integração com Keycloak
- Tempo real: SignalR (frontend usa pacote correspondente)

## 3. Unidade de risco (`risk-analysis-unit`)

- API: FastAPI + Uvicorn
- Modelagem/análise: Pandas, Scikit-learn, PyTorch
- Suporte: Requests, APScheduler, python-dotenv

## 4. Infraestrutura e operação local

- Containerização/orquestração: Docker Compose
- Banco de dados: PostgreSQL 15 (imagem alpine)
- IAM/SSO: Keycloak 26
- Observabilidade de logs: Dozzle
- Backup: serviço dedicado de backup de banco (`infra/db-backup`)

## 5. Integrações externas

- OpenTopography (DEM)
- Overpass API / OpenStreetMap
- Open-Meteo
- INMET
- CEMADEN
- Defesa Civil
- IBGE

## 6. Agentes e habilidades (orquestração de engenharia)

- Agentes técnicos e orquestrador em `.workflow/agents` e `docs/agents`
- Skills de apoio em `.workflow/skills` e `agents/skills`

## 7. Fontes consultadas para este inventário

- `docker-compose.yml`
- `frontend-react/package.json`
- `backend-dotnet/SOSLocation.API/SOSLocation.API.csproj`
- `backend-dotnet/SOSLocation.Application/SOSLocation.Application.csproj`
- `backend-dotnet/SOSLocation.Infrastructure/SOSLocation.Infrastructure.csproj`
- `risk-analysis-unit/requirements.txt`
