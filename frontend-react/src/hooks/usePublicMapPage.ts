import { useState, useEffect } from 'react';
import { newsApi, type NewsNotification } from '../services/newsApi';
import { useSignalR } from './useSignalR';

/**
 * Hook for PublicMapPage logic
 * Manages fetching of public news, filtering, and map synchronization.
 */
export function usePublicMapPage() {
  const [news, setNews] = useState<NewsNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [countryFilter, setCountryFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [timeWindow, setTimeWindow] = useState('');

  const [selectedEvent, setSelectedEvent] = useState<NewsNotification | null>(null);

  const fetchNews = async () => {
    setIsLoading(true);
    try {
      const data = await newsApi.getNews(countryFilter, locationFilter, timeWindow);
      setNews(data);
    } catch (error) {
      console.error("Failed to load news for project concept:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Real-time updates via SignalR
  useSignalR('/notifications', ['ReceiveAlert', 'UpdateWeather'], (method: string, data: any) => {
    if (method === 'ReceiveAlert' || method === 'UpdateWeather') {
      const newAlert: NewsNotification = {
        id: data.id || Math.random().toString(),
        title: data.title || 'Alerta Meteorológico',
        description: data.message || data.content || data.description || 'Monitoramento em tempo real detectou alterações.',
        source: data.source || 'JMA/INMET',
        severity: (data.severity === 'critical' || data.severity === 'Extremo') ? 'Extremo' : 'Atenção',
        riskScore: data.riskScore || (data.severity === 'critical' ? 95 : 60),
        at: data.createdAt || data.at || new Date().toISOString(),
        publishedAt: data.createdAt || data.at || new Date().toISOString(),
        category: method === 'UpdateWeather' ? 'WEATHER' : 'EMERGENCY',
        latitude: data.lat || data.latitude,
        longitude: data.lng || data.longitude,
        externalUrl: data.url || data.externalUrl
      };
      
      setNews(prev => [newAlert, ...prev].slice(0, 50));
    }
  });

  useEffect(() => {
    fetchNews();
  }, [countryFilter, locationFilter, timeWindow]);

  return {
    news,
    isLoading,
    selectedEvent,
    setSelectedEvent,
    filters: {
      countryFilter, setCountryFilter,
      locationFilter, setLocationFilter,
      timeWindow, setTimeWindow
    },
    refresh: fetchNews
  };
}
