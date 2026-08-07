import type {
  DataDrivenPropertyValueSpecification,
  ExpressionSpecification,
  LayerSpecification,
  SourceSpecification,
} from 'maplibre-gl';
import type { RGBA } from '../materials/theme';
import {
  BOUNDARY_COLOR,
  BUILDING_COLORS,
  DAMAGE_COLORS,
  darkenColorForRoof,
  LAND_USE_COLORS,
  liftColorForHeight,
  RISK_LEVEL_COLORS,
  ROAD_COLORS,
  rgbaCss,
  WATER_COLOR,
} from '../materials/theme';

/** Alturas (m) amostradas para a interpolação de clareamento por altura. */
const HEIGHT_GRADIENT_STOPS_METERS = [9, 20, 40, 70, 120];

/**
 * Expressão MapLibre: clareia `base` conforme `height_m` sobe, mesma casas e
 * prédios de uma mesma categoria (cor/matiz) ficam distinguíveis por altura —
 * casas baixas com o tom saturado, prédios altos claros (leitura de skyline).
 */
function heightGradientExpression(base: RGBA): DataDrivenPropertyValueSpecification<string> {
  const stops: (number | string)[] = [0, rgbaCss(base)];
  for (const heightMeters of HEIGHT_GRADIENT_STOPS_METERS) {
    stops.push(heightMeters, rgbaCss(liftColorForHeight(base, heightMeters)));
  }
  return [
    'interpolate',
    ['linear'],
    ['coalesce', ['get', 'height_m'], 0],
    ...stops,
  ] as unknown as DataDrivenPropertyValueSpecification<string>;
}
import type { LayerKey } from '../../stores/appStore';

export type FeatureKind = 'building' | 'road' | 'water' | 'operational';

export interface CityStyleOptions {
  revisionId: string;
  visibility: Record<LayerKey, boolean>;
  boundaryBox?: { west: number; south: number; east: number; north: number } | null;
  /** Simulação de desastre concluída a exibir como overlay de intensidade (PGA). */
  activeSimulation?: {
    id: string;
    revisionId: string;
    west: number;
    south: number;
    east: number;
    north: number;
    replayFrameIndex: number | null;
  } | null;
}

const SOURCE_PREFIX = 'sos-';

function tileSource(
  revisionId: string,
  kind: string,
  minzoom: number,
  maxzoom: number,
  simulationId?: string,
): SourceSpecification {
  const query = simulationId ? `?simulationId=${encodeURIComponent(simulationId)}` : '';
  return {
    type: 'vector',
    tiles: [`${window.location.origin}/api/v1/tiles/${revisionId}/${kind}/{z}/{x}/{y}.mvt${query}`],
    minzoom,
    maxzoom,
    // promoteId: o id (uuid) do banco vira o feature id — habilita feature-state.
    promoteId: 'id',
  };
}

/**
 * Camadas urbanas como estilo nativo MapLibre (abordagem OpenMapTiles/Google-Maps-like):
 * fill-extrusion trata winding do MVT corretamente (paredes sempre presentes),
 * suporta base (min_height + ground_elevation) e gradiente vertical de sombreamento.
 * deck.gl permanece reservado para camadas de simulação (ADR-0003).
 */
export function buildCitySources(options: CityStyleOptions): Record<string, SourceSpecification> {
  const { revisionId } = options;
  const simulationId = options.activeSimulation?.revisionId === revisionId
    ? options.activeSimulation.id
    : undefined;
  return {
    // O backend mantém geometria sem simplificação a partir de z15; buscar até
    // z19 preserva contornos e picking preciso em vez de ampliar tiles z16.
    [`${SOURCE_PREFIX}buildings`]: tileSource(revisionId, 'buildings', 12, 19, simulationId),
    [`${SOURCE_PREFIX}roads`]: tileSource(revisionId, 'roads', 8, 19),
    [`${SOURCE_PREFIX}water`]: tileSource(revisionId, 'water', 6, 19),
    [`${SOURCE_PREFIX}land-use`]: tileSource(revisionId, 'land-use', 8, 19),
  };
}

/** Cor por estado de dano, vinda do tile da simulação (com fallback legado para feature-state). */
function damageColorExpression(): DataDrivenPropertyValueSpecification<string> {
  return [
    'match',
    ['coalesce', ['get', 'damage_state'], ['feature-state', 'damageState'], 'none'],
    'none', rgbaCss(DAMAGE_COLORS.none),
    'slight', rgbaCss(DAMAGE_COLORS.slight),
    'moderate', rgbaCss(DAMAGE_COLORS.moderate),
    'extensive', rgbaCss(DAMAGE_COLORS.extensive),
    'complete', rgbaCss(DAMAGE_COLORS.complete),
    rgbaCss(DAMAGE_COLORS.none),
  ] as unknown as DataDrivenPropertyValueSpecification<string>;
}

