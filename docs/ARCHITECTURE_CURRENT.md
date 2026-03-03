# Arquitetura atual (baseline)

## Stack
- Backend: Django + Django REST Framework style (`APIView`/views functionais), SQLite/PostgreSQL configurável.
- Frontend: React 19 + TypeScript + Vite + Tailwind + Leaflet + Zustand.
- Auth atual: sessão Django + fluxo Google OAuth2 opcional; para MVP foi adicionado parsing de claims JWT Bearer (compatível com tokens Keycloak em modo pass-through).

## Entrypoints
- Backend: `manage.py`, `core/urls.py`, `apps/api/urls.py`.
- Frontend: `frontend-react/src/main.tsx`, `frontend-react/src/AppRoutes.tsx`.

## Como rodar local
- Backend: `pip install -r requirements.txt && python manage.py migrate && python manage.py runserver`.
- Frontend: `cd frontend-react && bun install && bun run dev`.

## Auth (estado atual)
- Endpoints de auth em `/api/auth/*` usando sessão.
- MVP novo adiciona utilitário de autorização por role/incident (`apps/api/authz.py`) com:
  - `AdminGlobal` (global)
  - roles por incidente no claim `incident_roles[incidentId]`.
