import { useState, useCallback } from 'react';
import type { ToolMode } from '../components/features/map/MapInteractions';
import type { OpsFormState, OpsRecordType, SaveOpsFn, SpatialFilter } from '../types';

/**
 * Controller Hook for SOSPage
 * Manages UI interaction states, transitions, and local operational forms.
 */
export function useSOSPageController(saveOpsFn: SaveOpsFn) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([-20.91, -42.98]);
  const [mapZoom, setMapZoom] = useState(13);
  const [lastClickedCoords, setLastClickedCoords] = useState<[number, number] | null>(null);
  const [tool, setTool] = useState<ToolMode>('inspect');
  const [areaDraft, setAreaDraft] = useState<Array<[number, number]>>([]);
  const [spatialFilter, setSpatialFilter] = useState<SpatialFilter | null>(null);

  const [openOpsModal, setOpenOpsModal] = useState(false);
  const [opsForm, setOpsForm] = useState<OpsFormState>({
    recordType: 'risk_area' as OpsRecordType,
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
      const typeMap: Record<string, OpsRecordType> = {
        'Voluntários': 'voluntario',
        'Doações': 'doacao',
        'Resgate': 'resgate',
        'Bombeiros': 'bombeiros',
        'Exército': 'exercito'
      };
      setOpsForm(prev => ({ ...prev, recordType: typeMap[label] ?? 'risk_area' }));
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
      setHoveredId, 
      setMapCenter: (c: [number, number]) => {
        if (c && !isNaN(c[0]) && !isNaN(c[1])) setMapCenter(c);
      },
      setMapZoom, 
      setLastClickedCoords, 
      setTool,
      setAreaDraft, 
      setSpatialFilter, 
      setOpenOpsModal, 
      setOpsForm,
      setIntelPanelOpen, 
      setLiveOpsPanelOpen, 
      setCursorCoords, 
      setContextMenu,
      handleMarkerHover, 
      handleMarkerUnhover, 
      handleMapHover, 
      handleQuickAction,
      resetMap, 
      executeSaveOps
    }
  };
}
