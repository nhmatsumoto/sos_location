# Plano de Melhoria e Implementação Faseada — SOS Location

## 1. Objetivo

Este documento transforma o diagnóstico atual do projeto em um plano executável, priorizado e validável.
O foco é reduzir risco operacional, estabilizar a base de engenharia e abrir espaço para evolução funcional sem ampliar a dívida técnica existente.

## 2. Evidências objetivas do estado atual

### 2.1 Frontend

- O type-check do frontend falha com erros estruturais em tipagem, contratos quebrados e imports inválidos.
- O lint do frontend reporta **365 problemas** (`347` erros e `18` warnings), com forte concentração em:
  - `@typescript-eslint/no-explicit-any`
  - `@typescript-eslint/no-unused-vars`
  - `react-hooks/exhaustive-deps`
  - `react-hooks/purity`
- Há erros que indicam regressões funcionais, não apenas estilo:
  - `soilSaturaion` em vez de `soilSaturation`
  - import inexistente de `setProjectionReference`
  - tipos desalinhados em `SimulationsPage.tsx`
  - propriedades ausentes no contrato usado por `CityScaleWebGL.tsx`

### 2.2 Backend

- O backend possui testes, mas a execução local não está operacional no ambiente atual por restrições do `dotnet/MSBuild` no sandbox.
- A API mantém pontos de risco de segurança e operação:
  - `ValidateAudience = false`
  - `context.Database.Migrate()` executado no boot sem governança por ambiente
  - `AllowedOrigins` inclui `"*"` em configuração que também usa credenciais

### 2.3 Infraestrutura e configuração

- O repositório não possui `.github/workflows`, então não existe CI versionado.
- O `docker-compose.yml` expõe um token padrão de NASA Earthdata diretamente no arquivo.
- O frontend está configurado para Bun no `package.json`, mas os scripts principais dependiam explicitamente de `bun`, reduzindo portabilidade.

### 2.4 Testes

- `risk-analysis-unit/tests` existe, mas o ambiente atual não possui `pytest` instalado.
- O backend tem projeto de testes dedicado, mas falta uma trilha de execução padronizada e reproduzível.

## 3. Princípios de execução

1. Estabilizar antes de expandir feature.
2. Corrigir riscos transversais antes de refatorações profundas.
3. Cada fase precisa terminar com critérios de aceite objetivos.
4. Nenhuma fase deve aumentar o acoplamento entre UI, domínio e integração externa.
5. Segurança, observabilidade e automação entram como requisitos de base, não como pós-trabalho.

## 4. Fases de implementação

## Fase 0 — Contenção de risco e ergonomia mínima

### Objetivo

Eliminar fragilidades imediatas de configuração e tornar o repositório menos dependente de comportamento implícito do ambiente.

### Melhorias

#### M0.1 Segredos e configuração sensível

- **Problema:** `docker-compose.yml` contém fallback com token Earthdata inline.
- **Impacto:** vazamento de segredo, rotação difícil, risco de uso indevido de credencial.
- **Implementação:**
  1. Remover qualquer valor real embutido em `docker-compose.yml`.
  2. Declarar placeholders em `.env.example`.
  3. Garantir que provedores externos suportem ausência explícita da variável.
- **Critério de aceite:** nenhum segredo real permanece hardcoded no compose versionado.
- **Validação:** busca por `EarthdataToken=` e inspeção manual do compose.

#### M0.2 Portabilidade de scripts do frontend

- **Problema:** scripts principais dependem explicitamente de `bun`.
- **Impacto:** build local inconsistente, onboarding mais frágil, menor compatibilidade com CI.
- **Implementação:**
  1. Tornar `type-check`, `build` e `lint` independentes do gerenciador de pacotes.
  2. Preservar compatibilidade com Bun e npm.
- **Critério de aceite:** scripts podem ser executados via npm ou bun.
- **Validação:** leitura de `package.json` e execução local via binários do projeto.

#### M0.3 Governança de autenticação e startup

