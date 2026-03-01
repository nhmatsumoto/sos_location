export function SettingsPage() {
  return (
    <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4">
      <h2 className="text-lg font-semibold text-slate-100">Configurações</h2>
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
  );
}
