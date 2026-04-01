/**
 * Semantic land-use classification for satellite imagery.
 * Each pixel/tile of the satellite canvas is classified into one of these categories,
 * which drives color-coded 3D reconstruction without textures.
 */
export const SemanticClass = {
  UNKNOWN: 0,
  VEGETATION: 1,    // Parks, forest, fields — green (varying by NDVI density)
  WATER: 2,         // Rivers, lakes, sea — blue
  ROAD: 3,          // Asphalt, paving — medium gray
  BUILDING_LOW: 4,  // Houses, low residential — dark gray / black
  BUILDING_HIGH: 5, // Towers, commercial — purple
  BRIDGE: 6,        // Bridges, overpasses — yellow-orange
  BARE_GROUND: 7,   // Sand, dirt, exposed soil — tan/brown
  SLUM: 8,          // Informal settlements — red-orange
  SPORTS: 9,        // Stadiums, pitches, courts — lime green
} as const;

export type SemanticClass = (typeof SemanticClass)[keyof typeof SemanticClass];

export interface SemanticCell {
  class: SemanticClass;
  intensity: number; // 0-1: NDVI for vegetation, shadow depth for buildings, etc.
  r: number;         // avg red 0-255 of source tile pixels
  g: number;         // avg green
  b: number;         // avg blue
}

export interface SemanticGrid {
  cells: SemanticCell[][];
  cols: number;
  rows: number;
  tileSize: number; // source pixels per semantic cell
  metadata: SemanticMetadata;
}

export interface SemanticMetadata {
  vegetationPct: number;
  waterPct: number;
  roadPct: number;
  buildingPct: number;
  slumPct: number;
  urbanDensityScore: number; // 0-100
}

// WebGL color [R, G, B] 0-1 for each semantic class
export const SEMANTIC_COLORS: Record<SemanticClass, [number, number, number]> = {
  [SemanticClass.UNKNOWN]:       [0.12, 0.12, 0.12],
  [SemanticClass.VEGETATION]:    [0.08, 0.50, 0.08],
  [SemanticClass.WATER]:         [0.04, 0.22, 0.78],
  [SemanticClass.ROAD]:          [0.38, 0.38, 0.40],
  [SemanticClass.BUILDING_LOW]:  [0.16, 0.16, 0.16],
  [SemanticClass.BUILDING_HIGH]: [0.42, 0.08, 0.68],
  [SemanticClass.BRIDGE]:        [0.82, 0.56, 0.08],
  [SemanticClass.BARE_GROUND]:   [0.55, 0.42, 0.26],
  [SemanticClass.SLUM]:          [0.72, 0.20, 0.06],
  [SemanticClass.SPORTS]:        [0.26, 0.84, 0.16],
};

// Estimated height in meters per semantic class (used for 3D extrusion)
export const SEMANTIC_HEIGHT_M: Record<SemanticClass, number> = {
  [SemanticClass.UNKNOWN]:       0,
  [SemanticClass.VEGETATION]:    0,
  [SemanticClass.WATER]:         0,
  [SemanticClass.ROAD]:          0.3,
  [SemanticClass.BUILDING_LOW]:  7,    // ~2 floors × 3.5m
  [SemanticClass.BUILDING_HIGH]: 35,   // base ~10 floors; intensity scales up to ~20
  [SemanticClass.BRIDGE]:        5,
  [SemanticClass.BARE_GROUND]:   0,
  [SemanticClass.SLUM]:          4,    // ~1 floor
  [SemanticClass.SPORTS]:        0,
};

/**
 * ESA WorldCover 2021 class codes → SemanticClass mapping.
 * WorldCover class codes: 10=Tree cover, 20=Shrubland, 30=Grassland, 40=Cropland,
 * 50=Built-up, 60=Bare/sparse vegetation, 70=Snow/ice, 80=Permanent water,
 * 90=Herbaceous wetland, 95=Mangroves, 100=Moss/lichen
 *
 * Strategy: WorldCover wins on high-confidence classes (tree cover, water bodies).
 * RGB heuristics maintain primacy for BUILDING_LOW vs BUILDING_HIGH distinction
 * since WorldCover code 50 (built-up) does not encode building height.
 */
export const WORLDCOVER_TO_SEMANTIC: Record<number, SemanticClass> = {
  10:  SemanticClass.VEGETATION,    // Tree cover (high confidence)
  20:  SemanticClass.VEGETATION,    // Shrubland
  30:  SemanticClass.VEGETATION,    // Grassland
  40:  SemanticClass.BARE_GROUND,   // Cropland (treated as bare/agricultural)
  50:  SemanticClass.BUILDING_LOW,  // Built-up — height still determined by RGB heuristic
  60:  SemanticClass.BARE_GROUND,   // Bare/sparse vegetation
  70:  SemanticClass.WATER,         // Snow/ice (treated as bright water surface)
  80:  SemanticClass.WATER,         // Permanent water bodies (high confidence)
  90:  SemanticClass.WATER,         // Herbaceous wetland
  95:  SemanticClass.VEGETATION,    // Mangroves
  100: SemanticClass.VEGETATION,    // Moss/lichen
};

/** WorldCover class codes that should always override the RGB heuristic result. */
export const WORLDCOVER_HIGH_CONFIDENCE = new Set([10, 80]); // Tree cover, Permanent water

export const SEMANTIC_CLASS_NAMES: Record<SemanticClass, string> = {
  [SemanticClass.UNKNOWN]:       'Unknown',
  [SemanticClass.VEGETATION]:    'Vegetation',
  [SemanticClass.WATER]:         'Water',
  [SemanticClass.ROAD]:          'Road',
  [SemanticClass.BUILDING_LOW]:  'Residential',
  [SemanticClass.BUILDING_HIGH]: 'Commercial',
  [SemanticClass.BRIDGE]:        'Bridge',
  [SemanticClass.BARE_GROUND]:   'Bare Ground',
  [SemanticClass.SLUM]:          'Informal Settlement',
  [SemanticClass.SPORTS]:        'Sports / Stadium',
};
