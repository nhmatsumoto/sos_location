import { useEffect, useState } from 'react';
import { Polygon } from 'react-leaflet';
import { useParams } from 'react-router-dom';
import { MapPanel } from '../components/maps/MapPanel';
import { modulesApi } from '../services/modulesApi';

export function RescueSearchAreasPage() {
  const { id } = useParams();
  const [rows, setRows] = useState<any[]>([]);
  const [geojson, setGeojson] = useState('{"type":"Polygon","coordinates":[[[-42.94,-21.12],[-42.93,-21.12],[-42.93,-21.11],[-42.94,-21.12]]]}');

  const load = () => modulesApi.listSearchAreas(Number(id)).then(setRows).catch(() => setRows([]));
  useEffect(() => { void load(); }, [id]);

  const create = async () => {
    await modulesApi.createSearchArea(Number(id), { name: 'Nova área', geometry_json: JSON.parse(geojson), status: 'Pending' });
    load();
  };

  return <div className='space-y-3'>
    <div className='rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4 text-slate-200'>
      <h2 className='text-lg font-semibold'>Resgate / Áreas procuradas</h2>
      <textarea className='h-24 w-full rounded border bg-slate-950 p-2' value={geojson} onChange={(e) => setGeojson(e.target.value)} />
      <button className='mt-2 rounded border px-3 py-1' onClick={() => void create()}>Criar área</button>
      <pre className='mt-2 overflow-auto rounded bg-slate-950 p-2 text-xs'>{JSON.stringify(rows, null, 2)}</pre>
    </div>
    <MapPanel title='Camada pública de áreas (MVP)' renderExtraLayers={() => rows.map((r) => {
      const coords = r.geometry_json?.coordinates?.[0] || [];
      const path = coords.map((c: number[]) => [c[1], c[0]] as [number, number]);
      return <Polygon key={r.id} positions={path} pathOptions={{ color: r.status === 'Completed' ? '#16a34a' : r.status === 'InProgress' ? '#f59e0b' : '#3b82f6' }} />;
    })} />
  </div>;
}
