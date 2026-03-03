---
name: mg-location-orchestration
description: Use when translating MG Location natural-language requests into structured requirement cards, specialist-agent execution plans, and validation checklists across React, Django, integrations, and Keycloak.
---

# MG Location Orchestration

## Quando usar
Use esta skill quando a demanda vier em linguagem natural e precisar virar plano técnico executável no contexto MG Location.

## Workflow padrão
1. Mapear a solicitação para domínios: `frontend`, `backend`, `iam`, `integrations`, `observability`.
2. Preencher Requirement Card usando o template em `references/requirement-card-template.md`.
3. Delegar o trabalho para especialistas por domínio e definir ordem de execução.
4. Criar checklist de validação com comandos objetivos.
5. Registrar decisão e trade-off no learning log.

## Matriz de especialistas
- **Frontend Modernization Agent:** React/TypeScript, componentes, UX operacional.
- **Django Domain Agent:** APIs, modelagem, regras de domínio e testes.
- **Keycloak IAM Agent:** SSO, roles/scopes, proteção de endpoints.
- **Disaster Integrations Agent:** providers, normalização e resiliência.
- **Observability & Incident Agent:** logs estruturados, auditoria e incident response.

## Saída mínima obrigatória
- Requirement Card com escopo **in/out**.
- Plano por etapas com dependências explícitas.
- Checklist de validação (comandos reproduzíveis).
- Riscos, mitigação e estratégia de rollback.

## Guardrails
- Não implementar sem critérios de aceite verificáveis.
- Não liberar endpoint crítico sem autenticação/autorização testada.
- Não publicar fluxo novo sem observabilidade mínima (logs + erro explícito).
- Não fechar tarefa sem registrar aprendizado reutilizável.
