import { memo } from 'react';
import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';

interface EventMarkerProps {
    e: any;
    isHovered: boolean;
    onHover: (id: string) => void;
    onUnhover: () => void;
}

export const MemoizedEventMarker = memo(({ e, isHovered, onHover, onUnhover }: EventMarkerProps) => {
  const id = e.is_gis_alert ? e.id : `${e.provider}-${e.provider_event_id}`;
  
  const isAlert = e.type === 'disaster_alert';
  const color = getSeverityColor(e.severity);
  const iconHtml = isAlert
    ? `<div class="tactical-marker alert-marker ${isHovered ? 'hovered' : ''}" style="color: ${isHovered ? '#22d3ee' : color}">
         <span class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style="background-color: ${color}"></span>
         <span class="relative inline-flex rounded-full h-3 w-3" style="background-color: ${color}"></span>
       </div>`
    : `<div class="tactical-marker ${isHovered ? 'hovered' : ''}" style="color: ${isHovered ? '#22d3ee' : color}"></div>`;

  return (
    <Marker 
      position={[e.lat, e.lon]} 
      icon={L.divIcon({
        html: iconHtml,
        className: 'custom-div-icon',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      })}
      eventHandlers={{
        mouseover: () => onHover(id),
        mouseout: onUnhover
      }}
    >
      {isAlert && (
        <Tooltip direction="top" offset={[0, -10]} opacity={1} className="tactical-tooltip">
          <div className="flex flex-col gap-1 text-xs min-w-[200px]">
            <span className="font-bold text-slate-100 uppercase border-b border-white/20 pb-1">
              🚨 {e.title || 'Alerta de Risco'}
            </span>
            <span className="text-slate-300 max-w-[250px] whitespace-normal py-1">
              <strong className="text-slate-400">Motivo:</strong> {e.description}
            </span>
            <span className="text-cyan-400 font-mono pt-1 border-t border-white/10 text-[10px]">
              {e.lat.toFixed(4)}, {e.lon.toFixed(4)}
            </span>
          </div>
        </Tooltip>
      )}
    </Marker>
  );
});

function getSeverityColor(severity: number): string {
  if (severity >= 5) return '#f43f5e';
  if (severity >= 4) return '#f97316';
  if (severity >= 3) return '#eab308';
  return '#22d3ee';
}
