# Arquitetura de Renderização 3D de Cidades

## Estado atual

O renderer de cidade ativo é `CityScaleWebGL`, chamado pela página de simulações. Ele já renderiza terreno, elevação, prédios OSM, ruas, hidrografia, vegetação, áreas naturais, zonas de uso, amenities e efeitos visuais de desastre. A implementação é funcional, mas ainda mistura responsabilidades de dados, transformação, câmera, input, buffers e renderização.

## Estrutura incremental adotada

Foi criado o início do módulo `frontend-react/src/features/scene3d/`:

```text
features/scene3d/
  domain/
    GeoBounds.ts
    DisasterOverlay.ts
  services/
    coordinateNormalizer.ts
    sceneResourceDisposer.ts
```

Essa estrutura é o ponto de extração progressiva. Ela não remove o renderer atual; apenas cria contratos testáveis para as partes que não devem ficar presas ao WebGL.

## Separação alvo

| Responsabilidade | Módulo alvo | Observação |
| --- | --- | --- |
| Scene rendering | `components/CitySceneCanvas` ou renderer WebGL atual | Deve receber buffers e camadas prontas. |
| Geo data loading | `data/*Client.ts`, backend `/api/scene3d/*` | Deve carregar por `bbox`, `layers` e `lod`. |
| Coordinate transformation | `services/coordinateNormalizer.ts` | Origem local para evitar perda de precisão float. |
| Tile management | `services/tileSelectionService.ts` | Prioridade por viewport e distância da câmera. |
| Layer visibility | store/hook de UI | Sem acoplar com criação de buffers. |
| Simulation overlays | `domain/DisasterOverlay.ts` | Contrato comum para flood, quake, tsunami e outros. |
| Operational UI | painéis React | Não deve acessar WebGL diretamente. |

## Sistema de coordenadas

O domínio deve trabalhar com:

- entrada geográfica em `lat/lng` e `GeoBounds`;
- origem local no centro do recorte;
- coordenadas locais em metros;
- conversão para unidades do renderer somente na borda.

O renderer atual usa `CM = 100`, ou seja, 1 metro = 100 unidades de mundo. O novo `CoordinateNormalizer` aceita `worldUnitsPerMeter` para compatibilidade com esse contrato.

## Tiles e LOD

O caminho recomendado é:

1. Selecionar tiles por `bbox`, câmera e zoom operacional.
2. Carregar primeiro terreno e vias principais em LOD baixo.
3. Refinar terreno, prédios e vias quando a câmera se aproxima.
4. Descartar ou reduzir tiles fora do frustum/anel de interesse.
5. Manter cache em memória por chave `{source}:{layer}:{z}:{x}:{y}:{lod}`.

Orçamento inicial recomendado:

- terreno: limitar grade por tile; evitar uma grade gigante da cidade inteira;
- vias: simplificar polilinhas por LOD antes de expandir em quads;
- prédios: extrudar apenas dentro do raio tático; fora dele usar footprint ou bloco simplificado;
- água/hidrografia: renderizar como camada vetorial leve antes de materiais avançados.

## Integração com backend

Endpoints sugeridos devem retornar envelopes com metadados de fonte:

```text
GET /api/scene3d/sources
GET /api/scene3d/tiles?bbox={bbox}&layers={layers}&lod={lod}
GET /api/scene3d/elevation?bbox={bbox}&resolution={resolution}
GET /api/scene3d/buildings?bbox={bbox}&lod={lod}
GET /api/scene3d/roads?bbox={bbox}&lod={lod}
```

Esses endpoints ainda não foram adicionados nesta etapa para evitar criar contrato backend sem necessidade imediata. O backend atual em `/api/simulation/v1/scenes/data` continua como fallback.

## Performance e fallback

Regras obrigatórias para próximas fases:

- falha externa deve retornar cena degradada com metadado `isSynthetic` ou `fallbackReason`;
- WebGL resources devem ter dono claro e `dispose`;
- todo payload de alta resolução precisa de limite de tamanho;
- debug mode deve expor FPS, draw calls, triângulos aproximados e tiles carregados;
- Brasil/Japão devem ser resolvidos por cobertura da fonte, não por if de cidade.

## Caminho de migração

1. Manter `CityScaleWebGL` ativo e extrair primeiro normalização, builders e disposers.
2. Substituir geração de terreno monolítica por `TerrainTile`.
3. Mover edifícios/vias/hidrografia para builders independentes.
4. Adicionar store/hook para tiles e camadas.
5. Conectar `DisasterOverlay` como camada acima do terreno/prédios sem física completa.
