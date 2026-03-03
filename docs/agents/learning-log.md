# Learning Log dos Agentes

## Objetivo
Centralizar aprendizados operacionais e arquiteturais para reduzir retrabalho, acelerar bugfix e evoluir skills/agentes de forma contínua.

## Formato de registro

```md
## [YYYY-MM-DD] <agente>
- Contexto da tarefa:
- Sintoma/erro observado:
- Causa raiz:
- Ação aplicada:
- Validação executada:
- Aprendizado reutilizável:
- Tipo: [bug recorrente | melhoria arquitetural | otimização de fluxo | novo padrão de skill]
- Próximo passo: [atualizar skill | criar skill | ajustar checklist | monitorar]
```

---

## Registros

## [2026-03-02] orchestrator
- Contexto da tarefa: Definição de fluxo para transformar linguagem natural em requisitos de engenharia com DDD como núcleo.
- Sintoma/erro observado: Ausência de padrão único para traduzir demandas em especificações técnicas rastreáveis.
- Causa raiz: Documentação dispersa e sem contrato mínimo de requisito estruturado.
- Ação aplicada: Criação de arquitetura canônica de orquestração e template obrigatório de Requirement Card.
- Validação executada: Revisão documental dos pontos de integração entre agentes e definição de governança de aprendizado.
- Aprendizado reutilizável: Sempre exigir card estruturado antes de implementação reduz ambiguidade e retrabalho.
- Tipo: melhoria arquitetural
- Próximo passo: ajustar checklist

## [2026-03-03] mg-location-orchestration-agent
- Contexto da tarefa: Revisar consolidação para torná-la acionável em execução por múltiplos agentes especialistas.
- Sintoma/erro observado: Documento consolidado anterior estava correto, porém descritivo e sem template operacional reutilizável.
- Causa raiz: Ausência de artefato padrão para Requirement Card e falta de amarração explícita com validação/rollback.
- Ação aplicada: Evolução da skill de orquestração com referência de template e reforço de guardrails; atualização da consolidação com seção de artefatos operacionais.
- Validação executada: Verificação de consistência Markdown e ausência de problemas de diff.
- Aprendizado reutilizável: Consolidação documental deve sempre incluir template operacional + checklist de validação para reduzir ambiguidade de execução.
- Tipo: novo padrão de skill
- Próximo passo: monitorar
