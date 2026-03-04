import type React from 'react';
import { useMapEvents } from 'react-leaflet';

interface MapClickSelectorProps {
  enabled: boolean;
  onSelect: (lat: number, lng: number, clientX: number, clientY: number) => void;
}

export const MapClickSelector: React.FC<MapClickSelectorProps> = ({ enabled, onSelect }) => {
  useMapEvents({
    click(e) {
      if (!enabled) return;
      onSelect(e.latlng.lat, e.latlng.lng, e.originalEvent.clientX, e.originalEvent.clientY);
    },
  });

  return null;
};
