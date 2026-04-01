import { useMap } from 'react-leaflet';
import { useEffect } from 'react';
import L from 'leaflet';
import type { NewsNotification } from '../../services/newsApi';

interface MapAutoBoundsProps {
  news: NewsNotification[];
}

export function MapAutoBounds({ news }: MapAutoBoundsProps) {
  const map = useMap();

  useEffect(() => {
    const safeNews = Array.isArray(news) ? news : [];
    if (safeNews.length === 0) return;
    let mounted = true;

    const bounds = L.latLngBounds(
      safeNews
        .filter((n) => n.latitude && n.longitude)
        .map((n) => [n.latitude!, n.longitude!] as [number, number])
    );

    if (bounds.isValid() && mounted) {
      try {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
      } catch {
        // suppress stale animation on unmount
      }
    }
    return () => { mounted = false; };
  }, [news, map]);

  return null;
}
