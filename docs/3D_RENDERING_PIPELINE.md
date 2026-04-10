# Pipeline de Renderização 3D — SOS Location

> Documentação técnica completa do motor de renderização 3D de cidades reais, desde a seleção de área até a exibição no browser.

---

## Visão Geral

O sistema renderiza qualquer cidade do mundo em 3D a partir de três fontes de dados reais:

1. **Imagem de satélite** — ESRI World Imagery (tiles XYZ, gratuito, CORS-enabled)
2. **Modelo Digital de Elevação (DEM)** — AWS Terrarium (Mapzen elevation tiles)
3. **Dados OpenStreetMap (OSM)** — edifícios, vias, corpos d'água, parques via Overpass API

O resultado é um `CityBlueprint` compilado no browser que alimenta um motor WebGL 2.0 customizado (`HydraEngine`) renderizando terreno, edifícios, água, vegetação e partículas de desastre em tempo real.

---

## Baseline de 21/03

Esta documentação usa a sequência de commits de **21/03/2026** como contrato de renderização:

| Commit | Papel no motor 3D |
|--------|-------------------|
| `f78ab39f02f3ada4f68d81814ca0473dd0456e04` | Introduziu a atualização grande do motor 3D: `CityScaleWebGL`, agentes geoespaciais, shaders, `GeoDataPipeline`, `TileLoader`, provedores DEM/satélite e enriquecimento OSM. |
| `290dbc37a38e90a0b6104aa8929a6b015241b148` | Consolidou tipos, testes, shaders e ajustes de integração do fluxo de simulação. |
| `f3cabad37eebfffeeebe0c60e82d11401844a3f5` | Snapshot final do dia 21/03; é a referência de comportamento: blueprint montado no browser e simulação física sem sobrescrever a cidade renderizada. |

O ponto crítico desse baseline é a separação entre **cidade** e **desastre**:

- A cidade é capturada uma vez por `captureBlueprint(bbox)`.
- `captureBlueprint` usa `simulationsApi.indexUrbanPipeline(bbox)` e depois `CityBlueprintBuilder.build(bbox, osmData)`.
- `runSimulation()` pode chamar o backend físico, mas não deve substituir `resultData` nem `blueprint`.
- `CityScaleWebGL` deve continuar recebendo o mesmo `blueprint`; os efeitos de desastre entram por `simData`, `layers` e uniforms WebGL.

---

## Fluxo Completo

```
Usuário seleciona área no mapa (bbox)
        │
        ▼
SimulationsPage → captureBlueprint(bbox)
        │
        ├─► simulationsApi.indexUrbanPipeline(bbox)      [backend .NET]
        │        ├─► Overpass API (OSM) → buildings, roads, waterways...
        │        ├─► DEM/land-cover/population/hotspots quando disponíveis
        │        └─► Retorna: UrbanSimulationResult
        │
        └─► CityBlueprintBuilder.build(bbox, osmData)    [browser]
                 │
                 ├─ Fase 1: SATELLITE (10–40%)
                 │       TileLoader.loadSatelliteTiles()
                 │       └─► ESRI XYZ tiles → HTMLCanvasElement (cropped ao bbox)
                 │
                 ├─ Fase 2: SEGMENTATION (50–70%)
                 │       SemanticTileProcessor.classify(canvas)
                 │       └─► Heurísticas RGB → SemanticGrid (grid de classes)
                 │
                 ├─ Fase 3: ELEVATION (80–90%)
                 │       osmData.elevationGrid OU zeros/fallback
                 │       └─► Bilinear resample → elevation[rows][cols] 0–1
                 │
                 └─ Fase 4: COMPILE (100%)
                         Monta CityBlueprint com todos os dados
                         │
                         ▼
                 CityBlueprint (pronto)
                         │
                         ▼
        <CityScaleWebGL blueprint={blueprint} />
                 │
                 ├─► HydraEngine (WebGL 2.0)
                 │       TerrainLayer   — malha de terreno + textura satélite
                 │       UrbanLayer     — edifícios extrudados
                 │       WaterLayer     — corpos d'água animados
                 │       ParticleLayer  — chuva, neve, fumaça
                 │
                 └─► GeoDataPipeline.fetch() [paralelo, em background]
                         ├─► TerrainTileLoader (AWS Terrarium DEM)
                         ├─► NasaGibsProvider (Landsat / VIIRS)
                         └─► WeatherDataFetcher (Open-Meteo)
```

