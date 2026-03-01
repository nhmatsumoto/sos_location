# Operation V2 Orchestrator

## Objetivo
Orquestrar a evolução da plataforma para uma operação de resgate moderna, limpa e orientada a execução rápida em campo.

## Agentes especialistas
1. **Rescue UI Agent**
   - Responsável por design moderno/limpo e semântica visual de emergência.
   - Define tokens de cor para prioridade e status (alto risco, em ação, concluído).

2. **Map Interaction Agent**
   - Melhora leitura operacional no mapa: filtros, foco em hotspots e pontos de apoio.
   - Mantém navegação fluida entre painel tático e mapa.

3. **Django Architecture Agent**
   - Estrutura módulos por contexto de domínio (ex.: rescue, alerts, volunteers).
   - Aplica SOLID, Clean Architecture, DDD e padrões de projeto.

4. **PostgreSQL Reliability Agent**
   - Evolui modelagem e estratégia de persistência para PostgreSQL.
   - Define índices, constraints e consultas para cenários de alta urgência.

5. **Observability & Incident Agent**
   - Define logs estruturados, auditoria de ações e trilha de decisão operacional.
   - Apoia diagnóstico rápido de falhas e bugfix contínuo.

## Roadmap técnico recomendado
- Curto prazo: UX visual semântica + CRUD operacional persistido.
- Médio prazo: backend modular por bounded contexts + casos de uso explícitos.
- Longo prazo: observabilidade, auditoria de ação e engine de priorização.
