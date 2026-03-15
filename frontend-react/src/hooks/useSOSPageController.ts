import { useState, useCallback } from 'react';
import type { ToolMode } from '../components/map/MapInteractions';

/**
 * Controller Hook for SOSPage
 * Manages UI interaction states, transitions, and local operational forms.
 */
export function useSOSPageController(saveOpsFn: any) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([-20.91, -42.98]);
  const [mapZoom, setMapZoom] = useState(13);
  const [lastClickedCoords, setLastClickedCoords] = useState<[number, number] | null>(null);
  const [tool, setTool] = useState<ToolMode>('inspect');
  const [areaDraft, setAreaDraft] = useState<Array<[number, number]>>([]);
  const [spatialFilter, setSpatialFilter] = useState<any>(null);

  const [openOpsModal, setOpenOpsModal] = useState(false);
  const [opsForm, setOpsForm] = useState({
    recordType: 'risk_area' as any,
    personName: '',
    lastSeenLocation: '',
    incidentTitle: '',
    severity: 'high'
  });

  const [intelPanelOpen, setIntelPanelOpen] = useState(false);
  const [liveOpsPanelOpen, setLiveOpsPanelOpen] = useState(false);
  const [cursorCoords, setCursorCoords] = useState<[number, number] | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, lat: number, lon: number } | null>(null);

  const handleMarkerHover = useCallback((id: string) => setHoveredId(id), []);
  const handleMarkerUnhover = useCallback(() => setHoveredId(null), []);
  const handleMapHover = useCallback((lat: number, lon: number) => setCursorCoords([lat, lon]), []);

  const handleQuickAction = useCallback((label: string) => {
    if (label === 'LIVE OPERATIONS') {
      setLiveOpsPanelOpen(prev => !prev);
    } else if (label === 'Relato') {
      setOpsForm(prev => ({ ...prev, recordType: 'risk_area' }));
      setOpenOpsModal(true);
    } else if (['Voluntários', 'Doações', 'Resgate', 'Bombeiros', 'Exército'].includes(label)) {
      const typeMap: Record<string, string> = {
        'Voluntários': 'voluntario',
        'Doações': 'doacao',
        'Resgate': 'resgate',
        'Bombeiros': 'bombeiros',
        'Exército': 'exercito'
      };
      setOpsForm(prev => ({ ...prev, recordType: typeMap[label] }));
      setOpenOpsModal(true);
    }
  }, []);

  const resetMap = useCallback(() => {
    setMapCenter([-14.2, -51.9]);
    setHoveredId(null);
    setTool('inspect');
  }, []);

  const executeSaveOps = useCallback(() => {
    saveOpsFn(opsForm, lastClickedCoords, setOpenOpsModal, setLastClickedCoords);
  }, [saveOpsFn, opsForm, lastClickedCoords]);

  return {
    states: {
      hoveredId, mapCenter, mapZoom, lastClickedCoords, tool,
      areaDraft, spatialFilter, openOpsModal, opsForm,
      intelPanelOpen, liveOpsPanelOpen, cursorCoords, contextMenu
    },
    actions: {
      setHoveredId, setMapCenter, setMapZoom, setLastClickedCoords, setTool,
      setAreaDraft, setSpatialFilter, setOpenOpsModal, setOpsForm,
      setIntelPanelOpen, setLiveOpsPanelOpen, setCursorCoords, setContextMenu,
      handleMarkerHover, handleMarkerUnhover, handleMapHover, handleQuickAction,
      resetMap, executeSaveOps
    }
  };
}
