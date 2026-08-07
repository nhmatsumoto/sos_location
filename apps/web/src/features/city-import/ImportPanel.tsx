import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, importFileDownloadUrl } from '../../api/client';
import { useAppStore } from '../../stores/appStore';
import type { ImportJob } from '../../schemas/api';

const ACTIVE_STATUSES = new Set(['queued', 'running', 'retrying']);
const LISTED_STATUSES = new Set(['queued', 'running', 'retrying', 'completed', 'failed']);
const MAX_INTERACTIVE_IMPORT_AREA_KM2 = 250;

function approximateAreaKm2(place: { west: number; south: number; east: number; north: number }): number {
  const radiusMeters = 6_371_008.8;
  const midLatitude = ((place.south + place.north) / 2) * Math.PI / 180;
  const width = (place.east - place.west) * Math.PI / 180 * radiusMeters * Math.cos(midLatitude);
  const height = (place.north - place.south) * Math.PI / 180 * radiusMeters;
  return Math.abs(width * height) / 1_000_000;
}

/** Caixa de ~225 km², segura para o Overpass, usada para resposta inicial em
 * localidades cuja fronteira administrativa é grande demais para o importador
 * interativo. Não se apresenta como uma importação completa da cidade. */
function operationalArea(place: { centerLon: number; centerLat: number }) {
  const halfSideKm = 7.5;
  const latDelta = halfSideKm / 111.32;
  const lonDelta = halfSideKm / (111.32 * Math.cos(place.centerLat * Math.PI / 180));
  return {
    west: place.centerLon - lonDelta, south: place.centerLat - latDelta,
    east: place.centerLon + lonDelta, north: place.centerLat + latDelta,
  };
}