/** Match pela classe fina (casa/apartamento) com fallback no tipo agregado. */
function buildingTypeMatchExpression(
  colorFor: (base: RGBA) => RGBA,
): DataDrivenPropertyValueSpecification<string> {
  return [
    'match',
    ['coalesce', ['get', 'building_class'], ['get', 'building_type'], 'unknown'],
    'house', heightGradientExpression(colorFor(BUILDING_COLORS.house)),
    'apartment', heightGradientExpression(colorFor(BUILDING_COLORS.apartment)),
    'mixed_use', heightGradientExpression(colorFor(BUILDING_COLORS.mixed_use)),
    'residential', heightGradientExpression(colorFor(BUILDING_COLORS.residential)),
    'commercial', heightGradientExpression(colorFor(BUILDING_COLORS.commercial)),
    'industrial', heightGradientExpression(colorFor(BUILDING_COLORS.industrial)),
    'public', heightGradientExpression(colorFor(BUILDING_COLORS.public)),
    'hospital', heightGradientExpression(colorFor(BUILDING_COLORS.hospital)),
    'school', heightGradientExpression(colorFor(BUILDING_COLORS.school)),
    heightGradientExpression(colorFor(BUILDING_COLORS.unknown)),
  ] as unknown as DataDrivenPropertyValueSpecification<string>;
}

/** Expressão de cor semântica com seleção, dano do tile e gradiente por altura. */
function buildingColorExpression(): DataDrivenPropertyValueSpecification<string> {
  return [
    'case',
    ['boolean', ['feature-state', 'selected'], false],
    '#ffd666',
    [
      '!=',
      ['coalesce', ['get', 'damage_state'], ['feature-state', 'damageState'], 'none'],
      'none',
    ],
    damageColorExpression(),
    buildingTypeMatchExpression((base) => base),
  ] as unknown as DataDrivenPropertyValueSpecification<string>;
}

/** Mesma expressão, tom escurecido — usada pelo boné de telhado (sos-buildings-roof). */
function buildingRoofColorExpression(): DataDrivenPropertyValueSpecification<string> {
  return [
    'case',
    ['boolean', ['feature-state', 'selected'], false],
    '#ffd666',
    [
      '!=',
      ['coalesce', ['get', 'damage_state'], ['feature-state', 'damageState'], 'none'],
      'none',
    ],
    damageColorExpression(),
    buildingTypeMatchExpression(darkenColorForRoof),
  ] as unknown as DataDrivenPropertyValueSpecification<string>;
}