- **Problema:** validação de audiência está desligada e migração de banco ocorre sempre no boot.
- **Impacto:** risco de aceitar tokens indevidos e de acoplar deploy à mutação automática de banco.
- **Implementação:**
  1. Tornar `ValidateAudience` configurável com default seguro.
  2. Tornar `ApplyMigrationsOnStartup` e `SeedOnStartup` configuráveis.
  3. Remover wildcard inválido de CORS.
- **Critério de aceite:** segurança e bootstrap passam a depender de configuração explícita.
- **Validação:** inspeção de `Program.cs` e `appsettings.json`.

#### M0.4 Correções pequenas de contrato quebrado

- **Problema:** há utilitários referenciados no frontend que não existem mais.
- **Impacto:** type-check falha por regressão evitável.
- **Implementação:**
  1. Restaurar utilitários simples necessários para compatibilidade.
  2. Corrigir typos de contrato de dados de baixo risco.
- **Critério de aceite:** erros triviais deixam de bloquear checks.
- **Validação:** novo type-check com redução observável de erros.

## Fase 1 — Recuperação de qualidade do frontend

### Objetivo

Reduzir o frontend de um estado de erro sistêmico para um baseline compilável e rastreável.

### Melhorias

#### M1.1 Fechamento de contratos TypeScript

- Corrigir imports quebrados, tipos faltantes e propriedades divergentes.
- Prioridade para:
  - `src/store/cityStore.ts`
  - `src/components/features/map/SnapshotVolume.tsx`
  - `src/components/ui/CityScaleWebGL.tsx`
  - `src/pages/SimulationsPage.tsx`

#### M1.2 Redução de `any` por domínio

- Separar por áreas:
  - APIs REST
  - stores Zustand
  - páginas CRUD
  - componentes táticos de mapa
- Não tentar zerar tudo de uma vez.
- Começar por serviços e DTOs compartilhados.

#### M1.3 Higiene React 19

- Resolver chamadas impuras em render.
- Corrigir efeitos com dependências faltantes.
- Isolar lógica derivada em hooks estáveis.

### Critérios de aceite da Fase 1

- `tsc -b` executa sem erro.
- `eslint .` cai para um volume residual controlado e classificado.
- Componentes centrais de mapa e simulação preservam comportamento atual.

## Fase 2 — Testabilidade e CI

### Objetivo

Criar um pipeline automático mínimo para impedir regressões silenciosas.

### Melhorias

#### M2.1 CI versionado

- Criar workflow com jobs independentes:
  - frontend type-check
  - frontend lint
  - backend restore/build/test
  - smoke test da unidade Python

#### M2.2 Convenção de comandos locais

- Padronizar targets:
  - `make frontend-typecheck`
  - `make frontend-lint`
  - `make backend-test`
  - `make checks`

#### M2.3 Revisão do inventário de testes

- Remover placeholders como `UnitTest1.cs`.
- Classificar testes por:
  - unitários
  - integração
  - contratos

### Critérios de aceite da Fase 2

- Pull request novo aciona CI automaticamente.
- Falhas de build/test bloqueiam merge.
- Todo comando local crítico possui equivalente no CI.

## Fase 3 — Segurança, configuração e operação

### Objetivo

Subir o projeto para um padrão minimamente defensável para ambiente compartilhado.

### Melhorias

#### M3.1 Hardening de autenticação e CORS

- Validar audience por padrão.
- Revisar allowed origins por ambiente.
- Garantir coerência entre frontend Keycloak e backend JWT.

#### M3.2 Estratégia de migração e seed

- Separar:
  - migração automática para dev
  - migração controlada para homolog/prod
  - seed de demonstração apenas onde for seguro

#### M3.3 Baseline de segredos

- Consolidar fontes sensíveis em `.env` e secret store do ambiente.
- Proibir segredo em compose, docs e exemplos versionados.

#### M3.4 Segurança contínua

- Adicionar SAST, secret scanning e dependency audit no CI.

### Critérios de aceite da Fase 3

