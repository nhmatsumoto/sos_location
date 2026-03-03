import type { OperationsSnapshot } from '../../services/operationsApi';
import { MapShell } from '../../map/components/MapShell';

interface OperationalMapProps {
  data: OperationsSnapshot | null;
  onRefresh: () => Promise<void>;
}

export function OperationalMap({ data, onRefresh }: OperationalMapProps) {
  return (
    <section className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-3 shadow-lg shadow-black/25">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-100">Mapa operacional tático (Leaflet + Three.js)</h3>
        <button onClick={() => void onRefresh()} className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800">Atualizar snapshot</button>
      </div>
      <MapShell data={data} />
      <p className="mt-2 text-xs text-slate-300">Camadas padronizadas em Map Core: base, overlays, clima Open-Meteo, timeline e camada 3D opcional.</p>
    </section>
  );
}
