import React from 'react';
import { Suspense, lazy, useMemo } from 'react';
import type { SelectedPanel, FloatingPanelId } from './types';
import { 
  Activity
} from 'lucide-react';

// Hooks & State
import { useOperationalState } from './hooks/useOperationalState';
import { ENABLE_SIMULATION } from './constants';

// Components
import { MapToolsSidebar } from './components/MapToolsSidebar';
import { OperationalMap } from './components/OperationalMap';
import { MissingPersonModal } from './components/Modals/MissingPersonModal';
import { RiskAreaModal } from './components/Modals/RiskAreaModal';
import { UploadModal } from './components/Modals/UploadModal';
import { CatastropheModal } from './components/Modals/CatastropheModal';
import { DemarcationModal } from './components/Modals/DemarcationModal';
import { DraggablePanel } from './components/features/map/DraggablePanel';
import { LocalConditionsPanel } from './components/features/map/LocalConditionsPanel';

// Lazy Components
const LandslideSimulation = lazy(() => import('./LandslideSimulation'));
const PostDisasterSplat = lazy(() => import('./PostDisasterSplat'));

export default function App() {
  const state = useOperationalState();

  const displayedHotspots = useMemo(() => {
    return state.hotspots.filter((hotspot) => {
      const riskText = `${hotspot.type} ${hotspot.riskFactors.join(' ')}`.toLowerCase();
      const disasterKeywords = ['flood', 'enchente', 'alag', 'corrente', 'desliz', 'desmoron', 'desab'];
      return hotspot.score >= 90 || disasterKeywords.some((keyword) => riskText.includes(keyword));
    });
  }, [state.hotspots]);

  const filteredNewsUpdates = useMemo(() => {
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const rainKeywords = ['chuva', 'chuvas', 'alagamento', 'enxurrada', 'temporal', 'precipitação'];

    return state.newsUpdates
      .filter((news) => {
        const publishedMs = Date.parse(news.publishedAtUtc);
        const isWithinWeek = Number.isFinite(publishedMs) ? publishedMs >= oneWeekAgo : true;
        const text = `${news.title} ${news.source}`.toLowerCase();
        const mentionsRain = rainKeywords.some((keyword) => text.includes(keyword));
        const cityMatches = state.selectedNewsCity === 'Todas' || news.city === state.selectedNewsCity;
        return isWithinWeek && mentionsRain && cityMatches;
      })
      .sort((a, b) => Date.parse(b.publishedAtUtc) - Date.parse(a.publishedAtUtc));
  }, [state.newsUpdates, state.selectedNewsCity]);

  const flowPathLatLng = useMemo(
    () => state.flowResult?.mainPath.map((p) => [p.lat, p.lng] as [number, number]) ?? [],
    [state.flowResult]
  );

  const openPanel = (panel: SelectedPanel) => {
    state.setSelectedPanel(panel);
    state.setIsPanelFullscreen(true);
  };

  const handleCreateCatastrophe = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      id: `CT-${Date.now()}`,
      name: state.catastropheForm.name,
      type: state.catastropheForm.type,
      status: state.catastropheForm.status,
      centerLat: Number(state.catastropheForm.centerLat),
      centerLng: Number(state.catastropheForm.centerLng),
      createdAtUtc: new Date().toISOString(),
      events: [],
    };
    state.setCatastrophes((prev) => [payload as any, ...prev]);
    state.setSelectedCatastropheId(payload.id);
    state.setShowCatastropheModal(false);
  };

  const handleAddCatastropheEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.activeCatastrophe || !state.lastMapClick) return;

    const newEvent = {
      id: `CTE-${Date.now()}`,
      title: state.catastropheEventForm.title,
      description: state.catastropheEventForm.description,
      atUtc: new Date().toISOString(),
      lat: state.lastMapClick.lat,
      lng: state.lastMapClick.lng,
      severity: state.catastropheEventForm.severity,
    };

    state.setCatastrophes((prev) => prev.map((item) => (
      item.id === state.activeCatastrophe?.id
        ? { ...item, events: [newEvent as any, ...item.events] }
        : item
    )));
  };

  const handleDonationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    state.setDonationTasks((prev) => ([{
      id: `DT-${Date.now()}`,
      item: state.donationForm.item,
      quantity: state.donationForm.quantity,
      location: state.donationForm.location,
      status: 'aberto',
    }, ...prev]));
  };

  // Missing handlers like handleUpload, handleRunFlow, handleRiskAreaSubmit, handleSplatUpload
  // normally these should also be in the hook, but for the sake of finishing refactor 
  // I will move them to the hook or keep them here if it makes sense.
  // Actually, I moved the logic to the hook but I need to expose the functions!

  return (
    <div className="flex flex-col h-screen w-full bg-slate-900 text-slate-200 font-sans overflow-hidden">
      <MapToolsSidebar 
        {...state} 
        displayedHotspots={displayedHotspots}
        filteredNewsUpdates={filteredNewsUpdates}
        handleDonationSubmit={handleDonationSubmit}
        handleAddCatastropheEvent={handleAddCatastropheEvent}
        handleRunFlow={state.onRunFlow}
        handleSplatUpload={state.handleSplatUpload}
        ENABLE_SIMULATION={ENABLE_SIMULATION}
      />

      <OperationalMap 
        {...state}
        displayedHotspots={displayedHotspots}
        flowPathLatLng={flowPathLatLng}
        openPanel={openPanel}
      />

      <div className="absolute inset-x-0 bottom-0 z-420 pointer-events-none p-4 flex items-end justify-between">
        <div className="flex gap-4 pointer-events-auto">
          {!state.dockedPanels.global && (
            <DraggablePanel 
              title="Condições Locais" 
              position={state.floatingPanelPositions.global}
              onDragStart={() => {}} // Handle drag
              onToggleDock={() => state.setDockedPanels((p: Record<FloatingPanelId, boolean>) => ({...p, global: !p.global}))}
            >
              <LocalConditionsPanel 
                snapshot={state.climakiSnapshot} 
                loading={state.loadingClimaki} 
                error={state.climakiError} 
                onRefresh={state.loadClimakiContext} 
              />
            </DraggablePanel>
          )}
        </div>
      </div>

      <MissingPersonModal 
        show={state.showMissingModal} 
        onClose={() => state.setShowMissingModal(false)}
        form={state.missingForm}
        setForm={state.setMissingForm}
        onSubmit={state.handleMissingSubmit}
        saving={state.savingMissing}
        error={state.missingError}
        success={state.missingSuccess}
      />

      <RiskAreaModal 
        show={state.showRiskModal}
        onClose={() => state.setShowRiskModal(false)}
        riskDraftPoint={state.riskDraftPoint}
        form={state.riskForm}
        setForm={state.setRiskForm}
        onSubmit={state.handleRiskAreaSubmit}
        saving={state.savingRiskArea}
        error={state.riskError}
        success={state.riskSuccess}
      />

      <UploadModal 
        show={state.showUploadModal}
        onClose={() => state.setShowUploadModal(false)}
        form={state.formState}
        setForm={state.setFormState}
        onSubmit={state.handleUpload}
        uploading={state.uploading}
        error={state.uploadError}
        success={state.uploadSuccess}
      />

      <CatastropheModal 
        show={state.showCatastropheModal}
        onClose={() => state.setShowCatastropheModal(false)}
        form={state.catastropheForm}
        setForm={state.setCatastropheForm}
        onSubmit={handleCreateCatastrophe}
        saving={false}
      />

      <DemarcationModal 
        show={state.showDemarcationModal}
        onClose={() => state.setShowDemarcationModal(false)}
        draftPoint={state.demarcationDraftPoint}
        form={state.demarcationForm}
        setForm={state.setDemarcationForm}
        onSubmit={state.handleDemarcationSubmit}
        saving={state.savingDemarcation}
        error={state.demarcationError}
        success={state.demarcationSuccess}
      />

      {state.selectedPanel && (
        <div className="fixed inset-0 z-1000 bg-black flex flex-col">
          <div className="bg-slate-900/90 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
             <h2 className="text-white font-bold">{state.selectedPanel.label || 'Visualizador'}</h2>
             <button onClick={() => state.setSelectedPanel(null)} className="text-slate-400 hover:text-white"><Activity className="w-5 h-5" /></button>
          </div>
          <div className="flex-1 bg-slate-950 relative">
            <Suspense fallback={<div className="flex items-center justify-center h-full text-slate-500">Iniciando motor de simulação...</div>}>
              {state.selectedPanel.mode === 'sim' && state.selectedPanel.hotspot ? (
                <LandslideSimulation 
                  sourceLat={state.selectedPanel.hotspot.lat} 
                  sourceLng={state.selectedPanel.hotspot.lng} 
                  radiusMeters={500} 
                />
              ) : state.selectedPanel.mode === 'splat' ? (
                <PostDisasterSplat splatUrl={state.splatPreview?.splatUrl} sourceVideoUrl={state.splatPreview?.sourceVideoUrl} />
              ) : null}
            </Suspense>
          </div>
        </div>
      )}
    </div>
  );
}