`sceneDataApi.fetchSceneData()` existe no código atual, mas no contrato de 21/03 ele é **fallback**, não caminho normal. Ele só deve entrar quando o payload urbano vem vazio ou sintético e o frontend precisa de uma segunda chance para montar a cena. Isso evita que uma falha `504` em `/api/simulation/v1/scenes/data` bloqueie ou atrase a renderização principal.

---

## Componentes Principais

### 1. SimulationsPage.tsx
**Caminho atual:** `src/domains/operations/pages/SimulationsPage.tsx`

**Alias histórico:** `src/pages/SimulationsPage.tsx`

Ponto de entrada do usuário. Gerencia o fluxo de 4 etapas:

| Etapa | O que acontece |
|-------|---------------|
| `LOCATION` | Usuário posiciona o mapa e define a bbox |
| `INDEXING` | `captureBlueprint()` — barra de progresso visível |
| `SCENARIO` | Blueprint pronto, 3D renderizado, usuário configura desastre |
| `SIMULATION` | `simData` altera overlays/uniforms, sem trocar o blueprint |

Props passadas para `CityScaleWebGL`:
```typescript
centerLat, centerLng         // centro em graus decimais
bbox                         // [minLat, minLon, maxLat, maxLon]
blueprint                    // CityBlueprint compilado
simData                      // { type, waterLevel, intensity, ... }
layers                       // visibilidade por camada
topoScale, lightAngle, ...   // ajustes visuais
```

---

### 2. CityBlueprintBuilder
**Caminho:** `src/lib/blueprint/CityBlueprintBuilder.ts`

Orquestra a montagem do blueprint em 4 fases. Método principal:

```typescript
CityBlueprintBuilder.build(
  bbox: [minLat, minLon, maxLat, maxLon],
  osmData: UrbanSimulationResult | null,
  tileSize = 16,
  onProgress?: (p: BlueprintProgress) => void
): Promise<CityBlueprint>
```

**Saída — `CityBlueprint`:**
```typescript
{
  bbox,
  worldSpanX,          // largura real em metros (eixo E-O)
  worldSpanZ,          // altura real em metros (eixo N-S)
  semantic: SemanticGrid,
  elevation: number[][], // normalizado 0–1
  elevationMin,         // em metros
  elevationMax,         // em metros
  osm: {
    buildings, highways, waterways, waterAreas,
    parks, naturalAreas, landUseZones, amenities
  },
  hasSatelliteCanvas,
  metadata,
  capturedAt
}
```

---

### 3. TileLoader — Satélite
**Caminho:** `src/lib/webgl/TileLoader.ts`

Carrega tiles XYZ de satélite e recorta ao bbox exato.

**Algoritmo:**
1. Calcula zoom ótimo (8–19) para ≤ 8×8 tiles
2. Converte lat/lon → coordenadas de tile Web Mercator
3. Carrega tiles em paralelo (`Promise.all`) com fallback escuro
4. Costura em canvas, recorta com projeção inversa

**Provedor padrão:** ESRI World Imagery (gratuito, sem API key)

**Saída:** `HTMLCanvasElement` — salvo em `SatelliteCanvasCache` para evitar `toDataURL()` (CORS)

---

### 4. TerrainTileLoader — Elevação (DEM)
**Caminho:** `src/lib/geo/TerrainTileLoader.ts`

Carrega dados de elevação real via AWS Terrarium.

**Fonte:** `s3://elevation-tiles-prod` (Mapzen/Terrarium)

**Decodificação Terrarium:**
```
altura_metros = (R × 256 + G + B ÷ 256) − 32768
```

**Saída — `DEMResult`:**
```typescript
{
  grid: Float32Array,  // row-major, [0] = NW
  rows, cols,
  minHeight,           // metros
  maxHeight            // metros
}
```

---

### 5. SemanticTileProcessor — Segmentação
**Caminho:** `src/lib/segmentation/SemanticTileProcessor.ts`

Classifica pixels do canvas de satélite em categorias semânticas via heurísticas RGB.

**Classes e critérios:**

| Classe | Critério RGB |
|--------|-------------|
| `WATER` | Azul dominante, brilho < 165 |
| `VEGETATION` | Verde > vermelho + 6 (NDVI-like) |
| `SPORTS` | Verde artificial (g > 140) |
| `ROAD` | Cinza, baixa saturação, brilho médio |
| `BUILDING_HIGH` | Sombra escura, saturação < 35, brilho < 80 |
| `BUILDING_LOW` | Escuro moderado, saturação baixa-média |
| `SLUM` | Vermelho-marrom quente, textura caótica |
| `BARE_GROUND` | Claro quente, baixa saturação |
| `UNKNOWN` | Padrão |

