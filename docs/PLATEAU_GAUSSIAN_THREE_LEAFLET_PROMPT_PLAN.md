# Plano em Formato de Prompt — Integração PLATEAU + Gaussian Splatting + Three.js + Leaflet

## 1) Análise rápida da stack atual (MG Location)

- **Backend:** Django 5 + DRF com módulos para simulação, incidentes e integrações (`apps/api`).
- **Frontend:** React + TypeScript + Vite (`frontend-react`) com recursos já existentes de **Three.js** e **Leaflet**.
- **Mapas/3D já presentes no código:**
  - camadas de mapa e integração Three/Leaflet (`frontend-react/src/map/layers/*`);
  - componentes táticos de mapa (`frontend-react/src/components/map/*`);
  - página e fluxo de simulação (`frontend-react/src/pages/SimulationsPage.tsx`, `frontend-react/src/services/simulationService.ts`).
- **Arquitetura operacional:** foco em resiliência offline-first, sync e operações de emergência.

Conclusão: a base já suporta evolução incremental para pipeline geoespacial avançado com dados PLATEAU, renderização híbrida 2D/3D e mídia 3D capturada via Gaussian Splatting.

---

## 2) Prompt mestre (para orquestrar implementação)

```text
Você é um Arquiteto Técnico Principal e Orquestrador de Agentes do projeto MG Location.

Contexto do projeto:
- Stack backend: Django + DRF.
- Stack frontend: React + TypeScript + Vite.
- O projeto já usa Leaflet e Three.js em módulos de mapa/simulação.
- Objetivo: evoluir as simulações para usar dados do Project PLATEAU e complementar cenas com Gaussian Splatting (.splat), mantendo padrão de arquitetura resiliente do MG Location.

Objetivos desta entrega:
1. Integrar dados do PLATEAU (open-data e bibliotecas oficiais) no pipeline de simulação.
2. Usar Leaflet como base cartográfica para demarcar áreas de renderização PLATEAU.
3. Usar Three.js para modelar/renderizar ícones 3D informativos no mapa.
4. Incorporar arquivos .splat (Gaussian Splatting) como video proxy/camada visual para enriquecer cenários.
5. Definir arquitetura modular, observabilidade, testes e roadmap incremental com baixo risco.

Links de referência obrigatórios:
- https://github.com/Project-PLATEAU
- https://www.mlit.go.jp/plateau/open-data/
- https://www.mlit.go.jp/plateau/libraries/
- https://github.com/graphdeco-inria/gaussian-splatting
- https://threejs.org/
- https://leafletjs.com/

Regras de resposta:
- Responder em português.
- Entregar resultado em seções:
  A) Diagnóstico técnico da arquitetura atual e gaps
  B) Arquitetura alvo (componentes, contratos e fluxo de dados)
  C) Novos agentes especialistas recomendados e responsabilidades
  D) Novas skills recomendadas (com escopo e critérios de uso)
  E) Backlog priorizado (P0/P1/P2) com critérios de aceite
  F) Plano de implementação em fases (MVP → escala)
  G) Estratégia de testes (unitário, integração, E2E, visual e performance)
  H) Estratégia de logs/telemetria para debug de simulação
  I) Riscos técnicos + mitigação
  J) Prompt final de execução por sprint (pronto para copiar/colar)

Restrições técnicas:
- Não quebrar fluxos existentes de incidentes/simulações.
- Evitar lock-in: abstrair provider de geodados (adapter pattern).
- Suportar fallback de renderização (Leaflet-only quando 3D indisponível).
- Definir governança de versão de dados geoespaciais e metadata.

Diretrizes de arquitetura:
- Criar módulo de ingestão PLATEAU no backend (normalização + cache + versionamento).
- Expor endpoints para recorte espacial (bbox/polígono), camadas e metadados.
- No frontend, separar:
  - MapBaseProvider (Leaflet)
  - Overlay3DProvider (Three.js)
  - SplatSceneProvider (.splat)
- Implementar feature flags para ativar/desativar PLATEAU/3D/SPLAT por ambiente.
- Incluir trilha de auditoria para cenários simulados e fontes de dados.

Formato de saída esperado:
- Tabelas para backlog e riscos.
- Diagramas textuais (ASCII/mermaid) para arquitetura e fluxo.
- Checklist operacional por fase.
- Prompt de execução final em bloco ```text```.
```

---

## 3) Novos agentes especialistas sugeridos

1. **PLATEAU Data Integration Agent**  
   Responsável por catálogo de datasets, ingestão, normalização geoespacial, versionamento e validação de metadados.

2. **Geospatial Backend (Django/GIS) Agent**  
   Responsável por contratos de API geoespacial (bbox, tiles, overlays), cache, indexação espacial e performance.

3. **3D Web Rendering Agent (Three.js) Agent**  
   Responsável por pipeline de ícones 3D, culling/LOD, sincronização com coordenadas do mapa e performance client-side.

4. **Gaussian Splatting Scene Agent**  
   Responsável por estratégia de ingestão/stream de `.splat`, fallback, compressão e lifecycle de assets de cena.

5. **Cartography UX Agent (Leaflet + Tactical UI)**  
   Responsável por UX de seleção de área, demarcação de polígonos, camadas e legibilidade operacional.

6. **Geo Observability & QA Agent**  
   Responsável por logs geoespaciais, métricas de renderização, testes visuais de mapa e regressão de performance.

---

## 4) Novas skills recomendadas para o repositório

- `skill-plateau-data-pipeline.md`
- `skill-geospatial-api-contracts.md`
- `skill-threejs-map-overlays.md`
- `skill-gaussian-splatting-integration.md`
- `skill-leaflet-territory-demarcation.md`
- `skill-geo-observability.md`

Cada skill deve conter:
- contexto de uso;
- entradas/saídas esperadas;
- checklist técnico;
- anti-padrões;
- definição de pronto (DoD).

---

## 5) Prompt curto para uso imediato (versão operacional)

```text
Analise a arquitetura atual do MG Location e entregue um plano técnico incremental para integrar Project PLATEAU + Leaflet + Three.js + Gaussian Splatting (.splat) nas simulações.

Gere:
1) diagnóstico de gaps,
2) arquitetura alvo com contratos backend/frontend,
3) backlog P0/P1/P2 com critérios de aceite,
4) riscos e mitigação,
5) plano de testes e observabilidade,
6) proposta de novos agentes e skills especializados.

Responda em português, com tabelas e checklist executável por sprint.
```
