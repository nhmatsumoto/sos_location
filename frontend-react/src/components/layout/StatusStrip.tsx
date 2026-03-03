export function StatusStrip() {
  return (
    <div className="grid grid-cols-1 gap-2 rounded-xl border border-slate-700/60 bg-slate-900/60 p-2 text-xs text-slate-200 md:grid-cols-4">
      <p><span className="font-semibold text-emerald-300">Online</span> · Sync ativo</p>
      <p>Última atualização: 14:23:12</p>
      <p>Fonte ativa: Open-Meteo + INMET + STAC</p>
      <p>Latência média API: 182ms</p>
    </div>
  );
}
