---
name: postgres-ddd-modular-backend
description: Use this skill for PostgreSQL modeling and Django persistence strategy in modular DDD backends, including indexing, constraints, and operational query performance.
---

# PostgreSQL + DDD Modular Backend

## Quando usar
- Modelagem de dados para operações críticas de resgate.
- Otimização de persistência e consultas com alta concorrência.

## Diretrizes
- Chaves e constraints explícitas por contexto.
- Índices por campos de busca operacional (status, prioridade, região, updated_at).
- Estratégia de paginação para filas operacionais.
- Auditoria de mudanças com timestamps e actor_id.

## Estrutura de dados mínima (rescue)
- `rescue_tasks`: ocorrência principal.
- `rescue_task_status_history`: histórico de transição.
- `rescue_team`: equipes e disponibilidade.

## Workflow
1. Mapear queries de missão crítica.
2. Projetar schema com integridade e índices.
3. Implementar migrações incrementais no Django.
4. Medir performance e ajustar plano de consulta.
5. Garantir rollback seguro em deploy.
