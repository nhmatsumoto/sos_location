import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { modulesApi } from '../services/modulesApi';

interface PublicIncident {
  id: string | number;
  name?: string;
  status?: string;
}

export function PublicIncidentsPage() {
  const [rows, setRows] = useState<PublicIncident[]>([]);
  useEffect(() => { modulesApi.publicIncidents().then((data) => setRows((data ?? []) as PublicIncident[])).catch(() => setRows([])); }, []);
  return <div className='space-y-2 p-4 text-slate-100'><h2 className='text-xl font-semibold'>Transparência pública</h2>{rows.map((i)=> <Link className='block rounded border p-2' key={i.id} to={`/public/incidents/${i.id}`}>{i.name} · {i.status}</Link>)}</div>;
}
