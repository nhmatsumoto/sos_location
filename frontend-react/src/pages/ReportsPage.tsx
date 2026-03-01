import { MapPanel } from '../components/maps/MapPanel';
import { reportsMock } from '../mocks/dashboard';

export function ReportsPage() {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_1fr]">
      <section className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-100">Novo relato (pessoas/animais)</h2>
        <div className="space-y-3">
          <select className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"><option>Tipo de relato</option></select>
          <textarea className="min-h-24 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Descrição" />
          <input className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Localização" />
          <select className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"><option>Credibilidade</option></select>
          <button className="rounded-lg bg-cyan-600 px-3 py-2 text-sm font-semibold text-white">Publicar relato</button>
        </div>

        <h3 className="mt-5 mb-2 text-sm font-semibold text-slate-100">Feed / timeline</h3>
        <ul className="space-y-2">
          {reportsMock.map((report) => (
            <li key={report.id} className="rounded-lg border border-slate-700 bg-slate-950/50 p-2 text-sm">
              <p className="font-semibold text-slate-100">{report.descricao}</p>
              <p className="text-xs text-slate-300">{report.localizacao} · credibilidade {report.credibilidade} · {report.criadoEm}</p>
            </li>
          ))}
        </ul>
      </section>
      <MapPanel title="Preview no mapa" />
    </div>
  );
}
