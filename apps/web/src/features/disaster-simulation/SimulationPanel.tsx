import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAppStore } from '../../stores/appStore';
import type { SeismicReplayFrame, SimulationRun } from '../../schemas/api';

const ACTIVE_STATUSES = new Set(['queued', 'running', 'retrying']);

const DAMAGE_LEVELS: Array<{
  key: 'none' | 'slight' | 'moderate' | 'extensive' | 'complete';
  label: string;
  color: string;
}> = [
  { key: 'none', label: 'None', color: '#6b7280' },
  { key: 'slight', label: 'Slight', color: '#eab308' },
  { key: 'moderate', label: 'Moderate', color: '#f97316' },
  { key: 'extensive', label: 'Extensive', color: '#ef4444' },
  { key: 'complete', label: 'Complete', color: '#7f1d1d' },
];

function activateSimulation(run: SimulationRun, replayFrameIndex: number | null) {
  if (run.intensityWest == null || run.intensitySouth == null
    || run.intensityEast == null || run.intensityNorth == null) return;

  // Dano dos MVTs e campo de onda mudam juntos. Durante o replay, apenas a
  // imagem é trocada pelo GeoScene; os tiles de edifícios permanecem em cache.
  useAppStore.setState((state) => ({
    watchedSimulationId: run.id,
    activeSimulation: {
      id: run.id,
      revisionId: run.cityRevisionId,
      west: run.intensityWest!,
      south: run.intensitySouth!,
      east: run.intensityEast!,
      north: run.intensityNorth!,
      replayFrameIndex,
    },
    layers: { ...state.layers, seismicIntensity: true },
  }));
}

