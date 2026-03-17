# Análise de Feature: Simulação Multi-Catástrofes + Toolkit SDK

## 1. Objetivo da solicitação

A solicitação pede evolução do projeto para suportar **simulações multi-risco** (incêndios, alagamentos, terremotos, maremoto/tsunami), com **monitoramento por sensores**, **cenários urbanos e costeiros**, e unificação dos cálculos em um **SDK de simulação** reutilizável por frontend, backend e unidade de risco.

---

## 2. Diagnóstico do estado atual do projeto

## 2.1 O que já existe e pode ser reaproveitado

- Frontend já possui base de visualização geoespacial 2D/3D com React + Leaflet + Three.js.
- Há uma simulação já implementada para deslizamento em `LandslideSimulation.tsx`, com malha de terreno, amostragem de elevação, partículas e ingestão de feições urbanas.
- A unidade de risco em Python (`risk-analysis-unit`) já executa ciclo periódico, integra clima (INMET/Open-Meteo) e calcula score de risco com modelo ML simples.
- Documentação do stack já prevê fontes como OpenTopography, OSM/Overpass, Open-Meteo, CEMADEN e Defesa Civil.

## 2.2 Gaps técnicos identificados para a nova feature

1. **Modelo de domínio limitado**: hoje o núcleo de risco está orientado a score agregado, sem taxonomia formal por tipo de desastre e sem parâmetros físicos por cenário.
2. **Acoplamento de simulação ao frontend**: parte importante da lógica está no componente de UI, dificultando validação científica, testes e reuso em API.
3. **Ausência de catálogo de sensores**: não há normalização explícita de telemetria (boias oceânicas, pluviômetros, anemômetros, sismógrafos, satélite, radar).
4. **Sem engine costeira/oceanográfica dedicada**: não há modelagem de maré, propagação de onda, corrente marinha e tempo de chegada (ETA) para tsunami.
5. **Sem pipeline de cenários padronizado**: falta estrutura única para “inputs + suposições + execução + outputs + incerteza”.

---

## 3. Arquitetura proposta para a expansão

## 3.1 Princípio-chave

Separar em três camadas:

1. **Domain SDK (núcleo matemático/físico)**
   - Biblioteca única para modelos de propagação, vulnerabilidade e exposição.
   - Pode ser implementada em Python primeiro (integração natural com `risk-analysis-unit`) e exposta via API.

2. **Simulation Orchestrator (backend)**
   - Orquestra execução de cenários, versionamento de parâmetros e persistência de resultados (GeoJSON/tiles).
   - Publica estado em tempo real para frontend (SSE/SignalR).

3. **Tactical Visualization (frontend)**
   - Foco em renderização e interação operacional (camadas de risco, timeline, área impactada, rotas de evacuação).
   - Sem conter equações críticas de simulação.

## 3.2 Pacotes sugeridos para o SDK

- `hazard_models/`
  - `wildfire.py` (propagação por vento, umidade, combustível).
  - `flood.py` (runoff simplificado + acumulação + drenagem urbana).
  - `earthquake.py` (intensidade por distância/solo + dano esperado).
  - `tsunami.py` (altura de onda estimada, propagação costeira simplificada, ETA).
- `exposure/`
  - População, edifícios críticos, hospitais, escolas, rotas e infraestrutura.
- `sensors/`
  - Ingestão e calibração por tipo de sensor (quality flags, latência, confiabilidade).
- `scenarios/`
  - Schema versionado para cenários reproduzíveis.
- `outputs/`
  - Mapas raster/vetoriais, envelopes de risco, trilhas de auditoria e métricas.

---

## 4. Especificação mínima por tipo de catástrofe

## 4.1 Incêndios (urbano/florestal)

**Entradas:** vento (direção/velocidade), umidade relativa, temperatura, cobertura do solo/combustível, relevo, focos ativos.

**Monitoramento recomendado:**
- Estações meteorológicas (INMET/Open-Meteo).
- Satélite térmico/focos de calor (INPE/NASA FIRMS quando aplicável).
- Sensores locais IoT (temperatura/fumaça/CO).

**Saídas:** perímetro provável, taxa de propagação, zonas de risco por tempo (15/30/60 min), rotas seguras.

## 4.2 Alagamentos/enchentes

**Entradas:** chuva acumulada/intensidade, declividade, drenagem, impermeabilização urbana, nível de rios/canais.

**Monitoramento recomendado:**
- Pluviômetros, radar de precipitação, réguas linimétricas e sensores de nível.
- Dados topográficos DEM e histórico de drenagem urbana.

**Saídas:** mapa de lâmina d'água estimada, pontos críticos, vias intransitáveis e tempo de inundação.

## 4.3 Terremotos

**Entradas:** magnitude/profundidade epicentral, tipo de solo, densidade urbana, tipologia construtiva.

**Monitoramento recomendado:**
- Redes sismográficas (USGS, serviços nacionais).
- Crowd-sensing (app/call center) para confirmação de dano em campo.

**Saídas:** mapa de intensidade esperada, probabilidade de dano estrutural, priorização de busca e resgate.

