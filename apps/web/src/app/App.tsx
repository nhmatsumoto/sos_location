import { CityViewer } from '../features/city-viewer/CityViewer';
import { SearchPanel } from '../features/city-search/SearchPanel';
import { CitiesPanel } from '../features/city-search/CitiesPanel';
import { ImportPanel } from '../features/city-import/ImportPanel';
import { SimulationPanel } from '../features/disaster-simulation/SimulationPanel';
import { LayerPanel } from '../features/layer-control/LayerPanel';
import { InspectorPanel } from '../features/feature-inspector/InspectorPanel';
import { DiagnosticsBar } from '../features/diagnostics/DiagnosticsBar';
import { DeepLinkSync } from '../features/deep-link/DeepLinkSync';
import { useAppStore } from '../stores/appStore';

export function App() {
  const selectedCity = useAppStore((s) => s.selectedCity);

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-100">
      <DeepLinkSync />
      <header className="flex h-12 items-center gap-4 border-b border-slate-800 bg-slate-950 px-4">
        <h1 className="text-sm font-bold tracking-wide text-sky-400">
          SOS_LOCATION
          <span className="ml-2 font-normal text-slate-400">City Reconstruction Platform</span>
        </h1>
        <SearchPanel />
        {selectedCity && (
          <span className="text-xs text-slate-400">
            Viewing: <span className="text-slate-200">{selectedCity.name}</span>
          </span>
        )}
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-72 flex-col gap-3 overflow-y-auto border-r border-slate-800 bg-slate-950 p-3">
          <CitiesPanel />
          <LayerPanel />
          <ImportPanel />
          <SimulationPanel />
        </aside>

        <main className="relative min-w-0 flex-1">
          <CityViewer />
          <InspectorPanel />
        </main>
      </div>

      <DiagnosticsBar />
    </div>
  );
}
