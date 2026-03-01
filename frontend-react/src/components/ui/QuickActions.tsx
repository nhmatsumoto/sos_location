const actions = ['Registrar relato', 'Registrar área buscada', 'Adicionar desaparecido', 'Exportar CSV', 'Abrir camadas satélite'];

export function QuickActions() {
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((label) => (
        <button
          key={label}
          type="button"
          className="rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
        >
          {label}
        </button>
      ))}
    </div>
  );
}
