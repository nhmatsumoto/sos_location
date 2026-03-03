# Auditoria completa do status atual do projeto (backend + frontend + infra)

## 1) Stack identificada
- **Backend:** Django (apps modulares em `apps/api`, `apps/map`, `apps/rescue_ops`).
- **Frontend web:** React + TypeScript + Vite (`frontend-react`).
- **Mobile captura:** Flutter (`flutter_capture_app`).
- **Banco principal:** PostgreSQL (Docker Compose).
- **Infra local:** Docker Compose com serviços `frontend`, `backend`, `postgres`, `risk-agent`.

---

## 2) O que foi ajustado nesta rodada

### 2.1 Containers Docker com nomes mais descritivos
Foram renomeados os `container_name` para melhorar legibilidade operacional:
- `mg-location-postgres` -> `mg-location-db-postgres`
- `mg-location-backend` -> `mg-location-api-backend`
- `mg-location-risk-agent` -> `mg-location-ml-risk-agent`
- `simulador-mg-location` -> `mg-location-web-frontend`

Também foi aplicado baseline de segurança e tuning no PostgreSQL:
- `POSTGRES_INITDB_ARGS` com autenticação SCRAM.
- parâmetros de runtime para conexões/memória/timeouts.

### 2.2 Banco de dados: performance e segurança (app + DB)
**No Compose/Postgres**
- `max_connections`, `shared_buffers`, `work_mem`, `maintenance_work_mem`, `effective_cache_size`.
- `statement_timeout` e `idle_in_transaction_session_timeout`.

**No Django (`core/settings.py`)**
- `CONN_MAX_AGE` aumentado e configurável.
- `CONN_HEALTH_CHECKS` habilitável por env.
- `connect_timeout`.
- `application_name` para rastreabilidade no Postgres.
- `options` com `statement_timeout`, `lock_timeout` e `idle_in_transaction_session_timeout` por env.
- `ALLOWED_HOSTS` padrão endurecido (`localhost,127.0.0.1`) ao invés de `*`.

### 2.3 Baseline de ambiente
- `.env.example` atualizado com variáveis de DB para pool/timeout/segurança.

---

## 3) Varredura de mocks/hardcoded no diretório raiz (com foco em produção)

### 3.1 Backend (produção)
**Arquivos com dados fallback/seed/mock ainda ativos:**
- `apps/api/views.py`
  - seed inicial de collapse report (`INITIAL_UBA_COLLAPSE_SEED`, `_seed_initial_collapse_report`).
  - `ATTENTION_ALERTS` em memória para fallback quando banco vazio.
  - fallback local de contexto de terreno (`OPEN_TERRAIN_FALLBACK`).

### 3.2 Frontend (produção)
- `frontend-react/src/mocks/dashboard.ts`
  - ainda existe com datasets mockados (hotspots, missing persons, reports, layers).
  - após mudanças anteriores, parte importante já não depende deste arquivo para Command Center/Data Hub, mas o arquivo permanece no repositório.
- `frontend-react/src/LandslideSimulation.tsx`
  - mantém geração de malha local fallback para terreno 3D quando integração não responde.

### 3.3 Mobile/Flutter
- `flutter_capture_app/lib/main.dart`
  - token mockado (`mock-fcm-token`) no payload de registro push.

### 3.4 Testes
- Ocorrências de `unittest.mock` em suíte de testes são **esperadas** e não representam risco de produção.

---

## 4) O que ainda falta alterar (plano de execução recomendado)

### Prioridade P0 (produção)
1. **Remover seed automático em import-time** (`_seed_initial_collapse_report`) e mover para:
   - migration de dados opcional, ou
   - comando management (`seed_demo_data`) protegido por env (`ENABLE_DEMO_SEED=true`).
2. **Eliminar fallback de alertas em memória** (`ATTENTION_ALERTS`) e usar somente persistência (`AttentionAlert`) + job de ingestão.
3. **Revisar defaults sensíveis em Compose**:
   - secret e credenciais padrão apenas para dev local, com validação para produção.

### Prioridade P1 (qualidade e segurança)
4. **Criar índice e constraints adicionais** conforme consultas mais usadas (ex.: `MapAnnotation` por `record_type`, `severity`, `status`, `created_at` composto conforme cardinalidade real).
5. **Padronizar variáveis de ambiente** (`DB_SSLMODE`, timeouts, lock timeout) com documentação de perfil dev/staging/prod.
6. **Adicionar healthcheck de banco no backend app startup** com retries e observabilidade de latência de query.

### Prioridade P2 (cleanup técnico)
7. **Arquivar/remover `frontend-react/src/mocks/dashboard.ts`** se não houver uso residual.
8. **Substituir `mock-fcm-token` no Flutter** por valor vindo de serviço real (FCM/APNs) e fluxo de capability check.
9. **Consolidar fallback strategy** em documento arquitetural: quando fallback é permitido, TTL e origem de verdade.

---

## 5) Risco residual atual
- Ainda existem pontos de fallback e seed em runtime no backend principal que podem mascarar indisponibilidade de integrações externas.
- Há artefatos mockados no frontend/mobile que devem ser removidos ou claramente isolados para `dev/demo`.

