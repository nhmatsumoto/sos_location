import { useState, useEffect, useMemo, useRef } from 'react';
import type { FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import type { 
  NewsUpdate, SupportPoint, MapDemarcation,
  DonationTask, Catastrophe, 
  FloatingPanelId, FloatingPanelPosition, SelectedPanel 
} from '../types';
import { 
  initialFormState, initialMissingForm, initialRiskForm, initialDonationForm, 
  initialSplatForm, initialCatastropheForm, initialCatastropheEventForm, 
  initialDemarcationForm, LOCAL_WEEKLY_RAIN_NEWS
} from '../constants';
import { useClimate } from './useClimate';
import { useEmergencyAlerts } from './useEmergencyAlerts';
import { useSimulation } from './useSimulation';
import { apiClient } from '../services/apiClient';
import { frontendLogger } from '../lib/logger';

export function useOperationalState() {
  const { climakiSnapshot, loadingClimaki, climakiError, loadClimakiContext } = useClimate();
  const { 
    attentionAlerts, missingPeople, hotspots, loadingAlerts, loadingMissing, loadingHotspots,
    loadAttentionAlerts, loadMissingPeople, loadHotspots, 
    handleMissingSubmit: apiMissingSubmit, handleRiskAreaSubmit: apiRiskAreaSubmit 
  } = useEmergencyAlerts();
  const { 
    flowForm, setFlowForm, flowResult, setFlowResult, flowError, setFlowError, 
    runningFlow, handleRunFlow, splatUploading, splatError, 
    handleSplatUpload: apiSplatUpload 
  } = useSimulation();

  const [newsUpdates, setNewsUpdates] = useState<NewsUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingNews, setLoadingNews] = useState(true);
  const [selectedNewsCity, setSelectedNewsCity] = useState<'Todas' | 'Ubá' | 'Juiz de Fora' | 'Matias Barbosa'>('Todas');

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showMissingModal, setShowMissingModal] = useState(false);
  const [showCatastropheModal, setShowCatastropheModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savingMissing, setSavingMissing] = useState(false);

  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [missingError, setMissingError] = useState('');
  const [missingSuccess, setMissingSuccess] = useState('');

  const [formState, setFormState] = useState(initialFormState);
  const [missingForm, setMissingForm] = useState(initialMissingForm);
  const [selectedPanel, setSelectedPanel] = useState<SelectedPanel | null>(null);
  const [isPanelFullscreen, setIsPanelFullscreen] = useState(true);
  const [selectedIncidentPoint, setSelectedIncidentPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [riskDraftPoint, setRiskDraftPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [savingRiskArea, setSavingRiskArea] = useState(false);
  const [riskError, setRiskError] = useState('');
  const [riskSuccess, setRiskSuccess] = useState('');
  const [riskForm, setRiskForm] = useState(initialRiskForm);

  const [demarcations, setDemarcations] = useState<MapDemarcation[]>([]);
  const [demarcationDraftPoint, setDemarcationDraftPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [showDemarcationModal, setShowDemarcationModal] = useState(false);
  const [savingDemarcation, setSavingDemarcation] = useState(false);
  const [demarcationError, setDemarcationError] = useState('');
  const [demarcationSuccess, setDemarcationSuccess] = useState('');
  const [demarcationForm, setDemarcationForm] = useState(initialDemarcationForm);
  
  const location = useLocation();
  const sidebarTab = useMemo<'news' | 'hotspots' | 'support' | 'volunteers'>(() => {
    if (location.pathname === '/news') return 'news';
    if (location.pathname === '/support') return 'support';
    if (location.pathname === '/volunteers') return 'volunteers';
    return 'hotspots';
  }, [location.pathname]);

  const [mapActionMode, setMapActionMode] = useState<'none' | 'incident' | 'risk' | 'support'>('none');
  const [mapQuickMenu, setMapQuickMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    lat: number;
    lng: number;
  } | null>(null);
  const [lastMapClick, setLastMapClick] = useState<{ lat: number; lng: number } | null>(null);
  const [supportPoints, setSupportPoints] = useState<SupportPoint[]>([]);
  const [donationForm, setDonationForm] = useState(initialDonationForm);
  const [donationTasks, setDonationTasks] = useState<DonationTask[]>([
    { id: 'DT-001', item: 'Cobertores', quantity: '80 unidades', location: 'Escola Municipal A', status: 'aberto' },
    { id: 'DT-002', item: 'Cestas básicas', quantity: '45 unidades', location: 'Paróquia Central', status: 'em_andamento' },
  ]);
  const [splatForm, setSplatForm] = useState(initialSplatForm);
  const [splatPreview, setSplatPreview] = useState<{ splatUrl?: string | null; sourceVideoUrl?: string } | null>(null);
  const [catastropheForm, setCatastropheForm] = useState(initialCatastropheForm);
  const [catastropheEventForm, setCatastropheEventForm] = useState(initialCatastropheEventForm);
  const [catastrophes, setCatastrophes] = useState<Catastrophe[]>([
    {
      id: 'CT-001',
      name: 'Enchente no perímetro urbano de Ubá',
      type: 'Enchente',
      status: 'Ativa',
      centerLat: -21.1215,
      centerLng: -42.9427,
      createdAtUtc: new Date().toISOString(),
      events: [
        {
          id: 'CTE-001',
          title: 'Primeiro alerta da Defesa Civil',
          description: 'Volume elevado no córrego e risco de transbordamento.',
          atUtc: new Date().toISOString(),
          lat: -21.1215,
          lng: -42.9427,
          severity: 'high',
        },
      ],
    },
  ]);
  const [selectedCatastropheId, setSelectedCatastropheId] = useState<string>('CT-001');
  const mapOverlayRef = useRef<HTMLDivElement | null>(null);
  const [floatingPanelPositions, setFloatingPanelPositions] = useState<Record<FloatingPanelId, FloatingPanelPosition>>({
    global: { top: 16, left: 16 },
    terrain: { top: 16, left: 320 },
    alerts: { top: 16, left: 630 },
    splat: { top: 16, left: 940 }
  });
  const [dockedPanels, setDockedPanels] = useState<Record<FloatingPanelId, boolean>>({
    global: false,
    terrain: false,
    alerts: false,
    splat: false
  });

  const [mapMode, setMapMode] = useState<'tactical' | 'topographic'>('tactical');
  const tacticalMapEnabled = mapMode === 'tactical';

  const activeCatastrophe = useMemo(
    () => catastrophes.find((item) => item.id === selectedCatastropheId) ?? null,
    [catastrophes, selectedCatastropheId],
  );

  const loadNews = () => {
    setLoadingNews(true);
    apiClient.get<NewsUpdate[]>('/api/news-updates')
      .then((res) => {
        const data = res.data;
        const validNews = Array.isArray(data) ? data : [];
        setNewsUpdates(validNews.length ? validNews : LOCAL_WEEKLY_RAIN_NEWS);
      })
      .catch(() => setNewsUpdates(LOCAL_WEEKLY_RAIN_NEWS))
      .finally(() => setLoadingNews(false));
  };

  useEffect(() => {
    loadHotspots().then(() => setLoading(false));

    loadNews();
    loadMissingPeople();
    loadAttentionAlerts();
    loadClimakiContext();

    const tacticalInterval = setInterval(() => {
      loadAttentionAlerts();
      loadClimakiContext();
    }, 120000);

    const publicSourcesInterval = setInterval(() => {
      loadNews();
    }, 1800000);

    return () => {
      clearInterval(tacticalInterval);
      clearInterval(publicSourcesInterval);
    };
  }, [loadHotspots, loadMissingPeople, loadAttentionAlerts, loadClimakiContext]);

  const loadDemarcations = async () => {
    try {
      const res = await apiClient.get<MapDemarcation[]>('/api/v1/demarcations');
      setDemarcations(res.data);
    } catch (err) {
      frontendLogger.error('Falha ao carregar demarcações', { err });
    }
  };

  useEffect(() => {
    loadDemarcations();
  }, []);

  const handleUpload = async (event: FormEvent) => {
    event.preventDefault();
    setUploadError('');
    setUploadSuccess('');

    if (!formState.video) {
        setUploadError('Selecione um vídeo gravado no celular antes de enviar.');
        return;
    }

    setUploading(true);
    const payload = new FormData();
    payload.append('locationName', formState.locationName);
    payload.append('latitude', formState.latitude);
    payload.append('longitude', formState.longitude);
    payload.append('description', formState.description);
    payload.append('reporterName', formState.reporterName);
    payload.append('reporterPhone', formState.reporterPhone);
    payload.append('video', formState.video);

    try {
        await apiClient.post('/api/collapse-reports', payload);

        setUploadSuccess('Upload recebido! O vídeo entrou na fila para gaussian-splatting.');
        setFormState(initialFormState);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro inesperado no envio.';
        frontendLogger.error('Falha no upload de vídeo', { message });
        setUploadError(message);
    } finally {
        setUploading(false);
    }
  };

  const handleMissingSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setMissingError('');
    setMissingSuccess('');
    setSavingMissing(true);

    const result = await apiMissingSubmit(missingForm);
    if (result.success) {
      setMissingSuccess('Cadastro realizado com sucesso.');
      setMissingForm(initialMissingForm);
    } else {
      setMissingError(result.error ?? 'Erro inesperado no cadastro.');
    }
    setSavingMissing(false);
  };

  const onRunFlow = async (event: FormEvent) => {
    event.preventDefault();
    await handleRunFlow();
  };

  const handleRiskAreaSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!riskDraftPoint) {
        setRiskError('Selecione um ponto de risco no mapa antes de salvar.');
        return;
    }

    setSavingRiskArea(true);
    setRiskError('');
    setRiskSuccess('');

    const result = await apiRiskAreaSubmit(riskForm, riskDraftPoint);
    if (result.success) {
      setRiskSuccess('Área de risco registrada com sucesso.');
      setShowRiskModal(false);
      setRiskForm(initialRiskForm);
      setRiskDraftPoint(null);
    } else {
      setRiskError(result.error ?? 'Erro ao registrar área de risco.');
    }
    setSavingRiskArea(false);
  };

  const handleDemarcationSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!demarcationDraftPoint) {
      setDemarcationError('Selecione um ponto no mapa.');
      return;
    }

    setSavingDemarcation(true);
    setDemarcationError('');
    setDemarcationSuccess('');

    try {
      const payload = {
        ...demarcationForm,
        latitude: demarcationDraftPoint.lat,
        longitude: demarcationDraftPoint.lng,
        tags: demarcationForm.tags.split(',').map(t => t.trim()).filter(t => t !== ''),
        createdBy: 'Admin', // Static for now
      };

      const res = await apiClient.post<MapDemarcation>('/api/v1/demarcations', payload);
      setDemarcations(prev => [res.data, ...prev]);
      setDemarcationSuccess('Demarcação salva!');
      setShowDemarcationModal(false);
      setDemarcationForm(initialDemarcationForm);
      setDemarcationDraftPoint(null);
    } catch (err) {
      setDemarcationError('Falha ao salvar demarcação.');
    } finally {
      setSavingDemarcation(false);
    }
  };

  const handleSplatUpload = async (event: FormEvent) => {
    event.preventDefault();

    if (!splatForm.video) {
        return;
    }

    const result = await apiSplatUpload({
      latitude: splatForm.latitude,
      longitude: splatForm.longitude,
      video: splatForm.video,
    });

    if (result.success && result.data) {
      setSplatPreview({
          splatUrl: result.data.splatUrl,
          sourceVideoUrl: result.data.sourceVideoUrl,
      });
      setSplatForm((prev) => ({ ...prev, video: null }));
      setSelectedPanel({ mode: 'splat', label: 'Render 3D (gaussian-splatting)' });
      setIsPanelFullscreen(true);
    }
  };

  return {
    hotspots,
    newsUpdates, setNewsUpdates,
    missingPeople,
    attentionAlerts,
    flowForm, setFlowForm,
    flowResult, setFlowResult,
    flowError, setFlowError,
    climakiSnapshot,
    loadingClimaki,
    climakiError,
    loading, setLoading,
    loadingNews, setLoadingNews,
    selectedNewsCity, setSelectedNewsCity,
    loadingMissing,
    loadingAlerts,
    loadingHotspots,
    runningFlow,
    showUploadModal, setShowUploadModal,
    showMissingModal, setShowMissingModal,
    showCatastropheModal, setShowCatastropheModal,
    uploading, setUploading,
    savingMissing, setSavingMissing,
    uploadError, setUploadError,
    uploadSuccess, setUploadSuccess,
    missingError, setMissingError,
    missingSuccess, setMissingSuccess,
    formState, setFormState,
    missingForm, setMissingForm,
    selectedPanel, setSelectedPanel,
    isPanelFullscreen, setIsPanelFullscreen,
    selectedIncidentPoint, setSelectedIncidentPoint,
    riskDraftPoint, setRiskDraftPoint,
    showRiskModal, setShowRiskModal,
    savingRiskArea, setSavingRiskArea,
    riskError, setRiskError,
    riskSuccess, setRiskSuccess,
    riskForm, setRiskForm,
    demarcations, setDemarcations,
    demarcationDraftPoint, setDemarcationDraftPoint,
    showDemarcationModal, setShowDemarcationModal,
    savingDemarcation,
    demarcationError,
    demarcationSuccess,
    demarcationForm, setDemarcationForm,
    sidebarTab,
    mapActionMode, setMapActionMode,
    mapQuickMenu, setMapQuickMenu,
    lastMapClick, setLastMapClick,
    supportPoints, setSupportPoints,
    donationForm, setDonationForm,
    donationTasks, setDonationTasks,
    splatForm, setSplatForm,
    splatUploading,
    splatError,
    splatPreview, setSplatPreview,
    catastropheForm, setCatastropheForm,
    catastropheEventForm, setCatastropheEventForm,
    catastrophes, setCatastrophes,
    selectedCatastropheId, setSelectedCatastropheId,
    mapOverlayRef,
    floatingPanelPositions, setFloatingPanelPositions,
    dockedPanels, setDockedPanels,
    mapMode, setMapMode,
    tacticalMapEnabled,
    activeCatastrophe,
    loadNews,
    loadAttentionAlerts,
    loadMissingPeople,
    loadClimakiContext,
    loadHotspots,
    handleUpload,
    handleMissingSubmit,
    onRunFlow,
    handleRiskAreaSubmit,
    handleDemarcationSubmit,
    handleSplatUpload
  };
}
