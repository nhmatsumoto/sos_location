# ADR 0005 — Fila de jobs durável no PostgreSQL

- **Status**: aceito (2026-07-16)

## Contexto
A importação é um processo de múltiplos estágios que não pode perder estado
com o restart de um worker. Redis/brokers dedicados seriam infraestrutura a
mais sem necessidade concreta no MVP.

## Decisão
- Tabela `import_jobs` é a fila. Reserva com
  `SELECT ... FOR UPDATE SKIP LOCKED` dentro de transação, marcando o job como
  `Running` com `worker_id` e tentativa.
- Estados: queued, running, completed, failed, cancelled, retrying
  (máximo de 3 tentativas; falha antes disso → retrying).
- Cada estágio grava progresso/mensagem no job (visível na UI a cada poll).
- Idempotência: reexecução cria nova revisão draft e limpa features residuais
  antes de inserir; revisões publicadas são imutáveis; unicidade
  `(city_revision_id, external_id)` garantida pelo banco.

## Consequências
- Zero estado em memória; N workers competem com segurança.
- Se surgir necessidade real de cache distribuído/notificações, Redis pode ser
  adicionado sem tocar o domínio.
