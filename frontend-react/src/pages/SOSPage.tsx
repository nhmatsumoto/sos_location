import { useMemo, useState, Fragment } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import { Modal } from '../components/ui/Modal';
import { CommandDock } from '../components/ui/CommandDock';

import { MapInteractions, MapListener } from '../components/features/map/MapInteractions';
import { MemoizedEventMarker } from '../components/features/map/EventMarker';
import { MapArea } from '../components/ui/MapArea';
import { LiveOpsPanel } from '../components/features/map/LiveOpsPanel';
import { CursorCoordinates } from '../components/features/map/CursorCoordinates';
import { MapContextMenu } from '../components/features/map/MapContextMenu';

import { useSOSPageData } from '../hooks/useSOSPageData';
import { useSOSPageController } from '../hooks/useSOSPageController';
import { SOSHeaderHUD } from '../components/ui/SOSHeaderHUD';
import { AlertSidebar } from '../components/ui/AlertSidebar';
import { MissionsPanel } from '../components/features/gamification/MissionsPanel';
import { GamificationHud } from '../components/features/gamification/GamificationHud';
import { SituationIntelPanel } from '../components/ui/SituationIntelPanel';
import { TacticalOpsForm } from '../components/ui/TacticalOpsForm';
import {
  Box, VStack, Center, Spinner, IconButton
} from '@chakra-ui/react';
import { TacticalText } from '../components/atoms/TacticalText';
import { Bell, BellOff, BarChart2, Plus, Minus } from 'lucide-react';

/**
 * SOS War Room — Guardian Clarity v3
 * Redesigned for maximum map visibility and information clarity.
 * Navigation Rail (64px) + floating panels = 90%+ map visibility.
 */
