import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { formatConfidence, type Provenance } from '../../schemas/api';
import { useAppStore } from '../../stores/appStore';

function Row({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex items-start justify-between gap-2 py-0.5">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="text-right text-xs text-slate-100">{value}</span>
    </div>
  );
}

function ProvenanceBlock({ provenance }: { provenance: Provenance[] }) {
  if (provenance.length === 0)
    return <p className="text-[11px] text-slate-500">No dataset provenance recorded.</p>;
  return (
    <div className="space-y-1">
      {provenance.map((p) => (
        <div key={`${p.dataset}-${p.version}`} className="rounded bg-slate-800/70 p-2 text-[11px]">
          <div className="font-medium text-slate-200">{p.dataset}</div>
          <div className="text-slate-400">{p.attribution}</div>
          <div className="text-slate-500">
            {p.license} · v{p.version} · captured {new Date(p.capturedAt).toLocaleDateString()}
          </div>
          {p.sourceKey && (
            <div className="text-slate-500">
              {p.sourceKey} · priority {p.sourcePriority}
              {p.isStatistical ? ' · statistical' : ''}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function TagsBlock({ tags }: { tags: Record<string, string> | null | undefined }) {
  if (!tags || Object.keys(tags).length === 0) return null;
  const relevant = Object.entries(tags).filter(([k]) => !k.startsWith('@')).slice(0, 12);
  return (
    <details className="mt-2">
      <summary className="cursor-pointer text-xs text-slate-400">Source tags</summary>
      <div className="mt-1 space-y-0.5">
        {relevant.map(([key, value]) => (
          <div key={key} className="flex justify-between gap-2 text-[11px]">
            <span className="text-slate-500">{key}</span>
            <span className="truncate text-slate-300">{value}</span>
          </div>
        ))}
      </div>
    </details>
  );
}

export function InspectorPanel() {
  const selectedFeature = useAppStore((s) => s.selectedFeature);
  const setSelectedFeature = useAppStore((s) => s.setSelectedFeature);
  const activeSimulation = useAppStore((s) => s.activeSimulation);

  const buildingQuery = useQuery({
    queryKey: ['building', selectedFeature?.id],
    queryFn: () => api.getBuilding(selectedFeature!.id),
    enabled: selectedFeature?.kind === 'building',
  });
  const roadQuery = useQuery({
    queryKey: ['road', selectedFeature?.id],
    queryFn: () => api.getRoad(selectedFeature!.id),
    enabled: selectedFeature?.kind === 'road',
  });
  const waterQuery = useQuery({
    queryKey: ['water', selectedFeature?.id],
    queryFn: () => api.getWater(selectedFeature!.id),
    enabled: selectedFeature?.kind === 'water',
  });
  const seismicResponseQuery = useQuery({
    queryKey: ['simulation-building', activeSimulation?.id, selectedFeature?.id],
    queryFn: () => api.getSimulationBuildingResponse(
      activeSimulation!.id,
      selectedFeature!.id,
    ),
    enabled: selectedFeature?.kind === 'building' && activeSimulation != null,
  });

  if (!selectedFeature) return null;

  const isLoading =
    buildingQuery.isLoading || roadQuery.isLoading || waterQuery.isLoading;
  const isError = buildingQuery.isError || roadQuery.isError || waterQuery.isError;

  return (
    <aside
      data-testid="inspector-panel"
      className="absolute right-3 top-3 z-20 w-80 max-h-[calc(100%-6rem)] overflow-y-auto rounded-lg border border-slate-700 bg-slate-900/95 p-3 shadow-2xl backdrop-blur"
    >
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold capitalize text-slate-100">
          {selectedFeature.kind} inspector
        </h2>
        <button
          type="button"
          data-testid="inspector-close"
          onClick={() => setSelectedFeature(null)}
          className="rounded px-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
        >
          ✕
        </button>
      </div>

      {isLoading && <p className="text-xs text-slate-400">Loading feature…</p>}
      {isError && <p className="text-xs text-red-400">Failed to load feature details.</p>}

      {selectedFeature.kind === 'building' && buildingQuery.data && (
        <div>
          <Row label="ID" value={buildingQuery.data.feature.id.slice(0, 8)} />
          <Row label="External ID" value={buildingQuery.data.feature.externalId} />
          <Row label="Type" value={buildingQuery.data.feature.buildingType} />
          <Row label="Height" value={`${buildingQuery.data.feature.heightMeters.toFixed(1)} m`} />
          <Row label="Levels" value={buildingQuery.data.feature.buildingLevels ?? undefined} />
          <Row label="Roof levels" value={buildingQuery.data.feature.roofLevels ?? undefined} />
          <Row label="Roof shape" value={buildingQuery.data.feature.roofShape ?? undefined} />
          <Row label="Height source" value={buildingQuery.data.feature.heightSource} />
          <Row
            label="Confidence"
            value={formatConfidence(buildingQuery.data.feature.confidence)}
          />
          <Row
            label="Ground elevation"
            value={`${buildingQuery.data.feature.groundElevationMeters.toFixed(1)} m (estimated)`}
          />
          {buildingQuery.data.revision && (
            <Row label="Revision" value={`#${buildingQuery.data.revision.revisionNumber}`} />
          )}
          {activeSimulation && (
            <div className="mt-2 rounded border border-amber-800/60 bg-amber-950/30 p-2">
              <h3 className="mb-1 text-xs font-medium text-amber-200">Seismic response</h3>
              {seismicResponseQuery.isLoading && (
                <p className="text-[11px] text-slate-400">Loading calculated response…</p>
              )}
              {seismicResponseQuery.data && (
                <>
                  <Row label="Damage state" value={seismicResponseQuery.data.damageState} />
                  <Row
                    label="Peak ground acceleration"
                    value={`${seismicResponseQuery.data.peakGroundAccelerationG.toFixed(3)} g`}
                  />
                  <Row
                    label="Peak ground velocity"
                    value={`${seismicResponseQuery.data.peakGroundVelocityCms.toFixed(2)} cm/s`}
                  />
                  <Row
                    label="Spectral acceleration"
                    value={`${seismicResponseQuery.data.spectralAccelerationG.toFixed(3)} g`}
                  />
                  <Row
                    label="Peak drift"
                    value={`${(seismicResponseQuery.data.peakDriftRatio * 100).toFixed(3)}%`}
                  />
                  <Row
                    label="Natural period"
                    value={`${seismicResponseQuery.data.naturalPeriodSeconds.toFixed(3)} s`}
                  />
                </>
              )}
              {seismicResponseQuery.isError && (
                <p className="text-[11px] text-slate-500">
                  This building has no response in the active simulation.
                </p>
              )}
            </div>
          )}
          <div className="mt-2 border-t border-slate-800 pt-2">
            <h3 className="mb-1 text-xs font-medium text-slate-300">Provenance</h3>
            <ProvenanceBlock provenance={buildingQuery.data.provenance} />
          </div>
          <TagsBlock tags={buildingQuery.data.feature.tags ?? null} />
        </div>
      )}

      {selectedFeature.kind === 'road' && roadQuery.data && (
        <div>
          <Row label="ID" value={roadQuery.data.feature.id.slice(0, 8)} />
          <Row label="Name" value={roadQuery.data.feature.name ?? undefined} />
          <Row label="Class" value={roadQuery.data.feature.roadClass} />
          <Row label="Lanes" value={roadQuery.data.feature.lanes ?? undefined} />
          <Row label="Bridge" value={roadQuery.data.feature.isBridge ? 'yes' : undefined} />
          <Row label="Tunnel" value={roadQuery.data.feature.isTunnel ? 'yes' : undefined} />
          <Row label="Confidence" value={formatConfidence(roadQuery.data.feature.confidence)} />
          <div className="mt-2 border-t border-slate-800 pt-2">
            <h3 className="mb-1 text-xs font-medium text-slate-300">Provenance</h3>
            <ProvenanceBlock provenance={roadQuery.data.provenance} />
          </div>
          <TagsBlock tags={roadQuery.data.feature.tags ?? null} />
        </div>
      )}

      {selectedFeature.kind === 'water' && waterQuery.data && (
        <div>
          <Row label="ID" value={waterQuery.data.feature.id.slice(0, 8)} />
          <Row label="Name" value={waterQuery.data.feature.name ?? undefined} />
          <Row label="Type" value={waterQuery.data.feature.waterType} />
          <Row label="Confidence" value={formatConfidence(waterQuery.data.feature.confidence)} />
          <div className="mt-2 border-t border-slate-800 pt-2">
            <h3 className="mb-1 text-xs font-medium text-slate-300">Provenance</h3>
            <ProvenanceBlock provenance={waterQuery.data.provenance} />
          </div>
          <TagsBlock tags={waterQuery.data.feature.tags ?? null} />
        </div>
      )}
    </aside>
  );
}
