import React, { useState } from 'react';
import { Search, MapPin, Loader2 } from 'lucide-react';
import axios from 'axios';
import { useSimulationStore } from '../../store/useSimulationStore';

interface CitySearchProps {
  onSelect?: (lat: number, lon: number, displayName: string, bbox?: string[]) => void;
}

interface NominatimResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  boundingbox?: string[];
}

export const CitySearch: React.FC<CitySearchProps> = ({ onSelect }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<NominatimResult[]>([]);
  const setHeroPosition = useSimulationStore(state => state.setHeroPosition);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      // Use Nominatim OpenStreetMap Search API
      const res = await axios.get<NominatimResult[]>(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`);
      setResults(res.data);
    } catch (err) {
      console.error("Geocoding failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const selectCity = (lat: string, lon: string, displayName: string, bbox?: string[]) => {
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    setHeroPosition([latNum, lonNum]);
    setQuery(displayName.split(',')[0]);
    setResults([]);
    if (onSelect) onSelect(latNum, lonNum, displayName, bbox);
  };

  return (
    <div className="relative group/search w-64">
      <form onSubmit={handleSearch} className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search City (e.g. Tokyo, Rio)"
          className="w-full bg-slate-950/60 border border-white/10 rounded-xl py-2 px-4 pl-10 text-[11px] text-white placeholder:text-slate-500 focus:outline-hidden focus:border-cyan-500/50 transition-all backdrop-blur-md"
        />
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-500" /> : <Search className="h-3.5 w-3.5" />}
        </div>
      </form>

      {results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900/90 border border-white/10 rounded-xl overflow-hidden backdrop-blur-xl shadow-2xl z-50">
          {results.map((res) => (
            <button
              key={res.place_id}
              onClick={() => selectCity(res.lat, res.lon, res.display_name, res.boundingbox)}
              className="w-full text-left px-4 py-3 hover:bg-cyan-500/10 border-b border-white/5 last:border-0 transition-colors group/item"
            >
              <div className="flex items-start gap-3">
                <MapPin className="h-3.5 w-3.5 text-cyan-500 mt-0.5" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-white font-medium truncate">{res.display_name.split(',')[0]}</span>
                  <span className="text-[8px] text-slate-400 truncate pr-2">{res.display_name.split(',').slice(1).join(',')}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
