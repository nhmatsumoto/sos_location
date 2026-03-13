import { useEffect, useState } from 'react';
import { Shield, Search, LogIn, Globe, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { newsApi } from '../services/newsApi';
import type { NewsNotification } from '../services/newsApi';
import { NewsFeed } from '../components/public/NewsFeed';
import { PublicPortalMap } from '../components/public/PublicPortalMap';

export function PublicMapPage() {
  const navigate = useNavigate();
  const [news, setNews] = useState<NewsNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [countryFilter, setCountryFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');

  const fetchNews = async () => {
    setIsLoading(true);
    const data = await newsApi.getNews(countryFilter, locationFilter);
    setNews(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchNews();
  }, [countryFilter, locationFilter]);

  return (
    <div className="h-screen w-full bg-slate-50 text-slate-900 flex flex-col font-sans overflow-hidden">
      {/* Refined Header with Integrated Search */}
      <header className="z-40 bg-white border-b border-slate-200 px-6 h-20 flex items-center shrink-0">
        <div className="w-full flex items-center justify-between gap-8">
          {/* Logo Section */}
          <div className="flex items-center gap-3 min-w-max">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-200">
              <Shield size={20} fill="white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-black tracking-tight text-slate-900 leading-none">
                SOS <span className="text-blue-600 font-black">Portal</span>
              </h1>
              <div className="flex items-center gap-2 text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Indexer
              </div>
            </div>
          </div>

          {/* Integrated Search Bar */}
          <div className="flex-1 max-w-3xl flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="relative flex-1 group">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-blue-500 transition-colors" size={16} />
              <select 
                className="w-full h-11 pl-10 pr-4 bg-transparent border-none focus:ring-0 text-sm font-bold appearance-none cursor-pointer text-slate-700"
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
              >
                <option value="">Todos os Países</option>
                <option value="Brasil">Brasil</option>
                <option value="Japão">Japão</option>
                <option value="USA">USA</option>
                <option value="Spain">Spain</option>
              </select>
            </div>
            
            <div className="w-px h-6 bg-slate-200" />
            
            <div className="relative flex-2 group">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-blue-500 transition-colors" size={16} />
              <input 
                type="text" 
                placeholder="Localização..."
                className="w-full h-11 pl-10 pr-4 bg-transparent border-none focus:ring-0 text-sm font-bold placeholder:text-slate-400 text-slate-700"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
              />
            </div>

            <button 
              onClick={fetchNews}
              className="h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md shadow-blue-100"
            >
              <Search size={16} />
              <span className="hidden md:inline">Buscar</span>
            </button>
          </div>

          {/* Action Section */}
          <div className="flex items-center gap-4 min-w-max">
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-2 px-4 h-11 rounded-xl bg-slate-900 border border-slate-800 text-white hover:bg-slate-800 transition-all shadow-md active:scale-95"
            >
              <LogIn size={16} />
              <span className="hidden lg:inline text-[10px] font-black uppercase tracking-widest">Acesso Restrito</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Split Layout */}
      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar - Latest Notifications (30%) */}
        <aside className="w-full md:w-[30%] border-r border-slate-200 bg-white flex flex-col shrink-0">
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                Notificações
                <span className="flex h-5 items-center px-1.5 rounded bg-blue-50 text-blue-600 text-[10px] font-bold">
                  {news.length}
                </span>
              </h3>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            <NewsFeed news={news} isLoading={isLoading} />
          </div>
          
          <div className="p-4 bg-slate-50 border-t border-slate-200">
             <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">Monitoramento</div>
             <div className="flex h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
               <div className="w-[85%] bg-emerald-500 rounded-full" />
             </div>
             <div className="mt-2 text-[9px] text-slate-400 font-medium text-center uppercase tracking-tighter">Sistema de Alerta Precoce v1.2</div>
          </div>
        </aside>

        {/* Main Content - Map (70%) */}
        <div className="flex-1 overflow-hidden relative bg-slate-100">
          <PublicPortalMap news={news} />
        </div>
      </main>
    </div>
  );
}
