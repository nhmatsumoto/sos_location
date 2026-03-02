# Arquitetura de Orquestração de Engenharia (DDD + Agentes + Skills)

## Objetivo
Transformar linguagem natural em requisitos de engenharia de software de alto nível, com rastreabilidade ponta a ponta, alinhamento ao DDD e aprendizado contínuo dos agentes.

## Stack atual (base para decisões)
- **Backend:** Django + Django REST Framework.
- **Banco de dados:** PostgreSQL 15.
- **Frontend:** React 19 + TypeScript + Vite + Chakra UI + Tailwind.
- **Agente de risco:** serviço Python dedicado (`risk-agent`).
- **Operação:** Docker Compose com serviços separados por responsabilidade.

## Princípios arquiteturais
1. **DDD como núcleo**
   - Toda demanda em linguagem natural deve ser mapeada para:
     - Contexto delimitado (Bounded Context)
     - Caso de uso (Application Service)
     - Regras de domínio (Entities/VOs/Domain Services)
     - Contratos de integração (APIs/eventos)
2. **Especificação antes de implementação**
   - Agentes só iniciam codificação após registrar:
     - objetivo de negócio,
     - critérios de aceite,
     - riscos técnicos,
     - estratégia de teste.
3. **Aprendizado contínuo explícito**
   - Cada execução relevante deve produzir ou atualizar um registro em `docs/agents/learning-log.md`.
4. **Observabilidade de fluxo**
   - Erros, incidentes e decisões arquiteturais viram insumos para melhoria de skills e playbooks.

## Pipeline canônico (Natural Language -> Engenharia)
1. **Ingestão da demanda (orquestrador)**
   - Entrada em linguagem natural.
   - Extração de intenção, domínio afetado, impacto esperado e urgência.
2. **Tradução para requisitos estruturados**
   - Saída mínima:
     - problema,
     - resultado esperado,
     - escopo in/out,
     - critérios de aceite,
     - restrições técnicas e de negócio.
3. **Fatiamento por especialistas**
   - Distribuição para agentes especialistas (backend/frontend/dados/ops/qualidade).
4. **Execução guiada por skills**
   - Cada agente aplica skills específicas com checklist objetivo.
5. **Validação técnica e funcional**
   - Testes, lint, validação de contrato e revisão de risco.
6. **Retroalimentação e atualização de conhecimento**
   - Atualização de aprendizado no log.
   - Se houver padrão recorrente, promover para skill/padrão oficial.

## Contrato mínimo de requisito estruturado
Use o template abaixo em toda nova demanda:

```md
# Requirement Card

## 1) Contexto de negócio
- Problema:
- Valor esperado:
- Stakeholders:

## 2) Contexto DDD
- Bounded Context principal:
- Subdomínio (core/supporting/generic):
- Agregados impactados:

## 3) Escopo
- In scope:
- Out of scope:

## 4) Regras e critérios de aceite
- Regras de domínio:
- Critérios de aceite (Given/When/Then):

## 5) Arquitetura e integrações
- APIs/serviços impactados:
- Contratos de entrada/saída:
- Riscos e trade-offs:

## 6) Plano de entrega
- Quebra por agente especialista:
- Estratégia de teste:
- Definição de pronto (DoD):
```

## Atualização automática dos agentes (governança)
Quando um agente concluir uma tarefa, ele deve:
1. Registrar lições aprendidas no `learning-log.md`.
2. Classificar o aprendizado:
   - bug recorrente,
   - melhoria arquitetural,
   - otimização de fluxo,
   - novo padrão de skill.
3. Propor ação:
   - atualizar skill existente,
   - criar novo agente,
   - ajustar checklist de validação.

## Catálogo inicial de novos agentes recomendados
1. **Requirements Translator Agent**
   - Converte linguagem natural em Requirement Cards orientados a DDD.
2. **DDD Consistency Agent**
   - Verifica aderência entre modelagem, regras de domínio e APIs.
3. **Skill Evolution Agent**
   - Identifica padrões em incidentes/bugs e propõe evolução de skills.
4. **Engineering Memory Agent**
   - Curadoria do `learning-log.md`, removendo duplicação e promovendo padrões estáveis.

## Métricas de eficácia
- Lead time da demanda até requisito estruturado.
- Taxa de retrabalho por requisito ambíguo.
- Defeitos em produção por bounded context.
- % de demandas com aprendizado registrado.
- % de aprendizados convertidos em melhoria de skill/processo.
