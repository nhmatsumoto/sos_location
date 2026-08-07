/**
 * Tema de materiais do SOS_LOCATION.
 *
 * Decisão de arquitetura: feições urbanas são renderizadas sem texturas —
 * materiais sólidos, cores semânticas e iluminação. Uma única camada raster
 * OSM é aceita como contexto cartográfico global; satélite/ortofoto continuam
 * proibidos (verificado por teste automatizado).
 */

export type RGBA = [number, number, number, number];

export const BACKGROUND_COLOR = '#0b0f14';
export const TERRAIN_COLOR = '#161c24';

/** Cores semânticas por categoria de edifício (base opaca, material fosco). */
export const BUILDING_COLORS: Record<string, RGBA> = {
  house: [132, 158, 190, 255],
  apartment: [158, 174, 199, 255],
  mixed_use: [196, 159, 112, 255],
  residential: [141, 163, 191, 255],
  commercial: [217, 166, 98, 255],
  industrial: [154, 137, 176, 255],
  public: [96, 176, 179, 255],
  hospital: [214, 106, 106, 255],
  school: [126, 181, 122, 255],
  unknown: [120, 128, 138, 255],
};

export const BUILDING_HIGHLIGHT: RGBA = [255, 214, 102, 200];

/** Cores por nível de severidade de uma zona de risco desenhada manualmente. */
export const RISK_LEVEL_COLORS: Record<string, RGBA> = {
  low: [59, 130, 246, 255],
  moderate: [234, 179, 8, 255],
  high: [249, 115, 22, 255],
  severe: [239, 68, 68, 255],
};

export const ROAD_COLORS: Record<string, RGBA> = {
  highway: [232, 196, 120, 220],
  primary: [210, 180, 130, 210],
  secondary: [190, 170, 140, 200],
  tertiary: [170, 165, 150, 190],
  residential: [140, 145, 155, 180],
  service: [120, 125, 135, 150],
  path: [110, 120, 115, 140],
  cycleway: [110, 140, 125, 150],
  rail: [156, 116, 156, 200],
  minor: [125, 130, 140, 160],
  unknown: [120, 125, 135, 150],
};

/** Água: azul translúcido (transparência é material, não textura). */
export const WATER_COLOR: RGBA = [64, 120, 192, 170];

export const LAND_USE_COLORS: Record<string, RGBA> = {
  residential: [90, 105, 125, 60],
  commercial: [140, 115, 80, 60],
  industrial: [110, 95, 130, 60],
  civic: [80, 130, 145, 72],
  transport: [125, 120, 110, 68],
  pavement: [118, 122, 128, 82],
  green: [80, 130, 90, 80],
  agricultural: [110, 125, 85, 60],
  other: [100, 105, 115, 40],
};

export const BOUNDARY_COLOR: RGBA = [255, 214, 102, 180];

/** Cores por estado de dano estrutural (resposta sísmica) — escala clara→escura de severidade. */
export const DAMAGE_COLORS: Record<string, RGBA> = {
  none: [141, 163, 191, 255],
  slight: [232, 214, 90, 255],
  moderate: [224, 158, 60, 255],
  extensive: [206, 92, 56, 255],
  complete: [110, 32, 32, 255],
};

/** Altura (m) na qual o clareamento por altura atinge seu máximo. */
export const HEIGHT_LIFT_REFERENCE_METERS = 120;

/**
 * Clareia uma cor semântica proporcionalmente à altura do edifício (gradiente
 * calculado, não é textura): casas baixas ficam com o tom base saturado,
 * prédios altos clareiam progressivamente, dando leitura de skyline sem
 * perder a categoria (matiz) do tipo de uso.
 */
export function liftColorForHeight(base: RGBA, heightMeters: number): RGBA {
  const t = Math.min(Math.max(heightMeters, 0) / HEIGHT_LIFT_REFERENCE_METERS, 1);
  const lift = 45 + t * 70;
  return [
    Math.min(255, base[0] + lift),
    Math.min(255, base[1] + lift * 1.05),
    Math.min(255, base[2] + lift * 1.15),
    base[3],
  ];
}

/**
 * Escurece uma cor semântica para o plano do telhado (mesmo matiz da parede,
 * tom mais escuro) — cálculo de material, não textura.
 */
export function darkenColorForRoof(base: RGBA): RGBA {
  const factor = 0.72;
  return [base[0] * factor, base[1] * factor, base[2] * factor, base[3]];
}

export function buildingColor(type: string | undefined, heightMeters?: number): RGBA {
  const base = BUILDING_COLORS[type ?? 'unknown'] ?? BUILDING_COLORS.unknown;
  if (heightMeters !== undefined && heightMeters > 0) {
    return liftColorForHeight(base, heightMeters);
  }
  return base;
}

export function roadColor(roadClass: string | undefined): RGBA {
  return ROAD_COLORS[roadClass ?? 'unknown'] ?? ROAD_COLORS.unknown;
}

export function landUseColor(type: string | undefined): RGBA {
  return LAND_USE_COLORS[type ?? 'other'] ?? LAND_USE_COLORS.other;
}

/** Converte RGBA [0..255] para string CSS aceita por expressões MapLibre. */
export function rgbaCss([r, g, b, a]: RGBA): string {
  return `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`;
}

/**
 * Estilo base do MapLibre: fundo sólido + globo + céu/atmosfera procedurais
 * e luz direcional para o sombreamento das extrusões (fill-extrusion).
 * A única textura é o mapa-base terrestre público, para dar referência visual
 * aos continentes no globo. As camadas urbanas continuam sem textura.
 */
export function createBaseStyle(): Record<string, unknown> {
  return {
    version: 8,
    name: 'sos-location-base',
    projection: { type: 'globe' },
    // Luz viewport-anchored: paredes recebem sombreamento por orientação,
    // nenhuma face fica preta (técnica padrão dos renderers fill-extrusion).
    light: {
      anchor: 'viewport',
      position: [1.2, 210, 30],
      color: '#ffffff',
      intensity: 0.35,
    },
    // Céu/nevoeiro calculados (não são texturas): profundidade no horizonte.
    sky: {
      'sky-color': '#101a28',
      'horizon-color': '#1c2836',
      'fog-color': '#0b0f14',
      'sky-horizon-blend': 0.5,
      'horizon-fog-blend': 0.5,
      'fog-ground-blend': 0.9,
    },
    sources: {
      // Contexto cartográfico global; fica abaixo de todas as fontes SOS e não
      // altera materiais de edifícios, terreno ou resultados de simulação.
      'sos-earth-basemap': {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        minzoom: 0,
        maxzoom: 19,
        attribution: '© OpenStreetMap contributors',
      },
    },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': BACKGROUND_COLOR } },
      {
        id: 'sos-earth-basemap', type: 'raster', source: 'sos-earth-basemap',
        paint: { 'raster-opacity': 0.82, 'raster-saturation': -0.15, 'raster-contrast': 0.08 },
      },
    ],
  };
}
