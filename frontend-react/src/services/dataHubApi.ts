import { apiClient } from './apiClient';

export const dataHubApi = {
  // Weather — proxied via backend to avoid CORS
  weatherForecast: (lat: number, lng: number) =>
    apiClient.get('/integrations/weather-forecast', { params: { lat, lon: lng } }),

  // Alerts — from AttentionAlertsController (requires auth)
  alerts: () => apiClient.get('/integrations/alerts'),

  // Transparency — from IntegrationsController
  transparencyTransfers: () => apiClient.get('/integrations/transparency/transfers'),
  transparencySearch: (term: string) =>
    apiClient.get('/integrations/transparency/transfers', { params: { query: term } }),

  // Satellite layers
  satelliteLayers: () => apiClient.get('/integrations/satellite/layers'),
  satelliteRecent: () => apiClient.get('/integrations/satellite/layers'),
};
