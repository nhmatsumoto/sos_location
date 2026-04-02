import { useState, useEffect } from 'react';
import { Plus, Power, Globe, CloudRain, Newspaper, ShieldAlert, Cog } from 'lucide-react';
import { apiClient } from '../../../services/apiClient';

interface DataSource {
  id: string;
  name: string;
  type: 'News' | 'Weather' | 'People' | 'Risk';
  providerType: 'JsonApi' | 'RSS' | 'Scraper' | 'Inmet' | 'Cemaden';
  baseUrl: string;
  frequencyMinutes: number;
  isActive: boolean;
  metadataJson?: string;
  lastCrawlAt?: string;
  lastErrorMessage?: string;
}

const DATA_SOURCE_TYPES: DataSource['type'][] = ['News', 'Weather', 'People', 'Risk'];
const PROVIDER_TYPES: DataSource['providerType'][] = ['JsonApi', 'RSS', 'Scraper', 'Inmet', 'Cemaden'];

const isDataSourceType = (value: string): value is DataSource['type'] =>
  DATA_SOURCE_TYPES.includes(value as DataSource['type']);

const isProviderType = (value: string): value is DataSource['providerType'] =>
  PROVIDER_TYPES.includes(value as DataSource['providerType']);

export function DataSourceList() {
  const [sources, setSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSource, setNewSource] = useState<Partial<DataSource>>({
    name: '',
    type: 'News',
    providerType: 'JsonApi',
    baseUrl: '',
    frequencyMinutes: 30,
    isActive: true
  });

  useEffect(() => {
    fetchSources();
  }, []);

  const fetchSources = async () => {
    try {
      const response = await apiClient.get<DataSource[]>('/v1/data-sources');
      setSources(response.data);
    } catch (err) {
      console.error('Failed to fetch data sources', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      await apiClient.post('/v1/data-sources', newSource);
      setIsModalOpen(false);
      fetchSources();
    } catch (err) {
      console.error('Failed to create data source', err);
    }
  };

  const handleToggle = async (source: DataSource) => {
    try {
      await apiClient.put(`/v1/data-sources/${source.id}`, { ...source, isActive: !source.isActive });
      fetchSources();
    } catch (err) {
      console.error('Failed to toggle source', err);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'News': return <Newspaper size={18} />;
      case 'Weather': return <CloudRain size={18} />;
      case 'Risk': return <ShieldAlert size={18} />;
      default: return <Globe size={18} />;
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Cog className="text-cyan-400" /> Fontes de Dados e Crawlers
          </h1>
          <p className="text-slate-400 text-sm">Gerencie provedores externos de informação para indexação e análise de risco.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
        >
          <Plus size={20} /> Nova Fonte
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-slate-500 font-mono text-sm animate-pulse">
           Sincronizando com o hub de dados...
        </div>
      ) : sources.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sources.map(source => (
            <div key={source.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 hover:border-cyan-500/50 transition">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-900 rounded-lg text-cyan-400">
                    {getTypeIcon(source.type)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-100">{source.name}</h3>
                    <span className="text-xs text-slate-500 font-mono uppercase">{source.providerType}</span>
                  </div>
                </div>
                <button 
                  onClick={() => handleToggle(source)}
                  className={`p-2 rounded-lg transition ${source.isActive ? 'text-green-400 bg-green-500/10' : 'text-slate-500 bg-slate-700/50'}`}
                >
                  <Power size={16} />
                </button>
              </div>
              
              <div className="space-y-2 mb-4">
                <p className="text-xs text-slate-400 truncate"><strong>URL:</strong> {source.baseUrl}</p>
                <p className="text-xs text-slate-400"><strong>Frequência:</strong> a cada {source.frequencyMinutes} min</p>
                {source.lastCrawlAt && (
                  <p className="text-xs text-slate-500 italic">Última indexação: {new Date(source.lastCrawlAt).toLocaleString()}</p>
                )}
              </div>

              {source.lastErrorMessage && (
                <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-[10px] text-red-400 truncate">
                  Erro: {source.lastErrorMessage}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-slate-900/40 border border-dashed border-slate-700 rounded-2xl">
          <p className="text-slate-500 font-mono text-xs uppercase tracking-widest">Nenhuma fonte cadastrada no momento.</p>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-slate-100 mb-4">Configurar Nova Fonte</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Nome</label>
                <input 
                  type="text" 
                  value={newSource.name}
                  onChange={e => setNewSource({...newSource, name: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:border-cyan-500 outline-none"
                  placeholder="Ex: INMET Avisos Ativos"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Tipo</label>
                  <select 
                    value={newSource.type}
                    onChange={(e) => {
                      const nextType = e.target.value;
                      if (isDataSourceType(nextType)) {
                        setNewSource({ ...newSource, type: nextType });
                      }
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:border-cyan-500 outline-none"
                  >
                    <option value="News">News</option>
                    <option value="Weather">Weather</option>
                    <option value="People">People</option>
                    <option value="Risk">Risk</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Provedor</label>
                  <select 
                    value={newSource.providerType}
                    onChange={(e) => {
                      const nextProviderType = e.target.value;
                      if (isProviderType(nextProviderType)) {
                        setNewSource({ ...newSource, providerType: nextProviderType });
                      }
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:border-cyan-500 outline-none"
                  >
                    <option value="JsonApi">JSON API</option>
                    <option value="RSS">RSS Feed</option>
                    <option value="Scraper">Web Scraper</option>
                    <option value="Inmet">INMET</option>
                    <option value="Cemaden">CEMADEN</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Base URL</label>
                <input 
                  type="text" 
                  value={newSource.baseUrl}
                  onChange={e => setNewSource({...newSource, baseUrl: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:border-cyan-500 outline-none"
                  placeholder="https://api.exemplo.com/v1/data"
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-200 px-4 py-2">Cancelar</button>
                <button onClick={handleCreate} className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-2 rounded-lg font-semibold">Salvar Fonte</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
