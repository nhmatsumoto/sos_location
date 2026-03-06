import { useState, type FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../services/authApi';
import { setSessionToken } from '../lib/authSession';
import { Shield, Lock, User, ExternalLink, Loader2 } from 'lucide-react';

const keycloakUrl = import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8080';
const keycloakRealm = import.meta.env.VITE_KEYCLOAK_REALM || 'sos-location';
const keycloakClient = import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'sos-location-frontend';
const defaultRedirectUri = window.location.origin + '/login';
const envRedirectUri = import.meta.env.VITE_AUTH_REDIRECT_URI || defaultRedirectUri;

export function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123456');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Handle Keycloak callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      handleKeycloakCallback(code);
    }
  }, []);

  const handleKeycloakCallback = async (code: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await authApi.keycloak({ accessToken: code }); 
      setSessionToken(result.token);
      navigate('/app/sos', { replace: true });
    } catch (err) {
      console.error('SSO Error:', err);
      setError('Falha na autenticação via Keycloak SSO.');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!username || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await authApi.login({ username, password });
      setSessionToken(result.token);
      navigate('/app/sos', { replace: true });
    } catch {
      setError('Falha no login local. Confira usuário/senha ou use Keycloak SSO.');
    } finally {
      setLoading(false);
    }
  };

  const ssoLoginUrl = `${keycloakUrl}/realms/${keycloakRealm}/protocol/openid-connect/auth?client_id=${keycloakClient}&response_type=code&scope=openid&redirect_uri=${encodeURIComponent(envRedirectUri)}`;

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-950 px-4 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/4 -left-20 h-96 w-96 rounded-full bg-cyan-500/10 blur-[128px]" />
      <div className="absolute bottom-1/4 -right-20 h-96 w-96 rounded-full bg-blue-500/10 blur-[128px]" />

      <form 
        onSubmit={onSubmit} 
        className="relative w-full max-w-md space-y-6 rounded-3xl border border-white/5 bg-slate-900/40 p-8 backdrop-blur-2xl shadow-2xl"
      >
        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/20 text-cyan-400">
            <Shield size={28} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-500/70">Terminal de Acesso</p>
            <h1 className="text-2xl font-bold tracking-tight text-white italic">SOS Terminal Access</h1>
          </div>
        </div>

        <div className="space-y-4">
          <div className="relative group">
            <User size={18} className="absolute left-3 top-3 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
            <input 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              className="w-full rounded-xl border border-white/5 bg-slate-950/50 py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-600 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all" 
              placeholder="Identificador do Operador" 
            />
          </div>
          <div className="relative group">
            <Lock size={18} className="absolute left-3 top-3 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
            <input 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              type="password" 
              className="w-full rounded-xl border border-white/5 bg-slate-950/50 py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-600 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all" 
              placeholder="Chave de Segurança" 
            />
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs font-semibold text-rose-400 animate-in fade-in slide-in-from-top-2 duration-300">
            {error}
          </div>
        )}

        <div className="space-y-3 pt-2">
          <button 
            disabled={loading} 
            className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-cyan-500 py-3 text-xs font-black uppercase tracking-widest text-slate-950 transition-all hover:bg-cyan-400 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Confirmar Identidade
                <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20 scale-x-0 group-hover:scale-x-100 transition-transform" />
              </>
            )}
          </button>

          <a 
            href={ssoLoginUrl} 
            className="flex items-center justify-center gap-2 py-2 text-[10px] font-bold uppercase tracking-widest text-cyan-400/70 hover:text-cyan-300 transition-colors"
          >
            <ExternalLink size={14} />
            Entrar via Keycloak SSO
          </a>
        </div>

        <div className="pt-4 text-center">
          <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-600">
            Nível de Acesso: Restrito • Protocolo v4.1
          </p>
        </div>
      </form>
    </div>
  );
}
