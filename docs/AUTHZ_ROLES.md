# RBAC por incidente

## Roles
- Global: `AdminGlobal`
- Por incidente: `IncidentAdmin`, `OpsCoordinator`, `SupportManager`, `Volunteer`, `Auditor`

## Regras (MVP)
- `/api/incidents` GET: autenticado.
- `/api/incidents` POST: `AdminGlobal`.
- Apoio (`/api/incidents/{id}/support/*`): `SupportManager` ou `IncidentAdmin`.
- Resgate (`/api/incidents/{id}/rescue/*`): `OpsCoordinator` ou `IncidentAdmin`.
- Públicos (`/api/public/*`): sem autenticação.
