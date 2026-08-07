import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';

const SCENARIO_KEY = 'kumamoto-2026-07-28-m68';

export function DataSourcesPanel() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['scenario-data-status', SCENARIO_KEY],
    queryFn: () => api.getDisasterScenarioDataStatus(SCENARIO_KEY),
    refetchInterval: 30_000,
  });
  const captured = data?.filter((source) => source.captured).length ?? 0;
  return (
    <section className="panel" data-testid="data-sources-panel">
      <h2 className="panel-title">Kumamoto data sources</h2>
      <p className="mb-3 text-xs text-slate-400">
        Collection status, provenance and gaps for the operational scenario.
      </p>
      {isLoading && <p className="text-xs text-slate-500">Loading source status…</p>}
      {error && <p className="text-xs text-red-400">Source status is unavailable.</p>}
      {data && (
        <>
          <div className="mb-2 rounded bg-slate-900 p-2 text-xs">
            <span className="text-slate-500">Captured sources </span>
            <span className="font-semibold text-emerald-300">{captured}/{data.length}</span>
          </div>
          <ul className="space-y-1.5">
            {data.map((source) => (
              <li key={source.id} className="rounded border border-slate-800 bg-slate-900/60 p-2">
                <div className="flex items-start justify-between gap-2 text-xs">
                  <span className="font-medium text-slate-200">{source.name}</span>
                  <span className={source.captured ? 'text-emerald-300' : 'text-amber-300'}>
                    {source.captured ? 'captured' : 'pending'}
                  </span>
                </div>
                <p className="mt-0.5 text-[10px] text-slate-500">{source.category} · P{source.priority} · {source.purpose}</p>
                {source.latestCapturedAt && (
                  <p className="mt-0.5 text-[10px] text-slate-500">Last capture: {new Date(source.latestCapturedAt).toLocaleString()}</p>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
