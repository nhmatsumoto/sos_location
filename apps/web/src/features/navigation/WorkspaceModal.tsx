import { useEffect, useRef, type KeyboardEvent, type MouseEvent } from 'react';
import { CitiesPanel } from '../city-search/CitiesPanel';
import { ImportPanel } from '../city-import/ImportPanel';
import { SimulationPanel } from '../disaster-simulation/SimulationPanel';
import { DisasterManagementPanel } from '../disaster-management/DisasterManagementPanel';
import { DataSourcesPanel } from '../disaster-management/DataSourcesPanel';
import { LayerPanel } from '../layer-control/LayerPanel';
import { BuildingLegend } from '../layer-control/BuildingLegend';
import { useAppStore } from '../../stores/appStore';
import { WorkspaceMenu } from './WorkspaceMenu';
import { ScientificAnalysisPanel } from '../scientific-analysis/ScientificAnalysisPanel';

interface WorkspaceModalProps {
  open: boolean;
  onClose: () => void;
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Reúne as ferramentas que antes ocupavam a lateral fixa. O conteúdo do mapa
 * continua montado enquanto a modal está fechada para não interromper polling
 * nem reiniciar uma importação automática ao reabrir as ferramentas.
 */
export function WorkspaceModal({ open, onClose }: WorkspaceModalProps) {
  const activeWorkspace = useAppStore((s) => s.activeWorkspace);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) {
        previouslyFocused.focus();
      }
    };
  }, [open]);

  const handleBackdropMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;

    const focusable = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? [],
    ).filter((element) => !element.hasAttribute('disabled') && element.offsetParent !== null);
    if (focusable.length === 0) {
      event.preventDefault();
      dialogRef.current?.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      hidden={!open}
      aria-hidden={!open}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-sm sm:p-6"
      data-testid="workspace-modal-backdrop"
      onMouseDown={handleBackdropMouseDown}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="workspace-modal-title"
        aria-describedby="workspace-modal-description"
        data-testid="workspace-modal"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={`flex max-h-full w-full flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-950 shadow-2xl shadow-black/60 ${
          activeWorkspace === 'analysis' ? 'max-w-5xl' : 'max-w-xl'
        }`}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-800 px-4 py-3">
          <div>
            <h2 id="workspace-modal-title" className="text-sm font-semibold text-slate-100">
              Ferramentas do sistema
            </h2>
            <p id="workspace-modal-description" className="mt-0.5 text-xs text-slate-400">
              Navegue por cidades, camadas, análises e operações.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            data-testid="close-workspace-modal"
            aria-label="Fechar ferramentas do sistema"
            onClick={onClose}
            className="grid size-8 shrink-0 place-items-center rounded border border-slate-700 text-lg leading-none text-slate-300 hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 sm:p-4">
          <WorkspaceMenu />

          <div
            hidden={activeWorkspace !== 'map'}
            className="flex flex-col gap-3"
            aria-hidden={activeWorkspace !== 'map'}
          >
            <CitiesPanel />
            <ImportPanel />
            <LayerPanel />
            <BuildingLegend />
          </div>
          {activeWorkspace === 'simulation' && <SimulationPanel />}
          {activeWorkspace === 'analysis' && <ScientificAnalysisPanel onRequestMap={onClose} />}
          {activeWorkspace === 'operations' && <DisasterManagementPanel onRequestMap={onClose} />}
          {activeWorkspace === 'data' && <DataSourcesPanel />}
        </div>
      </div>
    </div>
  );
}
