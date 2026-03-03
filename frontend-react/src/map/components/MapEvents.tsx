import { useMapEvents } from 'react-leaflet';
import { useMapStore } from '../store/mapStore';

export function MapEvents({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  const setViewport = useMapStore((state) => state.setViewport);

  useMapEvents({
    click(event) {
      onMapClick(event.latlng.lat, event.latlng.lng);
    },
    moveend(event) {
      const map = event.target;
      const center = map.getCenter();
      const bounds = map.getBounds();
      setViewport({
        center: [center.lat, center.lng],
        zoom: map.getZoom(),
        bounds: [bounds.getSouth(), bounds.getWest(), bounds.getNorth(), bounds.getEast()],
      });
    },
  });

  return null;
}
