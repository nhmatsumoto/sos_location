import { useEffect, useState } from 'react';
import { DataTable } from '../components/ui/DataTable';
import { Button } from '../components/ui/Button';
import { TextInput } from '../components/ui/Field';
import { missingPersonsApi, type MissingPersonApi } from '../services/missingPersonsApi';
import { resolveApiUrl } from '../lib/apiBaseUrl';

export function MissingPersonsPage() {
  const [rows, setRows] = useState<MissingPersonApi[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ personName: '', age: '', city: 'Ubá', lastSeenLocation: '', contactPhone: '', additionalInfo: '' });

  const load = async () => {
    setLoading(true);
    try {
      setRows(await missingPersonsApi.list());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    if (!form.personName || !form.lastSeenLocation) return;
    await missingPersonsApi.create({
      personName: form.personName,
      age: form.age ? Number(form.age) : undefined,
      city: form.city,
      lastSeenLocation: form.lastSeenLocation,
      contactPhone: form.contactPhone,
      additionalInfo: form.additionalInfo,
      contactName: 'Central MG Location',
    });
    setForm({ personName: '', age: '', city: 'Ubá', lastSeenLocation: '', contactPhone: '', additionalInfo: '' });
    await load();
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-100">Cadastro de desaparecidos</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <TextInput value={form.personName} onChange={(e) => setForm((p) => ({ ...p, personName: e.target.value }))} placeholder="Nome completo" />
          <TextInput value={form.age} onChange={(e) => setForm((p) => ({ ...p, age: e.target.value }))} placeholder="Idade aproximada" />
          <TextInput value={form.lastSeenLocation} onChange={(e) => setForm((p) => ({ ...p, lastSeenLocation: e.target.value }))} placeholder="Última localização" />
          <TextInput value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} placeholder="Cidade" />
          <TextInput value={form.contactPhone} onChange={(e) => setForm((p) => ({ ...p, contactPhone: e.target.value }))} placeholder="Contato" />
          <TextInput value={form.additionalInfo} onChange={(e) => setForm((p) => ({ ...p, additionalInfo: e.target.value }))} placeholder="Observações" />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={() => void save()} disabled={loading}>Salvar</Button>
          <a className="inline-flex items-center rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm" href={resolveApiUrl('/api/missing-people.csv')} target="_blank" rel="noreferrer">Exportar CSV</a>
        </div>
      </section>

      <DataTable
        columns={[
          { key: 'personName', header: 'Nome' },
          { key: 'age', header: 'Idade aprox.' },
          { key: 'lastSeenLocation', header: 'Última localização' },
          { key: 'city', header: 'Cidade' },
          { key: 'contactPhone', header: 'Contato' },
        ]}
        rows={rows}
        emptyTitle={loading ? 'Carregando...' : 'Nenhum registro de desaparecido.'}
      />
    </div>
  );
}
