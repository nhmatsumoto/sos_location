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
  top: number;
  left: number;
}

export interface SelectedPanel {
  hotspot?: Hotspot;
  mode: 'sim' | 'splat';
  sourceLat?: number;
  sourceLng?: number;
  label?: string;
}
