---
name: frontend-ux-chakra
description: Use this skill when improving UX/UI in React frontend using Chakra UI, especially navigation clarity, operational dashboards, and accessible components for emergency workflows.
---

# Frontend UX Chakra

## Quando usar
- Pedidos para melhorar UX/UI.
- Necessidade de design system consistente em páginas operacionais.
- Refatorar telas com foco em rapidez de ação.

## Workflow
1. Mapear jornada principal (ex.: abrir ocorrência, acionar equipe, concluir).
2. Criar shell com navegação clara (dashboard, mapa, boletins).
3. Implementar componentes Chakra:
   - `Card` para KPI operacional.
   - `Input`/`Textarea`/`select` para captura rápida.
   - `Table` + `Badge` para status e prioridade.
4. Validar acessibilidade visual (contraste, estados e hierarquia).
5. Executar `npm run lint` e `npm run build`.

## Padrões
- Evitar telas super carregadas: separar contexto (KPI) de execução (CRUD).
- Botões de ação imediata sempre visíveis.
- Status semântico: aberto (vermelho), em ação (laranja), concluído (verde).
