import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type OperationalFeatureInput } from '../../api/client';
import { useAppStore, type DrawGeometryKind } from '../../stores/appStore';
import type { OperationalFeature } from '../../schemas/api';
import {
  OPERATIONAL_TOOL_LABELS,
  OPERATIONAL_TOOLS,
  type OperationalToolTone,
} from './operationalTools';

export const KUMAMOTO_SCENARIO_KEY = 'kumamoto-2026-07-28-m68';

const TOOL_ACCENTS: Record<OperationalToolTone, string> = {
  red: 'border-red-800/70 text-red-200',
  amber: 'border-amber-800/70 text-amber-200',
  sky: 'border-sky-800/70 text-sky-200',
  rose: 'border-rose-800/70 text-rose-200',
  emerald: 'border-emerald-800/70 text-emerald-200',
  orange: 'border-orange-800/70 text-orange-200',
  fuchsia: 'border-fuchsia-800/70 text-fuchsia-200',
};
const EDITABLE_TYPES = new Set(OPERATIONAL_TOOLS.map((tool) => tool.type));
const PRIORITY_LABELS: Record<number, string> = {
  1: 'P1 · crítica',
  2: 'P2 · alta',
  3: 'P3 · moderada',
  4: 'P4 · baixa',
};
const STATUS_LABELS: Record<string, string> = {
  reported: 'Reportado',
  verified: 'Verificado',
  assigned: 'Atribuído',
  'in-progress': 'Em atendimento',
  cleared: 'Liberado',
  closed: 'Encerrado',
};

