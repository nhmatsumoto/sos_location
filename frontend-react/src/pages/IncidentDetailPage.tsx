import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { modulesApi } from '../services/modulesApi';

interface IncidentDetail {
  id: string | number;
  name?: string;
  type?: string;
  status?: string;
  country?: string;
  region?: string;
}

export function IncidentDetailPage() {
  const { id } = useParams();
  const [incident, setIncident] = useState<IncidentDetail | null>(null);

  useEffect(() => {
    if (!id) return;
    modulesApi.getIncident(Number(id)).then((data) => setIncident((data ?? null) as IncidentDetail | null)).catch(() => setIncident(null));
  }, [id]);

  if (!incident) return <div className="text-slate-200">Incidente não encontrado.</div>;

  return (
    <div className="space-y-3 rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4 text-slate-200">
      <h2 className="text-lg font-semibold">{incident.name}</h2>
      <p>{incident.type} · {incident.status} · {incident.country}/{incident.region}</p>
      <div className="flex flex-wrap gap-2 text-sm">
        <Link className="rounded border px-2 py-1" to={`/incidents/${incident.id}/support/campaigns`}>Campanhas</Link>
        <Link className="rounded border px-2 py-1" to={`/incidents/${incident.id}/support/donations`}>Doações</Link>
        <Link className="rounded border px-2 py-1" to={`/incidents/${incident.id}/support/expenses`}>Despesas</Link>
        <Link className="rounded border px-2 py-1" to={`/incidents/${incident.id}/rescue/search-areas`}>Áreas de Busca</Link>
        <Link className="rounded border px-2 py-1" to={`/incidents/${incident.id}/rescue/assignments`}>Atribuições</Link>
      </div>
    </div>
  );
}
