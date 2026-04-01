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

## Fluxo Completo

```
Usuário seleciona área no mapa (bbox)
        │
        ▼
SimulationsPage → captureBlueprint(bbox)
        │
        ├─► simulationsApi.indexUrbanPipeline(bbox)      [backend .NET]
        │        └─► Overpass API (OSM) → buildings, roads, waterways...
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
                 │       osmData.elevationGrid (backend) OU zeros (fallback)
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

---

## Componentes Principais

### 1. SimulationsPage.tsx
**Caminho:** `src/pages/SimulationsPage.tsx`

Ponto de entrada do usuário. Gerencia o fluxo de 4 etapas:

| Etapa | O que acontece |
|-------|---------------|
| `LOCATION` | Usuário posiciona o mapa e define a bbox |
| `INDEXING` | `captureBlueprint()` — barra de progresso visível |
| `SCENARIO` | Blueprint pronto, 3D renderizado, usuário configura desastre |
| `SIMULATION` | `simData` flui em tempo real para o motor |

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
- `runSimulation(type, resolution, bbox, config)` — executa simulação no backend
- `blueprint` — estado React do `CityBlueprint` atual

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
| `Promise.all` para satélite + DEM | Carregamento paralelo reduz latência percebida. Falha de um não bloqueia o outro. |

---

## Limitações Conhecidas

- `SatelliteCanvasCache` não é por área — se duas áreas forem carregadas em paralelo, o último canvas vence.
- O grid de densidade populacional (32×32) não é reamostrado para coincidir com o grid semântico/de elevação.
- Dados climáticos globais buscam apenas temperatura/umidade, sem atividade sísmica.
- DEM do backend (`osmData.elevationGrid`) frequentemente vazio — o `TerrainTileLoader` (AWS) é o fallback confiável.
