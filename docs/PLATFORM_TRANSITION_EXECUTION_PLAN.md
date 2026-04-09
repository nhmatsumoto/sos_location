# Plano de Execucao da Transicao da Plataforma

> Objetivo: migrar o SOS Location para uma plataforma multiameaca orientada por dominio, com frontend Chakra UI + Vite + Bun, backend .NET com testes xUnit, e preservacao deliberada do conhecimento, algoritmos e tecnicas ja desenvolvidos.

## 1. Premissas de execucao

- a migracao nao sera um rewrite cego;
- o conhecimento atual de GIS, simulacao, ingestao de dados, renderer WebGL e regras operacionais sera reaproveitado;
- o frontend deixara de evoluir por acoplamento visual oportunista e passara a evoluir a partir de design system, shells e dominios;
- o backend continuara a ser o centro de orquestracao de dominio;
- testes de unidade e integracao do backend continuarao em `xUnit`;
- para o frontend, `xUnit` nao se aplica tecnicamente; o equivalente correto permanecera `Vitest + Testing Library`, com E2E depois;
- a migracao sera incremental, com gates de revisao ao fim de cada etapa.

## 2. Diagnostico revisado do estado atual

### 2.1 O que ja existe e deve ser preservado

- arquitetura .NET em camadas com `Domain`, `Application`, `Infrastructure` e `API`;
- suite de testes backend ja baseada em `xUnit`;
- integracoes GIS ja iniciadas para OSM, DEM, meteorologia e alertas;
- pipeline de simulacao e cena em `SimulationController`, `GisService`, `SceneDataService` e `CityBlueprintBuilder`;
- renderer WebGL proprio com camadas, shaders e pipeline de dados;
- manifesto de rotas e shell operacional ja iniciados no frontend;
- uso parcial de Chakra UI em componentes compartilhados e paginas;
- Vite como bundler principal;
- `bun.lock` e declaracao de `packageManager` ja presentes.

### 2.2 O que esta quebrado ou incoerente

- o frontend ainda mistura Chakra, Tailwind e CSS global de forma despadronizada;
- ha pelo menos `1265` ocorrencias de `className=` no frontend;
- a infraestrutura do frontend esta incoerente: o projeto declara Bun, mas `Dockerfile`, `Dockerfile.dev` e `Makefile` ainda usam `npm` e `node_modules/.bin`;
- a organizacao de paginas ainda carrega legado e duplicidade;
- o design visual nao representa o dominio com fidelidade suficiente;
- parte dos componentes de layout ainda usa cores hardcoded e classes utilitarias em vez de tokens semanticos;
- o frontend carece de uma camada unica de providers, design system e contratos visuais.

## 3. Estrategia de reutilizacao do conhecimento atual

### 3.1 Reaproveitar, nao descartar

Reaproveitar integralmente:

- provedores GIS e contratos de ingestao;
- modelos analiticos e fisicos descritos em `docs/ANALYTICAL_MODELS_AND_PHYSICS.md`;
- arquitetura de dominio e casos de uso do backend;
- manifesto de rotas e guardas de acesso ja tipados;
- pipeline WebGL, `CityBlueprintBuilder`, analyzers e shaders onde fizer sentido;
- stores, hooks e services que representem regras de negocio validas;
- testes backend existentes em `xUnit`, fortalecendo-os e reorganizando-os.

Reescrever ou consolidar:

- layout global, shells e navegacao do frontend;
- todos os componentes visuais acoplados a Tailwind ou CSS interno disperso;
- tema visual atual para um design system semantico baseado em Chakra UI;
- contratos de UI que ainda tratam o sistema como colecao de dashboards;
- infraestrutura de build/dev do frontend para Bun-first.

### 3.2 Regra de decisao

Cada modulo sera classificado antes da migracao:

- `preservar`: regra de negocio ou pipeline tecnico valido;
- `adaptar`: codigo util, mas com forma errada;
- `substituir`: legado visual, duplicado ou semanticamente fraco;
- `descontinuar`: nao representa mais o produto alvo.

## 4. Meta arquitetural

