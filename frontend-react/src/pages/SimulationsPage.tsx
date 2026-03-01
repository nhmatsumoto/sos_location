import { MapPanel } from '../components/maps/MapPanel';

export function SimulationsPage() {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1.3fr]">
      <section className="space-y-3 rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4">
        <h2 className="text-sm font-semibold text-slate-100">calculate / flow simulation</h2>
        <input className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Latitude origem" />
        <input className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Longitude origem" />
        <select className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"><option>Modelo de fluxo</option></select>
        <button className="rounded-lg bg-cyan-600 px-3 py-2 text-sm font-semibold text-white">Rodar simulação (mock)</button>
        <div className="rounded-lg border border-slate-700 bg-slate-950/50 p-3 text-sm text-slate-300">
          Resultado: área afetada estimada 1.23 km² · profundidade máx. 0.84m · tempo de propagação 18 min.
        </div>
      </section>
      <MapPanel title="Resultado da simulação" />
    </div>
  );
}
