import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, simulationIntensityDataUrl } from '../../api/client';
import type {
  BuildingSeismicResponse,
  SeismicAttenuationBand,
  SeismicDirectionSector,
  SeismicReplayManifest,
} from '../../schemas/api';
import { useAppStore } from '../../stores/appStore';
import { SimulationPanel } from '../disaster-simulation/SimulationPanel';
import type {
  ScientificToolDefinition,
  ScientificToolProps,
} from './scientificToolRegistry';
import {
  activateSeismicSimulation,
  buildSeismicDirectionOverlay,
} from './seismicMap';

function useEarthquakeResult(run: ScientificToolProps['run']) {
  const replayQuery = useQuery({
    queryKey: ['simulation-replay', run?.id],
    queryFn: () => api.getSimulationReplay(run!.id),
    enabled: run?.status === 'completed',
    staleTime: Number.POSITIVE_INFINITY,
  });
  const responsesQuery = useQuery({
    queryKey: ['simulation-building-responses', run?.id],
    queryFn: () => api.listSimulationBuildingResponses(run!.id),
    enabled: run?.status === 'completed',
    staleTime: Number.POSITIVE_INFINITY,
  });
  return { replayQuery, responsesQuery };
}

function ToolState({
  run,
  loading,
  error,
}: {
  run: ScientificToolProps['run'];
  loading: boolean;
  error: boolean;
}) {
  if (!run) {
    return (
      <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-5 text-center">
        <p className="text-sm font-medium text-slate-300">Nenhuma simulação selecionada</p>
        <p className="mt-1 text-xs text-slate-500">
          Execute ou selecione um cenário sísmico concluído.
        </p>
      </div>
    );
  }
  if (loading) return <p className="text-xs text-slate-400">Carregando produtos científicos…</p>;
  if (error) {
    return (
      <p className="rounded border border-red-900/70 bg-red-950/30 p-3 text-xs text-red-300">
        Os artefatos científicos desta execução não estão disponíveis.
      </p>
    );
  }
  return null;
}

function EarthquakeSystemTool({ run }: ScientificToolProps) {
  const { replayQuery, responsesQuery } = useEarthquakeResult(run);
  const replay = replayQuery.data;
  const responses = responsesQuery.data;
  const state = (
    <ToolState
      run={run}
      loading={replayQuery.isLoading || responsesQuery.isLoading}
      error={replayQuery.isError || responsesQuery.isError}
    />
  );
  if (!replay || !responses) return state;

  const affected = responses.filter((response) => response.damageState !== 'none').length;
  const critical = responses.filter(
    (response) => response.damageState === 'extensive' || response.damageState === 'complete',
  ).length;
  const dominantDirection = [...replay.directionSectors]
    .sort((left, right) => right.peakPgaG - left.peakPgaG)[0];
  const firstBand = replay.attenuationProfile[0];
  const lastBand = replay.attenuationProfile.at(-1);
  const dissipation =
    firstBand && lastBand && firstBand.meanPgaG > 0
      ? Math.max(0, (1 - lastBand.meanPgaG / firstBand.meanPgaG) * 100)
      : 0;

  return (
    <div className="space-y-3" data-testid="scientific-system-analysis">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric label="PGA máxima" value={`${replay.peakGroundAccelerationG.toFixed(3)} g`} tone="cyan" />
        <Metric label="Edifícios afetados" value={`${affected}/${responses.length}`} tone="amber" />
        <Metric label="Dano extenso/total" value={critical.toString()} tone="rose" />
        <Metric
          label="Direção dominante"
          value={dominantDirection ? `${dominantDirection.direction} · ${dominantDirection.peakPgaG.toFixed(3)}g` : '—'}
          tone="sky"
        />
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/55 p-3">
        <h3 className="text-xs font-semibold text-slate-200">Cadeia de análise sistêmica</h3>
        <div className="mt-3 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-1 text-center text-[10px]">
          <AnalysisNode label="Fonte" value={`Mw ${replay.momentMagnitude.toFixed(1)}`} />
          <FlowArrow />
          <AnalysisNode label="Meio" value={`Vs̄ ${replay.meanShearVelocityMps.toFixed(0)} m/s`} />
          <FlowArrow />
          <AnalysisNode label="Exposição" value={`${replay.buildingCount} edifícios`} />
        </div>
        <div className="my-1 flex justify-center text-slate-600">↓</div>
        <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-1 text-center text-[10px]">
          <AnalysisNode label="Movimento" value={`${replay.peakGroundAccelerationG.toFixed(3)} g`} />
          <FlowArrow />
          <AnalysisNode label="Resposta" value={`${critical} críticos`} />
          <FlowArrow />
          <AnalysisNode label="Decisão" value="mapa + operação" />
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Insight
          title="Dissipação espacial"
          text={
            firstBand && lastBand
              ? `A PGA média caiu ${dissipation.toFixed(1)}% entre as faixas ${formatBand(firstBand)} e ${formatBand(lastBand)}.`
              : 'A execução não possui faixas espaciais suficientes para comparar a dissipação.'
          }
        />
        <Insight
          title="Assimetria direcional"
          text={
            dominantDirection
              ? `O maior pico calculado está no setor ${dominantDirection.direction}; isso combina espalhamento, terreno e limites da malha.`
              : 'Sem setores direcionais disponíveis nesta execução.'
          }
        />
      </div>

      <ScientificNotice model={replay.modelVersion} />
    </div>
  );
}

