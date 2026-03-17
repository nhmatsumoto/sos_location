import { useMapEvents } from 'react-leaflet';
import type { LeafletMouseEvent } from 'leaflet';

interface MapClickSelectorProps {
  enabled: boolean;
  onSelect: (lat: number, lng: number, clientX: number, clientY: number) => void;
}

export const MapClickSelector: React.FC<MapClickSelectorProps> = ({ enabled, onSelect }) => {
  useMapEvents({
    click(e: LeafletMouseEvent) {
      if (!enabled) return;
      onSelect(e.latlng.lat, e.latlng.lng, e.originalEvent.clientX, e.originalEvent.clientY);
    },
  });

  return null;
};
