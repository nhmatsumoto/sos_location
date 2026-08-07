import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAppStore } from '../../stores/appStore';
import { earthquakeScientificTools } from './EarthquakeScientificTools';
import {
  ScientificToolRegistry,
  type ScientificToolCategory,
} from './scientificToolRegistry';

const registry = new ScientificToolRegistry(earthquakeScientificTools);

const CATEGORY_ACCENTS: Record<ScientificToolCategory, string> = {
  system: 'text-violet-300 bg-violet-950/50 border-violet-800/60',
  source: 'text-amber-300 bg-amber-950/50 border-amber-800/60',
  propagation: 'text-cyan-300 bg-cyan-950/50 border-cyan-800/60',
  intensity: 'text-rose-300 bg-rose-950/50 border-rose-800/60',
  impact: 'text-orange-300 bg-orange-950/50 border-orange-800/60',
  laboratory: 'text-sky-300 bg-sky-950/50 border-sky-800/60',
};

export function ScientificAnalysisPanel({
  onRequestMap,
}: {
  onRequestMap?: () => void;
}) {
  const selectedRevision = useAppStore((state) => state.selectedRevision);
  const watchedSimulationId = useAppStore((state) => state.watchedSimulationId);
  const [disasterType] = useState('earthquake');
  const tools = useMemo(() => registry.list(disasterType), [disasterType]);
  const [activeToolId, setActiveToolId] = useState('systemic-analysis');
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  const runsQuery = useQuery({
    queryKey: ['simulations'],
    queryFn: api.listSimulations,
    refetchInterval: (query) =>
      query.state.data?.some((run) => ['queued', 'running', 'retrying'].includes(run.status))
        ? 2_000
        : 10_000,
  });

  const eligibleRuns = useMemo(
    () => (runsQuery.data ?? []).filter(
      (run) =>
        run.disasterType === disasterType
        && run.status === 'completed'
        && (!selectedRevision || run.cityRevisionId === selectedRevision.id),
    ),
    [disasterType, runsQuery.data, selectedRevision],
  );

  useEffect(() => {
    setSelectedRunId((current) => {
      if (current && eligibleRuns.some((run) => run.id === current)) return current;
      return eligibleRuns.find((run) => run.id === watchedSimulationId)?.id
        ?? eligibleRuns[0]?.id
        ?? null;
    });
  }, [eligibleRuns, watchedSimulationId]);

  const selectedRun = eligibleRuns.find((run) => run.id === selectedRunId) ?? null;
  const activeTool = registry.get(disasterType, activeToolId) ?? tools[0];
  const ActiveComponent = activeTool?.component;

  return (
    <section data-testid="scientific-analysis-panel">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md border border-cyan-800/70 bg-cyan-950/50 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-cyan-300">
              Scientific workspace
            </span>
            <span className="text-[10px] text-slate-500">
              {tools.length} ferramentas registradas
            </span>
          </div>
          <h2 className="mt-2 text-base font-semibold text-slate-100">
            Análise científica de desastres
          </h2>
          <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-slate-400">
            Modelos físicos, dados, propagação e impacto no mesmo contexto geoespacial.
            O catálogo aceita novos motores e ferramentas por tipo de desastre.
          </p>
        </div>
        <div className="flex gap-2">
          <label className="text-[9px] uppercase tracking-wide text-slate-500">
            Desastre
            <select
              value={disasterType}
              aria-label="Tipo de desastre científico"
              onChange={() => undefined}
              className="mt-1 block rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs normal-case tracking-normal text-slate-200"
            >
              <option value="earthquake">Terremoto</option>
              <option value="flood" disabled>Inundação · motor futuro</option>
              <option value="fire" disabled>Incêndio · motor futuro</option>
            </select>
          </label>
          <label className="text-[9px] uppercase tracking-wide text-slate-500">
            Execução
            <select
              value={selectedRunId ?? ''}
              aria-label="Execução científica"
              onChange={(event) => setSelectedRunId(event.target.value || null)}
              className="mt-1 block max-w-48 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs normal-case tracking-normal text-slate-200"
            >
              <option value="">Sem execução</option>
              {eligibleRuns.map((run) => (
                <option key={run.id} value={run.id}>
                  {new Date(run.completedAt ?? run.createdAt).toLocaleString('pt-BR')}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <nav
        aria-label="Ferramentas científicas"
        className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3"
      >
        {tools.map((tool) => {
          const active = tool.id === activeTool?.id;
          return (
            <button
              key={tool.id}
              type="button"
              data-testid={`scientific-tool-${tool.id}`}
              aria-current={active ? 'page' : undefined}
              onClick={() => setActiveToolId(tool.id)}
              className={`rounded-xl border p-2.5 text-left transition ${
                active
                  ? CATEGORY_ACCENTS[tool.category]
                  : 'border-slate-800 bg-slate-900/55 text-slate-300 hover:border-slate-700 hover:bg-slate-800/70'
              }`}
            >
              <span className="block text-[11px] font-semibold">{tool.shortTitle}</span>
              <span className="mt-1 block text-[9px] leading-tight text-slate-500">
                {tool.outputs.join(' · ')}
              </span>
            </button>
          );
        })}
      </nav>

      {activeTool && ActiveComponent && (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/45 p-3 sm:p-4">
          <div className="mb-4 border-b border-slate-800 pb-3">
            <h3 className="text-sm font-semibold text-slate-100">{activeTool.title}</h3>
            <p className="mt-1 text-[11px] text-slate-500">{activeTool.description}</p>
          </div>
          <ActiveComponent run={selectedRun} onRequestMap={onRequestMap} />
        </div>
      )}
    </section>
  );
}

export { registry as scientificToolRegistry };
