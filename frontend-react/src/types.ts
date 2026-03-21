export interface Hotspot {
  id: string;
  lat: number;
  lng: number;
  score: number;
  type: string;
  confidence: number;
  estimatedAffected: number;
  riskFactors: string[];
  urgency: string;
  humanExposure: string;
}

export interface NewsUpdate {
  id: string;
  city: string;
  title: string;
  source: string;
  url: string;
  publishedAtUtc: string;
  thumbnailUrl: string;
  kind: 'alert' | 'government_action';
}

export interface MissingPerson {
  id: string;
  personName: string;
  age: number | null;
  city: string;
  lastSeenLocation: string;
  physicalDescription: string;
  additionalInfo: string;
  contactName: string;
  contactPhone: string;
  createdAtUtc: string;
}

export interface AttentionAlert {
  id: string;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical' | string;
  lat: number;
  lng: number;
  radiusMeters: number;
  createdAtUtc: string;
}

export interface SupportPoint {
  id: string;
  type: 'Atendimento' | 'Abrigo' | 'Distribuição' | string;
  lat: number;
  lng: number;
  notes: string;
  createdAtUtc: string;
}

export interface DonationTask {
  id: string;
  item: string;
  quantity: string;
  location: string;
  status: 'aberto' | 'em_andamento' | 'concluido';
}

