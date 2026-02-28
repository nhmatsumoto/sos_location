import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, LayersControl, Polyline, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import {
  AlertTriangle,
  MapPin,
  Waves,
  ShieldAlert,
  Activity,
  CheckCircle2,
  X,
  ExternalLink,
  Camera,
  Upload,
  Smartphone,
  Maximize2,
  Minimize2,
  Newspaper,
  Users,
  Play,
  Droplets,
  Siren,
} from 'lucide-react';
const LandslideSimulation = lazy(() => import('./LandslideSimulation'));
const PostDisasterSplat = lazy(() => import('./PostDisasterSplat'));

const configuredApiBase = ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '').replace(/\/$/, '');

const inferApiBaseUrl = () => {
  if (configuredApiBase) return configuredApiBase;
  if (typeof window === 'undefined') return '';

  const { protocol, hostname, port } = window.location;
  if (port === '8080') {
    return `${protocol}//${hostname}:8001`;
  }

  return '';
};

const API_BASE_URL = inferApiBaseUrl();
const resolveApiUrl = (path: string) => (API_BASE_URL ? `${API_BASE_URL}${path}` : path);

const LOCAL_WEEKLY_RAIN_NEWS: NewsUpdate[] = [
  {
    id: 'news-uba-1',
    city: 'Ubá',
    title: 'Defesa Civil reforça alerta de chuva forte em bairros ribeirinhos de Ubá',
    source: 'Boletim Regional MG',
    url: 'https://exemplo.local/noticias/uba-alerta-chuva-forte',
    publishedAtUtc: new Date(Date.now() - (1 * 24 * 60 * 60 * 1000)).toISOString(),
  },
  {
    id: 'news-uba-2',
    city: 'Ubá',
    title: 'Acumulado de chuva da semana eleva atenção para enxurradas no centro de Ubá',
    source: 'Radar da Chuva Zona da Mata',
    url: 'https://exemplo.local/noticias/uba-acumulado-semana',
    publishedAtUtc: new Date(Date.now() - (3 * 24 * 60 * 60 * 1000)).toISOString(),
  },
  {
    id: 'news-jf-1',
    city: 'Juiz de Fora',
    title: 'Juiz de Fora registra pontos de alagamento após chuva intensa no fim da tarde',
    source: 'Painel Metropolitano JF',
    url: 'https://exemplo.local/noticias/jf-alagamento-chuva',
    publishedAtUtc: new Date(Date.now() - (2 * 24 * 60 * 60 * 1000)).toISOString(),
  },
  {
    id: 'news-jf-2',
    city: 'Juiz de Fora',
    title: 'Nova frente de chuva mantém risco hidrológico moderado em Juiz de Fora',
    source: 'Tempo e Cidade',
    url: 'https://exemplo.local/noticias/jf-frente-de-chuva',
    publishedAtUtc: new Date(Date.now() - (5 * 24 * 60 * 60 * 1000)).toISOString(),
  },
  {
    id: 'news-mb-1',
    city: 'Matias Barbosa',
    title: 'Matias Barbosa entra em observação após sequência de chuvas na última semana',
    source: 'Monitor Mata Sul',
    url: 'https://exemplo.local/noticias/matias-barbosa-sequencia-chuvas',
    publishedAtUtc: new Date(Date.now() - (1.5 * 24 * 60 * 60 * 1000)).toISOString(),
  },
  {
    id: 'news-mb-2',
    city: 'Matias Barbosa',
    title: 'Defesa local atualiza pontos críticos de drenagem devido à chuva acumulada',
    source: 'Informe Municipal',
    url: 'https://exemplo.local/noticias/matias-drenagem-chuva',
    publishedAtUtc: new Date(Date.now() - (6 * 24 * 60 * 60 * 1000)).toISOString(),
  },
];



