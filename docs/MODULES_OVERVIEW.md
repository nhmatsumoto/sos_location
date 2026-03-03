# Modules Overview (MVP)

## Apoio
Entidades: `Campaign`, `DonationMoney`, `Expense`.
Endpoints privados: campanhas/doações/despesas por incidente.
Endpoint público: `/api/public/incidents/{incidentId}/support/summary`.

## Resgate
Entidades: `SearchArea`, `Assignment`.
Endpoints privados: CRUD básico de áreas + criação/listagem de atribuições.
Endpoint público: `/api/public/incidents/{incidentId}/rescue/search-areas` (geometry + status).

## Transparência
Entidade: `PublicSnapshot`.
Endpoints públicos:
- `/api/public/incidents`
- `/api/public/incidents/{incidentId}/snapshot/latest`

## Cross-cutting
- `Incident` como raiz multi-incidente.
- `AuditLog` append-only para operações críticas.
