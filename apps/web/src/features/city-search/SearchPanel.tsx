import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAppStore } from '../../stores/appStore';
import type { Place } from '../../schemas/api';

export function SearchPanel() {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const setSelectedPlace = useAppStore((s) => s.setSelectedPlace);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const normalized = query.trim();
    if (normalized.length < 2) {
      setDebounced('');
      return;
    }

    const timer = window.setTimeout(() => setDebounced(normalized), 400);
    return () => window.clearTimeout(timer);
  }, [query]);

  const { data: places, isFetching, error } = useQuery({
    queryKey: ['places', debounced],
    queryFn: ({ signal }) => api.searchPlaces(debounced, signal),
    enabled: open && debounced.length >= 2,
    staleTime: 60_000,
  });

  const onChange = (value: string) => {
    setQuery(value);
    setOpen(true);
    setSelectedPlace(null);
  };

  const choose = (place: Place) => {
    setSelectedPlace(place);
    setOpen(false);
    setQuery(place.name);
  };

  return (
    <div className="relative w-80">
      <input
        data-testid="city-search-input"
        value={query}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search a city (e.g. Komaki, Aichi)…"
        className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-sky-600"
      />
      {open && debounced.length >= 2 && (
        <div className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded border border-slate-700 bg-slate-900 shadow-xl">
          {isFetching && <div className="px-3 py-2 text-xs text-slate-400">Searching…</div>}
          {error != null && (
            <div className="px-3 py-2 text-xs text-red-400">
              Search failed — geocoder unavailable. Offline demo city is still available.
            </div>
          )}
          {places?.length === 0 && !isFetching && (
            <div className="px-3 py-2 text-xs text-slate-400">No results.</div>
          )}
          {places?.map((place) => (
            <button
              type="button"
              key={place.providerId}
              onClick={() => choose(place)}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-800"
            >
              <span className="text-slate-100">{place.name}</span>
              <span className="ml-2 text-xs text-slate-400">
                {[place.region, place.country].filter(Boolean).join(', ')}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