const iconLandslide = new L.Icon({
  iconUrl: 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-orange.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
const iconFlood = new L.Icon({
  iconUrl: 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-blue.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
const iconCritical = new L.Icon({
  iconUrl: 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-red.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface Hotspot {
  id: string;
  lat: number;
  lng: number;
  score: number;
  confidence: number;
  type: string;
  riskFactors: string[];
  humanExposure: string;
  estimatedAffected: number;
  urgency: string;
}


interface NewsUpdate {
  id: string;
  city: string;
  title: string;
  source: string;
  url: string;
  publishedAtUtc: string;
}

interface MissingPerson {
  id: string;
  personName: string;
  age?: number | null;
  city: string;
  lastSeenLocation: string;
  physicalDescription: string;
  additionalInfo: string;
  contactName: string;
  contactPhone: string;
  reportedAtUtc: string;
}


interface AttentionAlert {
  id: string;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical' | string;
  lat: number;
  lng: number;
  radiusMeters: number;
  createdAtUtc: string;
}

interface FlowCell {
  lat: number;
  lng: number;
  depth: number;
  terrain: number;
  velocity: number;
}

interface FlowPathPoint {
  lat: number;
  lng: number;
  step: number;
  depth: number;
}

interface FlowSimulationResponse {
  generatedAtUtc: string;
  floodedCells: FlowCell[];
  mainPath: FlowPathPoint[];
  maxDepth: number;
  estimatedAffectedAreaM2: number;
  disclaimer: string;
}

const tryParseJson = async <T,>(response: Response): Promise<T | null> => {
  const payloadText = await response.text();
  if (!payloadText) return null;

  try {
    return JSON.parse(payloadText) as T;
  } catch {
    return null;
  }
};

interface ClimakiSnapshot {
  fetchedAtIso: string;
  locationLabel: string;
  rainLast24hMm: number;
  rainLast72hMm: number;
  soilMoisturePercent: number;
  saturationLevel: 'Baixa' | 'Moderada' | 'Alta' | 'Crítica';
  saturationRisk: string;
}

const initialFormState = {
  locationName: '',
  latitude: '',
  longitude: '',
  description: '',
  reporterName: '',
  reporterPhone: '',
  video: null as File | null,
};

const initialMissingForm = {
  personName: '',
  age: '',
  city: 'Ubá',
  lastSeenLocation: '',
  physicalDescription: '',
  additionalInfo: '',
  contactName: '',
  contactPhone: '',
};



const initialRiskForm = {
  title: 'Nova área de risco mapeada',
  message: 'Possível risco identificado em campo. Avaliar prioridade.',
  severity: 'high',
  radiusMeters: '350',
  addMissingPerson: false,
  personName: '',
  city: 'Ubá',
  contactName: '',
  contactPhone: '',
  additionalInfo: '',
};

interface SelectedPanel {
  hotspot?: Hotspot;
  mode: 'sim' | 'splat';
  sourceLat?: number;
  sourceLng?: number;
  label?: string;
}

function MapClickSelector({ enabled, onSelect }: { enabled: boolean; onSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(event) {
      if (!enabled) return;
      onSelect(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
}


interface FloatingPanelPosition {
  top: number;
  left: number;
}

type FloatingPanelId = 'global' | 'terrain';

const FLOATING_PANEL_WIDTHS: Record<FloatingPanelId, number> = {
  global: 288,
  terrain: 320,
};

interface DraggablePanelProps {
  title: string;
  panelId: FloatingPanelId;
  position: FloatingPanelPosition;
  docked: boolean;
  onStartDrag: (panelId: FloatingPanelId, event: ReactPointerEvent<HTMLDivElement>) => void;
  onToggleDock: (panelId: FloatingPanelId) => void;
  children: ReactNode;
  widthClass?: string;
}

function DraggablePanel({
  title,
  panelId,
  position,
  docked,
  onStartDrag,
  onToggleDock,
  children,
  widthClass = 'w-72',
}: DraggablePanelProps) {
  return (
    <div
      className={`absolute bg-slate-900/85 backdrop-blur-md border border-slate-700 shadow-xl rounded-xl z-[410] text-sm ${widthClass} ${docked ? 'opacity-70' : ''}`}
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
    >
      <div
        className="px-3 py-2 border-b border-slate-700 bg-slate-800/70 rounded-t-xl flex items-center justify-between cursor-move touch-none"
        onPointerDown={(event) => onStartDrag(panelId, event)}
      >
        <h4 className="font-bold text-white uppercase tracking-wide text-xs">{title}</h4>
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => onToggleDock(panelId)}
          className="text-[10px] px-2 py-1 rounded border border-slate-600 text-slate-200 hover:text-white hover:border-cyan-400"
        >
          {docked ? 'Soltar' : 'Integrar'}
        </button>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

const initialFlowForm = {
  sourceLat: '-21.1215',
  sourceLng: '-42.9427',
  rainfallMmPerHour: '70',
  scenario: 'encosta' as 'encosta' | 'urbano' | 'rural',
};

export default function App() {
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
  const [isSelectingIncidentPoint, setIsSelectingIncidentPoint] = useState(false);
  const [isSelectingRiskArea, setIsSelectingRiskArea] = useState(false);
  const [selectedIncidentPoint, setSelectedIncidentPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [riskDraftPoint, setRiskDraftPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [savingRiskArea, setSavingRiskArea] = useState(false);
  const [riskError, setRiskError] = useState('');
  const [riskSuccess, setRiskSuccess] = useState('');
  const [riskForm, setRiskForm] = useState(initialRiskForm);
  const mapOverlayRef = useRef<HTMLDivElement | null>(null);
  const [floatingPanelPositions, setFloatingPanelPositions] = useState<Record<FloatingPanelId, FloatingPanelPosition>>({
    global: { top: 16, left: 16 },
    terrain: { top: 16, left: 320 },
  });
  const [dockedPanels, setDockedPanels] = useState<Record<FloatingPanelId, boolean>>({
    global: false,
    terrain: false,
  });
  const [dragState, setDragState] = useState<{
    panelId: FloatingPanelId;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const flowPathLatLng = useMemo(() => flowResult?.mainPath.map((point) => [point.lat, point.lng] as [number, number]) ?? [], [flowResult]);

  const clampPanelPosition = (panelId: FloatingPanelId, nextLeft: number, nextTop: number) => {
    const mapRect = mapOverlayRef.current?.getBoundingClientRect();
    if (!mapRect) return { left: Math.max(8, nextLeft), top: Math.max(8, nextTop) };

    const maxLeft = Math.max(8, mapRect.width - FLOATING_PANEL_WIDTHS[panelId] - 8);
    const maxTop = Math.max(8, mapRect.height - 120);

    return {
      left: Math.min(maxLeft, Math.max(8, nextLeft)),
      top: Math.min(maxTop, Math.max(8, nextTop)),
    };
  };

  useEffect(() => {
    if (!dragState) return;

    const handlePointerMove = (event: PointerEvent) => {
      const mapRect = mapOverlayRef.current?.getBoundingClientRect();
      if (!mapRect) return;

      const rawLeft = event.clientX - mapRect.left - dragState.offsetX;
      const rawTop = event.clientY - mapRect.top - dragState.offsetY;
      const next = clampPanelPosition(dragState.panelId, rawLeft, rawTop);

      setFloatingPanelPositions((prev) => ({
        ...prev,
        [dragState.panelId]: next,
      }));
    };

    const handlePointerUp = () => {
      setDragState(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragState]);

  useEffect(() => {
    const handleResize = () => {
      setFloatingPanelPositions((prev) => ({
        global: clampPanelPosition('global', prev.global.left, prev.global.top),
        terrain: clampPanelPosition('terrain', prev.terrain.left, prev.terrain.top),
      }));
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const startPanelDrag = (panelId: FloatingPanelId, event: ReactPointerEvent<HTMLDivElement>) => {
    if (dockedPanels[panelId]) return;

    const mapRect = mapOverlayRef.current?.getBoundingClientRect();
    if (!mapRect) return;

    const current = floatingPanelPositions[panelId];
    setDragState({
      panelId,
      offsetX: event.clientX - mapRect.left - current.left,
      offsetY: event.clientY - mapRect.top - current.top,
    });
  };

  const togglePanelDock = (panelId: FloatingPanelId) => {
    setDockedPanels((prev) => ({
      ...prev,
      [panelId]: !prev[panelId],
    }));
  };


  const filteredNewsUpdates = useMemo(() => {
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const rainKeywords = ['chuva', 'chuvas', 'alagamento', 'enxurrada', 'temporal', 'precipitação'];

    return newsUpdates
      .filter((news) => {
        const publishedMs = Date.parse(news.publishedAtUtc);
        const isWithinWeek = Number.isFinite(publishedMs) ? publishedMs >= oneWeekAgo : true;
        const text = `${news.title} ${news.source}`.toLowerCase();
        const mentionsRain = rainKeywords.some((keyword) => text.includes(keyword));
        const cityMatches = selectedNewsCity === 'Todas' || news.city === selectedNewsCity;
        return isWithinWeek && mentionsRain && cityMatches;
      })
      .sort((a, b) => Date.parse(b.publishedAtUtc) - Date.parse(a.publishedAtUtc));
  }, [newsUpdates, selectedNewsCity]);


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

    const params = new URLSearchParams({
      latitude: '-21.1215',
      longitude: '-42.9427',
      timezone: 'America/Sao_Paulo',
      hourly: 'precipitation,soil_moisture_0_to_1cm',
      forecast_days: '1',
      past_days: '3',
    });

    fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error('Não foi possível consultar dados climáticos agora.');
        return res.json();
      })
      .then((data) => {
        const precipitation = data?.hourly?.precipitation as number[] | undefined;
        const soilMoisture = data?.hourly?.soil_moisture_0_to_1cm as number[] | undefined;

        if (!precipitation?.length || !soilMoisture?.length) {
          throw new Error('Dados de chuva/umidade indisponíveis para este ponto.');
        }

        const rainLast24hMm = precipitation.slice(-24).reduce((sum, value) => sum + (Number(value) || 0), 0);
        const rainLast72hMm = precipitation.slice(-72).reduce((sum, value) => sum + (Number(value) || 0), 0);
        const soilMoisturePercent = (Number(soilMoisture.at(-1)) || 0) * 100;

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
          fetchedAtIso: new Date().toISOString(),
          locationLabel: 'Ubá (MG) • análise local',
          rainLast24hMm,
          rainLast72hMm,
          soilMoisturePercent,
          saturationLevel,
          saturationRisk,
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

    const interval = setInterval(() => {
      loadNews();
      loadAttentionAlerts();
      loadClimakiContext();
    }, 120000);
    return () => clearInterval(interval);
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
      setMissingError(error instanceof Error ? error.message : 'Erro inesperado no cadastro.');
    } finally {
      setSavingMissing(false);
    }
  };

  const handleRunFlow = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFlowError('');
    setRunningFlow(true);

    const scenarioConfig: Record<typeof flowForm.scenario, { steps: number; gridSize: number; cellSizeMeters: number; manningCoefficient: number; infiltrationRate: number; volumeFactor: number; label: string }> = {
      encosta: { steps: 130, gridSize: 44, cellSizeMeters: 20, manningCoefficient: 0.04, infiltrationRate: 0.0015, volumeFactor: 0.055, label: 'Encosta crítica' },
      urbano: { steps: 110, gridSize: 38, cellSizeMeters: 22, manningCoefficient: 0.03, infiltrationRate: 0.001, volumeFactor: 0.045, label: 'Bairro urbano' },
      rural: { steps: 95, gridSize: 34, cellSizeMeters: 26, manningCoefficient: 0.05, infiltrationRate: 0.003, volumeFactor: 0.038, label: 'Área rural' },
    };

    const activeScenario = scenarioConfig[flowForm.scenario];
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

    const endpoints = Array.from(new Set([
      resolveApiUrl('/api/location/flow-simulation'),
      '/api/location/flow-simulation',
    ]));

    try {
      let lastError = '';

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            const errorPayload = await tryParseJson<{ error?: string }>(response);
            throw new Error(errorPayload?.error ?? `Falha na simulação (HTTP ${response.status}).`);
          }

          const data = await tryParseJson<FlowSimulationResponse>(response);
          if (!data) {
            throw new Error('Resposta inválida da simulação hidrodinâmica.');
          }

          setFlowResult(data);
          setFlowError(`Cenário aplicado: ${activeScenario.label}. Ajuste a chuva e rode novamente para comparar.`);
          setRunningFlow(false);
          return;
        } catch (error) {
          lastError = error instanceof Error ? error.message : 'Erro inesperado na simulação.';
        }
      }

      throw new Error(lastError || 'Não foi possível conectar ao serviço de simulação.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro inesperado na simulação.';
      setFlowError(
        message.includes('NetworkError') || message.includes('Failed to fetch')
          ? 'Não conseguimos alcançar a API de enchente. Se estiver em docker, confirme API em http://localhost:8001.'
          : message,
      );
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
          // Mantém sucesso da área de risco mesmo se cadastro de desaparecido falhar.
        }
      }

      setRiskSuccess('Área de risco registrada com sucesso.');
      setShowRiskModal(false);
      setRiskForm(initialRiskForm);
      setRiskDraftPoint(null);
      setIsSelectingRiskArea(false);
    } catch (error) {
      setRiskError(error instanceof Error ? error.message : 'Erro ao registrar área de risco.');
    } finally {
      setSavingRiskArea(false);
    }
  };

  const openPanel = (panel: SelectedPanel) => {
    setSelectedPanel(panel);
    setIsPanelFullscreen(true);
  };
  return (
    <>
      <div className="flex h-screen w-full bg-slate-900 text-slate-200 font-sans overflow-hidden">
        <div className="w-1/3 h-full border-r border-slate-700 bg-slate-800 flex flex-col z-20 shadow-2xl">
          <div className="p-6 border-b border-slate-700 bg-slate-800/80 backdrop-blur-md space-y-2">
            <div className="flex items-center gap-3 mb-2">
              <ShieldAlert className="text-red-500 w-8 h-8" />
              <h1 className="text-2xl font-bold tracking-tight text-white">Centro de Comando</h1>
            </div>
            <p className="text-sm text-slate-400">Triagem tática: onde agir primeiro para maximizar vidas salvas.</p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <button
                onClick={() => {
                  setShowUploadModal(true);
                  setUploadError('');
                  setUploadSuccess('');
                }}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-md text-sm font-semibold transition-colors"
              >
                <Upload className="w-4 h-4" /> Enviar vídeo
              </button>
              <button
                onClick={() => {
                  setShowMissingModal(true);
                  setMissingError('');
                  setMissingSuccess('');
                }}
                className="flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-3 py-2 rounded-md text-sm font-semibold transition-colors"
              >
                <Users className="w-4 h-4" /> Cadastrar desaparecido
              </button>
              <button
                onClick={() => {
                  setIsSelectingIncidentPoint((prev) => !prev);
                }}
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-semibold transition-colors ${isSelectingIncidentPoint ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-100'}`}
              >
                <MapPin className="w-4 h-4" /> {isSelectingIncidentPoint ? 'Clique no mapa...' : 'Marcar ponto (1 clique)'}
              </button>

              <button
                onClick={() => {
                  setIsSelectingRiskArea((prev) => !prev);
                  setRiskError('');
                  setRiskSuccess('');
                }}
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-semibold transition-colors ${isSelectingRiskArea ? 'bg-rose-600 hover:bg-rose-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-100'}`}
              >
                <Siren className="w-4 h-4" /> {isSelectingRiskArea ? 'Clique no risco...' : 'Marcar área de risco'}
              </button>
            </div>
          </div>

          <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/50">
            <h2 className="text-xs uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-2">
              <Droplets className="w-3 h-3" /> Simulação de Enchente (modo fácil)
            </h2>
            <p className="text-[11px] text-slate-400 mb-2">Escolha um cenário, ajuste a chuva e clique em simular.</p>
            <form className="space-y-2" onSubmit={handleRunFlow}>
              <div className="grid grid-cols-2 gap-2">
                <input value={flowForm.sourceLat} onChange={(e) => setFlowForm((prev) => ({ ...prev, sourceLat: e.target.value }))} className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs" placeholder="Latitude" />
                <input value={flowForm.sourceLng} onChange={(e) => setFlowForm((prev) => ({ ...prev, sourceLng: e.target.value }))} className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs" placeholder="Longitude" />
              </div>
              {selectedIncidentPoint && (
                <button
                  type="button"
                  onClick={() => setFlowForm((prev) => ({ ...prev, sourceLat: selectedIncidentPoint.lat.toFixed(5), sourceLng: selectedIncidentPoint.lng.toFixed(5) }))}
                  className="w-full text-xs px-2 py-1 rounded border border-slate-600 text-slate-200 hover:border-cyan-400"
                >
                  Usar ponto marcado no mapa
                </button>
              )}
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[11px] text-slate-300 space-y-1">
                  <span>Cenário</span>
                  <select value={flowForm.scenario} onChange={(e) => setFlowForm((prev) => ({ ...prev, scenario: e.target.value as typeof flowForm.scenario }))} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs">
                    <option value="encosta">Encosta crítica</option>
                    <option value="urbano">Bairro urbano</option>
                    <option value="rural">Área rural</option>
                  </select>
                </label>
                <label className="text-[11px] text-slate-300 space-y-1">
                  <span>Chuva (mm/h)</span>
                  <input type="range" min={20} max={140} step={5} value={flowForm.rainfallMmPerHour} onChange={(e) => setFlowForm((prev) => ({ ...prev, rainfallMmPerHour: e.target.value }))} className="w-full" />
                  <span className="text-cyan-300 font-semibold">{flowForm.rainfallMmPerHour} mm/h</span>
                </label>
              </div>
              <button type="submit" disabled={runningFlow} className="w-full flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-70 text-white px-3 py-1.5 rounded text-xs font-semibold">
                <Play className="w-3 h-3" /> {runningFlow ? 'Simulando...' : 'Simular área de alagamento'}
              </button>
              {flowError && <p className="text-xs text-amber-300">{flowError}</p>}
              {flowResult && (
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-slate-900/70 border border-slate-700 rounded px-2 py-1">
                    <p className="text-slate-400">Profundidade máx.</p>
                    <p className="text-cyan-300 font-semibold">{flowResult.maxDepth.toFixed(2)} m</p>
                  </div>
                  <div className="bg-slate-900/70 border border-slate-700 rounded px-2 py-1">
                    <p className="text-slate-400">Área estimada</p>
                    <p className="text-cyan-300 font-semibold">{Math.round(flowResult.estimatedAffectedAreaM2)} m²</p>
                  </div>
                </div>
              )}
            </form>
          </div>

          <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/50">
            <h2 className="text-xs uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-2"><Newspaper className="w-3 h-3" />Aba notícias • Chuvas (últimos 7 dias)</h2>
            <div className="grid grid-cols-2 gap-1 mb-2 text-[11px]">
              {(['Todas', 'Ubá', 'Juiz de Fora', 'Matias Barbosa'] as const).map((cityTab) => (
                <button
                  key={cityTab}
                  type="button"
                  onClick={() => setSelectedNewsCity(cityTab)}
                  className={`px-2 py-1 rounded border transition-colors ${selectedNewsCity === cityTab ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-900/60 border-slate-700 text-slate-300 hover:bg-slate-700/60'}`}
                >
                  {cityTab}
                </button>
              ))}
            </div>
            {loadingNews ? <p className="text-xs text-slate-500">Buscando atualizações...</p> : (
              filteredNewsUpdates.length ? (
                <ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {filteredNewsUpdates.map((news) => (
                    <li key={news.id} className="text-xs bg-slate-900/60 border border-slate-700 rounded-md p-2">
                      <p className="font-semibold text-white">{news.city}: {news.title}</p>
                      <p className="text-slate-400">{new Date(news.publishedAtUtc).toLocaleString('pt-BR')}</p>
                      <a href={news.url} target="_blank" rel="noreferrer" className="text-blue-300 hover:text-blue-200 underline">{news.source}</a>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-xs text-slate-500">Sem notícias de chuva para o filtro selecionado na última semana.</p>
            )}
          </div>

          <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/50">
            <h2 className="text-xs uppercase tracking-wider text-slate-400 mb-2">Pessoas desaparecidas</h2>
            {loadingMissing ? <p className="text-xs text-slate-500">Carregando cadastros...</p> : (
              <ul className="space-y-2 max-h-28 overflow-y-auto pr-1">
                {missingPeople.slice(0, 4).map((person) => (
                  <li key={person.id} className="text-xs bg-slate-900/60 border border-slate-700 rounded-md p-2">
                    <p className="font-semibold text-white">{person.personName} ({person.city})</p>
                    <p className="text-slate-400">Contato: {person.contactName} - {person.contactPhone}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {loading ? <div className="flex items-center justify-center h-full"><Activity className="w-8 h-8 text-blue-500 animate-spin" /></div> : hotspots.map((hs, i) => (
              <div key={hs.id} className={`rounded-xl p-4 border transition-all ${hs.score > 90 ? 'bg-red-950/40 border-red-500/50 hover:bg-red-900/40' : 'bg-slate-700/50 border-orange-500/30 hover:bg-slate-700'}`}>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${hs.score > 90 ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'}`}>{i + 1}</span>
                    <h3 className="font-bold text-lg">{hs.type === 'Flood' ? 'Enchente' : 'Deslizamento'}</h3>
                  </div>
                  <div className="bg-slate-900 px-2 py-1 rounded-md border border-slate-600"><span className="text-xs font-mono text-slate-300">Score: {hs.score.toFixed(1)}</span></div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div className="bg-slate-800 p-2 rounded border border-slate-700"><p className="text-slate-400 mb-0.5">Potencial Vítimas</p><p className="font-semibold text-white flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-yellow-500" /> {hs.estimatedAffected}</p></div>
                  <div className="bg-slate-800 p-2 rounded border border-slate-700"><p className="text-slate-400 mb-0.5">Confiança IA</p><p className="font-semibold text-white">{(hs.confidence * 100).toFixed(0)}%</p></div>
                </div>
                <ul className="text-sm space-y-1">{hs.riskFactors.map((r, idx) => <li key={idx} className="flex items-start gap-1.5 text-slate-300"><CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" /><span>{r}</span></li>)}</ul>
              </div>
            ))}
          </div>
        </div>

        <div ref={mapOverlayRef} className="w-2/3 h-full relative z-10">
          <MapContainer center={[-21.1215, -42.9427]} zoom={14} className="h-full w-full" zoomControl={false}>
            <LayersControl position="topright">
              <LayersControl.BaseLayer checked name="Mapa em relevo">
                <TileLayer attribution='Map data: &copy; OpenStreetMap contributors | Style: OpenTopoMap' url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png" />
              </LayersControl.BaseLayer>
              <LayersControl.BaseLayer name="Mapa escuro tático">
                <TileLayer attribution='&copy; <a href="https://carto.com/">CartoDB</a>' url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
              </LayersControl.BaseLayer>
            </LayersControl>

            <MapClickSelector
              enabled={isSelectingIncidentPoint}
              onSelect={(lat, lng) => {
                setSelectedIncidentPoint({ lat, lng });
                setIsSelectingIncidentPoint(false);
                openPanel({ mode: 'sim', sourceLat: lat, sourceLng: lng, label: 'Ponto manual' });
              }}
            />

            <MapClickSelector
              enabled={isSelectingRiskArea}
              onSelect={(lat, lng) => {
                setRiskDraftPoint({ lat, lng });
                setShowRiskModal(true);
                setRiskError('');
                setRiskSuccess('');
                setRiskForm((prev) => ({
                  ...prev,
                  message: `Risco reportado próximo a ${lat.toFixed(5)}, ${lng.toFixed(5)}.`,
                }));
              }}
            />

            {hotspots.map((hs, i) => (
              <Marker key={hs.id} position={[hs.lat, hs.lng]} icon={hs.score > 90 ? iconCritical : hs.type === 'Flood' ? iconFlood : iconLandslide}>
                <Popup className="custom-popup">
                  <div className="text-slate-900 font-sans">
                    <h3 className="font-bold text-lg mb-1 flex items-center gap-2">{hs.type === 'Flood' ? <Waves className="w-4 h-4 text-blue-500" /> : <MapPin className="w-4 h-4 text-orange-500" />}{hs.type}</h3>
                    <p className="text-sm font-semibold mb-2">Rank: #{i + 1} | Urgência: {hs.urgency}</p>
                    <div className="bg-slate-100 p-2 rounded text-xs mb-2"><strong>Pessoas Risco:</strong> {hs.estimatedAffected}<br /><strong>Exposição:</strong> {hs.humanExposure}</div>
                    {hs.type === 'Landslide' && (
                      <div className="flex flex-col gap-1 mt-1">
                        <button onClick={() => openPanel({ hotspot: hs, mode: 'sim', sourceLat: hs.lat, sourceLng: hs.lng })} className="w-full flex justify-center items-center gap-1 bg-orange-600 hover:bg-orange-700 text-white py-1.5 px-2 rounded text-xs font-bold transition-colors"><ExternalLink className="w-3 h-3" /> Ver Simulação 3D</button>
                        <button onClick={() => openPanel({ hotspot: hs, mode: 'splat' })} className="w-full flex justify-center items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white py-1.5 px-2 rounded text-xs font-bold transition-colors"><Camera className="w-3 h-3" /> Ver Drone Splatting</button>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}

            {selectedIncidentPoint && (
              <>
                <Marker position={[selectedIncidentPoint.lat, selectedIncidentPoint.lng]} icon={iconLandslide}>
                  <Popup className="custom-popup">
                    <div className="text-slate-900 text-xs">
                      <p><strong>Ponto selecionado:</strong> {selectedIncidentPoint.lat.toFixed(5)}, {selectedIncidentPoint.lng.toFixed(5)}</p>
                      <p><strong>Raio de simulação:</strong> 500m</p>
                    </div>
                  </Popup>
                </Marker>
                <Circle center={[selectedIncidentPoint.lat, selectedIncidentPoint.lng]} radius={500} pathOptions={{ color: '#f97316', fillColor: '#fb923c', fillOpacity: 0.12, weight: 1.5 }} />
              </>
            )}


            {attentionAlerts.map((alert) => (
              <Circle
                key={`alert-area-${alert.id}`}
                center={[alert.lat, alert.lng]}
                radius={Math.max(80, alert.radiusMeters)}
                pathOptions={{
                  color: alert.severity === 'critical' ? '#ef4444' : alert.severity === 'high' ? '#f97316' : '#facc15',
                  fillColor: alert.severity === 'critical' ? '#ef4444' : alert.severity === 'high' ? '#f97316' : '#facc15',
                  fillOpacity: 0.12,
                  weight: 1.5,
                }}
              >
                <Popup className="custom-popup">
                  <div className="text-slate-900 text-xs">
                    <p><strong>{alert.title}</strong></p>
                    <p>{alert.message}</p>
                    <p><strong>Raio:</strong> {alert.radiusMeters} m</p>
                  </div>
                </Popup>
              </Circle>
            ))}

            {flowResult?.floodedCells.map((cell, index) => (
              <CircleMarker
                key={`flow-${index}`}
                center={[cell.lat, cell.lng]}
                radius={Math.max(2, Math.min(8, cell.depth * 5))}
                pathOptions={{
                  color: cell.depth > 1.0 ? '#1d4ed8' : '#38bdf8',
                  fillColor: cell.depth > 1.0 ? '#1d4ed8' : '#38bdf8',
                  fillOpacity: Math.min(0.85, 0.2 + cell.depth * 0.25),
                  weight: 0.8,
                }}
              >
                <Popup className="custom-popup">
                  <div className="text-slate-900 text-xs">
                    <p><strong>Profundidade:</strong> {cell.depth.toFixed(2)} m</p>
                    <p><strong>Velocidade:</strong> {cell.velocity.toFixed(2)} m/s</p>
                    <p><strong>Cota terreno:</strong> {cell.terrain.toFixed(1)} m</p>
                  </div>
                </Popup>
              </CircleMarker>
            ))}

            {flowPathLatLng.length > 1 && (
              <Polyline positions={flowPathLatLng} pathOptions={{ color: '#06b6d4', weight: 3, opacity: 0.9, dashArray: '6 6' }} />
            )}
          </MapContainer>

          {dockedPanels.global || dockedPanels.terrain ? (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[420] bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2 shadow-xl flex items-center gap-2 text-xs">
              <span className="text-slate-300 uppercase tracking-wide">Barra flutuante</span>
              {dockedPanels.global && (
                <button
                  type="button"
                  onClick={() => togglePanelDock('global')}
                  className="px-2 py-1 rounded border border-slate-600 text-slate-100 hover:border-cyan-400"
                >
                  Status Global
                </button>
              )}
              {dockedPanels.terrain && (
                <button
                  type="button"
                  onClick={() => togglePanelDock('terrain')}
                  className="px-2 py-1 rounded border border-slate-600 text-slate-100 hover:border-cyan-400"
                >
                  Situação do Terreno
                </button>
              )}
            </div>
          ) : null}

          {!dockedPanels.global && (
            <DraggablePanel
              title="Status Global"
              panelId="global"
              position={floatingPanelPositions.global}
              docked={dockedPanels.global}
              onStartDrag={startPanelDrag}
              onToggleDock={togglePanelDock}
              widthClass="w-72"
            >
              <div className="flex justify-between items-center mb-1"><span className="text-slate-400">Total Hotspots:</span><span className="font-semibold">{hotspots.length}</span></div>
              <div className="flex justify-between items-center mb-1"><span className="text-slate-400">Pop. em Perigo:</span><span className="font-semibold text-yellow-500">{hotspots.reduce((a, b) => a + b.estimatedAffected, 0)}</span></div>
              <div className="flex justify-between items-center mb-1"><span className="text-slate-400">Desaparecidos:</span><span className="font-semibold text-amber-400">{missingPeople.length}</span></div>
              <div className="mt-2 border-t border-slate-700 pt-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-400 mb-1">Alertas de atenção</p>
                {attentionAlerts.length === 0 ? (
                  <p className="text-xs text-slate-500">Sem alertas no momento.</p>
                ) : (
                  <ul className="space-y-1 max-h-24 overflow-y-auto pr-1">
                    {attentionAlerts.slice(0, 3).map((alert) => (
                      <li key={alert.id} className="text-[11px] bg-slate-900/70 border border-slate-700 rounded px-2 py-1">
                        <p className="font-semibold text-white truncate">{alert.title}</p>
                        <p className="text-slate-400 truncate">{alert.message}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {flowResult && (
                <>
                  <div className="mt-2 border-t border-slate-700 pt-2 text-xs text-cyan-300">Flood-CFD (didático)</div>
                  <div className="flex justify-between items-center text-xs"><span className="text-slate-400">Prof. máxima:</span><span className="font-semibold text-cyan-300">{flowResult.maxDepth.toFixed(2)} m</span></div>
                  <div className="flex justify-between items-center text-xs"><span className="text-slate-400">Área estimada:</span><span className="font-semibold text-cyan-300">{Math.round(flowResult.estimatedAffectedAreaM2)} m²</span></div>
                </>
              )}
            </DraggablePanel>
          )}

          {!dockedPanels.terrain && (
            <DraggablePanel
              title="Situação do Terreno"
              panelId="terrain"
              position={floatingPanelPositions.terrain}
              docked={dockedPanels.terrain}
              onStartDrag={startPanelDrag}
              onToggleDock={togglePanelDock}
              widthClass="w-80"
            >
              <div className="flex items-center justify-end mb-2">
                <a href="https://climaki.com/" target="_blank" rel="noreferrer" className="text-cyan-300 hover:text-cyan-100" title="Abrir Climaki">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
              <p className="text-[11px] text-slate-400 mb-2">Referência visual do Climaki + séries meteorológicas recentes.</p>

              {loadingClimaki ? (
                <p className="text-xs text-slate-400">Consultando chuva e umidade do solo...</p>
              ) : climakiError ? (
                <p className="text-xs text-amber-300">{climakiError}</p>
              ) : climakiSnapshot ? (
                <>
                  <p className="text-[11px] text-slate-400 mb-2">{climakiSnapshot.locationLabel}</p>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <div className="bg-slate-950/70 border border-slate-700 rounded p-2">
                      <p className="text-[10px] text-slate-500">Chuva 24h</p>
                      <p className="font-semibold text-cyan-200">{climakiSnapshot.rainLast24hMm.toFixed(1)} mm</p>
                    </div>
                    <div className="bg-slate-950/70 border border-slate-700 rounded p-2">
                      <p className="text-[10px] text-slate-500">Chuva 72h</p>
                      <p className="font-semibold text-cyan-200">{climakiSnapshot.rainLast72hMm.toFixed(1)} mm</p>
                    </div>
                    <div className="bg-slate-950/70 border border-slate-700 rounded p-2">
                      <p className="text-[10px] text-slate-500">Umid. Solo</p>
                      <p className="font-semibold text-cyan-200">{climakiSnapshot.soilMoisturePercent.toFixed(0)}%</p>
                    </div>
                  </div>
                  <div className="bg-slate-950/70 border border-slate-700 rounded p-2">
                    <p className="font-semibold text-white">Saturação: <span className="text-cyan-200">{climakiSnapshot.saturationLevel}</span></p>
                    <p className="text-[11px] text-slate-300 mt-1">{climakiSnapshot.saturationRisk}</p>
                  </div>
                </>
              ) : null}
            </DraggablePanel>
          )}


          {selectedPanel && (
            <div className={`absolute z-50 bg-slate-900 shadow-2xl border border-slate-600 flex flex-col overflow-hidden animate-in fade-in ${isPanelFullscreen ? 'inset-0 rounded-none' : 'bottom-4 left-4 w-96 h-80 rounded-xl slide-in-from-bottom-4'}`}>
              <div className="flex justify-between items-center p-2 border-b border-slate-700 bg-slate-800">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1">{selectedPanel.mode === 'sim' ? <MapPin className="w-3 h-3 text-orange-500" /> : <Camera className="w-3 h-3 text-blue-500" />}{selectedPanel.mode === 'sim' ? 'Simulação' : 'Drone (Splat)'}: {selectedPanel.label ?? selectedPanel.hotspot?.id ?? 'Sem identificação'}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setIsPanelFullscreen((prev) => !prev)} className="text-slate-400 hover:text-white bg-slate-700 hover:bg-slate-600 rounded p-0.5 transition-colors" title={isPanelFullscreen ? 'Sair de tela cheia' : 'Tela cheia'}>{isPanelFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}</button>
                  <button onClick={() => setSelectedPanel(null)} className="text-slate-400 hover:text-white bg-slate-700 hover:bg-slate-600 rounded p-0.5 transition-colors"><X className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="flex-1 w-full h-full relative">
                <Suspense fallback={<div className="h-full w-full flex items-center justify-center text-slate-400 text-sm">Carregando visualização 3D...</div>}>
                  {selectedPanel.mode === 'sim' ? <LandslideSimulation sourceLat={selectedPanel.sourceLat ?? selectedPanel.hotspot?.lat} sourceLng={selectedPanel.sourceLng ?? selectedPanel.hotspot?.lng} radiusMeters={500} allowRadiusControl={false} /> : <PostDisasterSplat />}
                </Suspense>
              </div>
            </div>
          )}
        </div>
      </div>

      {showRiskModal && (
        <div className="fixed inset-0 z-[999] bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl">
            <div className="p-4 border-b border-slate-700 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2"><Siren className="w-5 h-5 text-rose-400" /> Marcar área de risco</h3>
                {riskDraftPoint && <p className="text-xs text-slate-400 mt-1">Coordenadas: {riskDraftPoint.lat.toFixed(5)}, {riskDraftPoint.lng.toFixed(5)}</p>}
              </div>
              <button onClick={() => setShowRiskModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form className="p-4 space-y-3" onSubmit={handleRiskAreaSubmit}>
              <input required value={riskForm.title} onChange={(event) => setRiskForm((prev) => ({ ...prev, title: event.target.value }))} className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm" placeholder="Título do alerta" />
              <textarea required value={riskForm.message} onChange={(event) => setRiskForm((prev) => ({ ...prev, message: event.target.value }))} className="w-full min-h-20 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm" placeholder="Descrição do risco" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <select value={riskForm.severity} onChange={(event) => setRiskForm((prev) => ({ ...prev, severity: event.target.value }))} className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm">
                  <option value="medium">Médio</option>
                  <option value="high">Alto</option>
                  <option value="critical">Crítico</option>
                </select>
                <input value={riskForm.radiusMeters} onChange={(event) => setRiskForm((prev) => ({ ...prev, radiusMeters: event.target.value }))} className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm" placeholder="Raio (m)" />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input type="checkbox" checked={riskForm.addMissingPerson} onChange={(event) => setRiskForm((prev) => ({ ...prev, addMissingPerson: event.target.checked }))} />
                Também cadastrar pessoa desaparecida neste ponto
              </label>

              {riskForm.addMissingPerson && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input value={riskForm.personName} onChange={(event) => setRiskForm((prev) => ({ ...prev, personName: event.target.value }))} className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm" placeholder="Nome da pessoa" />
                  <select value={riskForm.city} onChange={(event) => setRiskForm((prev) => ({ ...prev, city: event.target.value }))} className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"><option>Ubá</option><option>Juiz de Fora</option><option>Matias Barbosa</option></select>
                  <input value={riskForm.contactName} onChange={(event) => setRiskForm((prev) => ({ ...prev, contactName: event.target.value }))} className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm" placeholder="Nome do contato" />
                  <input value={riskForm.contactPhone} onChange={(event) => setRiskForm((prev) => ({ ...prev, contactPhone: event.target.value }))} className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm" placeholder="Telefone" />
                  <textarea value={riskForm.additionalInfo} onChange={(event) => setRiskForm((prev) => ({ ...prev, additionalInfo: event.target.value }))} className="md:col-span-2 w-full min-h-16 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm" placeholder="Informações adicionais" />
                </div>
              )}

              {riskError && <p className="text-xs text-red-400">{riskError}</p>}
              {riskSuccess && <p className="text-xs text-emerald-400">{riskSuccess}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowRiskModal(false)} className="px-3 py-2 text-sm rounded border border-slate-600 text-slate-300 hover:text-white">Cancelar</button>
                <button type="submit" disabled={savingRiskArea} className="px-3 py-2 text-sm rounded bg-rose-600 text-white font-semibold hover:bg-rose-500 disabled:opacity-70">{savingRiskArea ? 'Salvando...' : 'Salvar área de risco'}</button>
              </div>
            </form>
          </div>
        </div>
      )}


      {showUploadModal && (
        <div className="fixed inset-0 z-[999] bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl">
            <div className="p-4 border-b border-slate-700 flex items-start justify-between">
              <div><h3 className="text-lg font-bold text-white flex items-center gap-2"><Smartphone className="w-5 h-5 text-blue-400" /> Upload de vídeo de desabamento</h3></div>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form className="p-4 space-y-3" onSubmit={handleUpload}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input required value={formState.locationName} onChange={(event) => setFormState((prev) => ({ ...prev, locationName: event.target.value }))} className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm" placeholder="Nome do local" />
                <input value={formState.reporterName} onChange={(event) => setFormState((prev) => ({ ...prev, reporterName: event.target.value }))} className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm" placeholder="Seu nome (opcional)" />
                <input required value={formState.latitude} onChange={(event) => setFormState((prev) => ({ ...prev, latitude: event.target.value }))} className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm" placeholder="Latitude" />
                <input required value={formState.longitude} onChange={(event) => setFormState((prev) => ({ ...prev, longitude: event.target.value }))} className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm" placeholder="Longitude" />
              </div>
              <textarea value={formState.description} onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))} className="w-full min-h-20 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm" placeholder="Descreva o desabamento" />
              <input value={formState.reporterPhone} onChange={(event) => setFormState((prev) => ({ ...prev, reporterPhone: event.target.value }))} className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm" placeholder="Contato (opcional)" />
              <input required type="file" accept="video/*" capture="environment" onChange={(event) => setFormState((prev) => ({ ...prev, video: event.target.files && event.target.files.length > 0 ? event.target.files[0] : null }))} className="text-xs w-full" />
              {uploadError && <p className="text-xs text-red-400">{uploadError}</p>}
              {uploadSuccess && <p className="text-xs text-emerald-400">{uploadSuccess}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowUploadModal(false)} className="px-3 py-2 text-sm rounded border border-slate-600 text-slate-300 hover:text-white">Fechar</button>
                <button type="submit" disabled={uploading} className="px-3 py-2 text-sm rounded bg-blue-600 text-white font-semibold hover:bg-blue-500 disabled:opacity-70">{uploading ? 'Enviando...' : 'Enviar para análise'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showMissingModal && (
        <div className="fixed inset-0 z-[999] bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl">
            <div className="p-4 border-b border-slate-700 flex items-start justify-between">
              <div><h3 className="text-lg font-bold text-white flex items-center gap-2"><Users className="w-5 h-5 text-amber-400" /> Cadastro de pessoa desaparecida</h3></div>
              <button onClick={() => setShowMissingModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form className="p-4 space-y-3" onSubmit={handleMissingSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input required value={missingForm.personName} onChange={(event) => setMissingForm((prev) => ({ ...prev, personName: event.target.value }))} className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm" placeholder="Nome da pessoa" />
                <input value={missingForm.age} onChange={(event) => setMissingForm((prev) => ({ ...prev, age: event.target.value }))} className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm" placeholder="Idade (opcional)" />
                <select value={missingForm.city} onChange={(event) => setMissingForm((prev) => ({ ...prev, city: event.target.value }))} className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"><option>Ubá</option><option>Juiz de Fora</option><option>Matias Barbosa</option></select>
                <input required value={missingForm.lastSeenLocation} onChange={(event) => setMissingForm((prev) => ({ ...prev, lastSeenLocation: event.target.value }))} className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm" placeholder="Último local visto" />
              </div>
              <textarea value={missingForm.physicalDescription} onChange={(event) => setMissingForm((prev) => ({ ...prev, physicalDescription: event.target.value }))} className="w-full min-h-20 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm" placeholder="Descrição física (roupas, características)" />
              <textarea value={missingForm.additionalInfo} onChange={(event) => setMissingForm((prev) => ({ ...prev, additionalInfo: event.target.value }))} className="w-full min-h-16 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm" placeholder="Informações adicionais" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input required value={missingForm.contactName} onChange={(event) => setMissingForm((prev) => ({ ...prev, contactName: event.target.value }))} className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm" placeholder="Nome do contato" />
                <input required value={missingForm.contactPhone} onChange={(event) => setMissingForm((prev) => ({ ...prev, contactPhone: event.target.value }))} className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm" placeholder="Telefone do contato" />
              </div>
              {missingError && <p className="text-xs text-red-400">{missingError}</p>}
              {missingSuccess && <p className="text-xs text-emerald-400">{missingSuccess}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowMissingModal(false)} className="px-3 py-2 text-sm rounded border border-slate-600 text-slate-300 hover:text-white">Fechar</button>
                <button type="submit" disabled={savingMissing} className="px-3 py-2 text-sm rounded bg-amber-600 text-white font-semibold hover:bg-amber-500 disabled:opacity-70">{savingMissing ? 'Salvando...' : 'Cadastrar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
