import { useMapEvents } from 'react-leaflet';

interface MapClickSelectorProps {
  enabled: boolean;
  onSelect: (lat: number, lng: number, clientX: number, clientY: number) => void;
}

export function MapClickSelector({ enabled, onSelect }: MapClickSelectorProps) {
  useMapEvents({
    click(event) {
      if (!enabled) return;
      const clientX = (event.originalEvent as MouseEvent).clientX;
      const clientY = (event.originalEvent as MouseEvent).clientY;
      onSelect(event.latlng.lat, event.latlng.lng, clientX, clientY);
    },
  });

  return null;
}
