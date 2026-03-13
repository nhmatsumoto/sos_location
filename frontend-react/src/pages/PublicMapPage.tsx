import { useEffect, useState } from 'react';
import { Shield, Search, LogIn, ChevronRight, Globe, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { newsApi } from '../services/newsApi';
import type { NewsNotification } from '../services/newsApi';
import { NewsFeed } from '../components/public/NewsFeed';

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
    <div className="min-h-screen w-full bg-slate-50 text-slate-900 flex flex-col font-sans overflow-x-hidden">
      {/* Background Subtle Patterns */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-40">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-100/50 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-100/50 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2" />
      </div>

      {/* Modern Glass Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200">
              <Shield size={22} fill="white" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900">
                SOS <span className="text-blue-600">Portal</span>
              </h1>
              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Indexer
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-2 px-5 h-11 rounded-2xl bg-slate-900 border border-slate-800 text-white hover:bg-slate-800 transition-all shadow-md active:scale-95"
            >
              <LogIn size={16} />
              <span className="text-xs font-bold uppercase tracking-wider">Acesso Restrito</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-10 relative z-10">
        
        {/* Hero Section */}
        <div className="mb-12 space-y-4">
          <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-tight max-w-2xl">
            Centro de Informações <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Oficiais e Emergenciais</span>
          </h2>
          <p className="text-slate-500 max-w-xl text-lg font-medium leading-relaxed">
            Acompanhe em tempo real notificações filtradas de fontes oficiais e veículos de notícia confiáveis.
          </p>
        </div>

        {/* Filters Container */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 p-3 mb-10 flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <select 
              className="w-full h-14 pl-12 pr-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold appearance-none cursor-pointer"
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
            >
              <option value="">Todos os Países</option>
              <option value="Brasil">Brasil</option>
              <option value="USA">USA</option>
              <option value="Spain">Spain</option>
            </select>
          </div>

          <div className="relative flex-1 w-full">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Filtrar por localização (ex: Minas Gerais)"
              className="w-full h-14 pl-12 pr-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold placeholder:text-slate-400"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
            />
          </div>

          <button 
            onClick={fetchNews}
            className="h-14 px-8 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-200 w-full md:w-auto"
          >
            <Search size={18} />
            Buscar
          </button>
        </div>

        {/* Feed Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                Últimas Notificações
                <span className="text-sm font-medium px-2 py-0.5 rounded-md bg-blue-50 text-blue-600">
                  {news.length}
                </span>
              </h3>
            </div>
            <NewsFeed news={news} isLoading={isLoading} />
          </div>

          <aside className="space-y-8">
            {/* Quick Links / Info */}
            <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-10">
                 <Shield size={80} />
               </div>
               <h4 className="text-lg font-bold mb-3 relative z-10">Bases Oficiais</h4>
               <p className="text-sm text-slate-400 mb-6 relative z-10 leading-relaxed">
                 Nossos dados são extraídos apenas de fontes verificadas como Defesa Civil, CEMADEN e agências de clima governamentais.
               </p>
               <button 
                  onClick={() => navigate('/')}
                  className="w-full h-12 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
               >
                 Início <ChevronRight size={14} />
               </button>
            </div>

            {/* Newsletter / CTA */}
            <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-8">
               <h4 className="text-slate-900 font-bold mb-2">Busca Geolocalizada</h4>
               <p className="text-sm text-slate-500 leading-relaxed mb-4">
                 Em breve você poderá ativar notificações em tempo real baseadas na sua posição GPS exata.
               </p>
               <div className="flex h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                 <div className="w-1/3 bg-blue-500 rounded-full" />
               </div>
               <span className="text-[10px] text-slate-400 font-black uppercase mt-2 block tracking-widest">35% Beta Testing</span>
            </div>
          </aside>
        </div>
      </main>

      <footer className="w-full bg-white border-t border-slate-200 px-6 py-6 mt-12">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">SOS-LOCATION INDEXER • 2026</span>
          <div className="flex items-center gap-6 text-xs text-slate-500 font-medium">
             <a href="#" className="hover:text-blue-600 transition-colors">Termos de Uso</a>
             <a href="#" className="hover:text-blue-600 transition-colors">Privacidade</a>
             <a href="#" className="hover:text-blue-600 transition-colors">Fontes de Dados</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