export function ImportPanel() {
  const queryClient = useQueryClient();
  const selectedPlace = useAppStore((s) => s.selectedPlace);
  const setWatchedJobId = useAppStore((s) => s.setWatchedJobId);
  const selectedAreaKm2 = selectedPlace ? approximateAreaKm2(selectedPlace) : 0;
  const isTooLargeForInteractiveImport = selectedAreaKm2 > MAX_INTERACTIVE_IMPORT_AREA_KM2;
  const autoImportedPlaceRef = useRef<string | null>(null);

  const { data: jobs } = useQuery({
    queryKey: ['imports'],
    queryFn: api.listImports,
    refetchInterval: (query) =>
      query.state.data?.some((j) => ACTIVE_STATUSES.has(j.status)) ? 2000 : 10000,
  });

  const startImport = useMutation({
    mutationFn: (place: NonNullable<typeof selectedPlace>) => {
      // O resultado da busca já contém a área resolvida. Reutilizá-la evita uma
      // segunda chamada ao Nominatim no worker e permite validar o limite antes
      // de enfileirar o job. placeProviderId fica preservado como referência.
      return api.createImport({
        placeProviderId: place.providerId,
        displayName: place.name,
        name: selectedAreaKm2 > MAX_INTERACTIVE_IMPORT_AREA_KM2
          ? `${place.name} — operational assessment area`
          : place.name,
        countryCode: place.countryCode ?? undefined,
        region: place.region ?? undefined,
        boundingBox: {
          ...(selectedAreaKm2 > MAX_INTERACTIVE_IMPORT_AREA_KM2 ? operationalArea(place) : {
            west: place.west, south: place.south, east: place.east, north: place.north,
          }),
        },
        source: 'openstreetmap',
        reconstructionProfile: place.countryCode?.toLowerCase() === 'jp'
          ? 'osm-japan-urban-v2'
          : 'osm-basic-v1',
      });
    },
    onSuccess: (job) => {
      setWatchedJobId(job.id);
      void queryClient.invalidateQueries({ queryKey: ['imports'] });
    },
  });

  // Selecionar um resultado já é uma intenção de abrir a área no sistema. A
  // importação começa sem exigir um segundo clique; o botão segue disponível
  // apenas como retry explícito em caso de falha.
  const selectedPlaceId = selectedPlace?.providerId;
  useEffect(() => {
    // Cidades do catálogo já possuem revisão publicada. Reabri-las não pode
    // criar outra importação; apenas resultados externos representam uma nova
    // intenção de aquisição OSM.
    if (!selectedPlace
        || selectedPlace.provider === 'catalog'
        || startImport.isPending
        || autoImportedPlaceRef.current === selectedPlace.providerId)
      return;
    autoImportedPlaceRef.current = selectedPlace.providerId;
    startImport.mutate(selectedPlace);
    // A mudança de local é o gatilho. Os outros estados pertencem à mutação e
    // não devem reiniciar a importação quando ela atualiza a tela.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlaceId]);

  const cancelImport = useMutation({
    mutationFn: (jobId: string) => api.cancelImport(jobId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['imports'] }),
  });

  const deleteImport = useMutation({
    mutationFn: (jobId: string) => api.deleteImport(jobId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['imports'] }),
  });

  const requestDelete = (job: ImportJob) => {
    if (
      window.confirm(
        'Delete this import? This removes the city revision and its buildings/roads/etc. ' +
          'Physical source files are kept and stay downloadable elsewhere.',
      )
    ) {
      deleteImport.mutate(job.id);
    }
  };

  // A API omite cancelamentos voluntários, mas mantém falhas para que o
  // diagnóstico seja exibido ao usuário. Este filtro também protege contra
  // estados desconhecidos em respostas antigas/cacheadas.
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
            disabled={startImport.isPending || (autoImportedPlaceRef.current === selectedPlace.providerId && startImport.error == null)}
            onClick={() => {
              if (!selectedPlace) return;
              if (autoImportedPlaceRef.current === selectedPlace.providerId && startImport.error == null) return;
              autoImportedPlaceRef.current = selectedPlace.providerId;
              startImport.mutate(selectedPlace);
            }}
            className="mt-2 w-full rounded bg-sky-700 px-2 py-1 text-sm text-white hover:bg-sky-600 disabled:opacity-50"
          >
            {startImport.isPending ? 'Requesting…' : startImport.error ? 'Retry import' : 'Import from OpenStreetMap'}
          </button>
          {isTooLargeForInteractiveImport && (
            <p className="mt-2 text-xs text-amber-300" data-testid="import-area-too-large">
              This boundary is about {selectedAreaKm2.toLocaleString(undefined, { maximumFractionDigits: 0 })} km².
              SOS_LOCATION is importing a 225 km² operational assessment area around its center instead.
              A PBF bulk import is still required for the complete boundary.
            </p>
          )}
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
              {!ACTIVE_STATUSES.has(job.status) && (
                <button
                  type="button"
                  data-testid={`delete-import-${job.id}`}
                  disabled={deleteImport.isPending}
                  onClick={() => requestDelete(job)}
                  className="text-[11px] text-slate-400 underline hover:text-red-400 disabled:opacity-50"
                >
                  delete
                </button>
              )}
            </div>
            {job.status === 'completed' && <ImportFiles jobId={job.id} />}
          </li>
        ))}
        {visibleJobs?.length === 0 && <li className="text-xs text-slate-500">No import jobs yet.</li>}
      </ul>
    </section>
  );
}

/** Lista os arquivos brutos (dataset versions) que alimentaram a revisão de um import concluído. */
function ImportFiles({ jobId }: { jobId: string }) {
  const [expanded, setExpanded] = useState(false);
  const { data: files, isFetching, isError } = useQuery({
    queryKey: ['import-files', jobId],
    queryFn: () => api.listImportFiles(jobId),
    enabled: expanded,
  });

  return (
    <div className="mt-1 border-t border-slate-800 pt-1">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((current) => !current)}
        className="text-[11px] text-slate-400 underline hover:text-sky-300"
      >
        {expanded ? 'hide source files' : 'show source files'}
      </button>
      {expanded && (
        <>
          {isFetching && <p className="mt-1 text-[11px] text-slate-500">loading files…</p>}
          {isError && <p className="mt-1 text-[11px] text-red-400">unable to load source files</p>}
          {!isFetching && !isError && files?.length === 0 && (
            <p className="mt-1 text-[11px] text-slate-500">no source files</p>
          )}
          {files && files.length > 0 && (
            <ul className="mt-1 space-y-0.5">
              {files.map((file) => (
                <li key={file.datasetVersionId} className="flex items-center justify-between text-[11px]">
                  <span className="truncate text-slate-400">{file.datasetName} · {file.version}</span>
                  <a
                    href={importFileDownloadUrl(jobId, file.datasetVersionId)}
                    download
                    className="ml-2 shrink-0 text-sky-400 underline hover:text-sky-300"
                  >
                    download
                  </a>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
