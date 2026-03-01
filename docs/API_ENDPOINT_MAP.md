# API endpoint map (monólito modular)

Este documento organiza o backend em módulos especialistas REST dentro do monólito Django e valida a cobertura de consumo no frontend React.

## Módulo `apps.api` (simulação e inteligência de campo)

| Endpoint | Método(s) | Objetivo | Consumido no Frontend |
|---|---|---|---|
| `/api/hotspots` | GET | Lista hotspots prioritários | ✅ `App.tsx` |
| `/api/news-updates` | GET | Feed de notícias/alertas | ✅ `App.tsx` |
| `/api/attention-alerts` | GET/POST | Alertas georreferenciados | ✅ `App.tsx` |
| `/api/missing-persons` | GET/POST | Cadastro/lista de desaparecidos | ✅ `App.tsx` |
| `/api/collapse-reports` | GET/POST | Relatos com mídia de colapso | ✅ `App.tsx` |
| `/api/simulation/easy` | POST | Simulação simplificada | ✅ `App.tsx` |
| `/api/location/flow-simulation` | POST | Simulação por fluxo | ✅ `App.tsx` |
| `/api/splat/convert` | POST | Conversão para pipeline splat | ✅ `App.tsx` |
| `/api/climate/integrations` | GET | Enriquecimento climático | ✅ `App.tsx` |

## Novo módulo especialista `apps.rescue_ops` (operações táticas)

| Endpoint | Método(s) | Objetivo | Consumido no Frontend |
|---|---|---|---|
| `/api/rescue-tasks` | GET/POST | CRUD (list/create) de tarefas de resgate | ✅ `rescueTasksApi.ts` |
| `/api/rescue-tasks/<task_id>` | PUT/DELETE | CRUD (update/delete) de tarefa específica | ✅ `rescueTasksApi.ts` |

## Compatibilidade frontend x backend

- O frontend já chamava `/api/rescue-tasks` com fallback local em `localStorage`.
- Foi implementada API REST no backend para eliminar dependência exclusiva do fallback.
- O tipo `id` no frontend agora aceita `number | string` para compatibilidade entre respostas do backend (inteiro) e fallback local (UUID string).
