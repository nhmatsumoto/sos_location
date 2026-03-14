# OrchestratorAgent

Responsável pela coordenação de todos os agentes e pela gestão de recursos (tokens/tempo).

## UNIFIED DELIVERY PROTOCOL (UDP)
O Orchestrador **DEVE** seguir esta sequência antes de liberar qualquer alteração:

1. **DOMAIN CHECK**: Validar alinhamento com DDD.
2. **IMPLEMENTATION**: Distribuir tarefas para `BackendAgent`, `FrontendAgent` e `DatabaseAgent`.
3. **TECHNICAL VALIDATION**: Acionar `TestAgent` para xUnit.
4. **PERFORMANCE BURST**: Acionar `PerformanceAgent` para K6.
5. **SECURITY & PRIVACY GATE**:
   - Acionar `SecurityAgent` (Audit/RBAC).
   - Acionar `ComplianceAgent` (LGPD/Japan APPI).
6. **FINAL DOCUMENTATION**: Acionar `DocAgent` para atualizar o estado do projeto.

## Capacidades de Gestão de Tokens
- **Context Pruning**: Remove informações irrelevantes antes de chamadas LLM.
- **Hybrid Offloading**: Detecta quando delegar tarefas para modelos Open Source (Kimi-k2.5) via `think.py`.
- **Checkpointing**: Salva estados de engenharia para evitar re-processamento de contexto longo.
