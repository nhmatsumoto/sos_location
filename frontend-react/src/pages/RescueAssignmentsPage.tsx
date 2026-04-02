import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { modulesApi } from '../services/modulesApi';

export function RescueAssignmentsPage() {
  const { id } = useParams();
  const [rows, setRows] = useState<unknown[]>([]);
  const [payload, setPayload] = useState('{"search_area":1,"assigned_to_user_id":"user-1"}');
  const load = useCallback(
    () => modulesApi.listAssignments(Number(id)).then(setRows).catch(() => setRows([])),
    [id],
  );
  useEffect(() => { void load(); }, [load]);
  return <div className='space-y-3 rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4 text-slate-200'>
    <h2 className='text-lg font-semibold'>Resgate / Atribuições</h2>
    <textarea className='h-24 w-full rounded border bg-slate-950 p-2' value={payload} onChange={(e) => setPayload(e.target.value)} />
    <button className='rounded border px-3 py-1' onClick={() => void modulesApi.createAssignment(Number(id), JSON.parse(payload)).then(load)}>Criar</button>
    <pre className='overflow-auto rounded bg-slate-950 p-2 text-xs'>{JSON.stringify(rows, null, 2)}</pre>
  </div>;
}
