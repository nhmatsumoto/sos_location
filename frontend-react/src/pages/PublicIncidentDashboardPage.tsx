import { useEffect, useMemo, useState } from 'react';
import { Polygon, TileLayer, MapContainer } from 'react-leaflet';
import { useParams } from 'react-router-dom';
import { modulesApi } from '../services/modulesApi';
import { KpiCard } from '../components/ui/KpiCard';
import { 
  Target, 
  CheckCircle, 
  Heart, 
  Wallet,
  Globe,
  Info
} from 'lucide-react';

export function PublicIncidentDashboardPage() {
  const { id } = useParams();
  const [snapshot, setSnapshot] = useState<any | null>(null);
  const [areas, setAreas] = useState<any[]>([]);

  const load = async () => {
    if (!id || isNaN(Number(id))) return;
    const incidentId = Number(id);
    try {
      const [snap, searchAreas] = await Promise.all([
        modulesApi.publicSnapshot(incidentId), 
        modulesApi.publicSearchAreas(incidentId)
      ]);
      setSnapshot(snap);
      setAreas(searchAreas);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { 
    void load(); 
    const t = setInterval(() => { void load(); }, 30000); 
    return () => clearInterval(t); 
  }, [id]);

  const stats = useMemo(() => snapshot?.data || {}, [snapshot]);

  return (
    <div className="h-screen w-screen relative overflow-hidden bg-slate-950">
      {/* Premium Identity Header */}
      <div className="absolute top-4 left-4 right-4 z-50 flex justify-between items-start pointer-events-none">
        <div className="flex gap-4 items-center bg-slate-900/80 border border-white/10 p-2 px-4 rounded-2xl backdrop-blur-xl pointer-events-auto shadow-2xl">
          <Globe className="h-5 w-5 text-cyan-400" />
          <div className="flex flex-col">
            <h1 className="text-[10px] font-black text-white uppercase tracking-widest leading-none">PORTAL DE TRANSPARÊNCIA</h1>
            <span className="text-[8px] text-cyan-500/70 font-mono">INCIDENTE #{id} | MONITORAMENTO PÚBLICO</span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 pointer-events-auto">
          <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full backdrop-blur-md">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-tighter">● OPERAÇÃO ATIVA</span>
          </div>
        </div>
      </div>

      {/* KPI Sidebar - Floating - Pushed down to avoid header overlap */}
      <div className="absolute top-28 left-4 z-40 flex flex-col gap-3 w-[220px]">
        <KpiCard 
          title="ÁREAS TOTAIS" 
          value={stats.searchAreas?.total ?? 0} 
          icon={<Target size={16} />} 
          color="text-slate-100"
        />
        <KpiCard 
          title="CONCLUÍDAS" 
          value={stats.searchAreas?.completed ?? 0} 
          icon={<CheckCircle size={16} />} 
          color="text-emerald-400"
          trend={`${stats.searchAreas?.total ? Math.round((stats.searchAreas.completed / stats.searchAreas.total) * 100) : 0}%`}
        />
        <KpiCard 
          title="DOAÇÕES" 
          value={`R$ ${stats.supportSummary?.totalReceivedMoney ?? 0}`} 
          icon={<Heart size={16} />} 
          color="text-rose-400"
        />
        <KpiCard 
          title="INVESTIDO" 
          value={`R$ ${stats.supportSummary?.totalSpentMoney ?? 0}`} 
          icon={<Wallet size={16} />} 
          color="text-amber-400"
        />
      </div>

      {/* Info Box - Bottom Left */}
      <div className="absolute bottom-6 left-4 z-40 max-w-[320px]">
        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl">
          <div className="flex items-start gap-3">
            <div className="bg-cyan-500/20 p-2 rounded-lg text-cyan-400">
              <Info size={16} />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Como ajudar</p>
              <p className="text-xs text-slate-200 leading-relaxed font-medium">
                Acompanhe as campanhas oficiais e canais de doação autorizados. Sua ajuda é fundamental para as equipes de resgate.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Map Content */}
      <div className="absolute inset-0 z-0">
        <MapContainer 
          center={[-21.1215, -42.9427]} 
          zoom={12} 
          zoomControl={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer 
            attribution='&copy; CARTO' 
            url='https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' 
          />
          {areas.map((r) => {
            const path = (r.geometry_json?.coordinates?.[0] || []).map((c: number[]) => [c[1], c[0]] as [number, number]);
            return (
              <Polygon 
                key={r.id} 
                positions={path} 
                pathOptions={{ 
                  color: r.status === 'Completed' ? '#10b981' : r.status === 'InProgress' ? '#f59e0b' : '#3b82f6', 
                  fillOpacity: 0.3,
                  weight: 2,
                  dashArray: r.status === 'InProgress' ? '5, 10' : undefined
                }} 
              />
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
