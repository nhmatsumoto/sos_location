import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, ShieldAlert, Home, RefreshCw, Lock } from 'lucide-react';

export function ErrorPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const code = searchParams.get('code') || '500';
  
  const handleBack = () => {
    if (window.history.length > 2) {
      window.history.back();
    } else {
      navigate('/');
    }
  };

  const redirectHome = () => {
    window.location.assign('/');
  };

  const errorConfigs = {
    '401': {
      title: 'Sessão Expirada',
      message: 'Sua autenticação expirou ou você tentou acessar um setor restrito sem as credenciais necessárias.',
      icon: <Lock className="w-16 h-16 text-amber-500" />,
      action: redirectHome,
      actionLabel: 'RE-AUTENTICAR AGORA',
    },
    '404': {
      title: 'Página não Encontrada',
      message: 'O recurso que você está procurando foi movido ou não existe em nossos registros digitais.',
      icon: <AlertCircle className="w-16 h-16 text-cyan-500" />,
      action: handleBack,
      actionLabel: 'VOLTAR À PÁGINA ANTERIOR',
    },
    '500': {
      title: 'Instabilidade no Sistema',
      message: 'Detectamos uma falha crítica em nossos servidores. Nossa equipe técnica já está trabalhando na restauração.',
      icon: <ShieldAlert className="w-16 h-16 text-rose-500" />,
      action: handleBack,
      actionLabel: 'TENTAR NOVAMENTE',
    },
  };

  const config = errorConfigs[code as keyof typeof errorConfigs] || errorConfigs['500'];

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden selection:bg-cyan-500/30">
      {/* Background ambient glows */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-rose-500/5 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      
      <div className="max-w-md w-full border border-white/5 bg-slate-900/40 backdrop-blur-2xl p-10 rounded-[2.5rem] shadow-2xl relative z-10 animate-in fade-in zoom-in duration-700 ease-out">
        <div className="flex flex-col items-center text-center">
          <div className="p-6 bg-white/5 rounded-3xl border border-white/10 mb-8 group transition-transform hover:scale-110 duration-500">
            {config.icon}
          </div>
          
          <div className="space-y-3 mb-8">
            <h1 className="text-5xl font-black tracking-tighter text-white opacity-20">
              {code}
            </h1>
            <h2 className="text-xl font-black tracking-tight text-white uppercase italic">
              {config.title}
            </h2>
            <div className={`h-1 w-12 mx-auto rounded-full ${
              code === '500' ? 'bg-rose-500' : 
              code === '401' ? 'bg-amber-500' : 
              'bg-cyan-500'
            }`} />
          </div>

          <p className="text-slate-400 text-sm leading-relaxed mb-10 max-w-[280px]">
            {config.message}
          </p>

          <div className="flex flex-col w-full gap-4">
            <button 
              onClick={config.action}
              className={`group relative overflow-hidden flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-[10px] tracking-[0.2em] transition-all active:scale-95 shadow-lg ${
                code === '500' ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/20' : 
                code === '401' ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/20' : 
                'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-900/20'
              }`}
            >
              <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
              <span>{config.actionLabel}</span>
              <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full duration-1000 transition-transform" />
            </button>
            
            <button 
              onClick={() => navigate('/')}
              className="group flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-[10px] tracking-[0.2em] border border-white/5 bg-white/5 hover:bg-white/10 text-slate-400 transition-all active:scale-95 hover:text-white"
            >
              <Home className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
              <span>HQ PRINCIPAL</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid footer decoration */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-linear-to-r from-transparent via-white/10 to-transparent opacity-20"></div>
    </div>
  );
}
