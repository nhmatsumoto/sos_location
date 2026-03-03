---
name: rescue-crud-ops
description: Use this skill when implementing or improving rescue-focused CRUD workflows for volunteers and emergency teams, including quick actions and status transitions.
---

# Rescue CRUD Ops

## Escopo
Operações de resgate com foco em ação imediata:
- Criar ocorrência
- Editar ocorrência
- Atualizar status
- Concluir e remover

## Workflow recomendado
1. Definir entidade mínima: título, equipe, local, prioridade, status.
2. Implementar tela com:
   - Formulário lateral (criar/editar)
   - Lista/tabela operacional
   - Ações rápidas: acionar, concluir
3. Exibir métricas resumidas no topo (abertos, em ação, concluídos).
4. Preparar camada de persistência:
   - Inicial: estado local
   - Próximo passo: API REST completa

## Regras operacionais
- Todo item novo inicia como `aberto`.
- `em_acao` indica despacho ativo.
- `concluido` encerra a ocorrência e sai da fila de urgência.