export function SOSPage() {
  const {
    events, domainEvents, alerts, mapAnnotations, opsSnapshot,
    country, setCountry,
    currentDisplayEvents,
    saveOps, sidebarAlerts
  } = useSOSPageData();

  const { states, actions } = useSOSPageController(saveOps);

  // Panel visibility toggles
  const [alertPanelOpen, setAlertPanelOpen] = useState(true);
  const [gamificationOpen, setGamificationOpen] = useState(false);

  const selectedEvent = useMemo(() => {
    if (!states.hoveredId) return null;
    return (events as any[]).find(e => `${e.provider}-${e.provider_event_id}` === states.hoveredId)
      || domainEvents.find(e => e.id === states.hoveredId)
      || (alerts as any[]).find(a => `alert-${a.id}` === states.hoveredId)
      || (mapAnnotations as any[]).find(m => `ann-${m.id}` === states.hoveredId)
      || (sidebarAlerts as any[]).find((a: any) => a.id === states.hoveredId);
  }, [states.hoveredId, events, domainEvents, alerts, mapAnnotations, sidebarAlerts]);

  return (
    <Box h="100%" w="100%" position="relative" overflow="hidden" bg="sos.dark">
      {/* Subtle ambient glow — not blocking */}
      <Box 
        position="absolute" 
        inset={0} 
        zIndex={1} 
        pointerEvents="none"
        background="radial-gradient(ellipse at 50% 0%, rgba(0,122,255,0.04) 0%, transparent 60%)" 
      />

      {/* Header HUD */}
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
          activeTeams: opsSnapshot?.kpis?.activeTeams ?? '--',
          criticalAlerts: opsSnapshot?.kpis?.criticalAlerts ?? '--',
          supplies: opsSnapshot?.kpis?.suppliesInTransit ?? '--',
          missingPersons: opsSnapshot?.layers?.missingPersons?.length ?? '0'
        }}
        alertPanelOpen={alertPanelOpen}
        onToggleAlerts={() => setAlertPanelOpen(p => !p)}
        gamificationOpen={gamificationOpen}
        onToggleMissions={() => setGamificationOpen(p => !p)}
      />


      {/* Alert Sidebar — right side, collapsible */}
      {alertPanelOpen && (
        <Box 
          position="absolute" 
          top="84px" 
          right={4} 
          bottom={6} 
          zIndex={40} 
          w="320px"
          className="animate-panel"
        >
          <AlertSidebar 
            alerts={sidebarAlerts.map((a: any) => ({
              ...a,
              description: a.description || `Tactical alert — ${a.source || 'system'}`,
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
        </Box>
      )}

      {/* Gamification Panel — right side when no alerts, or stacked */}
      {gamificationOpen && (
        <VStack 
          position="absolute" 
          top="84px" 
          right={alertPanelOpen ? '340px' : 4} 
          bottom={6} 
          zIndex={40} 
          spacing={4}
          align="stretch"
          w="300px"
          className="animate-panel"
          transition="right 0.25s cubic-bezier(0.4,0,0.2,1)"
        >
          <Box w="full">
            <GamificationHud />
          </Box>
          <Box flex={1} overflow="hidden">
            <MissionsPanel />
          </Box>
        </VStack>
      )}

      {/* Command Dock — bottom-left, vertical */}
      <CommandDock 
        onToggleLiveOps={() => actions.setLiveOpsPanelOpen(!states.liveOpsPanelOpen)} 
        onAction={actions.handleQuickAction}
        liveOpsActive={states.liveOpsPanelOpen}
      />

      {/* Intel panel on marker hover */}
      {states.intelPanelOpen && selectedEvent && (
        <SituationIntelPanel 
          event={selectedEvent} 
          onClose={() => {
            actions.setIntelPanelOpen(false);
            actions.setHoveredId(null);
          }} 
        />
      )}

      {/* Live Ops sliding panel */}
      {states.liveOpsPanelOpen && (
        <LiveOpsPanel onClose={() => actions.setLiveOpsPanelOpen(false)} />
      )}

      {/* MAP — hero element, full viewport */}
      <Box position="absolute" inset={0} zIndex={0}>
        {states.mapCenter ? (
          <Box position="relative" h="full" w="full">
            <MapContainer
              center={states.mapCenter}
              zoom={states.mapZoom}
              zoomControl={false}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                zIndex={1}
              />
              {/* Added labels layer for better orientation since nolabels was too empty */}
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"
                zIndex={10}
                opacity={0.8}
              />
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
                onFilterComplete={() => {}}
                onSnapshotComplete={() => {}}
                onContextMenu={(x, y, lat, lon) => actions.setContextMenu({ x, y, lat, lon })}
                show3D={false}
              />
              {/* Temporarily disabled clustering for debug */}
              {(currentDisplayEvents || []).map((e) => {
                if (!e) return null;
                const eventId = e.id || `${e.provider}-${e.provider_event_id}`;
                return (
                  <Fragment key={`group-${eventId}`}>
                    <MapArea 
                      id={eventId}
                      latitude={e.lat}
                      longitude={e.lon}
                      category={e.category || e.type || 'disaster_alert'}
                      polygon={e.polygon}
                    />
                    <MemoizedEventMarker
                      e={e} 
                      isHovered={states.hoveredId === eventId}
                      onHover={actions.handleMarkerHover}
                      onUnhover={actions.handleMarkerUnhover}
                    />
                  </Fragment>
                );
              })}
            </MapContainer>

            {/* Tactical Zoom Overlay (Repositioned to bottom-right to avoid HUD overlap) */}
            <Box position="absolute" bottom="84px" right={6} zIndex={130}>
               <VStack spacing={2}>
                  <IconButton 
                    aria-label="Zoom in" icon={<Plus size={18} />} 
                    onClick={() => actions.setMapZoom(states.mapZoom + 1)}
                    size="md" bg="rgba(8,8,15,0.85)" border="1px solid rgba(255,255,255,0.15)"
                    backdropFilter="blur(16px)" color="whiteAlpha.800" _hover={{ bg: 'sos.blue.500', color: 'white' }}
                    borderRadius="xl" boxShadow="2xl"
                  />
                  <IconButton 
                    aria-label="Zoom out" icon={<Minus size={18} />} 
                    onClick={() => actions.setMapZoom(states.mapZoom - 1)}
                    size="md" bg="rgba(8,8,15,0.85)" border="1px solid rgba(255,255,255,0.15)"
                    backdropFilter="blur(16px)" color="whiteAlpha.800" _hover={{ bg: 'sos.blue.500', color: 'white' }}
                    borderRadius="xl" boxShadow="2xl"
                  />
               </VStack>
            </Box>
          </Box>
        ) : (
          <Center h="full" bg="sos.dark" zIndex={2}>
            <VStack spacing={5}>
              <Spinner
                size="xl"
                thickness="3px"
                speed="0.8s"
                color="sos.blue.500"
                emptyColor="rgba(255,255,255,0.06)"
              />
              <VStack spacing={1}>
                <TacticalText variant="heading" fontSize="sm" color="white">
                  INITIALIZING GUARDIAN TERMINAL
                </TacticalText>
                <TacticalText variant="mono" fontSize="xs" color="sos.blue.400" className="animate-pulse">
                  ESTABLISHING SATELLITE UPLINK...
                </TacticalText>
              </VStack>
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
          lng={states.contextMenu.lon}
          onClose={() => actions.setContextMenu(null)}
          onMarkRiskArea={(lat: number, lng: number) => {
            actions.setLastClickedCoords([lat, lng]);
            actions.setOpsForm(prev => ({ ...prev, recordType: 'risk_area' }));
            actions.setOpenOpsModal(true);
          }}
        />
      )}
    </Box>
  );
}
