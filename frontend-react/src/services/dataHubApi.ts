import { apiClient } from './apiClient';

export const dataHubApi = {
  weatherForecast: (lat: number, lon: number) => apiClient.get('/api/weather/forecast', { params: { lat, lon } }),
  weatherArchive: (lat: number, lon: number) => apiClient.get('/api/weather/archive', { params: { lat, lon } }),
  alerts: () => apiClient.get('/api/alerts'),
  transparencyTransfers: () => apiClient.get('/api/transparency/transfers'),
  transparencySearch: (term: string) => apiClient.get('/api/transparency/search', { params: { query: term } }),
  satelliteLayers: () => apiClient.get('/api/satellite/layers'),
  satelliteRecent: () => apiClient.get('/api/satellite/goes/recent'),
};
