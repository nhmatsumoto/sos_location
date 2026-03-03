import { apiClient } from './apiClient';

export const modulesApi = {
  listIncidents: async () => (await apiClient.get('/api/incidents')).data,
  getIncident: async (id: number) => (await apiClient.get(`/api/incidents/${id}`)).data,
  listCampaigns: async (incidentId: number) => (await apiClient.get(`/api/incidents/${incidentId}/support/campaigns`)).data,
  createCampaign: async (incidentId: number, payload: any) => (await apiClient.post(`/api/incidents/${incidentId}/support/campaigns`, payload)).data,
  listDonations: async (incidentId: number) => (await apiClient.get(`/api/incidents/${incidentId}/support/donations/money`)).data,
  createDonation: async (incidentId: number, payload: any) => (await apiClient.post(`/api/incidents/${incidentId}/support/donations/money`, payload)).data,
  listExpenses: async (incidentId: number) => (await apiClient.get(`/api/incidents/${incidentId}/support/expenses`)).data,
  createExpense: async (incidentId: number, payload: any) => (await apiClient.post(`/api/incidents/${incidentId}/support/expenses`, payload)).data,
  listSearchAreas: async (incidentId: number) => (await apiClient.get(`/api/incidents/${incidentId}/rescue/search-areas`)).data,
  createSearchArea: async (incidentId: number, payload: any) => (await apiClient.post(`/api/incidents/${incidentId}/rescue/search-areas`, payload)).data,
  patchSearchArea: async (incidentId: number, id: number, payload: any) => (await apiClient.patch(`/api/incidents/${incidentId}/rescue/search-areas/${id}`, payload)).data,
  listAssignments: async (incidentId: number) => (await apiClient.get(`/api/incidents/${incidentId}/rescue/assignments`)).data,
  createAssignment: async (incidentId: number, payload: any) => (await apiClient.post(`/api/incidents/${incidentId}/rescue/assignments`, payload)).data,
  publicIncidents: async () => (await apiClient.get('/api/public/incidents')).data,
  publicSnapshot: async (incidentId: number) => (await apiClient.get(`/api/public/incidents/${incidentId}/snapshot/latest`)).data,
  publicSearchAreas: async (incidentId: number) => (await apiClient.get(`/api/public/incidents/${incidentId}/rescue/search-areas`)).data,
};
