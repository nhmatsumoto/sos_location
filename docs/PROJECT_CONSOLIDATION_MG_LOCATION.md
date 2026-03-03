# Consolidado do Projeto MG Location

## 1) Escopo funcional consolidado

1. **Renderização 3D do Terreno**  
   O sistema renderiza mapas tridimensionais com relevo detalhado.
2. **Demarcação de Áreas de Risco**  
   Permite marcar visualmente zonas de risco no mapa.
3. **Integração de Alertas da Defesa Civil**  
   Captura e exibe alertas de eventos como enchentes e terremotos.
4. **Notificações Push para Vítimas**  
   Alerta as vítimas sobre desastres e fornece instruções de segurança.
5. **Dashboard Público Interativo**  
   Área pública para colaboração, onde usuários podem indicar pontos de risco, enviar mídias e atribuir níveis de risco.
6. **Gestão de Permissões com Keycloak**  
   Uso do Keycloak para gerenciar acesso e login dos voluntários via SSO personalizado.
7. **Integração Keycloak-Backend (Django)**  
   Integração do Keycloak com a API backend para controle de permissões.
8. **Script de Configuração e Pipeline**  
   Script `.sh` executado no pipeline Docker para configurar o Keycloak (usuários, roles, certificados, login com Google, etc).
9. **Atualização do Frontend**  
   Ajustes no frontend para integrar as novas funcionalidades, incluindo criação de telas e hooks.

## 2) Tradução para engenharia estruturada (Requirement Cards)

### RFC-01 — Terreno 3D e camadas operacionais
- **Objetivo:** oferecer consciência situacional com relevo e overlays de risco.
- **Entrada:** tiles/base map, dados de altitude, camadas de hotspots/incidentes.
- **Saída:** mapa 3D interativo com controle de camadas e foco operacional.
- **Critérios de aceite:**
  - usuário alterna entre camadas sem recarregar a página;
  - risco é visível com codificação por severidade;
  - operação de zoom/pan permanece fluida em desktop operacional.

### RFC-02 — Demarcação geoespacial de risco
- **Objetivo:** registrar polígonos/áreas de risco com precisão e rastreabilidade.
- **Entrada:** cliques no mapa, metadados (tipo de risco, prioridade, origem).
- **Saída:** geometria validada e persistida para consulta posterior.
- **Critérios de aceite:**
  - mínimo de 3 pontos para polígonos;
  - edição/cancelamento antes de confirmar;
  - área fica disponível em listagem e mapa após persistência.

### RFC-03 — Alertas da Defesa Civil + eventos externos
- **Objetivo:** unificar sinais de desastre em um feed operacional único.
- **Entrada:** providers de alerta (nacionais e globais), job de ingestão.
- **Saída:** eventos normalizados, com severidade e localidade.
- **Critérios de aceite:**
  - eventos exibidos com timestamp de atualização;
  - deduplicação por fonte + janela temporal;
  - fallback para cache em indisponibilidade temporária do provider.

### RFC-04 — Notificação push para vítimas e voluntários
- **Objetivo:** reduzir tempo de resposta com instruções acionáveis.
- **Entrada:** eventos severos, geofiltro de usuários elegíveis.
- **Saída:** push segmentado por área e categoria de público.
- **Critérios de aceite:**
  - disparo orientado por regra de severidade;
  - mensagem contém instrução prática de segurança;
  - log de entrega e falha para auditoria.

### RFC-05 — Dashboard público colaborativo
- **Objetivo:** coletar inteligência de campo com participação cidadã.
- **Entrada:** relatos, mídia (foto/vídeo), classificação comunitária de risco.
- **Saída:** itens moderáveis e visualização pública com status.
- **Critérios de aceite:**
  - submissão com validações mínimas obrigatórias;
  - moderação com trilha de decisão;
  - visualização com nível de risco e evidências anexas.

### RFC-06 — IAM com Keycloak + SSO
- **Objetivo:** controlar autenticação/autorização por perfis operacionais.
- **Entrada:** realms, clients, users/groups, roles, identity provider Google.
- **Saída:** acesso por permissões no frontend e backend.
- **Critérios de aceite:**
  - login via SSO funcional;
  - roles refletidas em rotas e ações protegidas;
  - revogação de acesso aplicada sem alteração de código.

