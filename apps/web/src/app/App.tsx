import { useCallback, useEffect, useState } from 'react';
import { CityViewer } from '../features/city-viewer/CityViewer';
import { SearchPanel } from '../features/city-search/SearchPanel';
import { InspectorPanel } from '../features/feature-inspector/InspectorPanel';
import { DiagnosticsBar } from '../features/diagnostics/DiagnosticsBar';
import { DeepLinkSync } from '../features/deep-link/DeepLinkSync';
import { WorkspaceModal } from '../features/navigation/WorkspaceModal';
import { OperationalToolbox } from '../features/disaster-management/OperationalToolbox';
import { useAppStore } from '../stores/appStore';

export function App() {
  const selectedCity = useAppStore((s) => s.selectedCity);
  const selectedPlace = useAppStore((s) => s.selectedPlace);
  const activeWorkspace = useAppStore((s) => s.activeWorkspace);
  const setActiveWorkspace = useAppStore((s) => s.setActiveWorkspace);
  const riskZoneDraw = useAppStore((s) => s.riskZoneDraw);
  const operationalDraw = useAppStore((s) => s.operationalDraw);
  const pendingRiskZoneGeometry = useAppStore((s) => s.pendingRiskZoneGeometry);
  const pendingOperationalGeometry = useAppStore((s) => s.pendingOperationalGeometry);
  const [workspaceModalOpen, setWorkspaceModalOpen] = useState(false);

  const closeWorkspaceModal = useCallback(() => setWorkspaceModalOpen(false), []);

  // Busca externa abre as ferramentas de importação; uma cidade publicada
  // fecha a modal. Tratar ambos no mesmo efeito evita a corrida quando
  // CitiesPanel atualiza selectedCity e selectedPlace no mesmo commit.
  useEffect(() => {
    if (selectedCity) {
      setWorkspaceModalOpen(false);
      return;
    }
    if (!selectedPlace) return;
    setActiveWorkspace('map');
    setWorkspaceModalOpen(true);
  }, [selectedCity, selectedPlace, setActiveWorkspace]);

  // O desenho acontece no mapa, portanto a modal sai do caminho durante a
  // captura e retorna diretamente ao formulário quando a geometria termina.
  useEffect(() => {
    if (riskZoneDraw?.active || operationalDraw?.active) setWorkspaceModalOpen(false);
  }, [riskZoneDraw?.active, operationalDraw?.active]);

  useEffect(() => {
    if (!pendingRiskZoneGeometry && !pendingOperationalGeometry) return;
    setActiveWorkspace('operations');
    setWorkspaceModalOpen(true);
  }, [pendingRiskZoneGeometry, pendingOperationalGeometry, setActiveWorkspace]);

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-slate-950 text-slate-100">
      <DeepLinkSync />
      <header className="flex h-12 items-center gap-2 border-b border-slate-800 bg-slate-950 px-2 sm:gap-4 sm:px-4">
        <h1 className="shrink-0 text-sm font-bold tracking-wide text-sky-400">
          SOS_LOCATION
          <span className="ml-2 hidden font-normal text-slate-400 lg:inline">
            City Reconstruction Platform
          </span>
        </h1>
        <button
          type="button"
          data-testid="open-workspace-modal"
          aria-haspopup="dialog"
          aria-expanded={workspaceModalOpen}
          onClick={() => setWorkspaceModalOpen(true)}
          className="flex shrink-0 items-center gap-2 rounded border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:border-slate-600 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            className="size-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M2.25 3.25h11.5M2.25 8h11.5M2.25 12.75h11.5" />
            <circle cx="5" cy="3.25" r="1.25" fill="currentColor" stroke="none" />
            <circle cx="11" cy="8" r="1.25" fill="currentColor" stroke="none" />
            <circle cx="6.5" cy="12.75" r="1.25" fill="currentColor" stroke="none" />
          </svg>
          <span className="hidden sm:inline">
            {activeWorkspace === 'map' ? 'Mapa e importações' : 'Ferramentas'}
          </span>
          <span className="sm:hidden">Ferramentas</span>
        </button>
        <SearchPanel />
        {selectedCity && (
          <span className="hidden text-xs text-slate-400 xl:inline">
            Viewing: <span className="text-slate-200">{selectedCity.name}</span>
          </span>
        )}
      </header>

      <main className="relative min-h-0 min-w-0 flex-1">
        <CityViewer />
        <OperationalToolbox
          onOpenScientific={() => {
            setActiveWorkspace('analysis');
            setWorkspaceModalOpen(true);
          }}
          onOpenOperations={() => {
            setActiveWorkspace('operations');
            setWorkspaceModalOpen(true);
          }}
        />
        <InspectorPanel />
      </main>

      <WorkspaceModal open={workspaceModalOpen} onClose={closeWorkspaceModal} />

      <DiagnosticsBar />
    </div>
  );
}
