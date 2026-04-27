# Auditoria do Motor 3D do SOS Location

Data: 2026-04-27

## Resumo executivo

O caminho 3D ativo da aplicação está concentrado em `frontend-react/src/components/ui/CityScaleWebGL.tsx`, um renderizador WebGL2 direto usado por `SimulationsPage`. Ele recebe centro geográfico, `bbox`, dados OSM/DEM por `useSimulationsController`, normaliza parte da geometria em centímetros e renderiza terreno, prédios, vias, hidrografia, vegetação, camadas semânticas e efeitos de desastre.

O projeto também contém motores/protótipos paralelos (`HydraEngine`, `RenderOrchestrator`, camadas Three/R3F e gerenciadores Leaflet/Three), mas eles não são o caminho principal da cena de cidade operacional. A documentação anterior descrevia mais o desenho pretendido do Hydra do que o pipeline real em produção.

## Mapa do motor 3D atual

| Área | Arquivos principais | Papel atual |
| --- | --- | --- |
| Cena ativa | `frontend-react/src/components/ui/CityScaleWebGL.tsx` | Renderização WebGL2 monolítica da cidade. |
| Página operacional | `frontend-react/src/domains/operations/pages/SimulationsPage.tsx` | Injeta `centerLat`, `centerLng`, `bbox`, `blueprint`, camadas e parâmetros da simulação. |
| Controle e dados | `frontend-react/src/hooks/useSimulationsController.ts` | Busca pipeline urbano, hotspots e fallback de cena. |
| API frontend | `frontend-react/src/services/simulationsApi.ts`, `sceneDataApi.ts` | Conecta Overpass/DEM/backend de cena. |
| Pipeline geo frontend | `frontend-react/src/lib/geo/GeoDataPipeline.ts`, `TileLoader.ts`, `TerrainTileLoader.ts` | Carregamento/caches de tiles e dados geográficos. |
| Blueprint | `frontend-react/src/lib/blueprint/CityBlueprintBuilder.ts` | Converte payload urbano/DEM em insumos para o renderer. |
| Matemática GIS | `frontend-react/src/lib/webgl/GISMath.ts` | Matrizes, interpolação e operações vetoriais. |
| Semântica | `frontend-react/src/lib/segmentation/SemanticTileProcessor.ts` | Classificação e geometria semântica. |
| Engine paralelo | `frontend-react/src/engine/**`, `frontend-react/src/lib/webgl/engine/**` | Arquitetura planejada/protótipo, ainda não unificada ao fluxo ativo. |
| Backend GIS | `backend-dotnet/SOSLocation.API/Services/Gis/**` | DEM, OSM/Overpass, terrain RGB e fallbacks. |

## Fluxo de dados observado

1. Usuário escolhe região/simulação em `SimulationsPage`.
2. `useSimulationsController` solicita dados urbanos via `simulationsApi.indexUrbanPipeline`.
3. Quando há payload urbano, `CityBlueprintBuilder.build` monta elevação, edifícios, vias, hidrografia e metadados.
4. Em fallback, `sceneDataApi.fetchSceneData` chama `/api/simulation/v1/scenes/data`.
5. `CityScaleWebGL` converte lat/lon para espaço local, monta buffers WebGL, texturas de DEM/semântica e renderiza a cena.
6. Camadas de desastre atuais entram como efeitos visuais no renderer, não como contrato independente de `DisasterOverlay`.

## Achados por severidade

### Critical

- Canvas WebGL usava `window.innerWidth * devicePixelRatio` diretamente no JSX, quebrando SSR/testes, containers redimensionados e layouts embutidos. Corrigido com resize pelo tamanho real do canvas.
- Extrusões semânticas convertiam metros dividindo por `CM`; como o renderer usa centímetros, prédios/árvores semânticos ficavam quase invisíveis. Corrigido para multiplicar por `worldUnitsPerMeter`.
- `ThreeSceneManager` recriava geometrias e materiais por atualização sem descarte. Corrigido com `dispose` para meshes removidos/substituídos.
- `npm run type-check` estava bloqueado por tipos Chakra e props `loading`. Corrigido.

### High

- `CityScaleWebGL` concentra renderização, carregamento derivado, câmera, input, geometria e efeitos em um único arquivo grande. Isso dificulta LOD real, testes e evolução para múltiplas fontes.
- O terreno pode chegar a grade 2048, mas não há seleção adaptativa por viewport/hardware. Em regiões densas, isso pode gerar milhões de triângulos e travar hardware fraco.
- Vias são expandidas em quads no CPU com subdivisão por célula de terreno; malhas urbanas densas podem explodir vértices.
- O backend declara cena rica em comentários, mas ainda retorna semântica vazia em alguns caminhos e usa basemap CartoDB como "satellite". Isso precisa de metadados claros de fonte/cobertura.
- Fallbacks sintéticos existem e são úteis para continuidade, mas precisam sempre carregar `source`, `isSynthetic` e frescor para não parecerem dados reais.
- `areaScale` é recebido por `CityScaleWebGL`, mas não é usado no renderer ativo.

### Medium

- Há duas arquiteturas 3D paralelas: renderer ativo monolítico e Hydra/engine modular. A migração deve ser incremental, não substituição total imediata.
- Cache e tile loading existem em bibliotecas separadas, mas não controlam completamente o orçamento do renderer ativo.
- Eventos de input são globais no `window`; em telas com múltiplos painéis isso pode capturar ações fora da cena.
- Métricas de FPS/draw calls/triângulos ainda não estão expostas em modo debug operacional.

### Low

- Comentários de resolução do terreno estavam divergentes do código.
- A nomenclatura de escala alternava entre metros, unidades e centímetros, aumentando risco de regressões.

## Bugs corrigidos nesta execução

- Resize do canvas WebGL por tamanho real do elemento, com limite de DPR.
- Cleanup explícito do wrapper `WebGLRenderer`.
- Escala correta de extrusões semânticas em centímetros.
- Descarte de geometrias/materiais em `ThreeSceneManager`.
- Remoção de update duplicado em `RenderOrchestrator`.
- Typecheck frontend restabelecido.

## Gargalos restantes

- Falta LOD adaptativo no caminho ativo do renderer.
- Falta orçamento explícito de geometria por frame/tile.
- Falta contrato único para tiles de terreno, prédios, vias e hidrografia.
- Falta backend de recorte espacial persistido com PostGIS para dados grandes.
- Falta painel debug de performance 3D.

## Decisões recomendadas

1. Manter `CityScaleWebGL` como caminho ativo enquanto extrai serviços testáveis para `features/scene3d`.
2. Padronizar espaço local em metros no domínio e converter para centímetros apenas na borda do renderer atual.
3. Exigir metadados `source`, `coverage`, `resolutionMeters`, `isSynthetic` e `fetchedAt` em todo payload geoespacial.
4. Implementar tiles e LOD primeiro para terreno e vias; prédios devem usar simplificação/merge/instancing por LOD.
5. Tratar Brasil e Japão por provedores configuráveis, não por cidades hardcoded.
