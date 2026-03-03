import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { modulesApi } from '../services/modulesApi';
import { useIncidentStore } from '../store/incidentStore';

export function IncidentsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const { selectedIncidentId, setSelectedIncidentId } = useIncidentStore();

  useEffect(() => {
    modulesApi.listIncidents().then(setRows).catch(() => setRows([]));
  }, []);

  return (
    <div className="space-y-3 rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4">
      <h2 className="text-lg font-semibold text-slate-100">Incidentes</h2>
      <ul className="space-y-2">
        {rows.map((incident) => (
          <li key={incident.id} className="rounded border border-slate-700 p-3 text-sm text-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{incident.name}</p>
                <p>{incident.type} · {incident.status} · {incident.region}</p>
              </div>
              <div className="flex gap-2">
                <button className="rounded border border-cyan-500 px-2 py-1" onClick={() => setSelectedIncidentId(incident.id)}>
                  {selectedIncidentId === incident.id ? 'Selecionado' : 'Selecionar'}
                </button>
                <Link className="rounded border border-slate-500 px-2 py-1" to={`/incidents/${incident.id}`}>Detalhe</Link>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
