import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAppStore } from '../../stores/appStore';
import type { SimulationRun } from '../../schemas/api';

const ACTIVE_STATUSES = new Set(['queued', 'running', 'retrying']);

export function SimulationPanel() {
  const queryClient = useQueryClient();
  const selectedCity = useAppStore((s) => s.selectedCity);
  const selectedRevision = useAppStore((s) => s.selectedRevision);
  const watchedSimulationId = useAppStore((s) => s.watchedSimulationId);

  const [epicenterLon, setEpicenterLon] = useState('139.0');
  const [epicenterLat, setEpicenterLat] = useState('35.0');
  const [depthKm, setDepthKm] = useState('10');
  const [momentMagnitude, setMomentMagnitude] = useState('6.5');

  // Sem isso, um epicentro "de exemplo" (Tóquio) fica a centenas de km de
  // qualquer outra cidade selecionada, forçando o motor sísmico a simular um
  // domínio absurdamente grande. Reancora nas coordenadas da cidade ativa.
  useEffect(() => {
    if (selectedCity?.centerLon == null || selectedCity?.centerLat == null) return;
    setEpicenterLon(selectedCity.centerLon.toFixed(4));
    setEpicenterLat(selectedCity.centerLat.toFixed(4));
  }, [selectedCity]);

  const { data: runs } = useQuery({
    queryKey: ['simulations'],
    queryFn: api.listSimulations,
    refetchInterval: (query) =>
      query.state.data?.some((r) => ACTIVE_STATUSES.has(r.status)) ? 2000 : 10000,
  });

  const startSimulation = useMutation({
    mutationFn: () =>
      api.createSimulation({
        cityRevisionId: selectedRevision!.id,
        disasterType: 'earthquake',
        epicenterLon: Number(epicenterLon),
        epicenterLat: Number(epicenterLat),
        depthKm: Number(depthKm),
        momentMagnitude: Number(momentMagnitude),
      }),
    onSuccess: (run) => {
      useAppStore.getState().setWatchedSimulationId(run.id);
      void queryClient.invalidateQueries({ queryKey: ['simulations'] });
    },
  });

  const cancelSimulation = useMutation({
    mutationFn: (runId: string) => api.cancelSimulation(runId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['simulations'] }),
  });

  const showOnMap = async (run: SimulationRun) => {
    if (run.intensityWest == null || run.intensitySouth == null
      || run.intensityEast == null || run.intensityNorth == null) return;

    useAppStore.getState().setWatchedSimulationId(run.id);
    useAppStore.getState().setActiveSimulation({
      id: run.id,
      west: run.intensityWest,
      south: run.intensitySouth,
      east: run.intensityEast,
      north: run.intensityNorth,
    });
    useAppStore.setState((state) => ({ layers: { ...state.layers, seismicIntensity: true } }));

    const responses = await api.listSimulationBuildingResponses(run.id);
    const damageByBuildingId: Record<string, string> = {};
    for (const r of responses) damageByBuildingId[r.buildingId] = r.damageState;
    useAppStore.getState().setDamageByBuildingId(damageByBuildingId);
  };

  return (
    <section className="panel" data-testid="simulation-panel">
      <h2 className="panel-title">Earthquake Simulation</h2>

      {selectedRevision ? (
        <div className="mb-3 space-y-2 rounded border border-slate-700 bg-slate-800/60 p-2">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-slate-400">
              Epicenter lon
              <input
                type="number"
                step="0.001"
                value={epicenterLon}
                onChange={(e) => setEpicenterLon(e.target.value)}
                className="mt-0.5 w-full rounded bg-slate-900 px-1.5 py-1 text-sm text-slate-100"
              />
            </label>
            <label className="text-xs text-slate-400">
              Epicenter lat
              <input
                type="number"
                step="0.001"
                value={epicenterLat}
                onChange={(e) => setEpicenterLat(e.target.value)}
                className="mt-0.5 w-full rounded bg-slate-900 px-1.5 py-1 text-sm text-slate-100"
              />
            </label>
            <label className="text-xs text-slate-400">
              Depth (km)
              <input
                type="number"
                step="1"
                value={depthKm}
                onChange={(e) => setDepthKm(e.target.value)}
                className="mt-0.5 w-full rounded bg-slate-900 px-1.5 py-1 text-sm text-slate-100"
              />
            </label>
            <label className="text-xs text-slate-400">
              Magnitude (Mw)
              <input
                type="number"
                step="0.1"
                value={momentMagnitude}
                onChange={(e) => setMomentMagnitude(e.target.value)}
                className="mt-0.5 w-full rounded bg-slate-900 px-1.5 py-1 text-sm text-slate-100"
              />
            </label>
          </div>
          <button
            type="button"
            data-testid="start-simulation"
            disabled={startSimulation.isPending}
            onClick={() => startSimulation.mutate()}
            className="w-full rounded bg-sky-700 px-2 py-1 text-sm text-white hover:bg-sky-600 disabled:opacity-50"
          >
            {startSimulation.isPending ? 'Requesting…' : 'Run earthquake simulation'}
          </button>
          {startSimulation.error != null && (
            <p className="text-xs text-red-400">{String(startSimulation.error)}</p>
          )}
        </div>
      ) : (
        <p className="mb-3 text-xs text-slate-500">
          Select a published city revision to run a simulation.
        </p>
      )}

      <ul className="space-y-2">
        {runs?.map((run) => (
          <li key={run.id} className="rounded border border-slate-800 bg-slate-900/70 p-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-200">{run.disasterType}</span>
              <span className={`status-badge status-${run.status}`}>{run.status}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded bg-slate-800">
              <div
                className="h-full rounded bg-sky-600 transition-all"
                style={{ width: `${run.progress}%` }}
              />
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
              <span>{run.currentStage ?? '—'}{run.stageMessage ? ` · ${run.stageMessage}` : ''}</span>
              <span>{run.progress}%</span>
            </div>
            {run.error && <p className="mt-1 text-[11px] text-red-400">{run.error}</p>}
            <div className="mt-1 flex gap-2">
              {ACTIVE_STATUSES.has(run.status) && (
                <button
                  type="button"
                  onClick={() => cancelSimulation.mutate(run.id)}
                  className="text-[11px] text-slate-400 underline hover:text-red-400"
                >
                  cancel
                </button>
              )}
              {run.status === 'completed' && (
                <button
                  type="button"
                  data-testid={`show-on-map-${run.id}`}
                  onClick={() => void showOnMap(run)}
                  className="text-[11px] text-sky-400 underline hover:text-sky-300"
                >
                  {watchedSimulationId === run.id ? 'shown on map' : 'show on map'}
                </button>
              )}
            </div>
          </li>
        ))}
        {runs?.length === 0 && <li className="text-xs text-slate-500">No simulations yet.</li>}
      </ul>
    </section>
  );
}
