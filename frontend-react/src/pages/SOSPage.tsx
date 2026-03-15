import { useMemo } from 'react';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { MapContainer, TileLayer } from 'react-leaflet';
import { Modal } from '../components/ui/Modal';
import { QuickActions } from '../components/ui/QuickActions';

import { LoadingOverlay } from '../components/ui/LoadingOverlay';
import { MapInteractions, MapListener } from '../components/map/MapInteractions';
import { MemoizedEventMarker } from '../components/map/EventMarker';
import { LiveOpsPanel } from '../components/map/LiveOpsPanel';
import { CursorCoordinates } from '../components/map/CursorCoordinates';
import { MapContextMenu } from '../components/map/MapContextMenu';

import { useSOSPageData } from '../hooks/useSOSPageData';
import { useSOSPageController } from '../hooks/useSOSPageController';
import { SOSHeaderHUD } from '../components/ui/SOSHeaderHUD';
import { AlertSidebar } from '../components/ui/AlertSidebar';
import { MissionsPanel } from '../components/gamification/MissionsPanel';
import { GamificationHud } from '../components/gamification/GamificationHud';
import { SituationIntelPanel } from '../components/ui/SituationIntelPanel';
import { TacticalOpsForm } from '../components/ui/TacticalOpsForm';
import {
  Box,
  VStack,
  Center,
  Spinner,
} from '@chakra-ui/react';
import { TacticalText } from '../components/atoms/TacticalText';

/**
 * SOS War Room / Dashboard
 * The core operational environment. Refactored for Clean Architecture
 * and unified Tactical Design System.
 */