export function buildCityLayers(options: CityStyleOptions): LayerSpecification[] {
  const { visibility } = options;
  const layers: LayerSpecification[] = [];

  {
    layers.push({
      id: 'sos-land-use-fill',
      type: 'fill',
      source: `${SOURCE_PREFIX}land-use`,
      'source-layer': 'land_use',
      layout: { visibility: visibility.landUse ? 'visible' : 'none' },
      paint: {
        'fill-color': [
          'match',
          ['get', 'land_use_type'],
          'residential', rgbaCss(LAND_USE_COLORS.residential),
          'commercial', rgbaCss(LAND_USE_COLORS.commercial),
          'industrial', rgbaCss(LAND_USE_COLORS.industrial),
          'civic', rgbaCss(LAND_USE_COLORS.civic),
          'transport', rgbaCss(LAND_USE_COLORS.transport),
          'pavement', rgbaCss(LAND_USE_COLORS.pavement),
          'green', rgbaCss(LAND_USE_COLORS.green),
          'agricultural', rgbaCss(LAND_USE_COLORS.agricultural),
          rgbaCss(LAND_USE_COLORS.other),
        ],
      },
    });
  }

  {
    layers.push(
      {
        id: 'sos-water-fill',
        type: 'fill',
        source: `${SOURCE_PREFIX}water`,
        'source-layer': 'water',
        layout: { visibility: visibility.water ? 'visible' : 'none' },
        filter: ['==', ['geometry-type'], 'Polygon'],
        paint: { 'fill-color': rgbaCss(WATER_COLOR) },
      },
      {
        id: 'sos-water-line',
        type: 'line',
        source: `${SOURCE_PREFIX}water`,
        'source-layer': 'water',
        filter: ['==', ['geometry-type'], 'LineString'],
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
          visibility: visibility.water ? 'visible' : 'none',
        },
        paint: {
          'line-color': 'rgba(80, 140, 210, 0.85)',
          'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 8, 0.8, 16, 4],
        },
      },
    );
  }

  {
    const roadWidth = [
      'interpolate',
      ['exponential', 1.5],
      ['zoom'],
      8,
      ['match', ['get', 'road_class'], 'highway', 1.6, 'primary', 1.2, 'rail', 0.8, 0.5],
      18,
      [
        'match',
        ['get', 'road_class'],
        'highway', 20,
        'primary', 16,
        'secondary', 12,
        'tertiary', 9,
        'rail', 4,
        7,
      ],
    ] as ExpressionSpecification;
    layers.push(
      {
        // Contorno do tabuleiro: deixa pontes legíveis mesmo sobre água ou
        // outras vias. is_bridge aceita também viaduct/movable no backend.
        id: 'sos-bridges-casing',
        type: 'line',
        source: `${SOURCE_PREFIX}roads`,
        'source-layer': 'roads',
        filter: ['==', ['get', 'is_bridge'], true],
        layout: {
          'line-cap': 'butt',
          'line-join': 'round',
          visibility: visibility.roads ? 'visible' : 'none',
        },
        paint: {
          'line-color': 'rgba(45, 48, 54, 0.9)',
          'line-width': ['+', roadWidth, 4],
        },
      },
      {
        id: 'sos-roads-line',
        type: 'line',
        source: `${SOURCE_PREFIX}roads`,
        'source-layer': 'roads',
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
          visibility: visibility.roads ? 'visible' : 'none',
        },
        paint: {
          'line-color': [
            'match',
            ['get', 'road_class'],
            'highway', rgbaCss(ROAD_COLORS.highway),
            'primary', rgbaCss(ROAD_COLORS.primary),
            'secondary', rgbaCss(ROAD_COLORS.secondary),
            'tertiary', rgbaCss(ROAD_COLORS.tertiary),
            'residential', rgbaCss(ROAD_COLORS.residential),
            'service', rgbaCss(ROAD_COLORS.service),
            'path', rgbaCss(ROAD_COLORS.path),
            'cycleway', rgbaCss(ROAD_COLORS.cycleway),
            'rail', rgbaCss(ROAD_COLORS.rail),
            rgbaCss(ROAD_COLORS.minor),
          ],
          'line-width': roadWidth,
        },
      },
    );
  }

  {
    layers.push(
      {
        // Em zoom intermediário, footprints preservam toda a informação espacial
        // com custo muito menor que milhares de extrusões simultâneas.
        id: 'sos-buildings-footprint',
        type: 'fill',
        source: `${SOURCE_PREFIX}buildings`,
        'source-layer': 'buildings',
        minzoom: 12,
        maxzoom: 14,
        layout: { visibility: visibility.buildings ? 'visible' : 'none' },
        paint: {
          'fill-color': buildingColorExpression(),
          'fill-opacity': 0.82,
        },
      },
      {
        id: 'sos-buildings-3d',
        type: 'fill-extrusion',
        source: `${SOURCE_PREFIX}buildings`,
        'source-layer': 'buildings',
        minzoom: 14,
        layout: { visibility: visibility.buildings ? 'visible' : 'none' },
        paint: {
          'fill-extrusion-color': buildingColorExpression(),
          'fill-extrusion-height': ['coalesce', ['get', 'height_m'], 0],
          // Base = min_height (building:part). A elevação do solo vem do terreno
          // 3D do MapLibre (setTerrain) — somá-la aqui duplicaria o deslocamento;
          // ground_elevation_m permanece nos tiles como dado analítico.
          'fill-extrusion-base': ['coalesce', ['get', 'min_height_m'], 0],
          'fill-extrusion-opacity': 0.9,
          'fill-extrusion-vertical-gradient': true,
        },
      },
      {
        // Boné de telhado: segundo volume, mais estreito (footprint com buffer
        // negativo calculado no tile), aproximando telhado em cumeeira/pirâmide
        // sobre casas e construções com roof:shape != flat (BuildingRoofCalculator
        // na importação). Camada MVT separada ('buildings_roof') dentro do mesmo
        // tile de buildings — só existe onde roof_height_m > 0.
        id: 'sos-buildings-roof',
        type: 'fill-extrusion',
        source: `${SOURCE_PREFIX}buildings`,
        'source-layer': 'buildings_roof',
        minzoom: 14,
        layout: { visibility: visibility.buildings ? 'visible' : 'none' },
        paint: {
          'fill-extrusion-color': buildingRoofColorExpression(),
          'fill-extrusion-height': ['coalesce', ['get', 'height_m'], 0],
          'fill-extrusion-base': [
            '-', ['coalesce', ['get', 'height_m'], 0], ['coalesce', ['get', 'roof_height_m'], 0],
          ],
          'fill-extrusion-opacity': 0.9,
          'fill-extrusion-vertical-gradient': true,
        },
      },
    );
  }

  if (options.boundaryBox) {
    layers.push({
      id: 'sos-boundary-line',
      type: 'line',
      source: `${SOURCE_PREFIX}boundary`,
      layout: { visibility: visibility.boundary ? 'visible' : 'none' },
      paint: {
        'line-color': rgbaCss(BOUNDARY_COLOR),
        'line-width': 2.5,
        'line-dasharray': [3, 2],
      },
    });
  }

  return layers;
}

