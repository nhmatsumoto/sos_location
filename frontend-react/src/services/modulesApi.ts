import { apiClient } from './apiClient';
import { extractList } from '../lib/dataNormalization';

export const modulesApi = {
  listIncidents: async () => extractList((await apiClient.get('/Incidents')).data),
  getIncident: async (id: number) => (await apiClient.get(`/Incidents/${id}`)).data,
  
  listCampaigns: async (incidentId: number) => extractList((await apiClient.get(`/Incidents/${incidentId}/support/campaigns`)).data),
  createCampaign: async (incidentId: number, payload: unknown) => (await apiClient.post(`/Incidents/${incidentId}/support/campaigns`, payload)).data,
  
  listDonations: async (incidentId: number) => extractList((await apiClient.get(`/Incidents/${incidentId}/support/donations/money`)).data),
  createDonation: async (incidentId: number, payload: unknown) => (await apiClient.post(`/Incidents/${incidentId}/support/donations/money`, payload)).data,
  
  listExpenses: async (incidentId: number) => extractList((await apiClient.get(`/Incidents/${incidentId}/support/expenses`)).data),
  createExpense: async (incidentId: number, payload: unknown) => (await apiClient.post(`/Incidents/${incidentId}/support/expenses`, payload)).data,
  
  listSearchAreas: async (incidentId: number) => extractList((await apiClient.get(`/Incidents/${incidentId}/rescue/search-areas`)).data),
  createSearchArea: async (incidentId: number, payload: unknown) => (await apiClient.post(`/Incidents/${incidentId}/rescue/search-areas`, payload)).data,
  
  patchSearchArea: async (incidentId: number, id: number, payload: unknown) => (await apiClient.patch(`/Incidents/${incidentId}/rescue/search-areas/${id}`, payload)).data,
  
  listAssignments: async (incidentId: number) => extractList((await apiClient.get(`/Incidents/${incidentId}/rescue/assignments`)).data),
  createAssignment: async (incidentId: number, payload: unknown) => (await apiClient.post(`/Incidents/${incidentId}/rescue/assignments`, payload)).data,
  
  publicIncidents: async () => extractList((await apiClient.get('/public/incidents')).data),
  publicSnapshot: async (incidentId: number) => (await apiClient.get(`/public/incidents/${incidentId}/snapshot/latest`)).data,
  publicSearchAreas: async (incidentId: number) => extractList((await apiClient.get(`/public/incidents/${incidentId}/rescue/search-areas`)).data),
};
