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

export interface MapAnnotationDto {
  id: string;
  recordType: string;
  title: string;
  lat: number;
  lng: number;
  severity?: string;
  radiusMeters?: number;
  status?: string;
  metadata?: Record<string, unknown>;
  createdAtUtc?: string;
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

export interface SupplyItem {
  id: string;
  item: string;
  quantity: number;
  unit: string;
  origin: string;
  destination: string;
  status: string;
  priority: string;
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
    timeline?: Array<{
      id: string;
      at: string;
      title: string;
      description?: string;
      eventType: string;
      severity: number | string;
      lat: number;
      lng: number;
      source?: string;
      sourceUrl?: string;
      affectedPopulation?: number;
    }>;
  };
  weather: {
    summary: string;
    rain24hMm: number;
    rainNext24hMm?: number;
    stormRisk?: string;
    windGustKmh?: number | null;
    soilSaturation: string;
    providers?: Array<Record<string, unknown>>;
  };
  logistics: Array<{ id: string; item: string; quantity: number; status: string; priority: string }>;
}

export const operationsApi = {
  async snapshot() {
    const response = await apiClient.get<OperationsSnapshot>('/api/operations/snapshot', { __skipGlobalNotify: true } as any);
    return response.data;
  },

  async listSupportPoints() {
    try {
      const response = await apiClient.get<SupportPoint[]>('/api/support-points', { __skipGlobalNotify: true } as any);
      return response.data;
    } catch {
      return [];
    }
  },
  async createSupportPoint(payload: { name: string; type: string; lat: number; lng: number; capacity?: number; status?: string }) {
    const response = await apiClient.post('/api/support-points', payload);
    return response.data;
  },
  async updateSupportPoint(id: string, payload: { name: string; type: string; lat: number; lng: number; capacity?: number; status?: string }) {
    const response = await apiClient.put(`/api/support-points?id=${id}`, payload);
    return response.data;
  },
  async deleteSupportPoint(id: string) {
    const response = await apiClient.delete(`/api/support-points?id=${id}`);
    return response.data;
  },

  async listRiskAreas() {
    try {
      const response = await apiClient.get<RiskArea[]>('/api/risk-areas', { __skipGlobalNotify: true } as any);
      return response.data;
    } catch {
      return [];
    }
  },
  async createRiskArea(payload: { name: string; severity: string; lat: number; lng: number; radiusMeters?: number; notes?: string; status?: string }) {
    const response = await apiClient.post('/api/risk-areas', payload);
    return response.data;
  },
  async updateRiskArea(id: string, payload: { name: string; severity: string; lat: number; lng: number; radiusMeters?: number; notes?: string; status?: string }) {
    const response = await apiClient.put(`/api/risk-areas?id=${id}`, payload);
    return response.data;
  },
  async deleteRiskArea(id: string) {
    const response = await apiClient.delete(`/api/risk-areas?id=${id}`);
    return response.data;
  },


  async listMapAnnotations() {
    try {
      const response = await apiClient.get<MapAnnotationDto[]>('/api/map-annotations', { __skipGlobalNotify: true } as any);
      return response.data;
    } catch {
      return [];
    }
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

  async listRescueGroups() {
    try {
      const response = await apiClient.get<RescueGroup[]>('/api/rescue-groups', { __skipGlobalNotify: true } as any);
      return response.data;
    } catch {
      return [];
    }
  },
  async createRescueGroup(payload: { name: string; members: number; specialty: string; status: string; lat?: number; lng?: number }) {
    const response = await apiClient.post('/api/rescue-groups', payload);
    return response.data;
  },
  async updateRescueGroup(id: string, payload: { name: string; members: number; specialty: string; status: string; lat?: number; lng?: number }) {
    const response = await apiClient.put(`/api/rescue-groups?id=${id}`, payload);
    return response.data;
  },
  async deleteRescueGroup(id: string) {
    const response = await apiClient.delete(`/api/rescue-groups?id=${id}`);
    return response.data;
  },

  async listSupplies() {
    try {
      const response = await apiClient.get<SupplyItem[]>('/api/supply-logistics', { __skipGlobalNotify: true } as any);
      return response.data;
    } catch {
      return [];
    }
  },
  async createSupply(payload: { item: string; quantity: number; unit?: string; origin?: string; destination?: string; status?: string; priority?: string }) {
    const response = await apiClient.post('/api/supply-logistics', payload);
    return response.data;
  },
  async updateSupply(id: string, payload: { item: string; quantity: number; unit?: string; origin?: string; destination?: string; status?: string; priority?: string }) {
    const response = await apiClient.put(`/api/supply-logistics?id=${id}`, payload);
    return response.data;
  },
  async deleteSupply(id: string) {
    const response = await apiClient.delete(`/api/supply-logistics?id=${id}`);
    return response.data;
  },
};
