import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Shield, User, LogIn, ChevronRight } from 'lucide-react';

export function OnboardingPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,var(--tw-gradient-stops))] from-blue-900/20 via-slate-900 to-slate-950">
      <div className="absolute top-6 right-6 flex gap-2">
        <button onClick={() => changeLanguage('pt')} className={`px-2 py-1 rounded text-xs font-bold ${i18n.language.startsWith('pt') ? 'bg-blue-600' : 'bg-slate-800'}`}>PT</button>
        <button onClick={() => changeLanguage('en')} className={`px-2 py-1 rounded text-xs font-bold ${i18n.language.startsWith('en') ? 'bg-blue-600' : 'bg-slate-800'}`}>EN</button>
        <button onClick={() => changeLanguage('ja')} className={`px-2 py-1 rounded text-xs font-bold ${i18n.language.startsWith('ja') ? 'bg-blue-600' : 'bg-slate-800'}`}>JA</button>
      </div>

      <div className="max-w-4xl w-full">
        <header className="text-center mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex justify-center mb-6">
            <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 shadow-lg shadow-blue-500/10">
              <Shield size={48} className="text-blue-400" />
            </div>
          </div>
          <h1 className="text-5xl font-black mb-4 bg-clip-text text-transparent bg-linear-to-r from-blue-400 to-cyan-300 tracking-tight">
            SOS LOCATION
          </h1>
          <p className="text-slate-400 text-xl font-medium max-w-lg mx-auto">
            {t('onboarding.subtitle')}
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
          {/* Public Path */}
          <button
            onClick={() => navigate('/public/map')}
            className="group relative bg-slate-800/50 border border-slate-700/50 p-10 rounded-3xl hover:border-blue-500/50 hover:bg-slate-800 transition-all duration-300 text-left overflow-hidden hover:shadow-[0_0_50px_-15px_rgba(59,130,246,0.3)] active:scale-[0.98]"
          >
            <div className="mb-6 p-4 rounded-2xl bg-slate-900/50 w-fit group-hover:scale-110 transition-transform text-blue-400">
              <User size={32} />
            </div>
            <h3 className="text-2xl font-bold mb-3">Acessar como Visitante</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-4">
              Visualize o mapa de incidentes e áreas de risco em tempo real.
            </p>
            <div className="flex items-center text-blue-400 text-sm font-bold uppercase tracking-widest gap-2">
              Entrar Agora <ChevronRight size={16} />
            </div>
          </button>

          {/* Login Path */}
          <button
            onClick={() => navigate('/login')}
            className="group relative bg-slate-800/50 border border-slate-700/50 p-10 rounded-3xl hover:border-cyan-500/50 hover:bg-slate-800 transition-all duration-300 text-left overflow-hidden hover:shadow-[0_0_50px_-15px_rgba(6,182,212,0.3)] active:scale-[0.98]"
          >
            <div className="mb-6 p-4 rounded-2xl bg-slate-900/50 w-fit group-hover:scale-110 transition-transform text-cyan-400">
              <LogIn size={32} />
            </div>
            <h3 className="text-2xl font-bold mb-3">Login Operacional</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-4">
              Acesso restrito para equipes de resgate, defesa civil e voluntários.
            </p>
            <div className="flex items-center text-cyan-400 text-sm font-bold uppercase tracking-widest gap-2">
              Autenticar <ChevronRight size={16} />
            </div>
          </button>
        </div>

        <footer className="mt-20 text-center text-slate-600 text-[10px] font-mono uppercase tracking-[0.3em]">
          Tecnologia Crítica para Gestão de Catástrofes • v2.1
        </footer>
      </div>
    </div>
  );
}
