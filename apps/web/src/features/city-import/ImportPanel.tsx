import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAppStore } from '../../stores/appStore';
import type { ImportJob } from '../../schemas/api';

const ACTIVE_STATUSES = new Set(['queued', 'running', 'retrying']);
const LISTED_STATUSES = new Set(['queued', 'running', 'retrying', 'completed']);

export function ImportPanel() {
  const queryClient = useQueryClient();
  const selectedPlace = useAppStore((s) => s.selectedPlace);
  const setWatchedJobId = useAppStore((s) => s.setWatchedJobId);

  const { data: jobs } = useQuery({
    queryKey: ['imports'],
    queryFn: api.listImports,
    refetchInterval: (query) =>
      query.state.data?.some((j) => ACTIVE_STATUSES.has(j.status)) ? 2000 : 10000,
  });

  const startImport = useMutation({
    mutationFn: () => {
      const place = selectedPlace!;
      // O resultado da busca já contém a área resolvida. Reutilizá-la evita uma
      // segunda chamada ao Nominatim no worker e permite validar o limite antes
      // de enfileirar o job. placeProviderId fica preservado como referência.
      return api.createImport({
        placeProviderId: place.providerId,
        displayName: place.name,
        name: place.name,
        countryCode: place.countryCode ?? undefined,
        region: place.region ?? undefined,
        boundingBox: {
          west: place.west,
          south: place.south,
          east: place.east,
          north: place.north,
        },
        source: 'openstreetmap',
        reconstructionProfile: 'osm-basic-v1',
      });
    },
    onSuccess: (job) => {
      setWatchedJobId(job.id);
      void queryClient.invalidateQueries({ queryKey: ['imports'] });
    },
  });

  const cancelImport = useMutation({
    mutationFn: (jobId: string) => api.cancelImport(jobId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['imports'] }),
  });

  // A API já omite falhas definitivas e cancelamentos. Este filtro evita que
  // respostas antigas em cache voltem a exibi-los durante uma atualização.
  const visibleJobs = jobs?.filter((job) => LISTED_STATUSES.has(job.status));

  const openResult = async (job: ImportJob) => {
    if (!job.cityId || !job.cityRevisionId) return;
    const [cities, revisions] = await Promise.all([
      queryClient.fetchQuery({ queryKey: ['cities'], queryFn: api.listCities }),
      queryClient.fetchQuery({
        queryKey: ['revisions', job.cityId],
        queryFn: () => api.listRevisions(job.cityId!),
      }),
    ]);
    const city = cities.find((c) => c.id === job.cityId) ?? null;
    const revision = revisions.find((r) => r.id === job.cityRevisionId) ?? null;
    useAppStore.setState({
      selectedCity: city,
      selectedRevision: revision,
      selectedFeature: null,
      activeSimulation: null,
      tileStats: { loaded: 0, pending: 0 },
    });
  };

  return (
    <section className="panel" data-testid="import-panel">
      <h2 className="panel-title">Imports</h2>

      {selectedPlace ? (
        <div className="mb-3 rounded border border-slate-700 bg-slate-800/60 p-2">
          <div className="text-sm text-slate-100">{selectedPlace.name}</div>
          <div className="text-xs text-slate-400">
            {[selectedPlace.region, selectedPlace.country].filter(Boolean).join(', ')}
          </div>
          <button
            type="button"
            data-testid="start-import"
            disabled={startImport.isPending}
            onClick={() => startImport.mutate()}
            className="mt-2 w-full rounded bg-sky-700 px-2 py-1 text-sm text-white hover:bg-sky-600 disabled:opacity-50"
          >
            {startImport.isPending ? 'Requesting…' : 'Import from OpenStreetMap'}
          </button>
          {startImport.error != null && (
            <p className="mt-1 text-xs text-red-400">{String(startImport.error)}</p>
          )}
        </div>
      ) : (
        <p className="mb-3 text-xs text-slate-500">
          Search and select a city above to request an import.
        </p>
      )}

      <ul className="space-y-2">
        {visibleJobs?.map((job) => (
          <li key={job.id} className="rounded border border-slate-800 bg-slate-900/70 p-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-200">{job.jobType}</span>
              <span className={`status-badge status-${job.status}`}>{job.status}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded bg-slate-800">
              <div
                className="h-full rounded bg-sky-600 transition-all"
                style={{ width: `${job.progress}%` }}
              />
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
              <span>{job.currentStage ?? '—'}{job.stageMessage ? ` · ${job.stageMessage}` : ''}</span>
              <span>{job.progress}%</span>
            </div>
            {job.error && <p className="mt-1 text-[11px] text-red-400">{job.error}</p>}
            <div className="mt-1 flex gap-2">
              {ACTIVE_STATUSES.has(job.status) && (
                <button
                  type="button"
                  onClick={() => cancelImport.mutate(job.id)}
                  className="text-[11px] text-slate-400 underline hover:text-red-400"
                >
                  cancel
                </button>
              )}
              {job.status === 'completed' && job.cityRevisionId && (
                <button
                  type="button"
                  data-testid={`open-result-${job.id}`}
                  onClick={() => void openResult(job)}
                  className="text-[11px] text-sky-400 underline hover:text-sky-300"
                >
                  open revision
                </button>
              )}
            </div>
          </li>
        ))}
        {visibleJobs?.length === 0 && <li className="text-xs text-slate-500">No import jobs yet.</li>}
      </ul>
    </section>
  );
}
