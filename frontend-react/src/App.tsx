import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, LayersControl, Polyline } from 'react-leaflet';
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
} from 'lucide-react';
import LandslideSimulation from './LandslideSimulation';
import PostDisasterSplat from './PostDisasterSplat';

const API_BASE_URL = 'http://localhost:5031';

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

const initialFlowForm = {
  sourceLat: '-21.1215',
  sourceLng: '-42.9427',
  rainfallMmPerHour: '80',
  initialVolume: '3.5',
  steps: '120',
  gridSize: '40',
  cellSizeMeters: '25',
  manningCoefficient: '0.045',
  infiltrationRate: '0.002',
};

export default function App() {
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [newsUpdates, setNewsUpdates] = useState<NewsUpdate[]>([]);
  const [missingPeople, setMissingPeople] = useState<MissingPerson[]>([]);
  const [flowForm, setFlowForm] = useState(initialFlowForm);
  const [flowResult, setFlowResult] = useState<FlowSimulationResponse | null>(null);
  const [flowError, setFlowError] = useState('');

  const [loading, setLoading] = useState(true);
  const [loadingNews, setLoadingNews] = useState(true);
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
  const [selectedPanel, setSelectedPanel] = useState<{ hotspot?: Hotspot; mode: 'sim' | 'splat' } | null>(null);
  const [isPanelFullscreen, setIsPanelFullscreen] = useState(true);

  const flowPathLatLng = useMemo(() => flowResult?.mainPath.map((point) => [point.lat, point.lng] as [number, number]) ?? [], [flowResult]);

  const loadNews = () => {
    setLoadingNews(true);
    fetch(`${API_BASE_URL}/api/news-updates`)
      .then((res) => res.json())
      .then((data: NewsUpdate[]) => {
        setNewsUpdates(data);
        setLoadingNews(false);
      })
      .catch(() => setLoadingNews(false));
  };

  const loadMissingPeople = () => {
    setLoadingMissing(true);
    fetch(`${API_BASE_URL}/api/missing-persons`)
      .then((res) => res.json())
      .then((data: MissingPerson[]) => {
        setMissingPeople(data);
        setLoadingMissing(false);
      })
      .catch(() => setLoadingMissing(false));
  };

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/hotspots`)
      .then((res) => res.json())
      .then((data) => {
        setHotspots(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    loadNews();
    loadMissingPeople();

    const interval = setInterval(loadNews, 120000);
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
      const response = await fetch(`${API_BASE_URL}/api/collapse-reports`, {
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
      const response = await fetch(`${API_BASE_URL}/api/missing-persons`, {
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

    try {
      const response = await fetch(`${API_BASE_URL}/api/location/flow-simulation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceLat: Number(flowForm.sourceLat),
          sourceLng: Number(flowForm.sourceLng),
          rainfallMmPerHour: Number(flowForm.rainfallMmPerHour),
          initialVolume: Number(flowForm.initialVolume),
          steps: Number(flowForm.steps),
          gridSize: Number(flowForm.gridSize),
          cellSizeMeters: Number(flowForm.cellSizeMeters),
          manningCoefficient: Number(flowForm.manningCoefficient),
          infiltrationRate: Number(flowForm.infiltrationRate),
        }),
      });

      if (!response.ok) {
        const errorPayload = await response.json();
        throw new Error(errorPayload.error ?? 'Falha na simulação hidrodinâmica.');
      }

      const data: FlowSimulationResponse = await response.json();
      setFlowResult(data);
    } catch (error) {
      setFlowError(error instanceof Error ? error.message : 'Erro inesperado na simulação.');
    } finally {
      setRunningFlow(false);
    }
  };

  const openPanel = (panel: { hotspot?: Hotspot; mode: 'sim' | 'splat' }) => {
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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
            </div>
          </div>

          <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/50">
            <h2 className="text-xs uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-2">
              <Droplets className="w-3 h-3" /> Simulação de Enchente (CFD simplificado)
            </h2>
            <form className="space-y-2" onSubmit={handleRunFlow}>
              <div className="grid grid-cols-2 gap-2">
                <input value={flowForm.sourceLat} onChange={(e) => setFlowForm((prev) => ({ ...prev, sourceLat: e.target.value }))} className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs" placeholder="Lat" />
                <input value={flowForm.sourceLng} onChange={(e) => setFlowForm((prev) => ({ ...prev, sourceLng: e.target.value }))} className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs" placeholder="Lng" />
                <input value={flowForm.rainfallMmPerHour} onChange={(e) => setFlowForm((prev) => ({ ...prev, rainfallMmPerHour: e.target.value }))} className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs" placeholder="Chuva mm/h" />
                <input value={flowForm.initialVolume} onChange={(e) => setFlowForm((prev) => ({ ...prev, initialVolume: e.target.value }))} className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs" placeholder="Volume inicial" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <input value={flowForm.steps} onChange={(e) => setFlowForm((prev) => ({ ...prev, steps: e.target.value }))} className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs" placeholder="steps" />
                <input value={flowForm.gridSize} onChange={(e) => setFlowForm((prev) => ({ ...prev, gridSize: e.target.value }))} className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs" placeholder="grid" />
                <input value={flowForm.cellSizeMeters} onChange={(e) => setFlowForm((prev) => ({ ...prev, cellSizeMeters: e.target.value }))} className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs" placeholder="célula m" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input value={flowForm.manningCoefficient} onChange={(e) => setFlowForm((prev) => ({ ...prev, manningCoefficient: e.target.value }))} className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs" placeholder="Manning n" />
                <input value={flowForm.infiltrationRate} onChange={(e) => setFlowForm((prev) => ({ ...prev, infiltrationRate: e.target.value }))} className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs" placeholder="Infiltração" />
              </div>
              <button type="submit" disabled={runningFlow} className="w-full flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-70 text-white px-3 py-1.5 rounded text-xs font-semibold">
                <Play className="w-3 h-3" /> {runningFlow ? 'Simulando...' : 'Rodar Navier-Stokes simplificado'}
              </button>
              {flowError && <p className="text-xs text-red-400">{flowError}</p>}
              {flowResult && (
                <p className="text-[11px] text-cyan-300">
                  Prof. máx: {flowResult.maxDepth.toFixed(2)} m • Área: {Math.round(flowResult.estimatedAffectedAreaM2)} m²
                </p>
              )}
            </form>
          </div>

          <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/50">
            <h2 className="text-xs uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-2"><Newspaper className="w-3 h-3" />Crawler de notícias (Ubá/JF/Matias Barbosa)</h2>
            {loadingNews ? <p className="text-xs text-slate-500">Buscando atualizações...</p> : (
              <ul className="space-y-2 max-h-28 overflow-y-auto pr-1">
                {newsUpdates.slice(0, 4).map((news) => (
                  <li key={news.id} className="text-xs bg-slate-900/60 border border-slate-700 rounded-md p-2">
                    <p className="font-semibold text-white truncate">{news.city}: {news.title}</p>
                    <a href={news.url} target="_blank" rel="noreferrer" className="text-blue-300 hover:text-blue-200 underline">{news.source}</a>
                  </li>
                ))}
              </ul>
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

        <div className="w-2/3 h-full relative z-10">
          <MapContainer center={[-21.1215, -42.9427]} zoom={14} className="h-full w-full" zoomControl={false}>
            <LayersControl position="topright">
              <LayersControl.BaseLayer checked name="Mapa em relevo">
                <TileLayer attribution='Map data: &copy; OpenStreetMap contributors | Style: OpenTopoMap' url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png" />
              </LayersControl.BaseLayer>
              <LayersControl.BaseLayer name="Mapa escuro tático">
                <TileLayer attribution='&copy; <a href="https://carto.com/">CartoDB</a>' url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
              </LayersControl.BaseLayer>
            </LayersControl>

            {hotspots.map((hs, i) => (
              <Marker key={hs.id} position={[hs.lat, hs.lng]} icon={hs.score > 90 ? iconCritical : hs.type === 'Flood' ? iconFlood : iconLandslide}>
                <Popup className="custom-popup">
                  <div className="text-slate-900 font-sans">
                    <h3 className="font-bold text-lg mb-1 flex items-center gap-2">{hs.type === 'Flood' ? <Waves className="w-4 h-4 text-blue-500" /> : <MapPin className="w-4 h-4 text-orange-500" />}{hs.type}</h3>
                    <p className="text-sm font-semibold mb-2">Rank: #{i + 1} | Urgência: {hs.urgency}</p>
                    <div className="bg-slate-100 p-2 rounded text-xs mb-2"><strong>Pessoas Risco:</strong> {hs.estimatedAffected}<br /><strong>Exposição:</strong> {hs.humanExposure}</div>
                    {hs.type === 'Landslide' && (
                      <div className="flex flex-col gap-1 mt-1">
                        <button onClick={() => openPanel({ hotspot: hs, mode: 'sim' })} className="w-full flex justify-center items-center gap-1 bg-orange-600 hover:bg-orange-700 text-white py-1.5 px-2 rounded text-xs font-bold transition-colors"><ExternalLink className="w-3 h-3" /> Ver Simulação 3D</button>
                        <button onClick={() => openPanel({ hotspot: hs, mode: 'splat' })} className="w-full flex justify-center items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white py-1.5 px-2 rounded text-xs font-bold transition-colors"><Camera className="w-3 h-3" /> Ver Drone Splatting</button>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
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

          <div className="absolute top-4 right-4 bg-slate-800/80 backdrop-blur-md border border-slate-700 shadow-xl rounded-xl p-4 w-72 z-[400] text-sm">
            <h4 className="font-bold text-white mb-2 uppercase tracking-wide text-xs">Status Global</h4>
            <div className="flex justify-between items-center mb-1"><span className="text-slate-400">Total Hotspots:</span><span className="font-semibold">{hotspots.length}</span></div>
            <div className="flex justify-between items-center mb-1"><span className="text-slate-400">Pop. em Perigo:</span><span className="font-semibold text-yellow-500">{hotspots.reduce((a, b) => a + b.estimatedAffected, 0)}</span></div>
            <div className="flex justify-between items-center mb-1"><span className="text-slate-400">Desaparecidos:</span><span className="font-semibold text-amber-400">{missingPeople.length}</span></div>
            {flowResult && (
              <>
                <div className="mt-2 border-t border-slate-700 pt-2 text-xs text-cyan-300">Flood-CFD (didático)</div>
                <div className="flex justify-between items-center text-xs"><span className="text-slate-400">Prof. máxima:</span><span className="font-semibold text-cyan-300">{flowResult.maxDepth.toFixed(2)} m</span></div>
                <div className="flex justify-between items-center text-xs"><span className="text-slate-400">Área estimada:</span><span className="font-semibold text-cyan-300">{Math.round(flowResult.estimatedAffectedAreaM2)} m²</span></div>
              </>
            )}
          </div>

          {selectedPanel && (
            <div className={`absolute z-50 bg-slate-900 shadow-2xl border border-slate-600 flex flex-col overflow-hidden animate-in fade-in ${isPanelFullscreen ? 'inset-0 rounded-none' : 'bottom-4 left-4 w-96 h-80 rounded-xl slide-in-from-bottom-4'}`}>
              <div className="flex justify-between items-center p-2 border-b border-slate-700 bg-slate-800">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1">{selectedPanel.mode === 'sim' ? <MapPin className="w-3 h-3 text-orange-500" /> : <Camera className="w-3 h-3 text-blue-500" />}{selectedPanel.mode === 'sim' ? 'Simulação' : 'Drone (Splat)'}: {selectedPanel.hotspot?.id}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setIsPanelFullscreen((prev) => !prev)} className="text-slate-400 hover:text-white bg-slate-700 hover:bg-slate-600 rounded p-0.5 transition-colors" title={isPanelFullscreen ? 'Sair de tela cheia' : 'Tela cheia'}>{isPanelFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}</button>
                  <button onClick={() => setSelectedPanel(null)} className="text-slate-400 hover:text-white bg-slate-700 hover:bg-slate-600 rounded p-0.5 transition-colors"><X className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="flex-1 w-full h-full relative">{selectedPanel.mode === 'sim' ? <LandslideSimulation /> : <PostDisasterSplat />}</div>
            </div>
          )}
        </div>
      </div>

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
