/**
 * Tema de materiais do SOS_LOCATION.
 *
 * Decisão de arquitetura: a cidade é renderizada SEM texturas — apenas
 * materiais sólidos, cores semânticas e iluminação. Nenhuma camada raster,
 * satélite ou ortofoto pode ser registrada (verificado por teste automatizado).
 */

export type RGBA = [number, number, number, number];

export const BACKGROUND_COLOR = '#0b0f14';
export const TERRAIN_COLOR = '#161c24';

/** Cores semânticas por categoria de edifício (base opaca, material fosco). */
export const BUILDING_COLORS: Record<string, RGBA> = {
  residential: [141, 163, 191, 255],
  commercial: [217, 166, 98, 255],
  industrial: [154, 137, 176, 255],
  public: [96, 176, 179, 255],
  hospital: [214, 106, 106, 255],
  school: [126, 181, 122, 255],
  unknown: [120, 128, 138, 255],
};

export const BUILDING_HIGHLIGHT: RGBA = [255, 214, 102, 200];

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

export function buildingColor(type: string | undefined, heightMeters?: number): RGBA {
  const base = BUILDING_COLORS[type ?? 'unknown'] ?? BUILDING_COLORS.unknown;
  // Gradiente calculado (não é textura): edifícios sem categoria semântica
  // clareiam com a altura, dando leitura de skyline em áreas OSM "building=yes".
  if ((type === undefined || type === 'unknown') && heightMeters !== undefined && heightMeters > 0) {
    const t = Math.min(heightMeters / 120, 1);
    const lift = 45 + t * 70;
    return [
      Math.min(255, base[0] + lift),
      Math.min(255, base[1] + lift * 1.05),
      Math.min(255, base[2] + lift * 1.15),
      255,
    ];
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
 * Sem sources externas, sem raster, sem glyphs/sprites remotos — offline.
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
    sources: {},
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': BACKGROUND_COLOR } },
    ],
  };
}
