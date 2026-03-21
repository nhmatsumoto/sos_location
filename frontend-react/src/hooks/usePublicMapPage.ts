import { useState, useEffect, useRef, useCallback } from 'react';
import { newsApi, type NewsNotification } from '../services/newsApi';
import { useSignalR } from './useSignalR';

const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export interface RiskScore {
  country: string;
  location: string;
  score: number;
  level: 'Low' | 'Medium' | 'High' | 'Critical';
  last_updated: string;
  factors?: {
    alert_count: number;
    environmental: { humidity: number; temp: number; seismic: number };
    alerts_sample: string[];
  };
}

export interface RiskSummary {
  scores: RiskScore[];
  summary: {
    total:    number;
    critical: number;
    high:     number;
    medium:   number;
    low:      number;
    top_risk: RiskScore[];
  };
  last_cycle: string | null;
}

/**
 * Hook for PublicMapPage logic.
 * - Fetches public news from backend with optional filters
 * - Auto-refreshes every 5 minutes
 * - Fetches risk summary from the risk analysis unit (via backend proxy)
 * - Enriches news items with risk scores where location matches
 * - Exposes countdown to next refresh
 */
export function usePublicMapPage() {
  const [news, setNews] = useState<NewsNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [riskSummary, setRiskSummary] = useState<RiskSummary | null>(null);
  const [countryFilter, setCountryFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [timeWindow, setTimeWindow] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<NewsNotification | null>(null);
  const [nextRefreshIn, setNextRefreshIn] = useState(REFRESH_INTERVAL_MS / 1000);

  // Stable callback: fetch risk scores from the public proxy endpoint
  const fetchRiskSummary = useCallback(async () => {
    try {
      const res = await fetch('/api/public/risk-scores');
      if (res.ok) {
        const data: RiskSummary = await res.json();
        setRiskSummary(data);
      }
    } catch {
      // silent — risk unit may still be warming up
    }
  }, []);

  const fetchNews = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await newsApi.getNews(countryFilter, locationFilter, timeWindow);
      setNews(data);
      setNextRefreshIn(REFRESH_INTERVAL_MS / 1000);
    } catch (err) {
      console.error('Failed to load news:', err);
    } finally {
      setIsLoading(false);
    }
  }, [countryFilter, locationFilter, timeWindow]);

  // Initial fetch + re-fetch on filter change
  useEffect(() => {
    void fetchNews();
    void fetchRiskSummary();
  }, [fetchNews, fetchRiskSummary]);

  // 5-minute auto-refresh
  useEffect(() => {
    const interval = setInterval(() => {
      void fetchNews();
      void fetchRiskSummary();
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchNews, fetchRiskSummary]);

  // Per-second countdown ticker
  useEffect(() => {
    const ticker = setInterval(() => {
      setNextRefreshIn(prev => (prev <= 1 ? REFRESH_INTERVAL_MS / 1000 : prev - 1));
    }, 1000);
    return () => clearInterval(ticker);
  }, []);

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
        externalUrl: data.url || data.externalUrl,
      };
      setNews(prev => [newAlert, ...prev].slice(0, 50));
    }
  });

  // Enrich news items that lack a riskScore using location-matched risk scores
  const enrichedNews = news.map(item => {
    if (!riskSummary?.scores?.length || item.riskScore != null) return item;
    const loc = ((item as any).location || item.description || item.title || '').toLowerCase();
    const match = riskSummary.scores.find(s =>
      loc.includes(s.location.toLowerCase()) || s.location.toLowerCase().includes(loc)
    );
    return match ? { ...item, riskScore: match.score } : item;
  });

  return {
    news: enrichedNews,
    isLoading,
    riskSummary,
    nextRefreshIn,
    selectedEvent,
    setSelectedEvent,
    refresh: fetchNews,
    filters: {
      countryFilter, setCountryFilter,
      locationFilter, setLocationFilter,
      timeWindow, setTimeWindow,
    },
  };
}
