# Implementation Report

## Implementado
- Núcleo multi-incidente (`Incident`) + seleção no frontend.
- RBAC por claims JWT (global + por incidente).
- Auditoria append-only (`AuditLog`) em operações críticas.
- Módulo Apoio (campanhas, doações monetárias, despesas + summary público).
- Módulo Resgate (search areas, assignments, status + camada pública no mapa).
- Transparência pública com `PublicSnapshot` e dashboard React com polling de 30s.

## Endpoints criados
- Privados: `/api/incidents`, `/api/incidents/{id}`, `/api/incidents/{id}/support/*`, `/api/incidents/{id}/rescue/*`.
- Públicos: `/api/public/incidents`, `/api/public/incidents/{id}/snapshot/latest`, `/api/public/incidents/{id}/support/summary`, `/api/public/incidents/{id}/rescue/search-areas`.

## Como rodar/testar
- Backend: `python manage.py migrate`, `python manage.py test apps.api.tests.test_modules_mvp`.
- Frontend: `cd frontend-react && bun run build`.

## Pendências V1
- Estoque/logística avançada
- Missões completas e telemetria de equipes
- Conteúdo/notícias e comunicações públicas mais ricas
