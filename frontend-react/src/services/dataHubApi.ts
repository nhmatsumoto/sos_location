import { apiClient } from './apiClient';

export const dataHubApi = {
  weatherForecast: (lat: number, lng: number) => apiClient.get('/api/weather/forecast', { params: { lat, lon: lng } }),
  weatherArchive: (lat: number, lng: number) => apiClient.get('/api/weather/archive', { params: { lat, lon: lng } }),
  alerts: () => apiClient.get('/api/alerts'),
  transparencyTransfers: () => apiClient.get('/api/transparency/transfers'),
  transparencySearch: (term: string) => apiClient.get('/api/transparency/search', { params: { q: term } }),
  satelliteLayers: () => apiClient.get('/api/satellite/layers'),
  satelliteRecent: () => apiClient.get('/api/satellite/goes/recent'),
};
