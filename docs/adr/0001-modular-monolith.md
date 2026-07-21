# ADR 0001 — Modular monolith em vez de microsserviços

- **Status**: aceito (2026-07-16)

## Contexto
A plataforma precisa de catálogo de dados, importação, processamento geoespacial,
tiles e inspeção. Microsserviços trariam custo operacional imediato sem benefício
no MVP.

## Decisão
Um único deployable por processo (`Api`, `Worker`) sobre camadas compartilhadas
(`Domain`, `Application`, `GeoProcessing`, `Infrastructure`). Módulos separados
por limites de domínio (catálogo, cidades, importação, tiles, inspeção) dentro
do monólito, com dependências verificadas por testes de arquitetura
(NetArchTest). A extração futura de um módulo vira mover um projeto, não
reescrever contratos.

## Consequências
- Menos infraestrutura; deploy com Docker Compose.
- A fila de jobs vive no PostgreSQL (ADR 0005), sem broker dedicado.
- Se o volume de importação crescer, o Worker já é um processo separado e
  escala horizontalmente (FOR UPDATE SKIP LOCKED garante exclusão mútua).