export const RISK_ZONE_SOURCE = 'sos-risk-zones';
export const OPERATIONAL_SOURCE = 'sos-operational-features';
export const SCIENTIFIC_SOURCE = 'sos-scientific-analysis';

/** Cor por nível de severidade — mesma zona usa o mesmo tom no fill e na borda. */
function riskZoneColorExpression(): DataDrivenPropertyValueSpecification<string> {
  return [
    'match',
    ['get', 'level'],
    'low', rgbaCss(RISK_LEVEL_COLORS.low),
    'moderate', rgbaCss(RISK_LEVEL_COLORS.moderate),
    'high', rgbaCss(RISK_LEVEL_COLORS.high),
    'severe', rgbaCss(RISK_LEVEL_COLORS.severe),
    rgbaCss(RISK_LEVEL_COLORS.low),
  ] as unknown as DataDrivenPropertyValueSpecification<string>;
}

/**
 * Camadas de exibição das zonas de risco já salvas — GeoJSON direto (mesmo
 * precedente de `sos-boundary`), não MVT: dataset pequeno e esparso (dezenas
 * por cidade, não milhares), sem o problema de escala que motivou MVT para
 * buildings.
 */
export function buildRiskZoneLayers(): LayerSpecification[] {
  return [
    {
      id: 'sos-risk-zones-fill',
      type: 'fill',
      source: RISK_ZONE_SOURCE,
      paint: { 'fill-color': riskZoneColorExpression(), 'fill-opacity': 0.25 },
    },
    {
      id: 'sos-risk-zones-line',
      type: 'line',
      source: RISK_ZONE_SOURCE,
      paint: { 'line-color': riskZoneColorExpression(), 'line-width': 2 },
    },
  ];
}

export function buildOperationalLayers(): LayerSpecification[] {
  const color = [
    'case',
    ['==', ['get', 'type'], 'search-sector'],
    [
      'match',
      ['get', 'priority'],
      1, '#dc2626',
      2, '#f97316',
      3, '#d946ef',
      4, '#a855f7',
      '#d946ef',
    ],
    [
      'match',
      ['get', 'type'],
      'risk-area', '#ef4444',
      'safe-area', '#22c55e',
      'support-point', '#38bdf8',
      'traffic-interruption', '#f97316',
      'victim-report', '#fb7185',
      'alert', '#fbbf24',
      'rescue-route', '#0ea5e9',
      'epicenter', '#fde047',
      'assessment-perimeter', '#f59e0b',
      '#94a3b8',
    ],
  ] as unknown as DataDrivenPropertyValueSpecification<string>;
  return [
    {
      id: 'sos-operational-fill',
      type: 'fill',
      source: OPERATIONAL_SOURCE,
      filter: ['==', '$type', 'Polygon'],
      paint: {
        'fill-color': color,
        'fill-opacity': [
          'case',
          ['in', ['get', 'status'], ['literal', ['cleared', 'closed']]],
          0.08,
          0.22,
        ],
      },
    },
    {
      id: 'sos-operational-line',
      type: 'line',
      source: OPERATIONAL_SOURCE,
      filter: ['!=', '$type', 'Point'],
      paint: {
        'line-color': color,
        'line-width': [
          'case',
          ['boolean', ['feature-state', 'selected'], false],
          5,
          ['==', ['get', 'priority'], 1],
          4,
          2.5,
        ],
        'line-dasharray': [2, 1],
      },
    },
    {
      id: 'sos-operational-point',
      type: 'circle',
      source: OPERATIONAL_SOURCE,
      filter: ['==', '$type', 'Point'],
      paint: {
        'circle-radius': [
          'case',
          ['boolean', ['feature-state', 'selected'], false],
          11,
          ['==', ['get', 'priority'], 1],
          9,
          7,
        ],
        'circle-color': color,
        'circle-stroke-color': '#fff',
        'circle-stroke-width': 2,
      },
    },
    {
      id: 'sos-operational-label',
      type: 'symbol',
      source: OPERATIONAL_SOURCE,
      minzoom: 10,
      layout: {
        'text-field': [
          'concat',
          ['coalesce', ['get', 'name'], 'Ocorrência'],
          [
            'case',
            ['has', 'priority'],
            ['concat', ' · P', ['to-string', ['get', 'priority']]],
            '',
          ],
        ],
        'text-size': 11,
        'text-offset': [0, 1.3],
        'text-anchor': 'top',
        'text-allow-overlap': false,
      },
      paint: {
        'text-color': '#f8fafc',
        'text-halo-color': '#020617',
        'text-halo-width': 1.5,
      },
    },
  ];
}