Quando `landCover` disponível (ESA WorldCover 10m), classes de alta confiança sobrescrevem RGB.

**Saída — `SemanticGrid`:**
```typescript
{
  cells: SemanticCell[][],   // class, intensity, r, g, b por célula
  rows, cols,
  tileSize,                  // pixels fonte por célula
  metadata: {
    vegetationPct, waterPct, roadPct,
    buildingPct, slumPct, urbanDensityScore
  }
}
```

---

### 6. HydraEngine — Motor WebGL
**Caminho:** `src/lib/webgl/engine/HydraEngine.ts`

Motor WebGL 2.0 puro (sem Three.js). Gerencia o loop de renderização e as camadas.

**Camadas registradas:**

| Camada | Arquivo | Função |
|--------|---------|--------|
| `TerrainLayer` | `layers/TerrainLayer.ts` | Malha de terreno + textura satélite |
| `UrbanLayer` | `layers/UrbanLayer.ts` | Edifícios extrudados com telhados |
| `WaterLayer` | `layers/WaterLayer.ts` | Superfícies de água animadas |
| `ParticleLayer` | `layers/ParticleLayer.ts` | Partículas (chuva, neve, fumaça) |

---

### 7. CityMeshBuilder — Geometria
**Caminho:** `src/lib/webgl/engine/CityMeshBuilder.ts`

Converte `CityBlueprint` em arrays de vértices/índices WebGL.

**Layout de vértice do terreno (8 floats, 32 bytes):**
```
[x, y, z, nx, ny, nz, u, v]
 posição    normal      UV
```

**Cálculo de normais (diferenças finitas):**
```
N = normalize(−∂H/∂x, 1, −∂H/∂z)
```
Onde `∂H/∂x` e `∂H/∂z` são calculados pelos vizinhos esquerdo/direito e cima/baixo.

**Edifícios** — para cada polígono OSM:
- Paredes: quad por aresta do polígono (altura = `levels × 3.5m × 100 cm`)
- Telhado: fan de triângulos a partir do vértice 0

---

### 8. Sistema de Shaders

#### Terreno — `cityShaders.ts` (CITY_TERRAIN_VS/FS)
```glsl
// Vertex: desloca Y pela elevação normalizada
float h = elevationMin + hNorm * (elevationMax - elevationMin);
position.y = h * 100.0; // metros → cm

// Fragment: modo satélite usa textura real
vec4 satColor = texture(u_satelliteMap, v_uv);
// + iluminação Lambertiana pela normal calculada
```

**Uniformes principais:**
- `u_satelliteMap` — canvas de satélite como textura WebGL
- `u_topoMap` — grid de elevação
- `u_elevationMin/Max` — para desnormalizar
- `u_waterLevel` — nível da inundação
- `u_realisticMode` — alterna modo satélite / tático

#### Edifícios — `cityShaders.ts` (INFRASTRUCTURE_VS/FS)
- Fresnel nas bordas para contorno brilhante
- Scanlines táticas animadas por `u_time`
- Grid no topo (telhado) para estilo holográfico

#### Atmosfera — `atmosphereShaders.ts`
- **SKY:** cúpula com gradiente Rayleigh + nuvens FBM + disco solar
- **PRECIP:** 6 tipos (garoa, chuva, granizo, neve, nevasca) — ciente do terreno via `u_topoMap`
- **FOG:** névoa de chão + bruma do horizonte, densidade por umidade e precipitação

---

### 9. Sistema de Coordenadas
**Caminho:** `src/utils/projection.ts`

O motor usa **centímetros** como unidade base (1 unit = 1 cm).

**Escala:**
```
worldSpanX = (maxLon - minLon) × 111.139km × cos(lat) × 100cm/m
worldSpanZ = (maxLat - minLat) × 111.139km × 100cm/m
```

**Projeção lat/lon → mundo:**
```typescript
x = (lon - lonRef) × 11_132_000 × cos(latRef × π/180)  // cm E-O
z = (lat - latRef) × 11_132_000                          // cm N-S
```

**Alturas de edifícios:**
```typescript
height = (b.height ?? levels × 3.5) × 100  // metros × 100 = cm
```

---

### 10. Gerenciamento de Estado

