import { Circle, CircleMarker, Marker, Polyline, Popup } from 'react-leaflet';
import type { OperationsSnapshot } from '../../services/operationsApi';
import { useMapStore } from '../store/mapStore';

export function OverlayLayers({ data }: { data: OperationsSnapshot | null }) {
  const layersEnabled = useMapStore((state) => state.layersEnabled);

  return (
    <>
      {data?.layers?.flowPaths?.map((flow) => (
        <Polyline key={flow.id} positions={flow.coordinates?.map((c) => [c.lat, c.lng]) || []} pathOptions={{ color: '#38bdf8', weight: 4, opacity: 0.8 }} />
      ))}

      {layersEnabled.shelters && data?.layers?.riskAreas?.map((area) => (
        <Circle
          key={area.id}
          center={[area.lat, area.lng]}
          radius={area.radiusMeters ?? 450}
          pathOptions={{ color: area.severity === 'critical' ? '#ef4444' : '#f97316', fillOpacity: 0.2 }}
        >
          <Popup>{area.title} · {area.severity}</Popup>
        </Circle>
      ))}

      {layersEnabled.shelters && data?.layers?.supportPoints?.map((point) => (
        <Marker key={point.id} position={[point.lat, point.lng]}>
          <Popup>{point.title}</Popup>
        </Marker>
      ))}

      {layersEnabled.hotspots && data?.layers?.hotspots?.map((spot) => (
        <CircleMarker key={spot.id} center={[spot.lat, spot.lng]} radius={7} pathOptions={{ color: '#dc2626', fillOpacity: 0.7 }}>
          <Popup>{spot.id} · score {spot.score}</Popup>
        </CircleMarker>
      ))}

      {layersEnabled.missingPersons && data?.layers?.missingPersons?.filter((p) => p.lat && p.lng).map((person) => (
        <CircleMarker key={person.id} center={[person.lat as number, person.lng as number]} radius={6} pathOptions={{ color: '#f59e0b', fillOpacity: 0.8 }}>
          <Popup>{person.personName}</Popup>
        </CircleMarker>
      ))}

      {data?.layers?.timeline?.map((item) => {
        const severity = typeof item.severity === 'number' ? item.severity :
          (item.severity.toLowerCase() === 'extremo' ? 5 :
            (item.severity.toLowerCase() === 'perigo' ? 3 : 2));
        const color = severity >= 5 ? '#f43f5e' : (severity >= 3 ? '#f97316' : '#22d3ee');

        return (
          <CircleMarker
            key={item.id}
            center={[item.lat, item.lng]}
            radius={8}
            pathOptions={{
              color: color,
              fillColor: color,
              fillOpacity: 0.6,
              weight: 2,
              className: severity >= 4 ? 'animate-pulse' : ''
            }}
          >
            <Popup>
              <div className="flex flex-col gap-1 p-1">
                <div className="font-black text-[11px] uppercase tracking-wider border-b border-black/10 pb-1 flex items-center gap-2">
                  🚨 {item.title}
                </div>
                <div className="text-[10px] leading-relaxed text-slate-700 py-1">
                  {item.description}
                </div>
                {item.affectedPopulation && (
                  <div className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    Impacto: ~{item.affectedPopulation.toLocaleString()} pessoas
                  </div>
                )}
                <div className="text-[8px] font-mono text-slate-400 mt-1 uppercase">
                  Fonte: {item.source || item.eventType} · {item.at && new Date(item.at).toLocaleTimeString()}
                </div>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
}
