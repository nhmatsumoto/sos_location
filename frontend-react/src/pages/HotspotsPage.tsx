import { MapPanel } from '../components/maps/MapPanel';
import { DataTable } from '../components/ui/DataTable';
import { SeverityBadge } from '../components/ui/SeverityBadge';
import { hotspotsMock } from '../mocks/dashboard';

export function HotspotsPage() {
  return (
    <div className="space-y-4">
      <section className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-700/60 bg-slate-900/70 p-3 md:grid-cols-4">
        <select className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"><option>Tipo de risco (todos)</option></select>
        <select className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"><option>Severidade (todas)</option></select>
        <select className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"><option>Janela de tempo (24h)</option></select>
        <button className="rounded-lg bg-cyan-600 px-3 py-2 text-sm font-semibold text-white">Aplicar filtros</button>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.5fr_1fr]">
        <MapPanel title="Overlay de hotspots" />
        <DataTable
          columns={[
            { key: 'nome', header: 'Área crítica' },
            { key: 'tipoRisco', header: 'Risco' },
            { key: 'severidade', header: 'Severidade', render: (r) => <SeverityBadge severity={r.severidade} /> },
            { key: 'score', header: 'Score' },
          ]}
          rows={hotspotsMock}
          emptyTitle="Nenhum hotspot para os filtros selecionados."
        />
      </div>
    </div>
  );
}
