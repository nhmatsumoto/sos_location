import { apiClient } from './apiClient';

export interface SupportPoint {
  id: string;
  recordType: string;
  title: string;
  lat: number;
  lng: number;
  status: string;
  metadata?: { type?: string; capacity?: number };
}

export interface RiskArea {
  id: string;
  recordType: string;
  title: string;
  severity: string;
  lat: number;
  lng: number;
  radiusMeters?: number | null;
  status: string;
  metadata?: { notes?: string };
}

export interface RescueGroup {
  id: string;
  name: string;
  members: number;
  specialty: string;
  status: string;
  lat?: number | null;
  lng?: number | null;
}

export interface FlowPath {
  id: string;
  name: string;
  coordinates: Array<{ lat: number; lng: number }>;
}

export interface MissingPersonLite {
  id: string;
  personName: string;
  lastSeenLocation: string;
  lat?: number | null;
  lng?: number | null;
}

export interface OperationsSnapshot {
  generatedAtUtc: string;
  kpis: {
    criticalAlerts: number;
    activeTeams: number;
    rain24hMm: number;
    suppliesInTransit: number;
  };
  layers: {
    supportPoints: SupportPoint[];
    riskAreas: RiskArea[];
    rescueGroups: RescueGroup[];
    flowPaths: FlowPath[];
    missingPersons: MissingPersonLite[];
    hotspots: Array<{ id: string; lat: number; lng: number; score: number; type: string }>;
  };
  weather: {
    summary: string;
    rain24hMm: number;
    soilSaturation: string;
  };
  logistics: Array<{ id: string; item: string; quantity: number; status: string; priority: string }>;
}

export const operationsApi = {
  async snapshot() {
    const response = await apiClient.get<OperationsSnapshot>('/api/operations/snapshot');
    return response.data;
  },
  async createSupportPoint(payload: { name: string; type: string; lat: number; lng: number; capacity?: number }) {
    const response = await apiClient.post('/api/support-points', payload);
    return response.data;
  },
  async createRiskArea(payload: { name: string; severity: string; lat: number; lng: number; radiusMeters?: number; notes?: string }) {
    const response = await apiClient.post('/api/risk-areas', payload);
    return response.data;
  },
  async createMapAnnotation(payload: {
    recordType: 'support_point' | 'risk_area' | 'missing_person';
    title: string;
    lat: number;
    lng: number;
    severity?: string;
    radiusMeters?: number;
    status?: string;
    personName?: string;
    lastSeenLocation?: string;
    contactPhone?: string;
    city?: string;
    metadata?: Record<string, unknown>;
  }) {
    const response = await apiClient.post('/api/map-annotations', payload);
    return response.data;
  },
  async createRescueGroup(payload: { name: string; members: number; specialty: string; status: string; lat?: number; lng?: number }) {
    const response = await apiClient.post('/api/rescue-groups', payload);
    return response.data;
  },
  async createSupply(payload: { item: string; quantity: number; unit?: string; origin?: string; destination?: string; status?: string; priority?: string }) {
    const response = await apiClient.post('/api/supply-logistics', payload);
    return response.data;
  },
};
