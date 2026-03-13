import { apiClient } from './apiClient';

export interface NewsNotification {
  id: string;
  title: string;
  content: string;
  source: string;
  country: string;
  location: string;
  publishedAt: string;
  category: string;
  externalUrl?: string;
  latitude?: number;
  longitude?: number;
}

export const newsApi = {
  getNews: async (country?: string, location?: string) => {
    try {
      const response = await apiClient.get(`/api/v1/news`, {
        params: { country, location }
      });
      return response.data.data.items as NewsNotification[];
    } catch (error) {
      console.error("Failed to fetch news:", error);
      return [];
    }
  },
  
  getNewsById: async (id: string) => {
    try {
      const response = await apiClient.get(`/api/v1/news/${id}`);
      return response.data.data as NewsNotification;
    } catch (error) {
      console.error(`Failed to fetch news with id ${id}:`, error);
      return null;
    }
  }
};
