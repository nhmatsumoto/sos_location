---
name: sos-location-orchestration
description: Use when translating SOS Location natural-language requests into a structured software-engineering plan, including domain language, specialist agents/skills, simulation flows, and AI refinement pipeline requirements.
---

# SOS Location Orchestration

## Quando usar
Use esta skill quando a demanda vier em linguagem natural e precisar virar plano técnico executável para o SS/SOS Location, especialmente em simulação de desastres, IA e painéis operacionais.

## Workflow padrão
1. Mapear contexto, objetivos e restrições do pedido em até 10 bullets objetivos.
2. Formalizar Linguagem Ubíqua (entidades, eventos, fluxos e invariantes).
3. Preencher Requirement Card em `references/requirement-card-template.md`.
4. Selecionar agentes + skills com `references/agent-skill-routing-matrix.md`.
5. Definir backlog executável por etapas (dados, backend, frontend, IA e operação).
6. Especificar observabilidade (logs, métricas, trilha de decisão e learning log).
7. Publicar riscos, mitigação, critérios de aceite e rollback.

## Especialização para Simulação de Desastres
Para pedidos com simulação 3D e IA:
- Modelar no mínimo os fluxos **Entrada → Simulação → Painel**.
- Registrar integrações externas com estratégia de fallback (ex.: NASA, OSM).
- Explicitar separação entre camada de domínio, aplicação e infraestrutura.
- Definir contrato de dados de treino contínuo e validação de campo antes/depois.
- Planejar pipeline incremental em AWS Step Functions com checkpoints auditáveis.

## Saída mínima obrigatória
- Requirement Card com escopo in/out.
- Plano de execução por etapas com dependências explícitas.
- Matriz agente-skill usada no roteamento.
- Checklist de validação com comandos reproduzíveis.
- Riscos, mitigação e estratégia de rollback.

## Template de prompt para Codex CLI
Quando o usuário pedir “adaptar para o Codex CLI”, reutilize `references/codex-cli-disaster-prompt.md` e personalize apenas:
- nome do projeto,
- fontes de dados,
- stack real do repositório,
- critérios de aceite mensuráveis.

## Guardrails
- Não implementar sem critérios de aceite verificáveis.
- Não acoplar IA de treino e inferência sem fronteiras explícitas.
- Não liberar fluxo crítico sem logs estruturados e correlação de eventos.
- Não fechar tarefa sem learning log reutilizável.
