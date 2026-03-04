import type React from 'react';
import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

interface MapFocusControllerProps {
  target: { lat: number; lng: number } | null;
}

export const MapFocusController: React.FC<MapFocusControllerProps> = ({ target }) => {
  const map = useMap();

  useEffect(() => {
    if (target) {
      map.flyTo([target.lat, target.lng], 16, {
        duration: 1.5,
        easeLinearity: 0.25,
      });
    }
  }, [target, map]);

  return null;
};
