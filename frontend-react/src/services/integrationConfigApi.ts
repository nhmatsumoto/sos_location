import { apiClient } from './apiClient';

export interface IntegrationConfig {
  id:              string;
  name:            string;
  category:        string;
  description:     string;
  defaultEndpoint: string;
  customEndpoint?: string;
  apiKey?:         string;
  enabled:         boolean;
  authRequired:    boolean;
  status:          'configured' | 'unconfigured' | 'error';
  lastTestedAt?:   string;
  lastTestOk?:     boolean;
}

export interface IntegrationConfigUpdateDto {
  customEndpoint?: string;
  apiKey?:         string;
  enabled:         boolean;
}

export interface TestResult {
  ok:         boolean;
  statusCode?: number;
  error?:      string;
  testedAt:    string;
}

export const integrationConfigApi = {
  getAll(): Promise<IntegrationConfig[]> {
    return apiClient.get<IntegrationConfig[]>('/api/integration-configs').then(r => r.data);
  },

  get(id: string): Promise<IntegrationConfig> {
    return apiClient.get<IntegrationConfig>(`/api/integration-configs/${id}`).then(r => r.data);
  },

  update(id: string, dto: IntegrationConfigUpdateDto): Promise<IntegrationConfig> {
    return apiClient.put<IntegrationConfig>(`/api/integration-configs/${id}`, dto).then(r => r.data);
  },

  test(id: string): Promise<TestResult> {
    return apiClient.post<TestResult>(`/api/integration-configs/${id}/test`, {}).then(r => r.data);
  },
};