function EarthquakeSourceTool({ run }: ScientificToolProps) {
  const { replayQuery } = useEarthquakeResult(run);
  const replay = replayQuery.data;
  const state = (
    <ToolState run={run} loading={replayQuery.isLoading} error={replayQuery.isError} />
  );
  if (!replay) {
    return (
      <div className="space-y-3">
        {state}
        <UsgsCatalog />
      </div>
    );
  }
  const cfl = replay.gridSpacingMeters > 0
    ? replay.timeStepSeconds * replay.maximumShearVelocityMps * Math.SQRT2
      / replay.gridSpacingMeters
    : 0;

  return (
    <div className="space-y-3" data-testid="scientific-source-analysis">
      <div className="grid grid-cols-2 gap-2">
        <ScientificValue label="Magnitude de momento" value={`Mw ${replay.momentMagnitude.toFixed(2)}`} />
        <ScientificValue label="Profundidade hipocentral" value={`${replay.depthKm.toFixed(1)} km`} />
        <ScientificValue
          label="Momento sísmico M₀"
          value={scientificNotation(replay.seismicMomentNewtonMeters, 'N·m')}
        />
        <ScientificValue
          label="Energia radiada estimada"
          value={scientificNotation(replay.estimatedRadiatedEnergyJoules, 'J')}
        />
        <ScientificValue
          label="Frequência de canto"
          value={`${replay.cornerFrequencyHz.toFixed(3)} Hz`}
        />
        <ScientificValue
          label="Epicentro"
          value={`${replay.epicenterLat.toFixed(4)}, ${replay.epicenterLon.toFixed(4)}`}
        />
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/55 p-3">
        <h3 className="text-xs font-semibold text-slate-200">Discretização e estabilidade</h3>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
          <DataRow label="Malha FDTD" value={`${replay.gridColumns} × ${replay.gridRows}`} />
          <DataRow label="Raster científico" value={`${replay.rasterColumns} × ${replay.rasterRows}`} />
          <DataRow label="Δx" value={`${replay.gridSpacingMeters.toFixed(1)} m`} />
          <DataRow label="Δt" value={`${replay.timeStepSeconds.toFixed(5)} s`} />
          <DataRow label="Passos" value={replay.totalSteps.toLocaleString('pt-BR')} />
          <DataRow label="Tempo físico" value={`${replay.totalSeconds.toFixed(2)} s`} />
          <DataRow
            label="Vs mín / média / máx"
            value={`${replay.minimumShearVelocityMps.toFixed(0)} / ${replay.meanShearVelocityMps.toFixed(0)} / ${replay.maximumShearVelocityMps.toFixed(0)} m/s`}
          />
          <DataRow label="Número de Courant" value={cfl.toFixed(3)} />
        </dl>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
          <div
            className={`h-full rounded-full ${cfl <= 1 ? 'bg-emerald-500' : 'bg-red-500'}`}
            style={{ width: `${Math.min(100, cfl * 100)}%` }}
          />
        </div>
        <p className="mt-1 text-[10px] text-slate-500">
          CFL ≤ 1: {cfl <= 1 ? 'condição explícita atendida' : 'atenção, condição excedida'}.
        </p>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/55 p-3">
        <h3 className="text-xs font-semibold text-slate-200">Dados que alimentam o modelo</h3>
        <ul className="mt-2 space-y-1.5 text-[11px] text-slate-400">
          <li><b className="text-slate-300">Fonte:</b> modelo pontual de Brune e relação Mw–M₀.</li>
          <li><b className="text-slate-300">Solo:</b> Vs30 inferido da inclinação do terreno amostrado.</li>
          <li><b className="text-slate-300">Cidade:</b> geometrias, alturas e tipologias da revisão publicada.</li>
          <li><b className="text-slate-300">Estruturas:</b> resposta SDOF por Newmark-β e amortecimento configurado.</li>
        </ul>
      </div>

      <UsgsCatalog />

      {run && (
        <a
          href={simulationIntensityDataUrl(run.id)}
          download
          className="inline-flex items-center rounded-lg border border-cyan-800/70 bg-cyan-950/30 px-3 py-2 text-xs font-medium text-cyan-200 hover:bg-cyan-900/40"
        >
          Baixar raster PGA codificado (0,001 g)
        </a>
      )}
    </div>
  );
}