/**
 * Estilo genérico para resultados científicos. Cada ferramenta entrega
 * GeoJSON com propriedades visuais (`analysisColor`, `analysisWidth`,
 * `analysisRadius`, `analysisOpacity`, `analysisLabel`), portanto novos
 * desastres podem produzir overlays sem registrar novas layers no runtime.
 */
export function buildScientificAnalysisLayers(): LayerSpecification[] {
  return [
    {
      id: 'sos-scientific-fill',
      type: 'fill',
      source: SCIENTIFIC_SOURCE,
      filter: ['==', '$type', 'Polygon'],
      paint: {
        'fill-color': ['coalesce', ['get', 'analysisColor'], '#22d3ee'],
        'fill-opacity': ['coalesce', ['get', 'analysisOpacity'], 0.08],
      },
    },
    {
      id: 'sos-scientific-line',
      type: 'line',
      source: SCIENTIFIC_SOURCE,
      filter: ['!=', '$type', 'Point'],
      paint: {
        'line-color': ['coalesce', ['get', 'analysisColor'], '#22d3ee'],
        'line-width': ['coalesce', ['get', 'analysisWidth'], 2],
        'line-opacity': ['coalesce', ['get', 'analysisOpacity'], 0.8],
      },
    },
    {
      id: 'sos-scientific-point',
      type: 'circle',
      source: SCIENTIFIC_SOURCE,
      filter: ['==', '$type', 'Point'],
      paint: {
        'circle-radius': ['coalesce', ['get', 'analysisRadius'], 6],
        'circle-color': ['coalesce', ['get', 'analysisColor'], '#22d3ee'],
        'circle-opacity': ['coalesce', ['get', 'analysisOpacity'], 0.95],
        'circle-stroke-color': '#f8fafc',
        'circle-stroke-width': 1.5,
      },
    },
    {
      id: 'sos-scientific-label',
      type: 'symbol',
      source: SCIENTIFIC_SOURCE,
      minzoom: 7,
      filter: ['has', 'analysisLabel'],
      layout: {
        'text-field': ['get', 'analysisLabel'],
        'text-size': 10,
        'text-offset': [0, 1.2],
        'text-anchor': 'top',
        'text-allow-overlap': false,
      },
      paint: {
        'text-color': '#e0f2fe',
        'text-halo-color': '#020617',
        'text-halo-width': 1.5,
      },
    },
  ];
}

/** Ordem de prioridade do picking (o que o clique deve preferir). */
export const PICKABLE_LAYERS: { id: string; kind: FeatureKind }[] = [
  { id: 'sos-operational-point', kind: 'operational' },
  { id: 'sos-operational-line', kind: 'operational' },
  { id: 'sos-operational-fill', kind: 'operational' },
  { id: 'sos-buildings-3d', kind: 'building' },
  { id: 'sos-buildings-footprint', kind: 'building' },
  { id: 'sos-roads-line', kind: 'road' },
  { id: 'sos-water-fill', kind: 'water' },
  { id: 'sos-water-line', kind: 'water' },
];

export function boundaryGeoJson(box: {
  west: number;
  south: number;
  east: number;
  north: number;
}): GeoJSON.Feature {
  const { west, south, east, north } = box;
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: [
        [west, south],
        [east, south],
        [east, north],
        [west, north],
        [west, south],
      ],
    },
  };
}