### 4.1 Backend alvo

- backend continua em .NET;
- contratos de simulacao passam a orbitar um nucleo multiameaca;
- contexts principais:
  - `Terrain Intelligence`
  - `Hydrology`
  - `Seismic and Oceanic Hazards`
  - `Simulation`
  - `Risk Assessment`
  - `Emergency Response`
- testes de unidade e integracao em `xUnit`, com `FluentAssertions` e `WebApplicationFactory`.

### 4.2 Frontend alvo

- `Vite` como bundler;
- `Bun` como package manager e runner oficial;
- `Chakra UI` como fundacao de UI e design system;
- `TypeScript strict` mantido e endurecido quando possivel;
- layout organizado por shells e dominios;
- remocao progressiva de Tailwind e CSS global nao essencial;
- tokens semanticos representando o sistema:
  - superficies operacionais
  - estado de alerta
  - severidade
  - risco
  - resposta
  - telemetria

## 5. Politica de testes

### 5.1 Backend

Obrigatorio em todas as etapas de backend:

- testes de unidade em `xUnit`;
- testes de integracao em `xUnit`;
- testes para services de dominio, handlers, mapeadores, providers e controllers;
- cobertura minima por area migrada antes de merge.

### 5.2 Frontend

Como o frontend e TypeScript/React, o equivalente correto sera:

- testes de unidade em `Vitest`;
- testes de integracao de componentes em `Vitest + Testing Library`;
- testes de contrato de navegacao e providers;
- E2E posterior para fluxos criticos.

Regra de governanca:

- a exigencia de `xUnit` sera aplicada integralmente ao backend .NET;
- o frontend seguira stack de teste nativa do ecossistema React, sem forcar ferramentas incompativeis.

## 6. Etapas de execucao

## Etapa 0. Baseline, inventario e congelamento de contrato

### Objetivo

Criar uma base segura para migrar sem perder comportamento funcional.

### Entregas

- inventario de rotas, componentes, hooks, services e estilos;
- classificacao do codigo em `preservar`, `adaptar`, `substituir`, `descontinuar`;
- definicao oficial dos dominios de negocio;
- definicao dos shells do frontend;
- baseline de testes backend e frontend;
- checklist de build, lint e execucao local e em Docker.

### Gate de revisao

- backlog de migracao aprovado;
- nenhum modulo critico sem dono;
- roadmap e criterios de aceite por etapa publicados.

## Etapa 1. Fundacao do frontend Chakra-first e alinhamento Bun/Vite

### Objetivo

Criar a fundacao correta do frontend sem quebrar o sistema atual.

### Entregas

- camada unica de providers da aplicacao;
- design system semantico em Chakra UI;
- tema dividido por tokens, componentes, superficies e estados;
- utilitarios de teste do frontend centralizados;
- Dockerfiles e scripts alinhados a `Bun + Vite`;
- README do frontend atualizado para a stack real;
- coexistencia temporaria com Tailwind, mas proibindo novo acoplamento visual fora do design system.

### Regras

- nao remover Tailwind de uma vez;
- nenhum componente novo pode nascer em Tailwind;
- CSS global fica restrito a reset, Leaflet e casos realmente estruturais;
- layout compartilhado migra antes das paginas.

### Gate de revisao

- app compila;
- tema e providers centralizados;
- build do frontend em Docker funcional;
- scripts Bun-first funcionando;
- smoke tests do frontend passando.

## Etapa 2. Layout systemico e shells por dominio

### Objetivo

Parar de tratar o frontend como uma soma de paginas independentes.

### Entregas

- `PublicShell`;
- `OperationsShell`;
- `AdminShell`;
- `SimulationShell` ou `IncidentCommandShell`, conforme consolidacao;
- navegacao, topbar, sidebar, notificacoes e loading states reescritos em Chakra;
- componentes base:
  - `PageHeader`
  - `Panel`
  - `MetricCard`
  - `StatusBadge`
  - `SectionStack`
  - `EmptyState`
  - `ErrorState`
  - `LoadingState`

### Gate de revisao

