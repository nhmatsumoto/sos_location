import { useEffect, useMemo, useState } from 'react';
import { Polygon } from 'react-leaflet';
import { useParams } from 'react-router-dom';
import { MapPanel } from '../components/maps/MapPanel';
import { modulesApi } from '../services/modulesApi';

export function PublicIncidentDashboardPage() {
  const { id } = useParams();
  const [snapshot, setSnapshot] = useState<any | null>(null);
  const [areas, setAreas] = useState<any[]>([]);

  const load = async () => {
    if (!id || isNaN(Number(id))) return;
    const incidentId = Number(id);
    try {
      const [snap, searchAreas] = await Promise.all([modulesApi.publicSnapshot(incidentId), modulesApi.publicSearchAreas(incidentId)]);
      setSnapshot(snap);
      setAreas(searchAreas);
    } catch {}
  };

  useEffect(() => { 
    void load(); 
    const t = setInterval(() => { void load(); }, 30000); 
    return () => clearInterval(t); 
  }, [id]);

  const stats = useMemo(() => snapshot?.data || {}, [snapshot]);

  return <div className='space-y-3 p-4 text-slate-100'>
    <h2 className='text-xl font-semibold'>Dashboard Público</h2>
    <div className='grid grid-cols-2 gap-2 md:grid-cols-4'>
      <div className='rounded border p-2'>Áreas: {stats.searchAreas?.total ?? 0}</div>
      <div className='rounded border p-2'>Concluídas: {stats.searchAreas?.completed ?? 0}</div>
      <div className='rounded border p-2'>Doações: R$ {stats.supportSummary?.totalReceivedMoney ?? 0}</div>
      <div className='rounded border p-2'>Despesas: R$ {stats.supportSummary?.totalSpentMoney ?? 0}</div>
    </div>
    <MapPanel title='Mapa público' renderExtraLayers={() => areas.map((r) => {
      const path = (r.geometry_json?.coordinates?.[0] || []).map((c: number[]) => [c[1], c[0]] as [number, number]);
      return <Polygon key={r.id} positions={path} pathOptions={{ color: r.status === 'Completed' ? '#16a34a' : r.status === 'InProgress' ? '#f59e0b' : '#3b82f6', fillOpacity: 0.25 }} />;
    })} />
    <div className='rounded border p-3'>Como ajudar: acompanhe campanhas públicas e canais oficiais de doação.</div>
  </div>;
}