**`useSimulationsController.ts`** — hook principal:
- `captureBlueprint(bbox, onProgress)` — monta o blueprint completo
- `runSimulation(type, resolution, bbox, config)` — executa simulação no backend sem sobrescrever `resultData` ou `blueprint`
- `blueprint` — estado React do `CityBlueprint` atual

Contrato obrigatório:

1. `captureBlueprint()` é o único ponto que troca a cidade renderizada.
2. `resultData` guarda o payload urbano usado para montar a cidade.
3. `blueprint` guarda a versão compilada para WebGL.
4. `runSimulation()` retorna a resposta física do backend, mas a cena permanece em `blueprint`.
5. Eventos, enchente, terremoto, incêndio, neve e chuva entram por `simData` e uniforms do `CityScaleWebGL`.

**`useSimulationStore.ts`** — store Zustand global:
- `waterLevel` — nível da água (metros), passado ao `WaterLayer`
- `activeLayers` — visibilidade por camada
- `environment: { fog, rain, snow }` — parâmetros atmosféricos
- `heroPosition` — posição do Pegman/SOS Hero
- `focalPoint` — ponto de foco da câmera

**`SatelliteCanvasCache.ts`** — cache de módulo:
- Armazena o `HTMLCanvasElement` do satélite no escopo do módulo
- Evita `canvas.toDataURL()` que lança `SecurityError` em canvases CORS-tainted
- `CityBlueprintBuilder` escreve → `CityScaleWebGL` lê diretamente

---

## Diagrama de Dependências

```
SimulationsPage
    │
    ├── useSimulationsController
    │       ├── simulationsApi          (backend .NET → OSM/DEM)
    │       └── CityBlueprintBuilder
    │               ├── TileLoader          (ESRI satélite)
    │               ├── SemanticTileProcessor (classificação RGB)
    │               └── SatelliteCanvasCache  (cache CORS-safe)
    │
    └── CityScaleWebGL
            ├── HydraEngine (WebGL 2.0)
            │       ├── TerrainLayer    ← CityMeshBuilder.buildTerrain()
            │       ├── UrbanLayer      ← CityMeshBuilder.buildBuildings()
            │       ├── WaterLayer      ← waterLevel do simData
            │       └── ParticleLayer   ← tipo de desastre do simData
            │
            ├── GeoDataPipeline (background)
            │       ├── TerrainTileLoader  (AWS Terrarium DEM)
            │       ├── NasaGibsProvider   (Landsat)
            │       └── WeatherDataFetcher (Open-Meteo)
            │
            └── useSimulationStore (Zustand)
                    ├── activeLayers
                    ├── waterLevel
                    └── environment
```

---

## Decisões de Arquitetura

| Decisão | Motivo |
|---------|--------|
| Canvas na memória (sem `toDataURL`) | Tiles ESRI são CORS-tainted; `toDataURL()` lança `SecurityError`. O canvas é passado diretamente para `texImage2D`. |
| WebGL 2.0 puro (sem Three.js no HydraEngine) | Controle total de shaders e uniformes por camada de desastre. |
| Elevação normalizada 0–1 no blueprint | Permite resampling independente de resolução; desnormalizado no shader com `elevationMin/Max`. |
| Centímetros como unidade do motor | Precisão máxima para edifícios pequenos sem sacrificar escala de cidade (5km × 100 = 500.000 unidades). |
| `SatelliteCanvasCache` global | Compartilha o canvas entre `CityBlueprintBuilder` (quem busca) e `CityScaleWebGL` (quem usa como textura) sem re-fetch. |
| Fallback backend `/scenes/data` fora do caminho normal | Preserva o fluxo de 21/03 e evita que `504` no scene-data bloqueie o frontend. |
| `runSimulation()` sem `setResultData(response)` | Garante que a simulação física não substitua o payload urbano usado pela cena. |

---

## Limitações Conhecidas

- `SatelliteCanvasCache` não é por área — se duas áreas forem carregadas em paralelo, o último canvas vence.
- O grid de densidade populacional (32×32) não é reamostrado para coincidir com o grid semântico/de elevação.
- Dados climáticos globais buscam apenas temperatura/umidade, sem atividade sísmica.
- DEM do backend (`osmData.elevationGrid`) frequentemente vazio — o `TerrainTileLoader` (AWS) é o fallback confiável.

---

## Processo Operacional 21/03

O motor deve executar esta sequência para renderizar uma cidade:

