import type {
  DataDrivenPropertyValueSpecification,
  LayerSpecification,
  SourceSpecification,
} from 'maplibre-gl';
import {
  BOUNDARY_COLOR,
  BUILDING_COLORS,
  DAMAGE_COLORS,
  LAND_USE_COLORS,
  ROAD_COLORS,
  rgbaCss,
  WATER_COLOR,
} from '../materials/theme';
import type { LayerKey } from '../../stores/appStore';

export type FeatureKind = 'building' | 'road' | 'water';

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
    [`${SOURCE_PREFIX}buildings`]: tileSource(revisionId, 'buildings', 12, 16, simulationId),
    [`${SOURCE_PREFIX}roads`]: tileSource(revisionId, 'roads', 8, 16),
    [`${SOURCE_PREFIX}water`]: tileSource(revisionId, 'water', 6, 16),
    [`${SOURCE_PREFIX}land-use`]: tileSource(revisionId, 'land-use', 8, 16),
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
    [
      'match',
      ['get', 'building_type'],
      'residential', rgbaCss(BUILDING_COLORS.residential),
      'commercial', rgbaCss(BUILDING_COLORS.commercial),
      'industrial', rgbaCss(BUILDING_COLORS.industrial),
      'public', rgbaCss(BUILDING_COLORS.public),
      'hospital', rgbaCss(BUILDING_COLORS.hospital),
      'school', rgbaCss(BUILDING_COLORS.school),
      // unknown: gradiente calculado por altura (leitura de skyline).
      [
        'interpolate',
        ['linear'],
        ['coalesce', ['get', 'height_m'], 0],
        0, '#454c56',
        25, '#707a87',
        80, '#a8b3c1',
        180, '#dde5ef',
      ],
    ],
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
    layers.push({
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
        'line-width': [
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
        ],
      },
    });
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

/** Ordem de prioridade do picking (o que o clique deve preferir). */
export const PICKABLE_LAYERS: { id: string; kind: FeatureKind }[] = [
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
