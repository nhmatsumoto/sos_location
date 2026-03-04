import { useState, useEffect, useMemo, useRef } from 'react';
import type { FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import type { 
  Hotspot, NewsUpdate, MissingPerson, AttentionAlert, SupportPoint, 
  DonationTask, Catastrophe, FlowSimulationResponse, 
  ClimakiSnapshot, FloatingPanelId, FloatingPanelPosition, SelectedPanel 
} from '../types';
import { 
  initialFormState, initialMissingForm, initialRiskForm, initialDonationForm, 
  initialSplatForm, initialCatastropheForm, initialCatastropheEventForm, 
  initialFlowForm, LOCAL_WEEKLY_RAIN_NEWS, ENABLE_SIMULATION
} from '../constants';
import { resolveApiUrl } from '../lib/apiBaseUrl';
import { frontendLogger } from '../lib/logger';

const tryParseJson = async <T,>(response: Response): Promise<T | null> => {
  const payloadText = await response.text();
  if (!payloadText) return null;
  try {
    return JSON.parse(payloadText) as T;
  } catch {
    return null;
  }
};

export function useOperationalState() {
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [newsUpdates, setNewsUpdates] = useState<NewsUpdate[]>([]);
  const [missingPeople, setMissingPeople] = useState<MissingPerson[]>([]);
  const [attentionAlerts, setAttentionAlerts] = useState<AttentionAlert[]>([]);
  const [flowForm, setFlowForm] = useState(initialFlowForm);
  const [flowResult, setFlowResult] = useState<FlowSimulationResponse | null>(null);
  const [flowError, setFlowError] = useState('');
  const [climakiSnapshot, setClimakiSnapshot] = useState<ClimakiSnapshot | null>(null);
  const [loadingClimaki, setLoadingClimaki] = useState(true);
  const [climakiError, setClimakiError] = useState('');

  const [loading, setLoading] = useState(true);
  const [loadingNews, setLoadingNews] = useState(true);
  const [selectedNewsCity, setSelectedNewsCity] = useState<'Todas' | 'Ubá' | 'Juiz de Fora' | 'Matias Barbosa'>('Todas');
  const [loadingMissing, setLoadingMissing] = useState(true);
  const [runningFlow, setRunningFlow] = useState(false);

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
  const [splatUploading, setSplatUploading] = useState(false);
  const [splatError, setSplatError] = useState('');
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
    fetch(resolveApiUrl('/api/news-updates'))
      .then((res) => {
        if (!res.ok) throw new Error('endpoint unavailable');
        return res.json();
      })
      .then((data: NewsUpdate[]) => {
        const validNews = Array.isArray(data) ? data : [];
        setNewsUpdates(validNews.length ? validNews : LOCAL_WEEKLY_RAIN_NEWS);
      })
      .catch(() => setNewsUpdates(LOCAL_WEEKLY_RAIN_NEWS))
      .finally(() => setLoadingNews(false));
  };

  const loadAttentionAlerts = () => {
    fetch(resolveApiUrl('/api/attention-alerts'))
      .then((res) => res.json())
      .then((data: AttentionAlert[]) => setAttentionAlerts(data.slice(0, 6)))
      .catch(() => undefined);
  };

  const loadMissingPeople = () => {
    setLoadingMissing(true);
    fetch(resolveApiUrl('/api/missing-persons'))
      .then((res) => res.json())
      .then((data: MissingPerson[]) => {
        setMissingPeople(data);
        setLoadingMissing(false);
      })
      .catch(() => setLoadingMissing(false));
  };

  const loadClimakiContext = () => {
    setLoadingClimaki(true);
    setClimakiError('');

    fetch(resolveApiUrl('/api/climate/integrations?lat=-21.1215&lng=-42.9427'))
      .then((res) => {
        if (!res.ok) throw new Error('Não foi possível consultar integrações climáticas agora.');
        return res.json();
      })
      .then((data) => {
        const summary = data?.summary ?? {};
        const rainLast24hMm = Number(summary?.rainfallMm24h) || 0;
        const rainLast72hMm = Math.round(rainLast24hMm * 1.8 * 10) / 10;
        const soilMoisturePercent = Number(summary?.relativeHumidityPercent) || 35;
        const temperatureC = Number(summary?.temperatureCelsius ?? summary?.temperatureC ?? 24);

        let saturationLevel: ClimakiSnapshot['saturationLevel'] = 'Baixa';
        let saturationRisk = 'Solo com capacidade de infiltração ainda relevante.';

        if (soilMoisturePercent >= 75 || rainLast72hMm >= 120) {
          saturationLevel = 'Crítica';
          saturationRisk = 'Solo próximo da saturação total; alto risco para escorregamentos e enxurradas.';
        } else if (soilMoisturePercent >= 60 || rainLast72hMm >= 80) {
          saturationLevel = 'Alta';
          saturationRisk = 'Solo bastante encharcado; reforçar monitoramento de encostas e drenagem.';
        } else if (soilMoisturePercent >= 45 || rainLast72hMm >= 40) {
          saturationLevel = 'Moderada';
          saturationRisk = 'Umidade moderada; atenção em caso de continuidade de chuva.';
        }

        setClimakiSnapshot({
          fetchedAtIso: data?.fetchedAtUtc ?? new Date().toISOString(),
          locationLabel: 'Ubá (MG) • integrações climáticas externas',
          temperatureC,
          rainLast24hMm,
          rainLast72hMm,
          soilMoisturePercent,
          saturationLevel,
          saturationRisk,
          providers: (data?.providers ?? []).map((provider: { provider?: string }) => provider.provider || 'Fonte externa'),
        });
      })
      .catch((error) => {
        setClimakiError(error instanceof Error ? error.message : 'Erro ao atualizar dados climáticos.');
      })
      .finally(() => setLoadingClimaki(false));
  };

  useEffect(() => {
    fetch(resolveApiUrl('/api/hotspots'))
      .then((res) => res.json())
      .then((data) => {
        setHotspots(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));

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
  }, []);

  const handleUpload = async (event: FormEvent<HTMLFormElement>) => {
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
        const response = await fetch(resolveApiUrl('/api/collapse-reports'), {
            method: 'POST',
            body: payload,
        });

        if (!response.ok) {
            const errorPayload = await response.json();
            throw new Error(errorPayload.error ?? 'Falha ao fazer upload do vídeo.');
        }

        setUploadSuccess('Upload recebido! O vídeo entrou na fila para gaussian-splatting.');
        setFormState(initialFormState);
    } catch (error) {
        frontendLogger.error('Falha no upload de vídeo', {
            message: error instanceof Error ? error.message : 'unknown',
        });
        setUploadError(error instanceof Error ? error.message : 'Erro inesperado no envio.');
    } finally {
        setUploading(false);
    }
  };

  const handleMissingSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMissingError('');
    setMissingSuccess('');
    setSavingMissing(true);

    try {
        const response = await fetch(resolveApiUrl('/api/missing-persons'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                personName: missingForm.personName,
                age: missingForm.age ? Number(missingForm.age) : null,
                city: missingForm.city,
                lastSeenLocation: missingForm.lastSeenLocation,
                physicalDescription: missingForm.physicalDescription,
                additionalInfo: missingForm.additionalInfo,
                contactName: missingForm.contactName,
                contactPhone: missingForm.contactPhone,
            }),
        });

        if (!response.ok) {
            const errorPayload = await response.json();
            throw new Error(errorPayload.error ?? 'Falha ao cadastrar desaparecido.');
        }

        setMissingSuccess('Cadastro realizado com sucesso.');
        setMissingForm(initialMissingForm);
        loadMissingPeople();
    } catch (error) {
        frontendLogger.error('Falha no cadastro de pessoa desaparecida', {
            message: error instanceof Error ? error.message : 'unknown',
        });
        setMissingError(error instanceof Error ? error.message : 'Erro inesperado no cadastro.');
    } finally {
        setSavingMissing(false);
    }
  };

  const handleRunFlow = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFlowError('');

    if (!ENABLE_SIMULATION) {
        setFlowResult(null);
        setFlowError('Simulações estão desabilitadas no momento. Priorize marcações de resgate e risco no mapa.');
        return;
    }

    setRunningFlow(true);

    const scenarioConfig: Record<string, { steps: number; gridSize: number; cellSizeMeters: number; manningCoefficient: number; infiltrationRate: number; volumeFactor: number; label: string }> = {
        encosta: { steps: 130, gridSize: 44, cellSizeMeters: 20, manningCoefficient: 0.04, infiltrationRate: 0.0015, volumeFactor: 0.055, label: 'Encosta crítica' },
        urbano: { steps: 110, gridSize: 38, cellSizeMeters: 22, manningCoefficient: 0.03, infiltrationRate: 0.001, volumeFactor: 0.045, label: 'Bairro urbano' },
        rural: { steps: 95, gridSize: 34, cellSizeMeters: 26, manningCoefficient: 0.05, infiltrationRate: 0.003, volumeFactor: 0.038, label: 'Área rural' },
    };

    const activeScenario = scenarioConfig[flowForm.scenario] || scenarioConfig.encosta;
    const rainfall = Number(flowForm.rainfallMmPerHour);

    const payload = {
        sourceLat: Number(flowForm.sourceLat),
        sourceLng: Number(flowForm.sourceLng),
        rainfallMmPerHour: rainfall,
        initialVolume: Math.max(1.8, Number((rainfall * activeScenario.volumeFactor).toFixed(2))),
        steps: activeScenario.steps,
        gridSize: activeScenario.gridSize,
        cellSizeMeters: activeScenario.cellSizeMeters,
        manningCoefficient: activeScenario.manningCoefficient,
        infiltrationRate: activeScenario.infiltrationRate,
    };

    try {
        const response = await fetch(resolveApiUrl('/api/simulation/easy'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorPayload = await tryParseJson<{ error?: string }>(response);
            throw new Error(errorPayload?.error ?? `Falha na simulação (HTTP ${response.status}).`);
        }

        const data = await tryParseJson<FlowSimulationResponse & { flowSimulation?: FlowSimulationResponse }>(response);
        const flowData = data?.flowSimulation ?? data;
        if (!flowData) {
            throw new Error('Resposta inválida da simulação hidrodinâmica.');
        }

        setFlowResult(flowData);
        setFlowError(`Cenário aplicado: ${activeScenario.label}. Ajuste a chuva e rode novamente para comparar.`);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro inesperado na simulação.';
        frontendLogger.error('Falha ao executar simulação de fluxo', { message });
        setFlowError(message);
    } finally {
        setRunningFlow(false);
    }
  };

  const handleRiskAreaSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!riskDraftPoint) {
        setRiskError('Selecione um ponto de risco no mapa antes de salvar.');
        return;
    }

    setSavingRiskArea(true);
    setRiskError('');
    setRiskSuccess('');

    try {
        const response = await fetch(resolveApiUrl('/api/attention-alerts'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: riskForm.title,
                message: riskForm.message,
                severity: riskForm.severity,
                lat: riskDraftPoint.lat,
                lng: riskDraftPoint.lng,
                radiusMeters: Number(riskForm.radiusMeters) || 350,
            }),
        });

        if (!response.ok) {
            const errorPayload = await tryParseJson<{ error?: string }>(response);
            throw new Error(errorPayload?.error ?? 'Não foi possível salvar a área de risco.');
        }

        await loadAttentionAlerts();

        if (riskForm.addMissingPerson && riskForm.personName && riskForm.contactName && riskForm.contactPhone) {
            try {
                await fetch(resolveApiUrl('/api/missing-persons'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        personName: riskForm.personName,
                        age: null,
                        city: riskForm.city,
                        lastSeenLocation: `Área marcada ${riskDraftPoint.lat.toFixed(5)}, ${riskDraftPoint.lng.toFixed(5)}`,
                        physicalDescription: 'Registrado via marcação de área de risco no mapa.',
                        additionalInfo: riskForm.additionalInfo,
                        contactName: riskForm.contactName,
                        contactPhone: riskForm.contactPhone,
                    }),
                });
                loadMissingPeople();
            } catch {
                // Ignore failure
            }
        }

        setRiskSuccess('Área de risco registrada com sucesso.');
        setShowRiskModal(false);
        setRiskForm(initialRiskForm);
        setRiskDraftPoint(null);
    } catch (error) {
        frontendLogger.error('Falha ao registrar área de risco', {
            message: error instanceof Error ? error.message : 'unknown',
        });
        setRiskError(error instanceof Error ? error.message : 'Erro ao registrar área de risco.');
    } finally {
        setSavingRiskArea(false);
    }
  };

  const handleSplatUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSplatError('');

    if (!splatForm.video) {
        setSplatError('Selecione um vídeo para gerar a cena 3D com gaussian splatting.');
        return;
    }

    setSplatUploading(true);
    try {
        const payload = new FormData();
        payload.append('latitude', splatForm.latitude);
        payload.append('longitude', splatForm.longitude);
        payload.append('video', splatForm.video);

        const response = await fetch(resolveApiUrl('/api/splat/convert'), {
            method: 'POST',
            body: payload,
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data?.error ?? 'Falha ao converter vídeo para .splat.');
        }

        setSplatPreview({
            splatUrl: data?.splatUrl ? resolveApiUrl(data.splatUrl) : null,
            sourceVideoUrl: data?.storedVideoPath,
        });
        setSplatForm((prev) => ({ ...prev, video: null }));
        setSelectedPanel({ mode: 'splat', label: 'Render 3D (gaussian-splatting)' });
        setIsPanelFullscreen(true);
    } catch (error) {
        frontendLogger.error('Falha no pipeline de gaussian splatting', {
            message: error instanceof Error ? error.message : 'unknown',
        });
        setSplatError(error instanceof Error ? error.message : 'Erro no pipeline gaussian-splatting.');
    } finally {
        setSplatUploading(false);
    }
  };

  return {
    hotspots, setHotspots,
    newsUpdates, setNewsUpdates,
    missingPeople, setMissingPeople,
    attentionAlerts, setAttentionAlerts,
    flowForm, setFlowForm,
    flowResult, setFlowResult,
    flowError, setFlowError,
    climakiSnapshot, setClimakiSnapshot,
    loadingClimaki, setLoadingClimaki,
    climakiError, setClimakiError,
    loading, setLoading,
    loadingNews, setLoadingNews,
    selectedNewsCity, setSelectedNewsCity,
    loadingMissing, setLoadingMissing,
    runningFlow, setRunningFlow,
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
    sidebarTab,
    mapActionMode, setMapActionMode,
    mapQuickMenu, setMapQuickMenu,
    lastMapClick, setLastMapClick,
    supportPoints, setSupportPoints,
    donationForm, setDonationForm,
    donationTasks, setDonationTasks,
    splatForm, setSplatForm,
    splatUploading, setSplatUploading,
    splatError, setSplatError,
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
    handleUpload,
    handleMissingSubmit,
    handleRunFlow,
    handleRiskAreaSubmit,
    handleSplatUpload
  };
}
