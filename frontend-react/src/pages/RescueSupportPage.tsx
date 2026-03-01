export function RescueSupportPage() {
  return (
    <div className="space-y-4 rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-100">Briefing tático de resgate</h2>
        <button className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-100">Modo impressão / PDF</button>
      </header>
      <details open className="rounded-lg border border-slate-700 bg-slate-950/50 p-3">
        <summary className="cursor-pointer text-sm font-semibold text-slate-100">Snapshot operacional</summary>
        <p className="mt-2 text-sm text-slate-300">Setores 2, 3 e 7 com risco de inundação súbita. Priorizar evacuação assistida e bloqueio de acesso.</p>
      </details>
      <details className="rounded-lg border border-slate-700 bg-slate-950/50 p-3">
        <summary className="cursor-pointer text-sm font-semibold text-slate-100">Recomendações e riscos</summary>
        <p className="mt-2 text-sm text-slate-300">Reforçar drones térmicos no setor leste. Evitar deslocamento terrestre em vias ribeirinhas até nova janela meteorológica.</p>
      </details>
      <details className="rounded-lg border border-slate-700 bg-slate-950/50 p-3">
        <summary className="cursor-pointer text-sm font-semibold text-slate-100">Logística e pontos de apoio</summary>
        <p className="mt-2 text-sm text-slate-300">Ponto alfa (escola municipal) com capacidade para 180 pessoas. Estoque de água para 12h.</p>
      </details>
    </div>
  );
}
