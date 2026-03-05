import React, { useEffect, useState } from 'react';
import { Search, Globe, ChevronDown } from 'lucide-react';
import { getByCountry } from '../../services/disastersApi';

interface Country {
  country_code: string;
  country_name: string;
  count: number;
}

interface CountryDropdownProps {
  value: string;
  onChange: (value: string) => void;
}

export const CountryDropdown: React.FC<CountryDropdownProps> = ({ value, onChange }) => {
  const [countries, setCountries] = useState<Country[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCountries = async () => {
      setLoading(true);
      try {
        const resp = await getByCountry({});
        // Filter out empty country codes and sort by count/name
        const valid = (resp.items as Country[])
          .filter(c => c.country_code)
          .sort((a, b) => b.count - a.count || a.country_name.localeCompare(b.country_name));
        setCountries(valid);
      } catch (err) {
        console.error('Failed to fetch countries:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCountries();
  }, []);

  const filtered = countries.filter(c => 
    c.country_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.country_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedCountry = countries.find(c => c.country_code === value);

  return (
    <div className="relative inline-block w-64 group">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-9 w-full items-center justify-between rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200 transition-all hover:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <Globe size={14} className="shrink-0 text-cyan-400" />
          <span className="truncate">
            {selectedCountry ? selectedCountry.country_name : (value === '' ? 'Todos os Países' : value)}
          </span>
        </div>
        <ChevronDown size={14} className={`shrink-0 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40 bg-transparent" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute left-0 mt-1 z-50 w-full rounded-md border border-slate-700 bg-slate-900 p-1 shadow-2xl animate-in fade-in zoom-in-95 duration-100">
            <div className="relative flex items-center px-2 py-1.5 border-b border-slate-800 mb-1">
              <Search size={12} className="absolute left-4 text-slate-500" />
              <input
                autoFocus
                type="text"
                placeholder="Buscar país..."
                className="w-full rounded bg-slate-950/50 py-1 pl-7 pr-2 text-xs text-slate-200 outline-none placeholder:text-slate-600 focus:ring-1 focus:ring-cyan-500/30"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
              <button
                onClick={() => { onChange(''); setIsOpen(false); }}
                className={`flex w-full items-center px-3 py-2 text-left text-xs transition-colors hover:bg-cyan-500/10 hover:text-cyan-300 ${value === '' ? 'bg-cyan-500/5 text-cyan-400 font-bold' : 'text-slate-400'}`}
              >
                Todos os Países
              </button>
              {loading && countries.length === 0 && (
                <div className="px-3 py-4 text-center text-xs text-slate-500 italic">Carregando lista...</div>
              )}
              {filtered.map((c) => (
                <button
                  key={c.country_code}
                  onClick={() => { onChange(c.country_code); setIsOpen(false); }}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs transition-colors hover:bg-cyan-500/10 hover:text-cyan-300 ${value === c.country_code ? 'bg-cyan-500/5 text-cyan-400 font-bold' : 'text-slate-400'}`}
                >
                  <span className="truncate">{c.country_name}</span>
                  <span className="shrink-0 ml-2 rounded bg-slate-800 px-1 py-0.5 text-[9px] text-slate-500 group-hover:bg-cyan-900/40 group-hover:text-cyan-700">
                    {c.count}
                  </span>
                </button>
              ))}
              {!loading && filtered.length === 0 && searchTerm && (
                <div className="px-3 py-4 text-center text-xs text-slate-600 italic">Nenhum país encontrado</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
