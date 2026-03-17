---
name: multi-hazard-simulation-sdk
description: Use this skill when designing or implementing a reusable SDK for multi-disaster simulation (wildfire, flood, earthquake, tsunami) with scenario contracts and uncertainty handling.
---

# Multi-Hazard Simulation SDK

## Quando usar
- Ao criar núcleo de cálculo para múltiplos desastres.
- Ao padronizar cenários, parâmetros e saídas geoespaciais.
- Ao desacoplar modelo científico da camada de UI.

## Workflow
1. Definir `hazard_type` e escopo geográfico/temporal do cenário.
2. Mapear fontes de dados por risco (meteo, relevo, sísmico, oceânico, urbano).
3. Implementar modelo por módulo (`wildfire`, `flood`, `earthquake`, `tsunami`).
4. Registrar incerteza, suposições e confiança da simulação.
5. Publicar outputs em formato interoperável (GeoJSON/raster/tiles).
