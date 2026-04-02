import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { modulesApi } from '../services/modulesApi';

export function SupportSimplePage({ kind }: { kind: 'campaigns' | 'donations' | 'expenses' }) {
  const { id } = useParams();
  const [rows, setRows] = useState<unknown[]>([]);
  const [jsonPayload, setJsonPayload] = useState('{"currency":"BRL"}');

  const load = () => {
    const incidentId = Number(id);
    const fn = kind === 'campaigns' ? modulesApi.listCampaigns : kind === 'donations' ? modulesApi.listDonations : modulesApi.listExpenses;
    fn(incidentId).then(setRows).catch(() => setRows([]));
  };

  useEffect(load, [id, kind]);

  const create = async () => {
    const incidentId = Number(id);
    const payload = JSON.parse(jsonPayload || '{}');
    const fn = kind === 'campaigns' ? modulesApi.createCampaign : kind === 'donations' ? modulesApi.createDonation : modulesApi.createExpense;
    await fn(incidentId, payload);
    load();
  };

  return <div className="space-y-3 rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4 text-slate-200">
    <h2 className="text-lg font-semibold">Support / {kind}</h2>
    <textarea className="h-28 w-full rounded border bg-slate-950 p-2" value={jsonPayload} onChange={(e) => setJsonPayload(e.target.value)} />
    <button className="rounded border px-3 py-1" onClick={() => void create()}>Criar</button>
    <pre className="overflow-auto rounded bg-slate-950 p-2 text-xs">{JSON.stringify(rows, null, 2)}</pre>
  </div>;
}
