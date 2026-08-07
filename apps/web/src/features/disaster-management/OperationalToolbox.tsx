import { useState, type SVGProps } from 'react';
import { useAppStore } from '../../stores/appStore';
import {
  OPERATIONAL_TOOLS,
  getOperationalTool,
  type OperationalToolDefinition,
  type OperationalToolTone,
} from './operationalTools';

const TONE_STYLES: Record<
  OperationalToolTone,
  { button: string; icon: string; active: string }
> = {
  red: {
    button: 'hover:border-red-700/80 hover:bg-red-950/40',
    icon: 'bg-red-950/80 text-red-300 ring-red-800/70',
    active: 'border-red-600 bg-red-950/60',
  },
  amber: {
    button: 'hover:border-amber-700/80 hover:bg-amber-950/40',
    icon: 'bg-amber-950/80 text-amber-300 ring-amber-800/70',
    active: 'border-amber-600 bg-amber-950/60',
  },
  sky: {
    button: 'hover:border-sky-700/80 hover:bg-sky-950/40',
    icon: 'bg-sky-950/80 text-sky-300 ring-sky-800/70',
    active: 'border-sky-600 bg-sky-950/60',
  },
  rose: {
    button: 'hover:border-rose-700/80 hover:bg-rose-950/40',
    icon: 'bg-rose-950/80 text-rose-300 ring-rose-800/70',
    active: 'border-rose-600 bg-rose-950/60',
  },
  emerald: {
    button: 'hover:border-emerald-700/80 hover:bg-emerald-950/40',
    icon: 'bg-emerald-950/80 text-emerald-300 ring-emerald-800/70',
    active: 'border-emerald-600 bg-emerald-950/60',
  },
  orange: {
    button: 'hover:border-orange-700/80 hover:bg-orange-950/40',
    icon: 'bg-orange-950/80 text-orange-300 ring-orange-800/70',
    active: 'border-orange-600 bg-orange-950/60',
  },
  fuchsia: {
    button: 'hover:border-fuchsia-700/80 hover:bg-fuchsia-950/40',
    icon: 'bg-fuchsia-950/80 text-fuchsia-300 ring-fuchsia-800/70',
    active: 'border-fuchsia-600 bg-fuchsia-950/60',
  },
};

interface OperationalToolboxProps {
  onOpenOperations: () => void;
  onOpenScientific: () => void;
}

/**
 * Acesso direto às ações de campo. O formulário detalhado continua no quadro
 * operacional e é aberto automaticamente após a geometria ser concluída.
 */
