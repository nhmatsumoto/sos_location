import { apiClient } from './apiClient';
import { extractList } from '../lib/dataNormalization';

export interface NewsNotification {
  id: string;
  title: string;
  description: string;
  source: string;
  sourceUrl?: string;
  severity: 'Atenção' | 'Perigo' | 'Extremo';
  latitude?: number;
  longitude?: number;
  affectedPopulation?: number;
  at: string;
  // Extended properties for tactical UI telemétria
  category?: string;
  publishedAt?: string;
  riskScore?: number;
  content?: string;
  externalUrl?: string;
  climateInfo?: {
    temperature?: number;
    humidity?: number;
    windSpeed?: number;
    pressure?: number;
    precipitation?: number;
  };
}

export const newsApi = {
  getNews: async (country?: string, location?: string, timeWindow?: string): Promise<NewsNotification[]> => {
    try {
      const response = await apiClient.get(`/v1/news`, {
        params: { country, location, timeWindow }
      });
      return extractList<NewsNotification>(response.data);
    } catch (error) {
      console.error("Failed to fetch news:", error);
      return [];
    }
  }
};
