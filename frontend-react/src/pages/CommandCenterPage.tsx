import { AlertTriangle, CloudRain, Download, Users } from 'lucide-react';
import { MapPanel } from '../components/maps/MapPanel';
import { LayerControl } from '../components/maps/LayerControl';
import { KpiCard } from '../components/ui/KpiCard';
import { QuickActions } from '../components/ui/QuickActions';
import { SeverityBadge } from '../components/ui/SeverityBadge';
import { hotspotsMock, mapLayersMock } from '../mocks/dashboard';

export function CommandCenterPage() {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.7fr_1fr]">
      <div className="space-y-4">
        <QuickActions />
        <MapPanel title="Centro de Comando" rightSlot={<button className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800">Modo relevo/3D</button>} />
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <KpiCard title="Alertas críticos" value={5} subtitle="2 novos em 10 min" icon={<AlertTriangle size={16} className="text-rose-300" />} />
          <KpiCard title="Equipes ativas" value={12} subtitle="8 em campo" icon={<Users size={16} className="text-cyan-300" />} />
          <KpiCard title="Chuva 24h" value="142mm" subtitle="Zona Norte" icon={<CloudRain size={16} className="text-blue-300" />} />
          <KpiCard title="Exportação" value="CSV" subtitle="Atualizado" icon={<Download size={16} className="text-emerald-300" />} />
        </div>

        <section className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-3">
          <h3 className="mb-2 text-sm font-semibold text-slate-100">Hotspots prioritários</h3>
          <ul className="space-y-2">
            {hotspotsMock.map((spot) => (
              <li key={spot.id} className="rounded-lg border border-slate-700 bg-slate-950/50 p-2">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-100">{spot.nome}</p>
                  <SeverityBadge severity={spot.severidade} />
                </div>
                <p className="text-xs text-slate-300">{spot.municipio} · Score {spot.score} · {spot.tipoRisco}</p>
              </li>
            ))}
          </ul>
        </section>

        <LayerControl layers={mapLayersMock} />
      </div>
    </div>
  );
}
