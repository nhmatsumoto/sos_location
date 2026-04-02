# Prompt-base Codex CLI — Plataforma de Simulação de Desastres

## Contexto
Precisamos ampliar o SS Location para simular desastres em 3D com IA e painéis de resgate em tempo real.

## Linguagem Ubíqua
- **Evento de Desastre**: ocorrência simulada (ex.: tsunami, terremoto, inundação).
- **Cenário**: configuração topográfica, urbana e ambiental usada como base de simulação.
- **Painel de Resgate**: interface operacional para equipes com visão de impacto e prioridades.
- **Evidência de Campo**: dados coletados antes/depois para validar e recalibrar modelos.

## Objetivo Técnico
Traduzir requisitos em backlog executável com arquitetura desacoplada, tipagem forte e observabilidade ponta a ponta.

## Requisitos Funcionais
1. Simulação 3D de múltiplos eventos (tsunami, terremoto, etc.).
2. Painel com localização de áreas afetadas, severidade e prioridade de resposta.
3. Integração com dados públicos (ex.: NASA, OpenStreetMap).
4. Versionamento de cenários e resultados para auditoria.

## Requisitos Não Funcionais
- Escalabilidade horizontal e desacoplamento por módulos.
- Contratos tipados entre frontend, backend e pipeline de IA.
- Observabilidade mínima: logs estruturados, métricas e rastreabilidade por correlação.
- Treinamento contínuo automatizado com AWS Step Functions.

## Fluxos Principais
- **Entrada**: configurar cenário com dados públicos e parâmetros de evento.
- **Simulação**: executar modelo 3D + modelos de IA para propagação/impacto.
- **Painel**: publicar resultados em tempo real para equipes de resposta.
- **Refinamento**: usar evidências de campo para recalibrar modelos.

## Stack-alvo (adaptar ao repositório)
- Backend: .NET (com Dapper para acesso a dados quando aplicável).
- Frontend: React + TypeScript + visualização geoespacial/webgl.
- IA/Pipeline: AWS Step Functions para treino incremental e validação automatizada.

## Entregáveis esperados do Codex
1. Gerar/atualizar entidades de domínio e contratos API.
2. Implementar fluxos de simulação (entrada, execução, publicação de resultado).
3. Configurar pipeline de refinamento iterativo de IA.
4. Criar testes automatizados para regras críticas e integração.
5. Criar logging de execução para diagnóstico e melhoria contínua.

## Critérios de Aceite
- Cenário configurável executa simulação sem erro e gera artefatos rastreáveis.
- Painel exibe áreas afetadas com atualização consistente.
- Pipeline de refinamento roda de forma idempotente e auditável.
- Logs permitem reconstruir execução por `correlationId`.

## Próximas Ações
- Gerar código para novas entidades.
- Implementar fluxos de simulação.
- Configurar pipeline de refinamento.
- Publicar checklist de validação operacional.