function EarthquakePropagationTool({ run, onRequestMap }: ScientificToolProps) {
  const { replayQuery } = useEarthquakeResult(run);
  const replay = replayQuery.data;
  const [frameIndex, setFrameIndex] = useState<number | null>(null);
  const state = (
    <ToolState run={run} loading={replayQuery.isLoading} error={replayQuery.isError} />
  );
  if (!replay || !run) return state;

  const resolvedIndex = Math.min(
    frameIndex ?? replay.frames.length - 1,
    replay.frames.length - 1,
  );
  const frame = replay.frames[resolvedIndex];

  const projectOnMap = () => {
    activateSeismicSimulation(run, frame.index);
    useAppStore.getState().setScientificOverlay(buildSeismicDirectionOverlay(replay, frame));
    onRequestMap?.();
  };

  return (
    <div className="space-y-3" data-testid="scientific-propagation-analysis">
      <div className="rounded-xl border border-cyan-900/70 bg-cyan-950/15 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-semibold text-cyan-100">Frente de onda S</h3>
            <p className="mt-0.5 text-[10px] text-slate-500">
              Campo FDTD heterogêneo + correção de espalhamento 2.5D
            </p>
          </div>
          <span className="font-mono text-sm text-cyan-300">t={frame.timeSeconds.toFixed(3)}s</span>
        </div>
        <input
          type="range"
          min={0}
          max={replay.frames.length - 1}
          value={resolvedIndex}
          aria-label="Instante da análise de propagação"
          onChange={(event) => setFrameIndex(Number(event.target.value))}
          className="mt-3 w-full accent-cyan-500"
        />
        <div className="mt-1 flex justify-between text-[9px] text-slate-500">
          <span>origem</span>
          <span>{frame.step}/{replay.totalSteps} passos</span>
          <span>{replay.totalSeconds.toFixed(2)} s</span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/55 p-3">
          <h3 className="text-xs font-semibold text-slate-200">Direção da energia</h3>
          <p className="mt-0.5 text-[10px] text-slate-500">PGA de pico por setor azimutal</p>
          <DirectionRadar sectors={replay.directionSectors} />
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/55 p-3">
          <h3 className="text-xs font-semibold text-slate-200">Envelope da frente</h3>
          <div className="mt-3 space-y-2">
            <VelocityRow
              label="Vs mínima"
              velocity={replay.minimumShearVelocityMps}
              time={frame.timeSeconds}
              color="#38bdf8"
            />
            <VelocityRow
              label="Vs média"
              velocity={replay.meanShearVelocityMps}
              time={frame.timeSeconds}
              color="#22d3ee"
            />
            <VelocityRow
              label="Vs máxima"
              velocity={replay.maximumShearVelocityMps}
              time={frame.timeSeconds}
              color="#a5f3fc"
            />
          </div>
          <p className="mt-3 text-[10px] leading-relaxed text-slate-500">
            O envelope indica o intervalo cinemático; o raster mostra a propagação
            calculada célula a célula.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/55 p-3">
        <h3 className="text-xs font-semibold text-slate-200">Dissipação com a distância</h3>
        <p className="mt-0.5 text-[10px] text-slate-500">
          PGA média e máxima observadas no raster final por anéis epicentrais
        </p>
        <AttenuationChart bands={replay.attenuationProfile} />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="project-seismic-direction"
          onClick={projectOnMap}
          className="rounded-lg bg-cyan-700 px-3 py-2 text-xs font-semibold text-white hover:bg-cyan-600"
        >
          Projetar direção + onda no mapa
        </button>
        <button
          type="button"
          onClick={() => useAppStore.getState().setScientificOverlay(null)}
          className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800"
        >
          Limpar vetores
        </button>
      </div>
    </div>
  );
}

