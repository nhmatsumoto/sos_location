import { DataTable } from '../components/ui/DataTable';
import { missingPersonsMock } from '../mocks/dashboard';

export function MissingPersonsPage() {
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-100">Cadastro de desaparecidos</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <input className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Nome completo" />
          <input className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Idade aproximada" />
          <input className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Última localização" />
          <input className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Data/hora da última visualização" />
          <input className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Contato" />
          <input className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Observações" />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="rounded-lg bg-cyan-600 px-3 py-2 text-sm font-semibold text-white">Salvar</button>
          <button className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm">Exportar CSV</button>
        </div>
      </section>

      <DataTable
        columns={[
          { key: 'nome', header: 'Nome' },
          { key: 'idadeAproximada', header: 'Idade aprox.' },
          { key: 'ultimaLocalizacao', header: 'Última localização' },
          { key: 'status', header: 'Status' },
          { key: 'contato', header: 'Contato' },
        ]}
        rows={missingPersonsMock}
      />
    </div>
  );
}