- nenhum shell compartilhado dependente de Tailwind;
- navegacao principal padronizada;
- acessibilidade basica verificada;
- estados vazios, erro e loading unificados.

## Etapa 3. Migracao por dominio do frontend

### Ordem recomendada

1. `layouts` e navegacao
2. `auth` e `public`
3. `operations overview`
4. `incidents` e `resources`
5. `simulations`
6. `analytics`
7. `admin`

### Para cada dominio

- mover pagina para shell correto;
- substituir componentes visuais por Chakra;
- extrair container/page state de componentes de apresentacao;
- normalizar DTOs e estados;
- remover CSS local e classes utilitarias;
- criar testes de componente e integracao do dominio.

### Gate de revisao por dominio

- sem `className` novo;
- sem estilos inline arbitrarios;
- design tokens corretos;
- testes do dominio cobrindo renderizacao, interacoes e estados de falha;
- aliases legados documentados ou removidos.

## Etapa 4. Consolidacao do nucleo multiameaca no backend

### Objetivo

Transformar o backend em uma plataforma de simulacao reutilizavel por ameaca.

### Entregas

- contratos de dominio para:
  - `HazardEvent`
  - `TerrainState`
  - `WaterState`
  - `SimulationScenario`
  - `SimulationRun`
  - `ImpactAssessment`
  - `ResponsePlan`
- separacao de engines por ameaca com contrato comum;
- reorganizacao dos services GIS e de simulacao;
- persistencia e cache compatíveis com cenarios e runs;
- xUnit cobrindo services, handlers e APIs.

### Gate de revisao

- contrato unico de simulacao aceito;
- cenarios flood, dam-break e tsunami compartilhando base comum;
- testes de integracao backend aprovados;
- nenhum comportamento critico sem cobertura minima.

## Etapa 5. Integracao frontend-backend e experiencia operacional

### Objetivo

Unir a nova UI ao nucleo multiameaca sem perder a capacidade operacional.

### Entregas

- visualizacao de cenarios com linguagem operacional;
- timeline de eventos;
- zonas de impacto, tempo de chegada, profundidade e confianca expostos como entidades de primeira classe;
- painéis de resposta com recomendacao acionavel;
- fluxo de simulacao explicavel para coordenacao e campo.

### Gate de revisao

- operadores conseguem montar, executar e interpretar cenarios;
- outputs de simulacao batem com contratos da API;
- linguagem da interface corresponde ao dominio real.

## Etapa 6. Remocao de legado e hardening

### Objetivo

Encerrar a transicao sem deixar duas arquiteturas convivendo indefinidamente.

### Entregas

- remocao de Tailwind e plugin correspondente quando a migracao visual estiver concluida;
- remocao de CSS global nao essencial;
- remocao de paginas duplicadas e aliases expirados;
- limpeza de hooks e services obsoletos;
- atualizacao de documentacao, Docker, Makefile e CI.

### Gate de revisao

- frontend sem dependencia funcional de Tailwind;
- CI coerente com Bun e testes;
- docs atualizados;
- build, lint, testes e deploy reproduziveis.

## 7. Sequencia de cortes tecnicos recomendada

1. fundacao Chakra + providers + Bun-first
2. layout shell comum
3. navegacao e estados compartilhados
4. componentes base de feedback e dados
5. migracao das paginas operacionais prioritarias
6. consolidacao do dominio de simulacao
7. limpeza de legado

## 8. Criterios de aceite por merge request

- build local e Docker funcionando;
- nenhuma regressao em rotas criticas;
- testes novos cobrindo o comportamento alterado;
- frontend novo usando design system, nao utilitarios soltos;
- backend novo com testes `xUnit`;
- documentacao atualizada quando houver mudanca de contrato ou arquitetura.

## 9. Execucao imediata

As proximas entregas devem seguir esta ordem:

1. registrar a fundacao da migracao no codigo;
2. centralizar providers e design system do frontend;
3. alinhar Dockerfiles e scripts do frontend para Bun-first;
4. validar build, lint e testes;
5. iniciar a migracao dos shells compartilhados.