function EarthquakeIntensityTool({ run, onRequestMap }: ScientificToolProps) {
  const { replayQuery } = useEarthquakeResult(run);
  const replay = replayQuery.data;
  const [frameIndex, setFrameIndex] = useState<number | 'peak'>('peak');
  const state = (
    <ToolState run={run} loading={replayQuery.isLoading} error={replayQuery.isError} />
  );
  if (!replay || !run) return state;

  const showOnMap = () => {
    activateSeismicSimulation(
      run,
      frameIndex === 'peak' ? null : replay.frames[frameIndex].index,
    );
    onRequestMap?.();
  };
  const selectedFrame = frameIndex === 'peak' ? null : replay.frames[frameIndex];

  return (
    <div className="space-y-3" data-testid="scientific-intensity-analysis">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric label="PGA de domínio" value={`${replay.peakGroundAccelerationG.toFixed(3)} g`} tone="rose" />
        <Metric label="Resolução" value={`${replay.rasterColumns}×${replay.rasterRows}`} tone="cyan" />
        <Metric label="Amostras temporais" value={replay.frames.length.toString()} tone="sky" />
        <Metric label="Escala" value="0–1 g fixa" tone="amber" />
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/55 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-semibold text-slate-200">Mapa de calor</h3>
            <p className="text-[10px] text-slate-500">
              {selectedFrame
                ? `Aceleração instantânea em t=${selectedFrame.timeSeconds.toFixed(3)} s`
                : 'PGA máxima acumulada em cada célula'}
            </p>
          </div>
          <select
            value={frameIndex}
            onChange={(event) =>
              setFrameIndex(event.target.value === 'peak' ? 'peak' : Number(event.target.value))
            }
            aria-label="Produto do mapa de intensidade"
            className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-[11px] text-slate-200"
          >
            <option value="peak">PGA máxima</option>
            {replay.frames.map((frame, index) => (
              <option key={frame.index} value={index}>
                t={frame.timeSeconds.toFixed(3)} s
              </option>
            ))}
          </select>
        </div>
        <IntensityLegend />
        <button
          type="button"
          data-testid="show-seismic-heatmap"
          onClick={showOnMap}
          className="mt-3 w-full rounded-lg bg-sky-700 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-600"
        >
          Exibir mapa de calor
        </button>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/55 p-3">
        <h3 className="text-xs font-semibold text-slate-200">Evolução do pico instantâneo</h3>
        <IntensityHistory replay={replay} />
      </div>
    </div>
  );
}

