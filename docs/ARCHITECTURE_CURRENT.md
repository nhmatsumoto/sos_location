# Architecture SOS Location (v2.3)

## Stack
- **Backend**: ASP.NET Core 10 (C#), EF Core, Npgsql, PostgreSQL.
- **Frontend**: React 19 + TypeScript + Vite + Tailwind + **@react-three/fiber** (Three.js) + Zustand.
- **Rendering**: **Mixed Map System** (2D Tactical Leaflet + 3D Minecraft-style Center).
- **Docs**: Sphinx + MyST + MathJax com suporte a AsciiMath em `[= ... =]`.

## Entrypoints
- **Backend**: `SOSLocation.API/Program.cs`, `Controllers/*.cs`.
- **Frontend**: `frontend-react/src/main.tsx`.
- **Painel operacional atual**: `SOSPage.tsx`.
- **Mapa operacional**: `OperationalMapPage.tsx`.
- **Simulação e overlays 3D**: `SimulationsPage.tsx` + `CityScaleWebGL.tsx`.

## Routing & Access Control
The application starts at `http://localhost:8088/` and today is divided into:

- **Public Domain**: `/`, `/docs`, `/transparency`, `/login`
- **Private Domain**: `/app/*`

Current protected routes:

- `/app/sos`
- `/app/operational-map`
- `/app/rescue-ops`
- `/app/hotspots`
- `/app/missing-persons`
- `/app/reports`
- `/app/searched-areas`
- `/app/rescue-support`
- `/app/incidents`
- `/app/simulations`
- `/app/data-hub`
- `/app/integrations`
- `/app/global-disasters`
- `/app/volunteer`
- `/app/logistics`
- `/app/risk-assessment`
- `/app/support`
- `/app/settings`

Current admin-only routes:

- `/app/tactical-approval`
- `/app/admin/sources`

The route model is functional but overloaded. The target redesign is documented in [FRONTEND_TOTAL_REFACTOR_PLAN.md](/home/nhmatsumoto/sos_location/docs/FRONTEND_TOTAL_REFACTOR_PLAN.md).

## Dynamic Rendering Strategy
The current rendering strategy mixes:

- Leaflet for public and tactical map interactions;
- custom WebGL pipelines for terrain, slope, semantics and disaster overlays;
- selected Three/R3F integration for 3D capabilities still present in the repository.

Terrain and engineering layers are built from preprocessed scene data, including DEM, slope and semantic segmentation.

## Auth & Security
- **Identity**: Keycloak (OIDC) for centralized identity management.
- **Authorization**: Role-based access control (RBAC) via JWT claims.
- **State**: Zustand with persisted auth session in the current tab.
- **Resilience**: offline-oriented browser capabilities remain partial, not full offline-first.
