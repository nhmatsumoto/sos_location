import { useEffect, useCallback } from 'react';
import { useSplatStore } from '../store/useSplatStore';
import { apiClient } from '../services/apiClient';

/**
 * Hook responsible for fetching splat assets and populating the store.
 * Separates data-fetching concerns from state shape (store stays pure).
 */
export function useSplats() {
  const { splats, isLoading, error, setSplats, setLoading, setError, setActiveSplat, setQuality, activeSplatId, quality } =
    useSplatStore();

  const fetchSplats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get<{ id: string; title: string; file_url: string }[]>('/api/splats/');
      setSplats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch splat assets');
    } finally {
      setLoading(false);
    }
  }, [setSplats, setLoading, setError]);

  useEffect(() => {
    if (splats.length === 0 && !isLoading) {
      fetchSplats();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { splats, isLoading, error, setActiveSplat, setQuality, activeSplatId, quality, fetchSplats };
}
