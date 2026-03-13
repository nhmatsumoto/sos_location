import { LogIn, Shield, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { keycloak } from '../lib/keycloak';

export function LoginPage() {
  const navigate = useNavigate();

  const handleLogin = () => {
    keycloak.login();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-md w-full relative z-10">
        <button 
          onClick={() => navigate('/')}
          className="group flex items-center gap-2 text-slate-500 hover:text-white transition-colors mb-12 text-sm font-bold uppercase tracking-widest"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Voltar ao Início
        </button>

        <div className="bg-slate-900/50 border border-slate-800 p-10 rounded-[2.5rem] backdrop-blur-xl shadow-2xl">
          <div className="flex justify-center mb-8">
            <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
              <Shield size={40} className="text-cyan-400" />
            </div>
          </div>

          <div className="text-center mb-10">
            <h1 className="text-3xl font-black tracking-tight mb-3">Portal de Acesso</h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              Autenticação segura via Keycloak SSO para operadores e equipes de campo.
            </p>
          </div>

          <button
            onClick={handleLogin}
            className="w-full h-14 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black uppercase tracking-[0.2em] rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-lg shadow-cyan-500/20"
          >
            <LogIn size={20} />
            Entrar no Sistema
          </button>

          <p className="mt-8 text-center text-[10px] text-slate-600 font-mono uppercase tracking-widest">
            Acesso Restrito • Monitoramento Ativo
          </p>
        </div>
      </div>
    </div>
  );
}
