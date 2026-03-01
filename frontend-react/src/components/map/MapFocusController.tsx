import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

interface MapFocusControllerProps {
  target: { lat: number; lng: number } | null;
}

export function MapFocusController({ target }: MapFocusControllerProps) {
  const map = useMap();

  useEffect(() => {
    if (!target) return;
    map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 14), { duration: 1.1 });
  }, [target, map]);

  return null;
}
