import { Circle, CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer } from 'react-leaflet';
import { useState } from 'react';
import type { OperationsSnapshot } from '../../services/operationsApi';
import { operationsApi } from '../../services/operationsApi';
import { MapClickSelector } from '../map/MapClickSelector';

type OneClickMode = 'none' | 'support' | 'risk' | 'missing';

interface OperationalMapProps {
  data: OperationsSnapshot | null;
  onRefresh: () => Promise<void>;
}

export function OperationalMap({ data, onRefresh }: OperationalMapProps) {
  const [mode, setMode] = useState<OneClickMode>('none');
  const [busy, setBusy] = useState(false);

  const onSelectMap = async (lat: number, lng: number) => {
    setBusy(true);
    try {
      if (mode === 'support') {
        await operationsApi.createSupportPoint({ name: 'Ponto rápido no mapa', type: 'apoio', lat, lng });
      }
      if (mode === 'risk') {
        await operationsApi.createRiskArea({ name: 'Área crítica registrada', severity: 'high', lat, lng, radiusMeters: 450 });
      }
      if (mode === 'missing') {
        await operationsApi.createRiskArea({ name: 'Zona de busca prioritária', severity: 'medium', lat, lng, radiusMeters: 320 });
      }
      await onRefresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-3 shadow-lg shadow-black/25">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-100">Mapa operacional tático (Leaflet)</h3>
        <div className="flex flex-wrap gap-2 text-xs">
          <button className={`rounded-md border px-2 py-1 ${mode === 'support' ? 'border-cyan-400 bg-cyan-500/20 text-cyan-100' : 'border-slate-700 bg-slate-900 text-slate-200'}`} onClick={() => setMode((m) => m === 'support' ? 'none' : 'support')}>1-click apoio</button>
          <button className={`rounded-md border px-2 py-1 ${mode === 'risk' ? 'border-rose-400 bg-rose-500/20 text-rose-100' : 'border-slate-700 bg-slate-900 text-slate-200'}`} onClick={() => setMode((m) => m === 'risk' ? 'none' : 'risk')}>1-click risco</button>
          <button className={`rounded-md border px-2 py-1 ${mode === 'missing' ? 'border-amber-400 bg-amber-500/20 text-amber-100' : 'border-slate-700 bg-slate-900 text-slate-200'}`} onClick={() => setMode((m) => m === 'missing' ? 'none' : 'missing')}>1-click desaparecido</button>
          <button className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100" onClick={() => void onRefresh()} disabled={busy}>Atualizar</button>
        </div>
      </div>

      <div className="h-[520px] overflow-hidden rounded-xl border border-slate-700">
        <MapContainer center={[-21.1215, -42.9427]} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
          />
          <TileLayer
            attribution='Topography by OpenTopoMap (SRTM)'
            url='https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'
            opacity={0.42}
          />

          <MapClickSelector enabled={mode !== 'none'} onSelect={(lat, lng) => { void onSelectMap(lat, lng); }} />

          {data?.layers.flowPaths.map((flow) => (
            <Polyline key={flow.id} positions={flow.coordinates.map((c) => [c.lat, c.lng])} pathOptions={{ color: '#38bdf8', weight: 4, opacity: 0.8 }} />
          ))}

          {data?.layers.riskAreas.map((area) => (
            <Circle
              key={area.id}
              center={[area.lat, area.lng]}
              radius={area.radiusMeters}
              pathOptions={{ color: area.severity === 'critical' ? '#ef4444' : '#f97316', fillOpacity: 0.2 }}
            >
              <Popup>{area.name} · {area.severity}</Popup>
            </Circle>
          ))}

          {data?.layers.supportPoints.map((point) => (
            <Marker key={point.id} position={[point.lat, point.lng]}>
              <Popup>{point.name} · cap {point.capacity}</Popup>
            </Marker>
          ))}

          {data?.layers.hotspots.map((spot) => (
            <CircleMarker key={spot.id} center={[spot.lat, spot.lng]} radius={7} pathOptions={{ color: '#dc2626', fillOpacity: 0.7 }}>
              <Popup>{spot.id} · score {spot.score}</Popup>
            </CircleMarker>
          ))}

          {data?.layers.missingPersons.filter((p) => p.lat && p.lng).map((person) => (
            <CircleMarker key={person.id} center={[person.lat as number, person.lng as number]} radius={6} pathOptions={{ color: '#f59e0b', fillOpacity: 0.8 }}>
              <Popup>{person.personName}</Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
      <p className="mt-2 text-xs text-slate-300">Camadas: topografia/relevo, áreas de risco, escoamento, hotspots, pontos de apoio e desaparecidos.</p>
    </section>
  );
}
