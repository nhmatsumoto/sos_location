# API Endpoint Map

This document organizes the backend into specialized modules and validates frontend coverage.

## Operations & Disaster Module

| Endpoint | Method(s) | Description | Frontend Consumer |
|---|---|---|---|
| `/api/disasters/events` | GET | List disaster events | ✅ `disastersApi.ts` |
| `/api/operations/snapshot` | GET | Operational KPIs and layers | ✅ `operationsApi.ts` |
| `/api/health` | GET | System health & status | ✅ `apiClient.ts` |
| `/api/events` | GET | Event log / Sync | ✅ `eventsApi.ts` |
| `/api/v1/news` | GET | List operative news | ✅ `newsApi.ts` |
| `/api/v1/attention-alerts` | GET | Real-time critical alerts | ✅ `integrationsApi.ts` |
| `/api/v1/simulations/catalog` | GET | Catálogo de modelos de simulação multi-risco | ✅ Risk Analysis Unit |
| `/api/v1/simulations/run` | POST | Executa cenário de simulação multi-risco | ✅ Risk Analysis Unit |

## Specialized Search & Public Access

| Endpoint | Method(s) | Description | Frontend Consumer |
|---|---|---|---|
| `/api/public/incidents` | GET | List public incidents | ✅ `PublicController.cs` |
| `/api/missing-persons` | GET/POST | Missing persons registry | ✅ `missingPersonsApi.ts` |
| `/api/incidents` | GET/POST | Incident management | ✅ `incidentsApi.ts` |

## Compatibility
- The frontend uses `apiClient.ts` with standardized base URL configuration.
- .NET 10 controllers provide consistent JSON responses with Success/Failure patterns.
- CORS is configured to `AllowAnyOrigin` in `Program.cs` for tactical flexibility.
