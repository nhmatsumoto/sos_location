import { Circle, CircleMarker, Marker, Polyline, Popup } from 'react-leaflet';
import type { OperationsSnapshot } from '../../services/operationsApi';
import { useMapStore } from '../store/mapStore';

export function OverlayLayers({ data }: { data: OperationsSnapshot | null }) {
  const layersEnabled = useMapStore((state) => state.layersEnabled);

  return (
    <>
      {data?.layers.flowPaths.map((flow) => (
        <Polyline key={flow.id} positions={flow.coordinates.map((c) => [c.lat, c.lng])} pathOptions={{ color: '#38bdf8', weight: 4, opacity: 0.8 }} />
      ))}

      {layersEnabled.shelters && data?.layers.riskAreas.map((area) => (
        <Circle
          key={area.id}
          center={[area.lat, area.lng]}
          radius={area.radiusMeters ?? 450}
          pathOptions={{ color: area.severity === 'critical' ? '#ef4444' : '#f97316', fillOpacity: 0.2 }}
        >
          <Popup>{area.title} · {area.severity}</Popup>
        </Circle>
      ))}

      {layersEnabled.shelters && data?.layers.supportPoints.map((point) => (
        <Marker key={point.id} position={[point.lat, point.lng]}>
          <Popup>{point.title}</Popup>
        </Marker>
      ))}

      {layersEnabled.hotspots && data?.layers.hotspots.map((spot) => (
        <CircleMarker key={spot.id} center={[spot.lat, spot.lng]} radius={7} pathOptions={{ color: '#dc2626', fillOpacity: 0.7 }}>
          <Popup>{spot.id} · score {spot.score}</Popup>
        </CircleMarker>
      ))}

      {layersEnabled.missingPersons && data?.layers.missingPersons.filter((p) => p.lat && p.lng).map((person) => (
        <CircleMarker key={person.id} center={[person.lat as number, person.lng as number]} radius={6} pathOptions={{ color: '#f59e0b', fillOpacity: 0.8 }}>
          <Popup>{person.personName}</Popup>
        </CircleMarker>
      ))}
    </>
  );
}