function ImpactAtFrame({ frame, total }: { frame: SeismicReplayFrame; total: number }) {
  const affected = total - frame.none;
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-1 text-center">
        <div className="rounded bg-slate-950/70 p-1.5">
          <div className="text-[10px] uppercase text-slate-500">Affected</div>
          <div className="text-sm font-semibold text-amber-300">{affected}</div>
        </div>
        <div className="rounded bg-slate-950/70 p-1.5">
          <div className="text-[10px] uppercase text-slate-500">Peak frame</div>
          <div className="text-sm font-semibold text-cyan-300">
            {frame.peakAccelerationG.toFixed(3)} g
          </div>
        </div>
        <div className="rounded bg-slate-950/70 p-1.5">
          <div className="text-[10px] uppercase text-slate-500">Max drift</div>
          <div className="text-sm font-semibold text-rose-300">
            {(frame.maxCumulativeDriftRatio * 100).toFixed(3)}%
          </div>
        </div>
      </div>
      <div className="grid grid-cols-5 gap-1">
        {DAMAGE_LEVELS.map(({ key, label, color }) => (
          <div key={key} className="rounded bg-slate-950/60 px-1 py-1 text-center">
            <div className="mx-auto mb-0.5 h-1 w-5 rounded" style={{ backgroundColor: color }} />
            <div className="truncate text-[9px] text-slate-500" title={label}>{label}</div>
            <div className="text-xs font-medium text-slate-200">{frame[key]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SimulationPanel() {
  const queryClient = useQueryClient();
  const selectedCity = useAppStore((s) => s.selectedCity);
  const selectedRevision = useAppStore((s) => s.selectedRevision);
  const watchedSimulationId = useAppStore((s) => s.watchedSimulationId);

  const [epicenterLon, setEpicenterLon] = useState('139.0');
  const [epicenterLat, setEpicenterLat] = useState('35.0');
  const [depthKm, setDepthKm] = useState('10');
  const [momentMagnitude, setMomentMagnitude] = useState('6.5');
  const [replayRunId, setReplayRunId] = useState<string | null>(null);
  const [frameIndex, setFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  // Reancora o epicentro padrão na cidade ativa para manter o domínio urbano.
  useEffect(() => {
    if (selectedCity?.centerLon == null || selectedCity?.centerLat == null) return;
    setEpicenterLon(selectedCity.centerLon.toFixed(4));
    setEpicenterLat(selectedCity.centerLat.toFixed(4));
  }, [selectedCity]);

  const { data: runs } = useQuery({
    queryKey: ['simulations'],
    queryFn: api.listSimulations,
    refetchInterval: (query) =>
      query.state.data?.some((run) => ACTIVE_STATUSES.has(run.status)) ? 2000 : 10000,
  });

  const replayRun = runs?.find((run) => run.id === replayRunId) ?? null;
  const replayQuery = useQuery({
    queryKey: ['simulation-replay', replayRunId],
    queryFn: () => api.getSimulationReplay(replayRunId!),
    enabled: replayRunId != null && replayRun?.status === 'completed',
    staleTime: Number.POSITIVE_INFINITY,
  });
  const replay = replayQuery.data;
  const currentFrame = replay?.frames[Math.min(frameIndex, replay.frames.length - 1)];

  useEffect(() => {
    if (!replay || !replayRun) return;
    setFrameIndex(0);
    activateSimulation(replayRun, replay.frames[0].index);
  }, [replay, replayRun]);

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

  const selectFrame = useCallback((nextIndex: number) => {
    if (!replay || !replayRun) return;
    const clamped = Math.max(0, Math.min(nextIndex, replay.frames.length - 1));
    setFrameIndex(clamped);
    activateSimulation(replayRun, replay.frames[clamped].index);
  }, [replay, replayRun]);

  // Usa o intervalo físico entre snapshots; 1× corresponde ao tempo simulado.
  useEffect(() => {
    if (!isPlaying || !replay || frameIndex >= replay.frames.length - 1) {
      if (isPlaying && replay && frameIndex >= replay.frames.length - 1) setIsPlaying(false);
      return;
    }
    const next = frameIndex + 1;
    const simulatedDelta = replay.frames[next].timeSeconds - replay.frames[frameIndex].timeSeconds;
    const timer = window.setTimeout(
      () => selectFrame(next),
      Math.max(40, simulatedDelta * 1000 / playbackRate),
    );
    return () => window.clearTimeout(timer);
  }, [frameIndex, isPlaying, playbackRate, replay, selectFrame]);

  const openReplay = (run: SimulationRun) => {
    setReplayRunId(run.id);
    setFrameIndex(0);
    setIsPlaying(false);
    // Enquanto o manifesto é buscado, mantém o raster final válido. O primeiro
    // quadro só é ativado após a validação do payload pela schema Zod.
    activateSimulation(run, null);
  };

  return (
    <section className="panel" data-testid="simulation-panel">
      <h2 className="panel-title">Earthquake Simulation</h2>

      {selectedRevision ? (
        <div className="mb-3 space-y-2 rounded border border-slate-700 bg-slate-800/60 p-2">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-slate-400">
              Epicenter lon
              <input type="number" step="0.001" value={epicenterLon}
                onChange={(event) => setEpicenterLon(event.target.value)}
                className="mt-0.5 w-full rounded bg-slate-900 px-1.5 py-1 text-sm text-slate-100" />
            </label>
            <label className="text-xs text-slate-400">
              Epicenter lat
              <input type="number" step="0.001" value={epicenterLat}
                onChange={(event) => setEpicenterLat(event.target.value)}
                className="mt-0.5 w-full rounded bg-slate-900 px-1.5 py-1 text-sm text-slate-100" />
            </label>
            <label className="text-xs text-slate-400">
              Depth (km)
              <input type="number" step="1" value={depthKm}
                onChange={(event) => setDepthKm(event.target.value)}
                className="mt-0.5 w-full rounded bg-slate-900 px-1.5 py-1 text-sm text-slate-100" />
            </label>
            <label className="text-xs text-slate-400">
              Magnitude (Mw)
              <input type="number" step="0.1" value={momentMagnitude}
                onChange={(event) => setMomentMagnitude(event.target.value)}
                className="mt-0.5 w-full rounded bg-slate-900 px-1.5 py-1 text-sm text-slate-100" />
            </label>
          </div>
          <button type="button" data-testid="start-simulation"
            disabled={startSimulation.isPending} onClick={() => startSimulation.mutate()}
            className="w-full rounded bg-sky-700 px-2 py-1 text-sm text-white hover:bg-sky-600 disabled:opacity-50">
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

      {replayRun && (
        <div className="mb-3 space-y-2 rounded border border-cyan-900/80 bg-slate-900/90 p-2.5"
          data-testid="seismic-replay">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold text-cyan-200">Deterministic solver replay</h3>
              <p className="text-[10px] text-slate-500">FDTD wave field + Newmark-β structures</p>
            </div>
            <button type="button" onClick={() => {
              setIsPlaying(false);
              activateSimulation(replayRun, null);
            }} className="text-[10px] text-sky-400 underline">
              peak PGA
            </button>
          </div>

          {replayQuery.isLoading && <p className="text-xs text-slate-400">Loading replay frames…</p>}
          {replayQuery.isError && (
            <p className="text-xs text-red-400">Replay artifacts are unavailable for this run.</p>
          )}
          {replay && currentFrame && (
            <>
              <div className="grid grid-cols-4 gap-1 text-[10px]">
                <div><span className="text-slate-500">Mw</span><br />{replay.momentMagnitude.toFixed(1)}</div>
                <div><span className="text-slate-500">Depth</span><br />{replay.depthKm.toFixed(1)} km</div>
                <div><span className="text-slate-500">Grid</span><br />{replay.gridColumns}×{replay.gridRows}</div>
                <div><span className="text-slate-500">Spacing</span><br />{replay.gridSpacingMeters.toFixed(0)} m</div>
              </div>

              <div className="rounded bg-slate-950/70 p-2">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-mono text-cyan-200">t = {currentFrame.timeSeconds.toFixed(3)} s</span>
                  <span className="text-[10px] text-slate-500">
                    step {currentFrame.step}/{replay.totalSteps} · Δt {replay.timeStepSeconds.toFixed(5)} s
                  </span>
                </div>
                <input type="range" min={0} max={replay.frames.length - 1} value={frameIndex}
                  onChange={(event) => {
                    setIsPlaying(false);
                    selectFrame(Number(event.target.value));
                  }} className="w-full accent-cyan-500" aria-label="Seismic replay timeline" />
                <div className="mt-1 flex items-center justify-center gap-1">
                  <button type="button" onClick={() => { setIsPlaying(false); selectFrame(0); }}
                    className="viewer-btn px-2 py-0.5" aria-label="First frame">|◀</button>
                  <button type="button" onClick={() => { setIsPlaying(false); selectFrame(frameIndex - 1); }}
                    className="viewer-btn px-2 py-0.5" aria-label="Previous frame">◀</button>
                  <button type="button" onClick={() => {
                    if (frameIndex >= replay.frames.length - 1) selectFrame(0);
                    setIsPlaying((playing) => !playing);
                  }} className="min-w-14 rounded bg-cyan-800 px-2 py-0.5 text-xs text-white"
                    aria-label={isPlaying ? 'Pause replay' : 'Play replay'}>
                    {isPlaying ? 'Pause' : 'Play'}
                  </button>
                  <button type="button" onClick={() => { setIsPlaying(false); selectFrame(frameIndex + 1); }}
                    className="viewer-btn px-2 py-0.5" aria-label="Next frame">▶</button>
                  <select value={playbackRate} onChange={(event) => setPlaybackRate(Number(event.target.value))}
                    className="rounded bg-slate-800 px-1 py-0.5 text-xs text-slate-200"
                    aria-label="Replay speed">
                    <option value={0.25}>0.25×</option>
                    <option value={0.5}>0.5×</option>
                    <option value={1}>1×</option>
                    <option value={2}>2×</option>
                    <option value={4}>4×</option>
                  </select>
                </div>
              </div>

              <ImpactAtFrame frame={currentFrame} total={replay.buildingCount} />

              <div>
                <div className="h-2 rounded bg-gradient-to-r from-slate-950 via-cyan-500 via-40% to-red-500" />
                <div className="mt-0.5 flex justify-between text-[9px] text-slate-500">
                  <span>0 g</span><span>instantaneous acceleration</span><span>≥ 1 g</span>
                </div>
              </div>
              <p className="text-[10px] leading-relaxed text-slate-500">
                Frames are sampled from this run’s numerical integration. Real-world fidelity still depends on
                soil, source and structural assumptions; this is an engineering simulation, not an observed forecast.
              </p>
            </>
          )}
        </div>
      )}

      <details open>
        <summary className="mb-2 cursor-pointer text-xs font-medium text-slate-300">Simulation runs</summary>
        <ul className="space-y-2">
          {runs?.map((run) => (
            <li key={run.id} className="rounded border border-slate-800 bg-slate-900/70 p-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-200">{run.disasterType}</span>
                <span className={`status-badge status-${run.status}`}>{run.status}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded bg-slate-800">
                <div className="h-full rounded bg-sky-600 transition-all"
                  style={{ width: `${run.progress}%` }} />
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                <span>{run.currentStage ?? '—'}{run.stageMessage ? ` · ${run.stageMessage}` : ''}</span>
                <span>{run.progress}%</span>
              </div>
              {run.error && <p className="mt-1 text-[11px] text-red-400">{run.error}</p>}
              <div className="mt-1 flex gap-2">
                {ACTIVE_STATUSES.has(run.status) && (
                  <button type="button" onClick={() => cancelSimulation.mutate(run.id)}
                    className="text-[11px] text-slate-400 underline hover:text-red-400">
                    cancel
                  </button>
                )}
                {run.status === 'completed' && run.cityRevisionId === selectedRevision?.id && (
                  <button type="button" data-testid={`show-on-map-${run.id}`}
                    onClick={() => openReplay(run)}
                    className="text-[11px] text-sky-400 underline hover:text-sky-300">
                    {watchedSimulationId === run.id ? 'replay on map' : 'open replay'}
                  </button>
                )}
              </div>
            </li>
          ))}
          {runs?.length === 0 && <li className="text-xs text-slate-500">No simulations yet.</li>}
        </ul>
      </details>
    </section>
  );
}