- Nenhum segredo real no repositório.
- Ambientes não-dev podem subir sem migração implícita.
- Configuração auth/CORS é explícita e reproduzível.

## Fase 4 — Refatoração estrutural do frontend tático

### Objetivo

Conter a complexidade do núcleo geoespacial e de simulação.

### Melhorias

#### M4.1 Quebra de componentes gigantes

- Prioridade máxima para:
  - `src/components/ui/CityScaleWebGL.tsx`
  - `src/pages/SimulationsPage.tsx`
  - `src/pages/SOSPage.tsx`

#### M4.2 Separação entre visualização, estado e cálculo

- Extrair:
  - adaptadores de dados
  - hooks de coordenação
  - contratos de simulação
  - renderização WebGL

#### M4.3 Normalização de DTOs

- Centralizar tipos usados por API, store e renderização.

### Critérios de aceite da Fase 4

- Nenhum componente central concentra responsabilidade de página, dados e engine ao mesmo tempo.
- Regressões ficam cobertas por testes de hook/serviço.

## Fase 5 — Observabilidade e confiabilidade operacional

### Objetivo

Passar de software funcional para software operável.

### Melhorias

#### M5.1 Telemetria

- Definir spans e logs para:
  - ingestão GIS
  - chamadas externas
  - simulações
  - falhas de autenticação

#### M5.2 Healthchecks e readiness reais

- Separar health de processo, dependência e prontidão.

#### M5.3 Catálogo de incidentes operacionais

- Criar playbooks curtos para:
  - falha de provedor externo
  - falha de seed/migration
  - falha de autenticação
  - lentidão do mapa tático

### Critérios de aceite da Fase 5

- Logs e healthchecks permitem diagnóstico sem inspeção manual de código.
- Dependências críticas possuem fallback ou falha explícita.

## 5. Ordem recomendada de execução

1. Fase 0
2. Fase 1
3. Fase 2
4. Fase 3
5. Fase 4
6. Fase 5

## 6. Estratégia de implementação minuciosa

### Lote A — Correções transversais pequenas

- Segredos
- scripts
- flags de bootstrap
- compatibilidade de utilitários

### Lote B — Fechamento de erros do frontend por categoria

- contratos quebrados
- imports inválidos
- typos
- tipos compartilhados
- efeitos React

### Lote C — Automação

- make targets
- CI
- smoke tests

### Lote D — Refatoração estrutural

- decomposição de páginas/composição de hooks
- redução de acoplamento entre UI e engine

## 7. Comandos de validação por fase

### Fase 0

- `rg -n "EarthdataToken|NASA_EARTHDATA_TOKEN" docker-compose.yml .env.example`
- `sed -n '1,220p' frontend-react/package.json`
- `sed -n '1,260p' backend-dotnet/SOSLocation.API/Program.cs`

### Fase 1

- `cd frontend-react && ./node_modules/.bin/tsc -b --pretty false`
- `cd frontend-react && ./node_modules/.bin/eslint .`

### Fase 2

- `make checks`
- execução automática via GitHub Actions

### Fase 3+

- smoke de autenticação
- smoke de startup do backend
- verificação de healthchecks e logs

## 8. Riscos e mitigação

- **Risco:** tentar “zerar lint” antes de fechar contratos básicos.
  - **Mitigação:** priorizar type-check e erros com impacto funcional.
- **Risco:** quebrar ambiente local ao endurecer autenticação.
  - **Mitigação:** usar flags explícitas por ambiente.
- **Risco:** adicionar CI antes de estabilizar comandos locais.
  - **Mitigação:** padronizar Makefile e scripts primeiro.
- **Risco:** refatorar páginas grandes sem testes.
  - **Mitigação:** extrair por fatias e validar por hooks/serviços.

## 9. Definição de pronto

O projeto só pode ser considerado em trajetória saudável quando:

- frontend compila;
- lint está sob controle;
- backend testa de forma reproduzível;
- segredos não ficam em arquivos versionados;
- auth, CORS e migração são governados por ambiente;
- CI bloqueia regressões.
