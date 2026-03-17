---
name: atlas-geodata-fusion
description: Use this skill to integrate Atlas-aligned geospatial sources (GSI, GeoSampa, INDE, OpenTopography, Earthdata) into SOS Location risk models and 3D scene pipelines.
---

# Atlas Geodata Fusion

## Quando usar
- Quando for necessário incorporar novas fontes geoespaciais externas ao Data Hub.
- Quando modelos de risco exigirem novas variáveis topográficas/urbanas.
- Quando a cena 3D precisar de novas camadas de terreno, cadastro ou satélite.

## Checklist
1. Catalogar a fonte com endpoint, cobertura, licença e requisitos de autenticação.
2. Definir uso duplo: `riskModelUsage` e `scene3dUsage`.
3. Implementar endpoint backend no namespace `/api/integrations/atlas/*`.
4. Criar contrato tipado no frontend (`integrationsApi.ts`).
5. Documentar fallback operacional para indisponibilidade externa.
6. Atualizar documentação (`docs/INTEGRATIONS.md`, `DATA_SOURCES.md`).


## Validação rápida
1. Confirmar contrato backend: `GET /api/integrations/atlas/sources` retorna `items[]` com `id,name,category,endpoint,coverage,authRequired,riskModelUsage,scene3dUsage`.
2. Confirmar contrato backend: `GET /api/integrations/atlas/opentopography/catalog` responde com `data` ou fallback seguro.
3. Confirmar frontend: métodos `getAtlasSources()` e `getAtlasOpenTopographyCatalog()` em `integrationsApi.ts`.
4. Verificar documentação sincronizada em `docs/INTEGRATIONS.md` e `DATA_SOURCES.md`.