1. O usuário abre `/app/simulations` e seleciona a área no mapa.
2. A página calcula `bbox = [minLat, minLon, maxLat, maxLon]`.
3. `useSimulationsController.captureBlueprint(bbox)` inicia o fluxo e bloqueia captura duplicada via `isCapturingRef`.
4. O frontend chama `POST /api/v1/urban/pipeline` com `minLat`, `minLon`, `maxLat`, `maxLon` e `resolution`.
5. O backend retorna `UrbanSimulationResult` com `bbox`, `elevationGrid`, `urbanFeatures`, `soil`, `landCover`, `populationDensity` e metadados quando disponíveis.
6. O frontend mescla hotspots opcionais e normaliza `urbanFeatures` para sempre existir como listas.
7. `CityBlueprintBuilder.build()` carrega o satélite via `TileLoader.loadSatelliteTiles()`.
8. O canvas de satélite é salvo em `SatelliteCanvasCache`, nunca serializado com `toDataURL()`.
9. `SemanticTileProcessor` transforma o canvas em `SemanticGrid`.
10. `CityBlueprintBuilder` reamostra a elevação para o grid semântico e calcula `worldSpanX/worldSpanZ`.
11. O `CityBlueprint` é salvo em cache por bbox e enviado para `CityScaleWebGL`.
12. `CityScaleWebGL` cria os programas WebGL, texturas, buffers, malha de terreno, vias, edifícios, água, zonas, amenidades, vegetação e partículas.
13. O loop de render usa refs vivas para `simData`, `layers`, `topoScale`, iluminação e intensidade de partículas sem reconstruir o contexto WebGL a cada mudança.
14. Ao rodar o cenário, `runSimulation()` chama `POST /api/simulation/run`, mas não substitui `resultData` nem `blueprint`.
15. A cidade permanece igual; os efeitos de desastre mudam por uniforms de shader, overlays e `simData`.

---

## Ambiente Local Como 21/03

Pré-requisitos:

- Docker e Docker Compose disponíveis.
- Portas livres: `8088` frontend, `8080` Keycloak, `8000` backend, `5432` Postgres, `8090` risk-analysis.
- Arquivo `.env` opcional. Se necessário, copie `.env.example` para `.env` e ajuste apenas integrações externas.

Subida limpa do ambiente:

```bash
docker compose build backend frontend risk-analysis
docker compose up -d postgres keycloak backend frontend risk-analysis
docker compose ps
```

URLs esperadas:

| Serviço | URL |
|---------|-----|
| Frontend | `http://localhost:8088` |
| Simulações | `http://localhost:8088/app/simulations` |
| Backend direto | `http://localhost:8000/api/health` |
| Backend via frontend | `http://localhost:8088/api/health` |
| Keycloak | `http://localhost:8080` |

Validação mínima:

1. Abra `http://localhost:8088/app/simulations`.
2. Faça login pelo Keycloak local.
3. Escolha uma bbox pequena, idealmente entre `0.01` e `0.025` graus por eixo.
4. Aguarde a etapa `INDEXING` terminar sem erro fatal.
5. Confirme no HUD 3D:
   - `MESH: REAL_OSM` quando houver OSM real.
   - `SATELITE: ESRI` quando o canvas de satélite carregar.
   - `SEMANTICA: ATIVO` quando a segmentação gerar geometria.
6. Execute um cenário. A câmera, os edifícios e as vias devem permanecer na mesma cidade; apenas água, partículas, fogo, tremor, neve ou overlays devem mudar.

Validação por API quando estiver autenticado:

```bash
curl -s http://localhost:8000/api/health
```

Para `POST /api/v1/urban/pipeline`, use o frontend logado ou um token local do realm `sos-location`. Esse endpoint deve responder antes do timeout do proxy; se Overpass estiver instável, o backend deve cair para fallback sintético em vez de deixar a página travar.

Problemas conhecidos no console:

| Mensagem | Interpretação |
|----------|---------------|
| Keycloak `silent-check-sso.html` sandbox warning | Aviso do iframe de SSO silencioso; não é erro de renderização 3D. |
| SignalR negotiation stopped then WebSocket connected | Transitório quando a primeira negociação é cancelada e a conexão seguinte abre. |
| `/api/simulation/v1/scenes/data` 504 | Não deve ocorrer no caminho normal do contrato 21/03; se aparecer, algum fluxo voltou a chamar scene-data como primário. |
| Canvas `willReadFrequently` | `SemanticTileProcessor` deve pedir contexto 2D com `willReadFrequently: true`. |
