import { apiClient } from './apiClient';

export interface RiskFactors {
  alertCount: number;
  environmental: {
    humidity: number;
    temp:     number;
    seismic:  number;
  };
  alertsSample: string[];
}

export interface RiskScore {
  lat:         number | null;
  lon:         number | null;       // mapped from Python "lng"
  riskScore:   number;              // 0..1  (Python score / 100)
  severity:    'critical' | 'high' | 'medium' | 'low';  // lowercase
  country:     string;
  location:    string;
  lastUpdated: string;
  factors?:    RiskFactors;
}

export interface RiskAnalytics {
  totalLocations:             number;
  criticalCount:              number;
  highCount:                  number;
  mediumCount:                number;
  lowCount:                   number;
  affectedPopulation:         number;
  criticalInfrastructureCount: number;
}

export interface RiskAssessment {
  model: {
    name:    string;
    version: string;
  };
  riskMap:    RiskScore[];
  analytics:  RiskAnalytics;
  generatedAt: string;
}

export const riskApi = {
  async getAssessment(): Promise<RiskAssessment> {
    const response = await apiClient.get<RiskAssessment>('/api/risk/assessment');
    return response.data;
  },

  async pipelineSync(): Promise<{ status: string; message: string }> {
    const response = await apiClient.post<{ status: string; message: string }>('/api/risk/pipeline-sync');
    return response.data;
  },
};