export function OperationalToolbox({
  onOpenOperations,
  onOpenScientific,
}: OperationalToolboxProps) {
  const [expanded, setExpanded] = useState(true);
  const operationalDraw = useAppStore((state) => state.operationalDraw);
  const activeTool = getOperationalTool(operationalDraw?.featureType);

  const beginDraw = (tool: OperationalToolDefinition) => {
    const state = useAppStore.getState();
    const camera = state.camera;
    if (
      !camera
      || Math.abs(camera.longitude - 130.722) > 2
      || Math.abs(camera.latitude - 32.682) > 2
    ) {
      state.setPendingCamera({
        longitude: 130.722,
        latitude: 32.682,
        zoom: 10,
        pitch: 35,
        bearing: 0,
      });
    }
    state.startOperationalDraw(tool.type, tool.geometryKind);
    setExpanded(false);
  };

  if (!expanded) {
    return (
      <div className="absolute bottom-3 left-3 z-20">
        <button
          type="button"
          data-testid="open-operational-toolbox"
          aria-expanded="false"
          onClick={() => setExpanded(true)}
          className={`group flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left shadow-xl shadow-black/40 backdrop-blur-md transition ${
            operationalDraw
              ? 'border-amber-500/70 bg-amber-950/90 text-amber-100'
              : 'border-slate-700 bg-slate-950/90 text-slate-100 hover:border-sky-600'
          }`}
        >
          <span className="grid size-8 place-items-center rounded-lg bg-sky-500/15 text-sky-300">
            <ToolboxIcon className="size-4" />
          </span>
          <span>
            <span className="block text-xs font-semibold">
              {activeTool ? `Desenhando: ${activeTool.label}` : 'Ferramentas de campo'}
            </span>
            <span className="block text-[10px] text-slate-400">
              {activeTool ? 'Clique para ver as ações' : 'Risco, alertas e resgate'}
            </span>
          </span>
          {operationalDraw && (
            <span
              aria-hidden="true"
              className="ml-1 size-2 animate-pulse rounded-full bg-amber-400"
            />
          )}
        </button>
      </div>
    );
  }

  return (
    <aside
      aria-label="Ferramentas operacionais do mapa"
      data-testid="operational-toolbox"
      className="absolute bottom-3 left-3 z-20 flex max-h-[min(38rem,calc(100%-1.5rem))] w-[min(22rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-slate-700/90 bg-slate-950/92 shadow-2xl shadow-black/50 backdrop-blur-md"
    >
      <div className="flex items-start justify-between gap-3 border-b border-slate-800 px-3.5 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-sky-500/15 text-sky-300 ring-1 ring-inset ring-sky-500/25">
            <ToolboxIcon className="size-4.5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-100">Ferramentas de campo</h2>
            <p className="truncate text-[10px] text-slate-400">
              Operação Kumamoto · atualizações em tempo real
            </p>
          </div>
        </div>
        <button
          type="button"
          data-testid="collapse-operational-toolbox"
          aria-label="Recolher ferramentas de campo"
          aria-expanded="true"
          onClick={() => setExpanded(false)}
          className="grid size-8 shrink-0 place-items-center rounded-lg border border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
        >
          <ChevronDownIcon className="size-4" />
        </button>
      </div>

      <div className="overflow-y-auto p-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          O que deseja registrar?
        </p>
        <div className="grid grid-cols-2 gap-2">
          {OPERATIONAL_TOOLS.map((tool) => {
            const tone = TONE_STYLES[tool.tone];
            const active = operationalDraw?.featureType === tool.type;
            return (
              <button
                key={tool.type}
                type="button"
                data-testid={`toolbox-${tool.type}`}
                disabled={!!operationalDraw && !active}
                aria-pressed={active}
                onClick={() => {
                  if (!active) beginDraw(tool);
                  else setExpanded(false);
                }}
                className={`group min-h-20 rounded-xl border p-2.5 text-left transition disabled:cursor-not-allowed disabled:opacity-35 ${
                  active
                    ? tone.active
                    : `border-slate-800 bg-slate-900/70 ${tone.button}`
                }`}
              >
                <span
                  className={`mb-2 grid size-7 place-items-center rounded-lg ring-1 ring-inset ${tone.icon}`}
                >
                  <OperationalToolIcon name={tool.icon} className="size-3.5" />
                </span>
                <span className="block text-[11px] font-semibold leading-tight text-slate-100">
                  {tool.shortLabel}
                </span>
                <span className="mt-1 block text-[9px] leading-tight text-slate-500">
                  {geometryLabel(tool.geometryKind)}
                </span>
              </button>
            );
          })}
        </div>

        {activeTool && (
          <div
            role="status"
            className="mt-3 rounded-xl border border-amber-700/60 bg-amber-950/35 p-2.5"
          >
            <p className="flex items-center gap-2 text-[11px] font-semibold text-amber-200">
              <span className="size-1.5 animate-pulse rounded-full bg-amber-400" />
              Desenho em andamento
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-amber-100/65">
              {activeTool.instruction}
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 border-t border-slate-800 bg-slate-900/60">
        <button
          type="button"
          data-testid="open-scientific-analysis"
          onClick={onOpenScientific}
          className="border-r border-slate-800 px-3 py-2.5 text-left hover:bg-cyan-950/35"
        >
          <span className="block text-[11px] font-semibold text-cyan-200">
            Análise científica
          </span>
          <span className="block text-[9px] text-slate-500">
            Onda, calor e impacto
          </span>
        </button>
        <button
          type="button"
          data-testid="open-operational-board"
          onClick={onOpenOperations}
          className="flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-slate-800/80"
        >
          <span>
            <span className="block text-[11px] font-semibold text-slate-200">
              Quadro operacional
            </span>
            <span className="block text-[9px] text-slate-500">
              Equipes e vítimas
            </span>
          </span>
          <ArrowRightIcon className="size-3.5 shrink-0 text-sky-400" />
        </button>
      </div>
    </aside>
  );
}

function geometryLabel(kind: OperationalToolDefinition['geometryKind']) {
  if (kind === 'point') return 'Marcar um ponto';
  if (kind === 'line') return 'Traçar uma rota';
  return 'Desenhar uma área';
}

function OperationalToolIcon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & { name: OperationalToolDefinition['icon'] }) {
  const paths = {
    risk: <path d="M12 3 2.8 19h18.4L12 3Zm0 5.2v5.2m0 3.3v.1" />,
    alert: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" />
        <path d="M10 21h4" />
      </>
    ),
    route: (
      <>
        <circle cx="5" cy="18" r="2" />
        <path d="M7 18h3a3 3 0 0 0 3-3V8a3 3 0 0 1 3-3h3m-3-3 3 3-3 3" />
      </>
    ),
    victim: (
      <>
        <path d="M12 21s7-4.6 7-11a4 4 0 0 0-7-2.6A4 4 0 0 0 5 10c0 6.4 7 11 7 11Z" />
        <path d="M12 8v6m-3-3h6" />
      </>
    ),
    support: (
      <>
        <path d="M4 21v-9l8-7 8 7v9" />
        <path d="M9 21v-6h6v6m-3-13v4m-2-2h4" />
      </>
    ),
    road: (
      <>
        <path d="m8 3-2 18m10-18 2 18M12 5v3m0 4v3m0 4v2" />
        <path d="M3 9h18" />
      </>
    ),
    safe: (
      <>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
        <path d="m8.5 12 2.2 2.2 4.8-5" />
      </>
    ),
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 5 5M10.5 7v7m-3.5-3.5h7" />
      </>
    ),
  };
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}

function ToolboxIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M4 7h16M4 17h16" />
      <circle cx="9" cy="7" r="2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="17" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function ChevronDownIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function ArrowRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M5 12h14m-5-5 5 5-5 5" />
    </svg>
  );
}
