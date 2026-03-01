---
name: rescue-ui-system
description: Use this skill when designing or refactoring emergency operations UI in React with a modern clean visual language, semantic rescue colors, and fast task-oriented navigation.
---

# Rescue UI System

## Quando usar
- Evolução de UX/UI para operação de resgate.
- Padronização visual em dashboard, mapa e fluxos de ação rápida.

## Princípios visuais
- Visual limpo com baixa carga cognitiva.
- Semântica de risco:
  - `critical`: vermelho (incidente crítico)
  - `active`: laranja (equipe em ação)
  - `stable`: verde (resolvido)
  - `info`: azul (contexto/mapa)
- Tipografia objetiva e hierarquia clara (KPI -> ação -> detalhe).

## Workflow
1. Definir jornada principal (abrir ocorrência, acionar equipe, concluir).
2. Garantir barra de navegação com atalhos rápidos.
3. Construir cards/KPIs com prioridade visual.
4. Padronizar tabela/lista com badges e ações em 1 clique.
5. Validar responsividade para operação em mobile de campo.
6. Rodar `npm run lint` e `npm run build`.

## DoD
- Operador consegue registrar e despachar ocorrência em poucos cliques.
- Status da operação é compreensível sem leitura extensa.