export function SOSPage() {
  const {
    events, domainEvents, alerts, mapAnnotations, opsSnapshot,
    country, setCountry, initialLoading, savingOps,
    currentDisplayEvents,
    saveOps, sidebarAlerts
  } = useSOSPageData();

  const { states, actions } = useSOSPageController(saveOps);

  const selectedEvent = useMemo(() => {
    if (!states.hoveredId) return null;
    return (events as any[]).find(e => `${e.provider}-${e.provider_event_id}` === states.hoveredId) ||
      domainEvents.find(e => e.id === states.hoveredId) ||
      (alerts as any[]).find(a => `alert-${a.id}` === states.hoveredId) ||
      (mapAnnotations as any[]).find(m => `ann-${m.id}` === states.hoveredId) ||
      (sidebarAlerts as any[]).find((a: any) => a.id === states.hoveredId);
  }, [states.hoveredId, events, domainEvents, alerts, mapAnnotations, sidebarAlerts]);

  return (
    <Box h="100vh" w="100vw" position="relative" overflow="hidden" bg="sos.dark">
      {initialLoading && <LoadingOverlay message="Inicializando Guardian Terminal..." />}
      {savingOps && <LoadingOverlay message="Sincronizando Dados de Campo..." />}

      {/* Floating Header */}
      <SOSHeaderHUD
        country={country}
        setCountry={setCountry}
        onReset={actions.resetMap}
        activeTool={states.tool}
        setTool={actions.setTool}
        onSearchSelect={(lat, lon) => {
          actions.setMapCenter([lat, lon]);
          actions.setMapZoom(14);
        }}
        stats={{
          activeTeams: opsSnapshot?.kpis?.activeTeams ?? '0',
          criticalAlerts: opsSnapshot?.kpis?.criticalAlerts ?? '0',
          supplies: opsSnapshot?.kpis?.suppliesInTransit ?? '0',
          missingPersons: opsSnapshot?.layers?.missingPersons?.length ?? '0'
        }}
      />

      <AlertSidebar
        alerts={sidebarAlerts.map((a: any) => ({
          ...a,
          description: a.description || `Alerta de ${a.source || 'sistema'}`,
          lat: a.lat,
          lon: a.lon
        }))}
        kpis={{
          criticalAlerts: opsSnapshot?.kpis?.criticalAlerts || 0,
          activeTeams: opsSnapshot?.kpis?.activeTeams || 0,
          missingPersons: opsSnapshot?.layers?.missingPersons?.length || 0
        }}
        onAlertClick={(alert) => {
          if (alert.lat && alert.lon) {
            actions.setMapCenter([alert.lat, alert.lon]);
            actions.setMapZoom(15);
          }
        }}
      />

      {/* Gamification Feed (Right) */}
      <VStack position="absolute" top="120px" right={6} bottom={6} zIndex={40} display={{ base: 'none', xl: 'flex' }} spacing={6} align="stretch">
         <GamificationHud
           xp={3420}
           level={42}
           rank="Sentinel III"
           nextLevelXp={5000}
           w="340px"
         />
         <MissionsPanel />
      </VStack>

      {/* Quick Action Bar (Bottom) */}
      <Box position="absolute" bottom={6} left="50%" transform="translateX(-50%)" zIndex={40}>
        <QuickActions onToggleLiveOps={() => actions.setLiveOpsPanelOpen(!states.liveOpsPanelOpen)} onAction={actions.handleQuickAction} />
      </Box>

      {states.intelPanelOpen && selectedEvent && (
        <SituationIntelPanel 
          event={selectedEvent} 
          onClose={() => actions.setIntelPanelOpen(false)} 
        />
      )}

      {states.liveOpsPanelOpen && (
        <LiveOpsPanel onClose={() => actions.setLiveOpsPanelOpen(false)} />
      )}

      {/* Primary Map Foundation */}
      <Box position="absolute" inset={0} zIndex={0}>
        {states.mapCenter && states.mapCenter[0] !== undefined && (
          <MapContainer center={states.mapCenter} zoom={states.mapZoom} zoomControl={false} style={{ height: '100%', width: '100%' }}>
            <TileLayer attribution='&copy; CARTO' url='https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' />
            <MapListener onMove={(c, z) => { actions.setMapCenter(c); actions.setMapZoom(z); }} />
            <MapInteractions
              tool={states.tool}
              onPickPoint={(lat, lon) => {
                actions.setLastClickedCoords([lat, lon]);
                actions.setOpenOpsModal(true);
              }}
              onHover={actions.handleMapHover}
              areaDraft={states.areaDraft}
              setAreaDraft={actions.setAreaDraft}
              spatialFilter={states.spatialFilter}
              setSpatialFilter={actions.setSpatialFilter}
              onFilterComplete={() => { }}
              onSnapshotComplete={() => { }}
              onContextMenu={(x, y, lat, lon) => actions.setContextMenu({ x, y, lat, lon })}
              show3D={false}
            />
            <MarkerClusterGroup chunkedLoading maxClusterRadius={50}>
              {(currentDisplayEvents || []).map((e) => (
                <MemoizedEventMarker key={e.id || `${e.provider}-${e.provider_event_id}`} e={e} isHovered={states.hoveredId === (e.id || `${e.provider}-${e.provider_event_id}`)} onHover={actions.handleMarkerHover} onUnhover={actions.handleMarkerUnhover} />
              ))}
            </MarkerClusterGroup>
          </MapContainer>
        )}
        {!states.mapCenter && (
          <Center h="full" bg="sos.dark">
            <VStack spacing={4}>
              <Spinner color="sos.blue.500" size="xl" />
              <TacticalText variant="mono">
                Sincronizando com Satélites Guardian...
              </TacticalText>
            </VStack>
          </Center>
        )}
      </Box>

      {/* Tactical Registration Modal */}
      <Modal title="CADASTRO TÁTICO DE CAMPO" open={states.openOpsModal} onClose={() => actions.setOpenOpsModal(false)}>
        <TacticalOpsForm 
          opsForm={states.opsForm} 
          setOpsForm={actions.setOpsForm} 
          onSave={actions.executeSaveOps} 
        />
      </Modal>

      <CursorCoordinates coords={states.cursorCoords} />
      
      {states.contextMenu && (
        <MapContextMenu
          x={states.contextMenu.x}
          y={states.contextMenu.y}
          lat={states.contextMenu.lat}
          lon={states.contextMenu.lon}
          onClose={() => actions.setContextMenu(null)}
          onMarkRiskArea={(lat, lon) => {
            actions.setLastClickedCoords([lat, lon]);
            actions.setOpsForm(prev => ({ ...prev, recordType: 'risk_area' }));
            actions.setOpenOpsModal(true);
          }}
        />
      )}
    </Box>
  );
}
