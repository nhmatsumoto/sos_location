import { apiClient } from './apiClient';
import type { GeoJSONGeometry, ScenarioParameters, SimulationRunMetrics, SimulationArtifacts } from '../types';

export interface SimulationArea {
  id: string;
  name: string;
  bbox_min_lat: number;
  bbox_min_lng: number;
  bbox_max_lat: number;
  bbox_max_lng: number;
  polygon_geometry: GeoJSONGeometry | null;
  created_at: string;
}

export interface ScenarioBundle {
  id: string;
  area: string;
  version: string;
  status: 'pending' | 'extracting' | 'ready' | 'failed';
  terrain_path?: string;
  buildings_path?: string;
  parameters: ScenarioParameters;
}

export interface SimulationRun {
  id: string;
  scenario: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  water_level_start: number;
  rainfall_mm: number;
  duration_hours: number;
  metrics: SimulationRunMetrics | null;
  artifacts: SimulationArtifacts | null;
}

export const simulationService = {
  async listAreas() {
    return (await apiClient.get<SimulationArea[]>('/api/simulation/areas')).data;
  },
  
  async createArea(data: Partial<SimulationArea>) {
    return (await apiClient.post<SimulationArea>('/api/simulation/areas', data)).data;
  },
  
  async getArea(id: string) {
    return (await apiClient.get<SimulationArea>(`/api/simulation/areas/${id}`)).data;
  },
  
  async listScenarios(areaId: string) {
    return (await apiClient.get<ScenarioBundle[]>(`/api/simulation/areas/${areaId}/scenarios`)).data;
  },
  
  async createScenario(areaId: string, data: Partial<ScenarioBundle> = {}) {
    return (await apiClient.post<ScenarioBundle>(`/api/simulation/areas/${areaId}/scenarios`, data)).data;
  },
  
  async listRuns(scenarioId: string) {
    return (await apiClient.get<SimulationRun[]>(`/api/simulation/scenarios/${scenarioId}/runs`)).data;
  },
  
  async createRun(scenarioId: string, data: Partial<SimulationRun>) {
    return (await apiClient.post<SimulationRun>(`/api/simulation/scenarios/${scenarioId}/runs`, data)).data;
  }
};
