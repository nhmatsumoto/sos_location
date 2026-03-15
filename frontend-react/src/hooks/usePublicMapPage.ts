import { useState, useEffect } from 'react';
import { newsApi, type NewsNotification } from '../services/newsApi';

/**
 * Hook for PublicMapPage logic
 * Manages fetching of public news, filtering, and map synchronization.
 */
export function usePublicMapPage() {
  const [news, setNews] = useState<NewsNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [countryFilter, setCountryFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [timeWindow] = useState('');

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

  useEffect(() => {
    fetchNews();
  }, [countryFilter, locationFilter, timeWindow]);

  return {
    news,
    isLoading,
    filters: {
      countryFilter, setCountryFilter,
      locationFilter, setLocationFilter
    },
    refresh: fetchNews
  };
}
