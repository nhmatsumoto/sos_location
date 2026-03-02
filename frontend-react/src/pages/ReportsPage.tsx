import { useEffect, useState } from 'react';
import { MapPanel } from '../components/maps/MapPanel';
import { Button } from '../components/ui/Button';
import { SelectInput, TextAreaInput, TextInput } from '../components/ui/Field';
import { reportsApi, type ReportItemApi } from '../services/reportsApi';

export function ReportsPage() {
  const [reports, setReports] = useState<ReportItemApi[]>([]);
  const [form, setForm] = useState({ kind: 'person' as 'person' | 'animal', name: '', lastSeen: '', details: '', contact: '' });

  const load = async () => setReports(await reportsApi.list());

  useEffect(() => {
    let mounted = true;
    reportsApi.list().then((data) => {
      if (mounted) setReports(data);
    }).catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, []);

  const submit = async () => {
    if (!form.name || !form.lastSeen) return;
    await reportsApi.create(form);
    setForm({ kind: 'person', name: '', lastSeen: '', details: '', contact: '' });
    await load();
  };

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_1fr]">
      <section className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-100">Novo relato (pessoas/animais)</h2>
        <div className="space-y-3">
          <SelectInput value={form.kind} onChange={(e) => setForm((p) => ({ ...p, kind: e.target.value as 'person' | 'animal' }))}>
            <option value="person">Pessoa</option>
            <option value="animal">Animal</option>
          </SelectInput>
          <TextInput value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Nome / referência" />
          <TextInput value={form.lastSeen} onChange={(e) => setForm((p) => ({ ...p, lastSeen: e.target.value }))} placeholder="Última localização" />
          <TextAreaInput value={form.details} onChange={(e) => setForm((p) => ({ ...p, details: e.target.value }))} placeholder="Descrição" />
          <TextInput value={form.contact} onChange={(e) => setForm((p) => ({ ...p, contact: e.target.value }))} placeholder="Contato" />
          <Button onClick={() => void submit()}>Publicar relato</Button>
        </div>

        <h3 className="mb-2 mt-5 text-sm font-semibold text-slate-100">Feed / timeline</h3>
        <ul className="space-y-2">
          {reports.map((report) => (
            <li key={report.id} className="rounded-lg border border-slate-700 bg-slate-950/50 p-2 text-sm">
              <p className="font-semibold text-slate-100">{report.name}</p>
              <p className="text-xs text-slate-300">{report.lastSeen} · {report.kind} · {new Date(report.reportedAtUtc).toLocaleString('pt-BR')}</p>
              <p className="text-xs text-slate-300">{report.details}</p>
            </li>
          ))}
        </ul>
      </section>
      <MapPanel title="Preview no mapa" />
    </div>
  );
}
