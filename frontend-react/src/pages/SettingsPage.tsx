import { useState } from 'react';
import { authApi } from '../services/authApi';
import { Button } from '../components/ui/Button';
import { TextInput } from '../components/ui/Field';

export function SettingsPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [status, setStatus] = useState('Nenhuma sessão ativa.');

  const register = async () => {
    try {
      const payload = await authApi.register({ username, password, email });
      setToken(payload.token);
      setStatus(`Usuário ${payload.user.username} registrado com sucesso.`);
    } catch {
      setStatus('Falha ao registrar usuário.');
    }
  };

  const login = async () => {
    try {
      const payload = await authApi.login({ username, password });
      setToken(payload.token);
      setStatus(`Sessão autenticada para ${payload.user.username}.`);
    } catch {
      setStatus('Credenciais inválidas.');
    }
  };

  const validateSession = async () => {
    try {
      const me = await authApi.me(token);
      setStatus(`Token válido para ${me.user.username}.`);
    } catch {
      setStatus('Token inválido ou expirado.');
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4">
        <h2 className="text-lg font-semibold text-slate-100">Configurações Operacionais</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="rounded-lg border border-slate-700 bg-slate-950/40 p-3 text-sm text-slate-200">
            <p className="mb-1 font-semibold">Atualização automática</p>
            <input type="checkbox" defaultChecked className="h-4 w-4" />
          </label>
          <label className="rounded-lg border border-slate-700 bg-slate-950/40 p-3 text-sm text-slate-200">
            <p className="mb-1 font-semibold">Notificações críticas</p>
            <input type="checkbox" defaultChecked className="h-4 w-4" />
          </label>
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-emerald-700/40 bg-emerald-950/20 p-4">
        <h3 className="text-sm font-semibold text-emerald-100">Autenticação (Token)</h3>
        <TextInput value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Usuário" />
        <TextInput value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email (registro)" />
        <TextInput value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Senha" type="password" />
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void register()}>Registrar</Button>
          <Button onClick={() => void login()}>Entrar</Button>
          <Button onClick={() => void validateSession()}>Validar token</Button>
        </div>
        <TextInput value={token} onChange={(event) => setToken(event.target.value)} placeholder="Token de acesso" />
        <p className="rounded-lg border border-emerald-700/40 bg-slate-900/60 p-2 text-xs text-emerald-100">{status}</p>
      </div>
    </div>
  );
}