## 4.4 Maremoto/Tsunami (cidades costeiras)

**Entradas:** fonte sísmica/submarina, batimetria, elevação costeira, maré, linhas de costa e obstáculos.

**Monitoramento recomendado:**
- Boias de pressão oceânica (estilo DART), marégrafos e estações costeiras.
- Sensoriamento remoto para confirmação de anomalia de superfície.

**Saídas:** ETA por trecho costeiro, altura relativa de onda, polígonos de inundação costeira, rotas de evacuação vertical/horizontal.

---

## 5. Cenários operacionais sugeridos (MVP realista)

1. **Cenário A — Tsunami costeiro**
   - Cidade piloto: município litorâneo.
   - Simular impacto em toda a faixa costeira urbana com sensores virtuais + dados reais de maré.

2. **Cenário B — Incêndio com vento dominante**
   - Cidade com interface urbano-florestal.
   - Simular propagação orientada por vento e classificar quadras em risco iminente.

3. **Cenário C — Enchente urbana por chuva extrema**
   - Bacia urbana com drenagem limitada.
   - Simular áreas de acumulação e interrupção de vias críticas.

4. **Cenário D — Terremoto em zona habitada**
   - Simular intensidade por bairros e estimar danos para priorização de resposta.

---

## 6. Modelo de dados padronizado (proposta)

```json
{
  "scenario_id": "uuid",
  "hazard_type": "wildfire|flood|earthquake|tsunami",
  "region": { "bbox": [minLon, minLat, maxLon, maxLat] },
  "time_window": { "start": "ISO", "end": "ISO" },
  "inputs": {
    "meteo": {},
    "terrain": {},
    "ocean": {},
    "seismic": {},
    "urban": {}
  },
  "sensors": [
    { "id": "sensor-1", "type": "tide_gauge", "lat": 0, "lon": 0, "quality": "A" }
  ],
  "outputs": {
    "risk_polygons": [],
    "eta_map": [],
    "evac_routes": []
  },
  "uncertainty": {
    "confidence": 0.0,
    "assumptions": []
  }
}
```

---

## 7. Plano de execução incremental

## Fase 1 — Fundação (2-3 sprints)

- Criar pacote `simulation-sdk` na unidade Python.
- Extrair cálculos críticos de simulação para SDK (iniciando por incêndio e alagamento).
- Padronizar contrato de cenário (`scenario schema v1`).

## Fase 2 — Multi-hazard (3-5 sprints)

- Adicionar módulos de terremoto e tsunami.
- Implementar pipeline de sensores e qualidade de dados.
- Expor endpoints por cenário e execução assíncrona.

## Fase 3 — Operação avançada (contínua)

- Enriquecer com correntes marinhas, logística de evacuação e análise de desmatamento.
- Calibrar modelos com dados históricos e pós-evento.
- Gerar biblioteca de cenários de treino para defesa civil.

---

## 8. Novos agentes especialistas propostos

1. **Multi-Hazard Simulation Architect Agent**
   - Define contratos, interfaces e versionamento do SDK.
2. **Coastal & Ocean Dynamics Agent**
   - Foca em maré, batimetria, correntes, ETA e inundação costeira.
3. **Wildfire & Environmental Monitoring Agent**
   - Foca em vento, combustível, focos térmicos, desmatamento e risco de propagação.
4. **Sensor Fusion & Telemetry QA Agent**
   - Padroniza ingestão, confiabilidade e validação cruzada de sensores.

---

## 9. Novas skills propostas

- `multi-hazard-simulation-sdk`: desenho e implementação do SDK de simulação.
- `coastal-tsunami-modeling`: modelagem de cenários costeiros, maremoto e evacuação.

---

## 10. Critérios de aceite para a feature (definição executável)

1. O sistema permite criar e executar cenários para **4 riscos mínimos**: incêndio, alagamento, terremoto, tsunami.
2. Cada cenário registra **fontes de dados**, **parâmetros**, **versão do modelo** e **nível de confiança**.
3. A visualização exibe polígonos/heatmaps de impacto e timeline de evolução.
4. Existe API unificada para iniciar, acompanhar e exportar simulações.
5. O núcleo de cálculos está desacoplado da UI e testado em unidade/integração.

---

## 11. Riscos de implementação e mitigação

- **Risco de pseudo-precisão científica**: mitigar com metadados de incerteza e “confidence score”.
- **Dados heterogêneos e incompletos**: mitigar com qualidade de dados por fonte e fallback explícito.
- **Custo computacional em áreas grandes**: mitigar com grade adaptativa, cache espacial e execução assíncrona.
- **Complexidade operacional**: mitigar com rollout por tipo de risco e cidades piloto.

---

## 12. Conclusão

A solicitação é tecnicamente viável e está alinhada ao propósito do projeto. O melhor caminho é implementar a expansão via **SDK de simulação multi-risco** com arquitetura modular, iniciando por modelos com maior disponibilidade de dados (incêndio/alagamento) e evoluindo para cenários costeiros e sísmicos com governança de incerteza e telemetria robusta.