function EarthquakeImpactTool({ run }: ScientificToolProps) {
  const { replayQuery, responsesQuery } = useEarthquakeResult(run);
  const replay = replayQuery.data;
  const responses = responsesQuery.data;
  const state = (
    <ToolState
      run={run}
      loading={replayQuery.isLoading || responsesQuery.isLoading}
      error={replayQuery.isError || responsesQuery.isError}
    />
  );
  if (!replay || !responses) return state;

  const damageLevels = [
    ['none', 'Sem dano', '#64748b'],
    ['slight', 'Leve', '#eab308'],
    ['moderate', 'Moderado', '#f97316'],
    ['extensive', 'Extenso', '#ef4444'],
    ['complete', 'Completo', '#7f1d1d'],
  ] as const;
  const counts = damageLevels.map(([key]) =>
    responses.filter((response) => response.damageState === key).length,
  );
  const maximum = Math.max(1, ...counts);

  return (
    <div className="space-y-3" data-testid="scientific-impact-analysis">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric label="PGA P95" value={`${percentile(responses, 'peakGroundAccelerationG', 0.95).toFixed(3)} g`} tone="cyan" />
        <Metric label="PGV P95" value={`${percentile(responses, 'peakGroundVelocityCms', 0.95).toFixed(1)} cm/s`} tone="sky" />
        <Metric label="Sa espectral P95" value={`${percentile(responses, 'spectralAccelerationG', 0.95).toFixed(3)} g`} tone="amber" />
        <Metric label="Drift máximo" value={`${(maximumOf(responses, 'peakDriftRatio') * 100).toFixed(3)}%`} tone="rose" />
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/55 p-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-200">Estados de dano estrutural</h3>
          <span className="text-[10px] text-slate-500">{responses.length} edifícios</span>
        </div>
        <div className="mt-3 space-y-2">
          {damageLevels.map(([, label, color], index) => (
            <div key={label} className="grid grid-cols-[5rem_1fr_2.5rem] items-center gap-2 text-[10px]">
              <span className="text-slate-400">{label}</span>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${counts[index] / maximum * 100}%`, backgroundColor: color }}
                />
              </div>
              <span className="text-right font-medium text-slate-200">{counts[index]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <DistributionCard title="Aceleração do solo (PGA)" values={responses.map((item) => item.peakGroundAccelerationG)} unit="g" />
        <DistributionCard title="Período natural" values={responses.map((item) => item.naturalPeriodSeconds)} unit="s" />
        <DistributionCard title="Velocidade do solo (PGV)" values={responses.map((item) => item.peakGroundVelocityCms)} unit="cm/s" />
        <DistributionCard title="Drift estrutural" values={responses.map((item) => item.peakDriftRatio * 100)} unit="%" />
      </div>

      <ScientificNotice model={replay.modelVersion} />
    </div>
  );
}

function EarthquakeLaboratoryTool() {
  return <SimulationPanel />;
}

export const earthquakeScientificTools: ScientificToolDefinition[] = [
  {
    id: 'systemic-analysis',
    disasterType: 'earthquake',
    category: 'system',
    title: 'Análise sistêmica',
    shortTitle: 'Sistema',
    description: 'Relações entre fonte, meio, exposição, resposta e decisão.',
    outputs: ['síntese', 'assimetria', 'criticidade'],
    component: EarthquakeSystemTool,
  },
  {
    id: 'source-and-data',
    disasterType: 'earthquake',
    category: 'source',
    title: 'Fonte, dados e modelo',
    shortTitle: 'Fonte & dados',
    description: 'Hipocentro, energia, momento, malha, Vs e estabilidade numérica.',
    outputs: ['M₀', 'energia', 'Vs30', 'CFL'],
    component: EarthquakeSourceTool,
  },
  {
    id: 'propagation-and-dissipation',
    disasterType: 'earthquake',
    category: 'propagation',
    title: 'Propagação e dissipação',
    shortTitle: 'Propagação',
    description: 'Frente de onda, direção azimutal e atenuação com a distância.',
    outputs: ['onda', 'direção', 'dissipação'],
    component: EarthquakePropagationTool,
  },
  {
    id: 'intensity-heatmap',
    disasterType: 'earthquake',
    category: 'intensity',
    title: 'Intensidade e mapa de calor',
    shortTitle: 'Intensidade',
    description: 'PGA acumulada, quadros instantâneos e evolução temporal.',
    outputs: ['PGA', 'heatmap', 'replay'],
    component: EarthquakeIntensityTool,
  },
  {
    id: 'structural-impact',
    disasterType: 'earthquake',
    category: 'impact',
    title: 'Impacto estrutural',
    shortTitle: 'Estruturas',
    description: 'PGA, PGV, aceleração espectral, drift e estados de dano.',
    outputs: ['PGA/PGV', 'drift', 'dano'],
    component: EarthquakeImpactTool,
  },
  {
    id: 'simulation-laboratory',
    disasterType: 'earthquake',
    category: 'laboratory',
    title: 'Laboratório de cenários',
    shortTitle: 'Simular',
    description: 'Configure a fonte, execute o solver e reproduza o campo de onda.',
    outputs: ['simulação', 'FDTD', 'Newmark-β'],
    component: EarthquakeLaboratoryTool,
  },
];

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'cyan' | 'amber' | 'rose' | 'sky';
}) {
  const colors = {
    cyan: 'text-cyan-300',
    amber: 'text-amber-300',
    rose: 'text-rose-300',
    sky: 'text-sky-300',
  };
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/65 p-2.5">
      <div className={`truncate text-sm font-bold ${colors[tone]}`} title={value}>{value}</div>
      <div className="mt-0.5 text-[9px] leading-tight text-slate-500">{label}</div>
    </div>
  );
}

function AnalysisNode({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-700 bg-slate-950/80 px-1 py-2">
      <div className="uppercase tracking-wide text-slate-600">{label}</div>
      <div className="mt-0.5 truncate font-medium text-cyan-200" title={value}>{value}</div>
    </div>
  );
}

function FlowArrow() {
  return <span aria-hidden="true" className="text-cyan-700">→</span>;
}

function Insight({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/55 p-3">
      <h3 className="text-[11px] font-semibold text-slate-200">{title}</h3>
      <p className="mt-1 text-[10px] leading-relaxed text-slate-500">{text}</p>
    </div>
  );
}

function ScientificValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/55 p-3">
      <dt className="text-[9px] uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 break-words font-mono text-xs text-cyan-200">{value}</dd>
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[9px] uppercase tracking-wide text-slate-600">{label}</dt>
      <dd className="mt-0.5 text-slate-300">{value}</dd>
    </div>
  );
}

function DirectionRadar({ sectors }: { sectors: SeismicDirectionSector[] }) {
  const maximum = Math.max(0.001, ...sectors.map((sector) => sector.peakPgaG));
  const points = sectors.map((sector) => {
    const radius = 16 + sector.peakPgaG / maximum * 54;
    const angle = sector.centerBearingDegrees * Math.PI / 180;
    return `${80 + Math.sin(angle) * radius},${80 - Math.cos(angle) * radius}`;
  }).join(' ');
  return (
    <svg
      viewBox="0 0 160 160"
      role="img"
      aria-label="Distribuição direcional da aceleração sísmica"
      className="mx-auto mt-2 size-44 max-w-full"
    >
      {[25, 50, 70].map((radius) => (
        <circle key={radius} cx="80" cy="80" r={radius} fill="none" stroke="#334155" strokeWidth="0.7" />
      ))}
      {sectors.map((sector) => {
        const angle = sector.centerBearingDegrees * Math.PI / 180;
        const x = 80 + Math.sin(angle) * 70;
        const y = 80 - Math.cos(angle) * 70;
        const labelX = 80 + Math.sin(angle) * 77;
        const labelY = 80 - Math.cos(angle) * 77;
        return (
          <g key={sector.direction}>
            <line x1="80" y1="80" x2={x} y2={y} stroke="#334155" strokeWidth="0.7" />
            <text x={labelX} y={labelY} fill="#94a3b8" fontSize="7" textAnchor="middle" dominantBaseline="middle">
              {sector.direction}
            </text>
          </g>
        );
      })}
      <polygon points={points} fill="#06b6d4" fillOpacity="0.25" stroke="#22d3ee" strokeWidth="1.5" />
      <circle cx="80" cy="80" r="3" fill="#fde047" />
    </svg>
  );
}

function VelocityRow({
  label,
  velocity,
  time,
  color,
}: {
  label: string;
  velocity: number;
  time: number;
  color: string;
}) {
  return (
    <div className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-2 text-[10px]">
      <span className="text-slate-500">{label}</span>
      <div className="h-1.5 rounded-full bg-slate-800">
        <div className="h-full rounded-full" style={{ width: `${Math.max(5, velocity / 15)}%`, backgroundColor: color }} />
      </div>
      <span className="font-mono text-slate-300">{(velocity * time / 1000).toFixed(2)} km</span>
    </div>
  );
}

function AttenuationChart({ bands }: { bands: SeismicAttenuationBand[] }) {
  const maximum = Math.max(0.001, ...bands.map((band) => band.peakPgaG));
  if (bands.length === 0) {
    return <p className="mt-3 text-xs text-slate-500">Sem perfil de dissipação nesta execução.</p>;
  }
  return (
    <div className="mt-3 space-y-2">
      {bands.map((band) => (
        <div key={`${band.minimumDistanceKm}-${band.maximumDistanceKm}`} className="grid grid-cols-[3.5rem_1fr_4rem] items-center gap-2">
          <span className="text-[9px] text-slate-500">{formatBand(band)}</span>
          <div className="relative h-4 overflow-hidden rounded bg-slate-800/80">
            <div
              className="absolute inset-y-0 left-0 rounded bg-cyan-500/45"
              style={{ width: `${band.peakPgaG / maximum * 100}%` }}
            />
            <div
              className="absolute inset-y-1 left-0 rounded bg-cyan-300"
              style={{ width: `${band.meanPgaG / maximum * 100}%` }}
            />
          </div>
          <span className="text-right font-mono text-[9px] text-cyan-200">
            {band.meanPgaG.toFixed(3)}g
          </span>
        </div>
      ))}
      <div className="flex justify-end gap-3 text-[9px] text-slate-600">
        <span><i className="mr-1 inline-block size-1.5 bg-cyan-300" />média</span>
        <span><i className="mr-1 inline-block size-1.5 bg-cyan-500/45" />máxima</span>
      </div>
    </div>
  );
}

function IntensityLegend() {
  const stops = [
    ['0', '#000000'],
    ['0,005', '#0a1640'],
    ['0,02', '#185caa'],
    ['0,08', '#19becd'],
    ['0,20', '#f6d546'],
    ['0,40', '#f57d20'],
    ['0,70', '#da2d23'],
    ['≥1g', '#fff4e6'],
  ];
  return (
    <div className="mt-4">
      <div
        className="h-3 rounded-full"
        style={{
          background: `linear-gradient(to right, ${stops.map(([, color]) => color).join(', ')})`,
        }}
      />
      <div className="mt-1 flex justify-between text-[8px] text-slate-500">
        {stops.map(([label]) => <span key={label}>{label}</span>)}
      </div>
    </div>
  );
}

function IntensityHistory({ replay }: { replay: SeismicReplayManifest }) {
  const width = 340;
  const height = 110;
  const padding = 16;
  const maximum = Math.max(0.001, ...replay.frames.map((frame) => frame.peakAccelerationG));
  const points = replay.frames.map((frame, index) => {
    const x = padding + index / Math.max(1, replay.frames.length - 1) * (width - padding * 2);
    const y = height - padding - frame.peakAccelerationG / maximum * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="PGA de pico ao longo do tempo simulado"
      className="mt-2 w-full"
    >
      <defs>
        <linearGradient id="scientific-intensity-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map((fraction) => (
        <line
          key={fraction}
          x1={padding}
          x2={width - padding}
          y1={height - padding - fraction * (height - padding * 2)}
          y2={height - padding - fraction * (height - padding * 2)}
          stroke="#334155"
          strokeWidth="0.6"
        />
      ))}
      <polygon
        points={`${padding},${height - padding} ${points} ${width - padding},${height - padding}`}
        fill="url(#scientific-intensity-fill)"
      />
      <polyline points={points} fill="none" stroke="#22d3ee" strokeWidth="2" />
      <text x={padding} y={height - 3} fill="#64748b" fontSize="7">0 s</text>
      <text x={width - padding} y={height - 3} fill="#64748b" fontSize="7" textAnchor="end">
        {replay.totalSeconds.toFixed(2)} s
      </text>
      <text x={padding} y={9} fill="#67e8f9" fontSize="7">{maximum.toFixed(3)} g</text>
    </svg>
  );
}

function DistributionCard({
  title,
  values,
  unit,
}: {
  title: string;
  values: number[];
  unit: string;
}) {
  const ordered = [...values].sort((left, right) => left - right);
  const valueAt = (fraction: number) =>
    ordered[Math.min(ordered.length - 1, Math.floor(ordered.length * fraction))] ?? 0;
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/55 p-3">
      <h3 className="text-[11px] font-semibold text-slate-200">{title}</h3>
      <dl className="mt-2 grid grid-cols-3 gap-2 text-center">
        <DataPoint label="P50" value={`${valueAt(0.5).toFixed(3)} ${unit}`} />
        <DataPoint label="P95" value={`${valueAt(0.95).toFixed(3)} ${unit}`} />
        <DataPoint label="Máx" value={`${(ordered.at(-1) ?? 0).toFixed(3)} ${unit}`} />
      </dl>
    </div>
  );
}

function DataPoint({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[8px] uppercase text-slate-600">{label}</dt>
      <dd className="mt-0.5 text-[10px] text-cyan-200">{value}</dd>
    </div>
  );
}

function UsgsSource({
  name,
  use,
  href,
}: {
  name: string;
  use: string;
  href: string;
}) {
  return (
    <li className="rounded-lg border border-blue-900/40 bg-slate-950/45 p-2.5">
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="text-[11px] font-semibold text-blue-200 hover:underline"
      >
        {name}
      </a>
      <p className="mt-1 text-[9px] leading-relaxed text-slate-500">{use}</p>
    </li>
  );
}

function UsgsCatalog() {
  return (
    <div
      className="rounded-xl border border-blue-900/60 bg-blue-950/20 p-3"
      data-testid="usgs-scientific-catalog"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xs font-semibold text-blue-200">Catálogo científico USGS</h3>
          <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
            Fontes oficiais para confrontar a simulação com observações e
            substituir hipóteses por produtos instrumentais quando disponíveis.
          </p>
        </div>
        <a
          href="https://www.usgs.gov/programs/earthquake-hazards/science/earthquake-data"
          target="_blank"
          rel="noreferrer"
          className="shrink-0 text-[10px] text-blue-300 underline hover:text-blue-200"
        >
          catálogo
        </a>
      </div>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        <UsgsSource
          name="ComCat / FDSN"
          use="Hipocentro, magnitude, fases, mecanismo focal e produtos do evento"
          href="https://earthquake.usgs.gov/fdsnws/event/1/"
        />
        <UsgsSource
          name="ShakeMap"
          use="PGA, PGV e intensidade observada para validar o mapa de calor"
          href="https://earthquake.usgs.gov/data/shakemap/"
        />
        <UsgsSource
          name="Finite Fault"
          use="Geometria, direção de ruptura, deslizamento e função momento-tempo"
          href="https://earthquake.usgs.gov/data/finitefault/"
        />
        <UsgsSource
          name="Vs30 global"
          use="Condição de sítio para substituir ou calibrar a inferência por relevo"
          href="https://earthquake.usgs.gov/data/vs30/"
        />
      </ul>
    </div>
  );
}

function ScientificNotice({ model }: { model: string }) {
  return (
    <p className="rounded-lg border border-amber-900/50 bg-amber-950/20 p-2.5 text-[10px] leading-relaxed text-amber-100/55">
      Modelo {model}. Resultado de cenário para comparação e planejamento; não substitui
      ShakeMap observado, instrumentação local nem inspeção de segurança.
    </p>
  );
}

function scientificNotation(value: number, unit: string) {
  if (!Number.isFinite(value) || value <= 0) return 'não disponível';
  return `${value.toExponential(3)} ${unit}`;
}

function formatBand(band: SeismicAttenuationBand) {
  return `${band.minimumDistanceKm.toFixed(0)}–${band.maximumDistanceKm.toFixed(0)} km`;
}

function percentile(
  responses: BuildingSeismicResponse[],
  key: keyof Pick<
    BuildingSeismicResponse,
    'peakGroundAccelerationG' | 'peakGroundVelocityCms' | 'spectralAccelerationG' | 'peakDriftRatio'
  >,
  fraction: number,
) {
  const values = responses.map((response) => response[key]).sort((left, right) => left - right);
  return values[Math.min(values.length - 1, Math.floor(values.length * fraction))] ?? 0;
}

function maximumOf(
  responses: BuildingSeismicResponse[],
  key: keyof Pick<
    BuildingSeismicResponse,
    'peakGroundAccelerationG' | 'peakGroundVelocityCms' | 'spectralAccelerationG' | 'peakDriftRatio'
  >,
) {
  return Math.max(0, ...responses.map((response) => response[key]));
}
