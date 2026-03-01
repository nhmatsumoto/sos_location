import { MapPanel } from '../components/maps/MapPanel';

export function SearchedAreasPage() {
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4">
        <h2 className="mb-2 text-sm font-semibold text-slate-100">Registrar área já buscada (UI draw mock)</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <input className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Equipe" />
          <input className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Data/hora" />
          <select className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"><option>Resultado</option></select>
          <button className="rounded-lg bg-cyan-600 px-3 py-2 text-sm font-semibold text-white">Salvar polígono</button>
        </div>
      </section>
      <MapPanel title="Cobertura de busca: 67%" rightSlot={<span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-200">Camada ativa</span>} />
    </div>
  );
}
