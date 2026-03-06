import { memo } from 'react';
import { Marker } from 'react-leaflet';
import L from 'leaflet';

interface EventMarkerProps {
    e: any;
    isHovered: boolean;
    onHover: (id: string) => void;
    onUnhover: () => void;
}

export const MemoizedEventMarker = memo(({ e, isHovered, onHover, onUnhover }: EventMarkerProps) => {
  const id = `${e.provider}-${e.provider_event_id}`;
  return (
    <Marker 
      position={[e.lat, e.lon]} 
      icon={L.divIcon({
        html: `<div class="tactical-marker ${isHovered ? 'hovered' : ''}" style="color: ${isHovered ? '#22d3ee' : getSeverityColor(e.severity)}"></div>`,
        className: 'custom-div-icon',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      })}
      eventHandlers={{
        mouseover: () => onHover(id),
        mouseout: onUnhover
      }}
    />
  );
});

function getSeverityColor(severity: number): string {
  if (severity >= 5) return '#f43f5e';
  if (severity >= 4) return '#f97316';
  if (severity >= 3) return '#eab308';
  return '#22d3ee';
}