export interface CatastropheEvent {
  id: string;
  title: string;
  description: string;
  atUtc: string;
  lat: number;
  lng: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface Catastrophe {
  id: string;
  name: string;
  type: 'Enchente' | 'Deslizamento' | 'Desabamento' | "Corrente d'água";
  status: 'Ativa' | 'Monitorada' | 'Encerrada';
  centerLat: number;
  centerLng: number;
  createdAtUtc: string;
  events: CatastropheEvent[];
}

export interface FlowCell {
  lat: number;
  lng: number;
  depth: number;
  terrain: number;
  velocity: number;
}

export interface FlowPathPoint {
  lat: number;
  lng: number;
  step: number;
  depth: number;
}

export interface FlowSimulationResponse {
  generatedAtUtc: string;
  floodedCells: FlowCell[];
  mainPath: FlowPathPoint[];
  maxDepth: number;
  estimatedAffectedAreaM2: number;
  disclaimer: string;
}

export interface ClimakiSnapshot {
  fetchedAtIso: string;
  locationLabel: string;
  temperatureC: number;
  rainLast24hMm: number;
  rainLast72hMm: number;
  soilMoisturePercent: number;
  saturationLevel: 'Baixa' | 'Moderada' | 'Alta' | 'Crítica';
  saturationRisk: string;
  providers?: string[];
}

export type FloatingPanelId = 'global' | 'terrain' | 'alerts' | 'splat';

export interface FloatingPanelPosition {
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
}

export interface MapDemarcation {
  id: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  type: string;
  tags: string[];
  createdAtUtc: string;
  createdBy: string;
  isActive: boolean;
}

export interface SelectedPanel {
  hotspot?: Hotspot;
  mode: 'sim' | 'splat' | 'demarcation';
  sourceLat?: number;
  sourceLng?: number;
  label?: string;
}
export interface EnvironmentalData {
  temp?: number;
  pressure?: number;
  humidity?: number;
  windSpeed?: number;
  rainfall?: number;
  soilSaturation?: number;
}

export interface GISBuilding {
  coordinates: [number, number][];
  levels?: number;
  height?: number; // height in meters from OSM data (building:height tag)
  buildingUse?: 'residential' | 'commercial' | 'industrial' | 'mixed';
  tags?: Record<string, string>;
}

export interface GISHighway {
  coordinates: [number, number][];
  type?: string; // 'motorway' | 'primary' | 'secondary' | 'residential' | etc.
  lanes?: number;
  tags?: Record<string, string>;
}

export interface GISWaterway {
  coordinates: [number, number][];
}

export interface GISWaterArea {
  coordinates: [number, number][];
  type?: string; // 'lake' | 'river' | 'reservoir'
}

export interface GISPark {
  coordinates: [number, number][];
  type?: string; // 'park' | 'forest' | 'grass'
}

export interface GISNaturalArea {
  coordinates: [number, number][];
  /** scrub | heath | grassland | wetland | sand | beach | bare_rock | cliff | farmland | allotments | vineyard | orchard */
  type: string;
  category?: string;
}

export interface GISLandUseZone {
  coordinates: [number, number][];
  /** residential | commercial | industrial | retail | cemetery | construction | military | leisure_sports_centre | leisure_pitch | leisure_stadium */
  type: string;
  category?: string;
}

export interface GISAmenity {
  /** Single-element array [[lat, lng]] — point-of-interest location */
  coordinates: [number, number][];
  /** hospital | clinic | school | university | fire_station | police | shelter | pharmacy | post_office | townhall */
  type: string;
  tags?: Record<string, string>;
}

export interface UrbanSimulationResult {
  bbox: number[];
  area_scale?: number;
  source_metadata?: Record<string, unknown>;
  raster_url?: string;
  points?: unknown[];
  polygons?: unknown[];
  topo_data?: number[][];
  elevationGrid?: number[][];
  urbanFeatures?: {
    highways?: GISHighway[];
    waterways?: GISWaterway[];
    buildings?: GISBuilding[];
    areaScale?: number; // world scale in world units (≈200 for a ~5km area)
    waterAreas?: GISWaterArea[];
    parks?: GISPark[];
    naturalAreas?: GISNaturalArea[];
    landUseZones?: GISLandUseZone[];
    amenities?: GISAmenity[];
    pedestrianAreas?: GISNaturalArea[];
    parkingLots?: GISNaturalArea[];
    trees?: GISAmenity[];
    barriers?: GISHighway[];
  };
  soil?: {
    type: string;
    clayPct?: number;
    sandPct?: number;
    siltPct?: number;
    ph?: number;
    permeability?: number;
    source?: string;
  };
  landCover?: LandCoverGrid;
  populationDensity?: PopulationDensityGrid;
  hotspots?: HotspotEntry[];
}

export interface LandCoverGrid {
  rows: number;
  cols: number;
  grid: number[]; // row-major Uint8 ESA WorldCover class codes
  source: string;
  isAvailable: boolean;
}

export interface SoilData {
  type: string;
  clayPct: number;
  sandPct: number;
  siltPct: number;
  ph: number;
  bulkDensity: number;
  organicCarbonDensity: number;
  permeability: number;
  phDescriptor: string;
  source: string;
}

export interface PopulationDensityGrid {
  rows: number;
  cols: number;
  grid: number[][];  // normalized 0-1 log scale
  maxRawValue: number;
  year: number;
  isAvailable: boolean;
  source: string;
}

export interface SituationalSnapshot {
  id: string;
  timestamp: string;
  center: [number, number];
  bounds: Array<[number, number]>;
  environmentalData: EnvironmentalData;
  terrainData?: unknown;
  buildings?: unknown;
}

// ── Ops form ──────────────────────────────────────────────────────────────────

export type OpsRecordType =
  | 'risk_area'
  | 'voluntario'
  | 'doacao'
  | 'resgate'
  | 'bombeiros'
  | 'exercito';

export interface OpsFormState {
  recordType: OpsRecordType;
  personName: string;
  lastSeenLocation: string;
  incidentTitle: string;
  severity: string;
}

export type SaveOpsFn = (
  opsForm: OpsFormState,
  lastClickedCoords: [number, number] | null,
  setOpenOpsModal: (v: boolean) => void,
  setLastClickedCoords: (v: [number, number] | null) => void,
) => void;

/** Matches the shape expected by MapInteractions component */
export interface SpatialFilter {
  center: [number, number];
  radius: number;
}

// ── Disaster events ───────────────────────────────────────────────────────────

export interface DisasterEvent {
  id: number | string;
  title: string;
  description?: string;
  eventType: string;
  severity: number;
  lat: number;
  lon: number;
  startAt?: string;
  endAt?: string;
  countryCode?: string;
  countryName?: string;
  sourceUrl?: string;
  provider?: string;
  providerEventId?: string;
  geometry?: unknown;
}

export interface DisasterCountryStat {
  country_code: string;
  country_name: string;
  count: number;
  avg_severity?: number;
}

export interface DisasterTimeseriesPoint {
  bucket: string;
  count: number;
  avg_severity?: number;
}

// ── Simulation run ────────────────────────────────────────────────────────────

export interface SimulationRunMetrics {
  maxDepthM?: number;
  affectedAreaM2?: number;
  peakFlowM3s?: number;
  evacuationRisk?: number;
  [key: string]: number | string | undefined;
}

export interface SimulationArtifacts {
  geojsonUrl?: string;
  rasterUrl?: string;
  reportUrl?: string;
  [key: string]: string | undefined;
}

export interface ScenarioParameters {
  intensity?: number;
  duration?: number;
  waterLevel?: number;
  windSpeed?: number;
  [key: string]: number | string | boolean | undefined;
}

// ── Hotspot ───────────────────────────────────────────────────────────────────

export interface HotspotEntry {
  lat: number;
  lng: number;
  radius?: number;
  intensity?: number;
  type?: string;
  [key: string]: unknown;
}

// ── GeoJSON ───────────────────────────────────────────────────────────────────

export interface GeoJSONPoint { type: 'Point'; coordinates: [number, number] }
export interface GeoJSONPolygon { type: 'Polygon'; coordinates: [number, number][][] }
export interface GeoJSONMultiPolygon { type: 'MultiPolygon'; coordinates: [number, number][][][] }
export type GeoJSONGeometry = GeoJSONPoint | GeoJSONPolygon | GeoJSONMultiPolygon;