### RFC-07 — Integração Django ↔ Keycloak
- **Objetivo:** centralizar enforcement de permissões na API.
- **Entrada:** JWT/OIDC tokens emitidos pelo Keycloak.
- **Saída:** middleware/guardas de permissão por endpoint.
- **Critérios de aceite:**
  - endpoints críticos exigem escopo/role válido;
  - respostas 401/403 padronizadas;
  - logs com `request_id`, usuário e decisão de autorização.

### RFC-08 — Provisionamento por script e pipeline
- **Objetivo:** reduzir configuração manual e drift de ambiente.
- **Entrada:** script shell + variáveis de ambiente + pipeline Docker.
- **Saída:** Keycloak provisionado de forma idempotente.
- **Critérios de aceite:**
  - reexecução sem duplicar recursos;
  - erro explícito em ausência de segredo obrigatório;
  - etapa validada em CI com feedback objetivo.

### RFC-09 — Evolução frontend (telas + hooks)
- **Objetivo:** entregar UX operacional consistente com novos fluxos.
- **Entrada:** APIs novas/ajustadas, padrões de componentes existentes.
- **Saída:** páginas, estados e hooks para operação e monitoramento.
- **Critérios de aceite:**
  - componentes reutilizáveis e tipados;
  - feedback visual para sucesso/erro/loading;
  - cobertura mínima de fluxos críticos via testes de integração UI.

## 3) Mapeamento por stack do repositório

### Frontend (React + TypeScript)
- **Pontos de extensão:** `frontend-react/src/pages`, `frontend-react/src/components`, `frontend-react/src/hooks`, `frontend-react/src/services`.
- **Diretriz:** priorizar componentização, hooks isolados por domínio e integração HTTP padronizada.

### Backend (Django)
- **Pontos de extensão:** `apps/api`, `apps/rescue_ops`, `apps/map`, `core`.
- **Diretriz:** segregação por contexto de domínio, contratos estáveis de API, testes por endpoint e integração.

### IAM/SSO (Keycloak)
- **Pontos de extensão:** configuração de client/realm, políticas de roles e automação de provisionamento.
- **Diretriz:** autorização declarativa por papel e trilha de auditoria.

### Dados operacionais e integrações externas
- **Pontos de extensão:** `apps/api/integrations`, `apps/api/services/disasters`.
- **Diretriz:** normalização de payload, cache defensivo e tolerância a falhas de provider.

## 4) Agentes especialistas recomendados para execução

1. **Frontend Modernization Agent**
   - Foco: telas operacionais, mapa tático, UX de emergência, hooks.
2. **Django Domain Agent**
   - Foco: modelagem por contexto, casos de uso, contratos REST.
3. **Keycloak IAM Agent**
   - Foco: SSO, roles, tokens, enforcement de autorização.
4. **Disaster Integrations Agent**
   - Foco: ingestão, normalização e confiabilidade de providers.
5. **Observability & Incident Agent**
   - Foco: logging estruturado, diagnóstico de falhas, trilha de auditoria.

## 5) Backlog inicial de execução (ordem sugerida)

1. Definir contrato de autorização (roles/scopes) e matriz de permissões.
2. Implantar integração Keycloak no backend com endpoints críticos protegidos.
3. Atualizar frontend com rotas protegidas e estados de autenticação.
4. Consolidar fluxo de alertas e normalização de eventos em serviço único.
5. Entregar demarcação de risco com persistência geoespacial e moderação.
6. Conectar push notifications por severidade e área impactada.
7. Fechar dashboard público colaborativo com trilha de decisão.
8. Instrumentar logs estruturados e painéis de saúde operacional.

## 6) Definição de pronto (DoD)

- Requisito vinculado a RFC desta consolidação.
- Critérios de aceite verificáveis e demonstráveis.
- Testes automatizados de API/UI para fluxos críticos.
- Auditoria mínima: usuário, ação, timestamp e resultado.
- Atualização do learning log de agentes com decisão e trade-offs.


## 7) Artefatos operacionais de orquestração

- **Skill operacional:** `skills/mg-location-orchestration/SKILL.md`.
- **Template de Requirement Card:** `skills/mg-location-orchestration/references/requirement-card-template.md`.
- **Agente de orquestração:** `docs/agents/mg-location-orchestration-agent.md`.
- **Registro de aprendizado:** `docs/agents/learning-log.md`.

---

Este documento consolida o escopo funcional e o transforma em linguagem estruturada para engenharia de software de alto nível, pronto para execução orquestrada via Codex.
