import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { QUALITY_LABELS } from '../../schemas/api';
import { useAppStore } from '../../stores/appStore';
import type { City, Place } from '../../schemas/api';

/** Lista cidades já importadas e permite abrir uma revisão publicada. */
export function CitiesPanel() {
  const queryClient = useQueryClient();
  const selectedCity = useAppStore((s) => s.selectedCity);
  const selectedRevision = useAppStore((s) => s.selectedRevision);
  const setSelectedRevision = useAppStore((s) => s.setSelectedRevision);

  const { data: cities, isLoading, error } = useQuery({
    queryKey: ['cities'],
    queryFn: api.listCities,
    refetchInterval: 15000,
  });

  const { data: revisions } = useQuery({
    queryKey: ['revisions', selectedCity?.id],
    queryFn: () => api.listRevisions(selectedCity!.id),
    enabled: selectedCity !== null,
    staleTime: 60_000,
  });

  const openCity = async (city: City) => {
    // fetchQuery compartilha o mesmo cache da lista abaixo. Isso elimina a
    // segunda chamada disparada quando selectedCity muda.
    const cityRevisions = await queryClient.fetchQuery({
      queryKey: ['revisions', city.id],
      queryFn: () => api.listRevisions(city.id),
      staleTime: 60_000,
    });
    const published = cityRevisions.find((r) => r.status === 'published') ?? cityRevisions[0] ?? null;
    let place: Place | null = null;
    if (city.centerLon != null && city.centerLat != null) {
      // Usa o boundary real da cidade quando disponível; senão ~2km em torno do centro.
      const hasBounds =
        city.west != null && city.south != null && city.east != null && city.north != null;
      place = {
        providerId: `city/${city.id}`,
        provider: 'catalog',
        name: city.name,
        country: null,
        countryCode: city.countryCode,
        region: city.region,
        centerLon: city.centerLon,
        centerLat: city.centerLat,
        west: hasBounds ? city.west! : city.centerLon - 0.012,
        south: hasBounds ? city.south! : city.centerLat - 0.009,
        east: hasBounds ? city.east! : city.centerLon + 0.012,
        north: hasBounds ? city.north! : city.centerLat + 0.009,
      };
    }
    // Uma única transição evita reconstruir sources/tiles entre cidade,
    // revisão e enquadramento ainda inconsistentes.
    useAppStore.setState({
      selectedCity: city,
      selectedRevision: published,
      selectedPlace: place,
      selectedFeature: null,
      activeSimulation: null,
      tileStats: { loaded: 0, pending: 0 },
    });
  };

  return (
    <section className="panel" data-testid="cities-panel">
      <h2 className="panel-title">Cities</h2>
      {isLoading && <p className="text-xs text-slate-500">Loading…</p>}
      {error != null && (
        <p className="text-xs text-red-400" data-testid="cities-error">
          Failed to load cities: {error instanceof Error ? error.message : String(error)}
        </p>
      )}
      {cities?.length === 0 && (
        <p className="text-xs text-slate-500">
          No cities yet — the demo city appears after the worker finishes the offline fixture import.
        </p>
      )}
      <ul className="space-y-1">
        {cities?.map((city) => (
          <li key={city.id}>
            <button
              type="button"
              data-testid={`open-city-${city.slug}`}
              onClick={() => void openCity(city)}
              className={`w-full rounded px-2 py-1.5 text-left text-sm hover:bg-slate-800 ${
                selectedCity?.id === city.id ? 'bg-slate-800 text-sky-300' : 'text-slate-200'
              }`}
            >
              {city.name}
              {city.countryCode ? (
                <span className="ml-1 text-xs text-slate-500">({city.countryCode})</span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>

      {selectedCity && revisions && revisions.length > 0 && (
        <div className="mt-3 border-t border-slate-800 pt-2">
          <label htmlFor="revision-select" className="text-xs text-slate-400">
            Revision
          </label>
          <select
            id="revision-select"
            data-testid="revision-select"
            className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
            value={selectedRevision?.id ?? ''}
            onChange={(e) => {
              const revision = revisions.find((r) => r.id === e.target.value) ?? null;
              setSelectedRevision(revision);
            }}
          >
            {revisions.map((r) => (
              <option key={r.id} value={r.id}>
                #{r.revisionNumber} · {r.status} · {r.reconstructionProfile}
              </option>
            ))}
          </select>

          {selectedRevision && (
            <div className="mt-2 rounded border border-slate-800 bg-slate-900/70 p-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Quality</span>
                <span data-testid="quality-level" className="font-medium text-emerald-400">
                  {QUALITY_LABELS[selectedRevision.qualityLevel] ?? selectedRevision.qualityLevel}
                </span>
              </div>
              {selectedRevision.publishedAt && (
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-slate-400">Published</span>
                  <span className="text-slate-300">
                    {new Date(selectedRevision.publishedAt).toLocaleString()}
                  </span>
                </div>
              )}
              <p className="mt-1 text-[11px] text-slate-500">
                Heights may be inferred; ground elevation is estimated (flat terrain).
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
