import { useAppStore, type Workspace } from '../../stores/appStore';

const items: Array<{ id: Workspace; label: string; description: string }> = [
  { id: 'map', label: 'Mapa e importações', description: 'Busca, dados urbanos e camadas' },
  { id: 'simulation', label: 'Simulação', description: 'Modelagem de terremotos e reprodução' },
  { id: 'analysis', label: 'Análise científica', description: 'Dados, propagação, intensidade e impacto' },
  { id: 'operations', label: 'Operação de desastre', description: 'Risco, resposta e condições ambientais' },
  { id: 'data', label: 'Fontes de dados', description: 'Cobertura, coleta e proveniência' },
];

/** Navegação de alto nível: evita que funções operacionais fiquem perdidas em
 * uma pilha longa de painéis na lateral. */
export function WorkspaceMenu() {
  const activeWorkspace = useAppStore((s) => s.activeWorkspace);
  const setActiveWorkspace = useAppStore((s) => s.setActiveWorkspace);

  return (
    <nav aria-label="Application sections" className="rounded border border-slate-800 bg-slate-900/50 p-1">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          data-testid={`workspace-${item.id}`}
          aria-current={activeWorkspace === item.id ? 'page' : undefined}
          onClick={() => setActiveWorkspace(item.id)}
          className={`mb-1 w-full rounded px-2 py-1.5 text-left last:mb-0 ${
            activeWorkspace === item.id
              ? 'bg-sky-800/70 text-sky-100'
              : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          <span className="block text-xs font-semibold">{item.label}</span>
          <span className="block text-[10px] text-slate-400">{item.description}</span>
        </button>
      ))}
    </nav>
  );
}