export function DisasterManagementPanel({
  onRequestMap,
}: {
  onRequestMap?: () => void;
} = {}) {
  const queryClient = useQueryClient();
  const pending = useAppStore((state) => state.pendingOperationalGeometry);
  const operationalDraw = useAppStore((state) => state.operationalDraw);
  const [editing, setEditing] = useState<OperationalFeature | null>(null);
  const [filter, setFilter] = useState<'all' | 'p1' | 'victims' | 'traffic'>('all');

  const operationsQuery = useQuery({
    queryKey: ['operational-features', KUMAMOTO_SCENARIO_KEY],
    queryFn: () => api.listOperationalFeatures(KUMAMOTO_SCENARIO_KEY),
    refetchInterval: 5_000,
  });
  const summaryQuery = useQuery({
    queryKey: ['operational-summary', KUMAMOTO_SCENARIO_KEY],
    queryFn: () => api.getOperationalSummary(KUMAMOTO_SCENARIO_KEY),
    refetchInterval: 5_000,
  });

  const closeFeature = useMutation({
    mutationFn: (featureId: string) =>
      api.closeOperationalFeature(KUMAMOTO_SCENARIO_KEY, featureId),
    onSuccess: () => invalidateOperations(queryClient),
  });

  const visibleFeatures = useMemo(() => {
    // Epicentro e perímetros oficiais também pertencem ao GeoJSON do cenário,
    // mas são referências cartográficas, não ocorrências gerenciáveis.
    const source = (operationsQuery.data ?? [])
      .filter((feature) => EDITABLE_TYPES.has(feature.featureType));
    return source
      .filter((feature) => {
        if (filter === 'p1') return feature.priority === 1;
        if (filter === 'victims')
          return feature.confirmedVictims > 0 || feature.estimatedVictims > 0;
        if (filter === 'traffic') return feature.featureType === 'traffic-interruption';
        return true;
      })
      .sort((left, right) =>
        left.priority - right.priority
        || right.confirmedVictims - left.confirmedVictims
        || Date.parse(right.updatedAt) - Date.parse(left.updatedAt),
      );
  }, [filter, operationsQuery.data]);

  const beginDraw = (featureType: string, geometryKind: DrawGeometryKind) => {
    setEditing(null);
    const state = useAppStore.getState();
    const camera = state.camera;
    if (!camera || Math.abs(camera.longitude - 130.722) > 2 || Math.abs(camera.latitude - 32.682) > 2) {
      state.setPendingCamera({
        longitude: 130.722,
        latitude: 32.682,
        zoom: 10,
        pitch: 35,
        bearing: 0,
      });
    }
    state.startOperationalDraw(featureType, geometryKind);
  };

  return (
    <section className="panel" data-testid="disaster-management-panel">
      <div className="mb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="panel-title">Operação de crise · Kumamoto</h2>
            <p className="mt-1 text-xs text-slate-400">
              Terremoto M6.8 · quadro operacional preliminar
            </p>
          </div>
          <span className="rounded border border-amber-800/70 bg-amber-950/40 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-200">
            Em resposta
          </span>
        </div>
        <p className="mt-2 rounded border border-slate-800 bg-slate-900/60 p-2 text-[10px] leading-relaxed text-slate-500">
          Marcações humanas começam como reportadas. Confirme a fonte antes de mudar para
          verificada ou oficial.
        </p>
        <button
          type="button"
          onClick={() => {
            useAppStore.getState().setPendingCamera({
              longitude: 130.722,
              latitude: 32.682,
              zoom: 10,
              pitch: 35,
              bearing: 0,
            });
            onRequestMap?.();
          }}
          className="mt-2 text-[11px] text-sky-400 underline hover:text-sky-300"
        >
          Centralizar no epicentro e fechar ferramentas
        </button>
      </div>

      <OperationalSummary summary={summaryQuery.data} />

      {!pending && !editing && (
        <div className="mb-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Demarcar no mapa
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {OPERATIONAL_TOOLS.map((tool) => (
              <button
                key={tool.type}
                type="button"
                data-testid={`draw-${tool.type}`}
                disabled={operationalDraw?.active}
                onClick={() => beginDraw(tool.type, tool.geometryKind)}
                className={`rounded border bg-slate-900/70 p-2 text-left hover:bg-slate-800 disabled:opacity-50 ${TOOL_ACCENTS[tool.tone]}`}
              >
                <span className="block text-xs font-semibold">{tool.label}</span>
                <span className="mt-0.5 block text-[10px] leading-snug text-slate-500">
                  {tool.description}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {pending && (
        <OperationalFeatureForm
          key={`new-${pending.featureType}`}
          featureType={pending.featureType}
          geometry={pending.geometry}
          onCancel={() => useAppStore.getState().setPendingOperationalGeometry(null)}
          onSaved={() => {
            useAppStore.getState().setPendingOperationalGeometry(null);
            invalidateOperations(queryClient);
          }}
        />
      )}

      {editing && (
        <OperationalFeatureForm
          key={editing.id}
          featureType={editing.featureType}
          geometry={editing.geometry}
          existing={editing}
          onCancel={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            invalidateOperations(queryClient);
          }}
        />
      )}

      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Quadro ativo
        </h3>
        <select
          aria-label="Filtrar quadro operacional"
          value={filter}
          onChange={(event) => setFilter(event.target.value as typeof filter)}
          className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-300"
        >
          <option value="all">Todos</option>
          <option value="p1">Somente P1</option>
          <option value="victims">Com vítimas</option>
          <option value="traffic">Tráfego</option>
        </select>
      </div>

      {operationsQuery.isLoading && (
        <p className="text-xs text-slate-500">Atualizando quadro operacional…</p>
      )}
      {operationsQuery.error && (
        <p className="text-xs text-red-400">Não foi possível carregar as marcações.</p>
      )}
      <ul className="space-y-2" data-testid="operational-feature-list">
        {visibleFeatures.map((feature) => (
          <OperationalFeatureCard
            key={feature.id}
            feature={feature}
            onEdit={EDITABLE_TYPES.has(feature.featureType) ? () => setEditing(feature) : undefined}
            onClose={
              EDITABLE_TYPES.has(feature.featureType)
                ? () => {
                    if (window.confirm(`Encerrar a marcação "${feature.name}"?`))
                      closeFeature.mutate(feature.id);
                  }
                : undefined
            }
          />
        ))}
        {!operationsQuery.isLoading && visibleFeatures.length === 0 && (
          <li className="rounded border border-dashed border-slate-800 p-3 text-center text-xs text-slate-500">
            Nenhuma marcação corresponde ao filtro.
          </li>
        )}
      </ul>

      <details className="mt-4 border-t border-slate-800 pt-3">
        <summary className="cursor-pointer text-xs font-medium text-slate-300">
          Análise de exposição da revisão urbana
        </summary>
        <RiskZoneSection />
      </details>

      <WeatherSummary />
    </section>
  );
}

function OperationalSummary({
  summary,
}: {
  summary:
    | {
        priorityOne: number;
        confirmedVictims: number;
        estimatedVictims: number;
        peopleRescued: number;
        trafficInterruptions: number;
        alerts: number;
        rescueRoutes: number;
        supportPoints: number;
        assignedTeams: number;
      }
    | undefined;
}) {
  const cards = [
    ['P1 críticas', summary?.priorityOne ?? 0, 'text-red-300'],
    ['Vítimas confirmadas', summary?.confirmedVictims ?? 0, 'text-rose-300'],
    ['Vítimas estimadas', summary?.estimatedVictims ?? 0, 'text-amber-300'],
    ['Resgatadas', summary?.peopleRescued ?? 0, 'text-emerald-300'],
    ['Vias bloqueadas', summary?.trafficInterruptions ?? 0, 'text-orange-300'],
    ['Alertas / rotas', `${summary?.alerts ?? 0} / ${summary?.rescueRoutes ?? 0}`, 'text-amber-300'],
    ['Apoios / equipes', `${summary?.supportPoints ?? 0} / ${summary?.assignedTeams ?? 0}`, 'text-sky-300'],
  ] as const;
  return (
    <div className="mb-4 grid grid-cols-3 gap-1.5" data-testid="operational-summary">
      {cards.map(([label, value, color]) => (
        <div key={label} className="rounded border border-slate-800 bg-slate-900/70 p-2">
          <div className={`text-base font-bold ${color}`}>{value}</div>
          <div className="text-[9px] leading-tight text-slate-500">{label}</div>
        </div>
      ))}
    </div>
  );
}

function OperationalFeatureForm({
  featureType,
  geometry,
  existing,
  onCancel,
  onSaved,
}: {
  featureType: string;
  geometry: GeoJSON.Point | GeoJSON.LineString | GeoJSON.Polygon;
  existing?: OperationalFeature;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(existing?.name ?? OPERATIONAL_TOOL_LABELS[featureType] ?? 'Ocorrência');
  const [priority, setPriority] = useState(existing?.priority ?? 2);
  const [status, setStatus] = useState(existing?.status ?? 'reported');
  const [confirmedVictims, setConfirmedVictims] = useState(existing?.confirmedVictims ?? 0);
  const [estimatedVictims, setEstimatedVictims] = useState(existing?.estimatedVictims ?? 0);
  const [peopleRescued, setPeopleRescued] = useState(existing?.peopleRescued ?? 0);
  const [assignedTeam, setAssignedTeam] = useState(existing?.assignedTeam ?? '');
  const [capacity, setCapacity] = useState(existing?.capacity?.toString() ?? '');
  const [resources, setResources] = useState(existing?.resources ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [verificationStatus, setVerificationStatus] = useState(
    existing?.verificationStatus ?? 'reported',
  );

  const save = useMutation({
    mutationFn: () => {
      const request: OperationalFeatureInput = {
        featureType,
        name: name.trim(),
        geometry,
        priority,
        status,
        confirmedVictims,
        estimatedVictims,
        peopleRescued,
        assignedTeam: assignedTeam.trim() || undefined,
        capacity: capacity === '' ? undefined : Number(capacity),
        resources: resources.trim() || undefined,
        notes: notes.trim() || undefined,
        verificationStatus,
      };
      return existing
        ? api.updateOperationalFeature(KUMAMOTO_SCENARIO_KEY, existing.id, request)
        : api.createOperationalFeature(KUMAMOTO_SCENARIO_KEY, request);
    },
    onSuccess: onSaved,
  });

  return (
    <form
      data-testid="operational-feature-form"
      className="mb-4 space-y-2 rounded border border-sky-800/60 bg-slate-900/90 p-3"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate();
      }}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-sky-200">
          {existing ? 'Atualizar' : 'Registrar'} · {OPERATIONAL_TOOL_LABELS[featureType] ?? featureType}
        </h3>
        <span className="text-[10px] text-slate-500">{geometry.type}</span>
      </div>
      <input
        required
        maxLength={512}
        aria-label="Nome da marcação"
        value={name}
        onChange={(event) => setName(event.target.value)}
        className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100"
      />
      <div className="grid grid-cols-2 gap-2">
        <Field label="Prioridade">
          <select
            value={priority}
            onChange={(event) => setPriority(Number(event.target.value))}
            className="field-control"
          >
            {[1, 2, 3, 4].map((value) => (
              <option key={value} value={value}>{PRIORITY_LABELS[value]}</option>
            ))}
          </select>
        </Field>
        <Field label="Estado">
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="field-control"
          >
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <NumberField
          label="Confirmadas"
          value={confirmedVictims}
          onChange={(value) => {
            setConfirmedVictims(value);
            setEstimatedVictims((current) => Math.max(current, value));
          }}
        />
        <NumberField label="Estimadas" value={estimatedVictims} min={confirmedVictims} onChange={setEstimatedVictims} />
        <NumberField label="Resgatadas" value={peopleRescued} onChange={setPeopleRescued} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Equipe responsável">
          <input
            value={assignedTeam}
            maxLength={256}
            onChange={(event) => setAssignedTeam(event.target.value)}
            placeholder="Ex.: SAR-03"
            className="field-control"
          />
        </Field>
        <Field label="Capacidade">
          <input
            type="number"
            min={0}
            value={capacity}
            onChange={(event) => setCapacity(event.target.value)}
            placeholder="Pessoas"
            className="field-control"
          />
        </Field>
      </div>
      <Field label="Recursos / necessidades">
        <input
          value={resources}
          maxLength={4096}
          onChange={(event) => setResources(event.target.value)}
          placeholder="Ambulâncias, água, escoras, iluminação…"
          className="field-control"
        />
      </Field>
      <Field label="Observações">
        <textarea
          value={notes}
          maxLength={4096}
          rows={2}
          onChange={(event) => setNotes(event.target.value)}
          className="field-control"
        />
      </Field>
      <Field label="Confirmação da informação">
        <select
          value={verificationStatus}
          onChange={(event) => setVerificationStatus(event.target.value)}
          className="field-control"
        >
          <option value="reported">Reportada em campo</option>
          <option value="corroborated">Corroborada por segunda fonte</option>
          <option value="official">Confirmada oficialmente</option>
        </select>
      </Field>
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={save.isPending || !name.trim() || estimatedVictims < confirmedVictims}
          className="flex-1 rounded bg-sky-700 px-2 py-1.5 text-xs font-semibold text-white hover:bg-sky-600 disabled:opacity-50"
        >
          {save.isPending ? 'Salvando…' : existing ? 'Atualizar ocorrência' : 'Adicionar ao quadro'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-slate-700 px-2 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
        >
          Cancelar
        </button>
      </div>
      {save.error && <p className="text-xs text-red-400">{String(save.error)}</p>}
    </form>
  );
}

function OperationalFeatureCard({
  feature,
  onEdit,
  onClose,
}: {
  feature: OperationalFeature;
  onEdit?: () => void;
  onClose?: () => void;
}) {
  return (
    <li
      className={`rounded border bg-slate-900/70 p-2 ${
        feature.priority === 1 ? 'border-red-700/80' : 'border-slate-800'
      }`}
      data-testid={`operational-feature-${feature.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-slate-200">{feature.name}</p>
          <p className="text-[10px] text-slate-500">
            {OPERATIONAL_TOOL_LABELS[feature.featureType] ?? feature.featureType} · {STATUS_LABELS[feature.status] ?? feature.status}
          </p>
        </div>
        <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${
          feature.priority === 1
            ? 'bg-red-900/70 text-red-200'
            : feature.priority === 2
              ? 'bg-orange-900/60 text-orange-200'
              : 'bg-slate-800 text-slate-300'
        }`}>
          P{feature.priority}
        </span>
      </div>
      {(feature.confirmedVictims > 0 || feature.estimatedVictims > 0 || feature.peopleRescued > 0) && (
        <p className="mt-1 text-[11px] text-rose-300">
          {feature.confirmedVictims} confirmadas · {feature.estimatedVictims} estimadas · {feature.peopleRescued} resgatadas
        </p>
      )}
      {feature.assignedTeam && (
        <p className="mt-1 text-[11px] text-sky-300">Equipe: {feature.assignedTeam}</p>
      )}
      {feature.resources && <p className="mt-1 text-[10px] text-slate-400">{feature.resources}</p>}
      {feature.notes && <p className="mt-1 text-[10px] text-slate-500">{feature.notes}</p>}
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[9px] text-slate-600">
          {feature.verificationStatus} · {new Date(feature.updatedAt).toLocaleString()}
        </span>
        {(onEdit || onClose) && (
          <div className="flex gap-2">
            {onEdit && (
              <button type="button" onClick={onEdit} className="text-[10px] text-sky-400 underline">
                editar
              </button>
            )}
            {onClose && (
              <button type="button" onClick={onClose} className="text-[10px] text-red-400 underline">
                encerrar
              </button>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-[10px] text-slate-500">
      <span className="mb-0.5 block">{label}</span>
      {children}
    </label>
  );
}

function NumberField({
  label,
  value,
  min = 0,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  onChange: (value: number) => void;
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        min={min}
        max={1_000_000}
        value={value}
        onChange={(event) => onChange(Math.max(min, Number(event.target.value) || 0))}
        className="field-control"
      />
    </Field>
  );
}

function RiskZoneSection() {
  const queryClient = useQueryClient();
  const selectedRevision = useAppStore((state) => state.selectedRevision);
  const riskZoneDraw = useAppStore((state) => state.riskZoneDraw);
  const pendingGeometry = useAppStore((state) => state.pendingRiskZoneGeometry);
  const [name, setName] = useState('');
  const [hazardType, setHazardType] = useState('earthquake');
  const [level, setLevel] = useState('moderate');
  const [notes, setNotes] = useState('');
  const [expandedZoneId, setExpandedZoneId] = useState<string | null>(null);

  const zonesQuery = useQuery({
    queryKey: ['risk-zones', selectedRevision?.id],
    queryFn: () => api.listRiskZones(selectedRevision!.id),
    enabled: !!selectedRevision,
  });
  const createZone = useMutation({
    mutationFn: () =>
      api.createRiskZone(selectedRevision!.id, {
        name,
        hazardType,
        level,
        notes: notes || undefined,
        geometry: pendingGeometry!,
      }),
    onSuccess: () => {
      useAppStore.getState().setPendingRiskZoneGeometry(null);
      setName('');
      setNotes('');
      void queryClient.invalidateQueries({ queryKey: ['risk-zones', selectedRevision?.id] });
    },
  });
  const deleteZone = useMutation({
    mutationFn: (zoneId: string) => api.deleteRiskZone(zoneId),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ['risk-zones', selectedRevision?.id] }),
  });

  if (!selectedRevision)
    return <p className="mt-2 text-xs text-slate-500">Selecione uma revisão urbana para calcular exposição.</p>;

  return (
    <div className="mt-3">
      {!riskZoneDraw?.active && !pendingGeometry && (
        <button
          type="button"
          data-testid="start-risk-zone-draw"
          onClick={() => useAppStore.getState().startRiskZoneDraw()}
          className="mb-3 w-full rounded border border-amber-800 bg-amber-950/30 px-2 py-1 text-xs text-amber-200"
        >
          Desenhar zona para calcular edifícios expostos
        </button>
      )}
      {pendingGeometry && (
        <form
          className="mb-3 space-y-2 rounded border border-slate-700 bg-slate-800/60 p-2"
          onSubmit={(event) => {
            event.preventDefault();
            createZone.mutate();
          }}
        >
          <input
            required
            placeholder="Nome da zona"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="field-control"
          />
          <div className="flex gap-2">
            <select value={hazardType} onChange={(event) => setHazardType(event.target.value)} className="field-control">
              {['earthquake', 'flood', 'fire'].map((value) => <option key={value}>{value}</option>)}
            </select>
            <select value={level} onChange={(event) => setLevel(event.target.value)} className="field-control">
              {['low', 'moderate', 'high', 'severe'].map((value) => <option key={value}>{value}</option>)}
            </select>
          </div>
          <textarea
            placeholder="Observações"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="field-control"
          />
          <div className="flex gap-2">
            <button type="submit" className="flex-1 rounded bg-sky-700 px-2 py-1 text-xs text-white">
              Salvar
            </button>
            <button
              type="button"
              onClick={() => useAppStore.getState().setPendingRiskZoneGeometry(null)}
              className="rounded border border-slate-600 px-2 py-1 text-xs"
            >
              Descartar
            </button>
          </div>
        </form>
      )}
      <ul className="space-y-2">
        {zonesQuery.data?.map((zone) => (
          <li key={zone.id} className="rounded border border-slate-800 bg-slate-900/70 p-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-200">{zone.name}</span>
              <span className="text-slate-400">{zone.hazardType} · {zone.level}</span>
            </div>
            {zone.notes && <p className="mt-1 text-[11px] text-slate-500">{zone.notes}</p>}
            <div className="mt-1 flex gap-2">
              <button
                type="button"
                data-testid={`exposure-${zone.id}`}
                onClick={() => setExpandedZoneId(expandedZoneId === zone.id ? null : zone.id)}
                className="text-[11px] text-sky-400 underline"
              >
                exposure
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Delete risk zone "${zone.name}"?`)) deleteZone.mutate(zone.id);
                }}
                className="text-[11px] text-slate-400 underline hover:text-red-400"
              >
                delete
              </button>
            </div>
            {expandedZoneId === zone.id && <ZoneExposure zoneId={zone.id} />}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ZoneExposure({ zoneId }: { zoneId: string }) {
  const exposureQuery = useQuery({
    queryKey: ['risk-zone-exposure', zoneId],
    queryFn: () => api.getRiskZoneExposure(zoneId),
  });
  if (exposureQuery.isLoading) return <p className="mt-1 text-[11px] text-slate-500">Loading…</p>;
  if (!exposureQuery.data) return null;
  return (
    <div className="mt-1 border-t border-slate-800 pt-1 text-[11px] text-slate-400">
      <p>
        {exposureQuery.data.buildingCount} buildings · avg height{' '}
        {exposureQuery.data.averageHeightMeters.toFixed(1)}m
      </p>
      <ul>
        {exposureQuery.data.byType.map((item) => (
          <li key={item.buildingType}>{item.buildingType}: {item.count}</li>
        ))}
      </ul>
    </div>
  );
}

function WeatherSummary() {
  const selectedCity = useAppStore((state) => state.selectedCity);
  const weatherQuery = useQuery({
    queryKey: ['climate', selectedCity?.centerLat, selectedCity?.centerLon],
    queryFn: () => api.getCurrentWeather(selectedCity!.centerLat!, selectedCity!.centerLon!),
    enabled: !!selectedCity?.centerLat && !!selectedCity?.centerLon,
    staleTime: 10 * 60 * 1000,
    retry: false,
  });
  return (
    <div className="mt-4 border-t border-slate-800 pt-2 text-xs">
      <h3 className="mb-1 font-medium text-slate-300">Condições para equipes de campo</h3>
      {weatherQuery.data ? (
        <p className="text-slate-400">
          {weatherQuery.data.temperatureCelsius.toFixed(1)}°C ·{' '}
          {weatherQuery.data.precipitationMm.toFixed(1)}mm ·{' '}
          {weatherQuery.data.windSpeedKmh.toFixed(0)}km/h vento
        </p>
      ) : (
        <p className="text-slate-500">Condições indisponíveis para a área selecionada.</p>
      )}
    </div>
  );
}

function invalidateOperations(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({
    queryKey: ['operational-features', KUMAMOTO_SCENARIO_KEY],
  });
  void queryClient.invalidateQueries({
    queryKey: ['operational-summary', KUMAMOTO_SCENARIO_KEY],
  });
}
