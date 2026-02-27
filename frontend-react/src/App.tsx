import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
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
  Film,
} from 'lucide-react';
import LandslideSimulation from './LandslideSimulation';
import PostDisasterSplat from './PostDisasterSplat';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

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

interface CollapseReport {
  id: string;
  locationName: string;
  latitude: number;
  longitude: number;
  description: string;
  reporterName: string;
  reporterPhone: string;
  videoFileName: string;
  uploadedAtUtc: string;
  processingStatus: 'Pending' | 'Ingested' | 'Trained' | 'Published';
}

interface SpecialistAgent {
  name: string;
  specialty: string;
  mission: string;
  recommendation: string;
  confidence: number;
}

interface ProbableLocation {
  label: string;
  latitude: number;
  longitude: number;
  priority: number;
  probability: number;
  estimatedPeople: number;
  reasoning: string;
}

interface RescueSupportSnapshot {
  generatedAtUtc: string;
  areaAnalyzedM2: number;
  estimatedTrappedPeople: number;
  peopleDispersionPerSquareMeter: number;
  potentialSurvivorClusters: number;
  agents: SpecialistAgent[];
  probableLocations: ProbableLocation[];
}


const readErrorMessage = async (response: Response) => {
  const raw = await response.text();

  if (!raw) {
    return `Falha no upload (HTTP ${response.status}).`;
  }

  try {
    const parsed = JSON.parse(raw) as { error?: string; message?: string };
    return parsed.error ?? parsed.message ?? `Falha no upload (HTTP ${response.status}).`;
  } catch {
    return raw;
  }
};

const initialFormState = {
  locationName: '',
  latitude: '',
  longitude: '',
  description: '',
  reporterName: '',
  reporterPhone: '',
  video: null as File | null,
};

export default function App() {
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [reports, setReports] = useState<CollapseReport[]>([]);
  const [rescueSupport, setRescueSupport] = useState<RescueSupportSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingReports, setLoadingReports] = useState(true);
  const [loadingRescueSupport, setLoadingRescueSupport] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [formState, setFormState] = useState(initialFormState);
  const [selectedPanel, setSelectedPanel] = useState<{ hotspot: Hotspot; mode: 'sim' | 'splat' } | null>(null);

  const loadRescueSupport = () => {
    setLoadingRescueSupport(true);
    fetch(`${API_BASE_URL}/api/rescue-support?areaM2=15000`)
      .then((res) => res.json())
      .then((data: RescueSupportSnapshot) => {
        setRescueSupport(data);
        setLoadingRescueSupport(false);
      })
      .catch((err) => {
        console.error(err);
        setLoadingRescueSupport(false);
      });
  };

  const loadReports = () => {
    setLoadingReports(true);
    fetch(`${API_BASE_URL}/api/collapse-reports`)
      .then((res) => res.json())
      .then((data: CollapseReport[]) => {
        setReports(data);
        setLoadingReports(false);
      })
      .catch((err) => {
        console.error(err);
        setLoadingReports(false);
      });
  };

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/hotspots`)
      .then((res) => res.json())
      .then((data) => {
        setHotspots(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });

    loadReports();
    loadRescueSupport();
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
        const errorMessage = await readErrorMessage(response);
        throw new Error(errorMessage);
      }

      setUploadSuccess('Upload recebido! O vídeo entrou na fila para gaussian-splatting.');
      setFormState(initialFormState);
      loadReports();
      loadRescueSupport();
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Erro inesperado no envio.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <div className="flex h-screen w-full bg-slate-900 text-slate-200 font-sans overflow-hidden">
        <div className="w-1/3 h-full border-r border-slate-700 bg-slate-800 flex flex-col z-20 shadow-2xl">
          <div className="p-6 border-b border-slate-700 bg-slate-800/80 backdrop-blur-md">
            <div className="flex items-center gap-3 mb-2">
              <ShieldAlert className="text-red-500 w-8 h-8" />
              <h1 className="text-2xl font-bold tracking-tight text-white">Centro de Comando</h1>
            </div>
            <p className="text-sm text-slate-400 mb-4">Triagem Tática: Onde agir primeiro para maximizar vidas salvas.</p>
            <button
              onClick={() => {
                setShowUploadModal(true);
                setUploadError('');
                setUploadSuccess('');
              }}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-md text-sm font-semibold transition-colors"
            >
              <Upload className="w-4 h-4" />
              Enviar vídeo de desabamento (celular)
            </button>
          </div>

          <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/50">
            <h2 className="text-xs uppercase tracking-wider text-slate-400 mb-2">Fila de uploads para Gaussian Splatting</h2>
            {loadingReports ? (
              <p className="text-xs text-slate-500">Carregando uploads...</p>
            ) : reports.length === 0 ? (
              <p className="text-xs text-slate-500">Nenhum vídeo enviado até agora.</p>
            ) : (
              <ul className="space-y-2 max-h-28 overflow-y-auto pr-1">
                {reports.slice(0, 3).map((report) => (
                  <li key={report.id} className="text-xs bg-slate-900/60 border border-slate-700 rounded-md p-2">
                    <p className="font-semibold text-white truncate">{report.locationName}</p>
                    <p className="text-slate-400 truncate">{report.videoFileName}</p>
                    <p className="text-emerald-400">Status: {report.processingStatus}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/40">
            <h2 className="text-xs uppercase tracking-wider text-slate-400 mb-2">Agentes especialistas (física + resgate)</h2>
            {loadingRescueSupport || !rescueSupport ? (
              <p className="text-xs text-slate-500">Calculando suporte tático...</p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2 mb-2 text-xs">
                  <div className="bg-slate-900/60 border border-slate-700 rounded p-2">
                    <p className="text-slate-400">Possíveis soterrados</p>
                    <p className="font-semibold text-yellow-400">{rescueSupport.estimatedTrappedPeople}</p>
                  </div>
                  <div className="bg-slate-900/60 border border-slate-700 rounded p-2">
                    <p className="text-slate-400">Dispersão por m²</p>
                    <p className="font-semibold text-cyan-400">{rescueSupport.peopleDispersionPerSquareMeter.toFixed(4)}</p>
                  </div>

                <ul className="space-y-2 max-h-28 overflow-y-auto pr-1">
                  {rescueSupport.agents.map((agent) => (
                    <li key={agent.name} className="bg-slate-900/60 border border-slate-700 rounded-md p-2">
                      <p className="text-xs font-semibold text-white">{agent.name}</p>
                      <p className="text-[11px] text-slate-300">{agent.specialty}</p>
                      <p className="text-[11px] text-emerald-400">Confiança: {(agent.confidence * 100).toFixed(0)}%</p>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Activity className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
            ) : (
              hotspots.map((hs, i) => (
                <div
                  key={hs.id}
                  className={`rounded-xl p-4 border transition-all ${
                    hs.score > 90 ? 'bg-red-950/40 border-red-500/50 hover:bg-red-900/40' : 'bg-slate-700/50 border-orange-500/30 hover:bg-slate-700'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                          hs.score > 90 ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'
                        }`}
                      >
                        {i + 1}
                      </span>
                      <h3 className="font-bold text-lg">{hs.type === 'Flood' ? 'Enchente' : 'Deslizamento'}</h3>
                    </div>
                    <div className="bg-slate-900 px-2 py-1 rounded-md border border-slate-600">
                      <span className="text-xs font-mono text-slate-300">Score: {hs.score.toFixed(1)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div className="bg-slate-800 p-2 rounded border border-slate-700">
                      <p className="text-slate-400 mb-0.5">Potencial Vítimas</p>
                      <p className="font-semibold text-white flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-yellow-500" /> {hs.estimatedAffected}
                      </p>
                    </div>
                    <div className="bg-slate-800 p-2 rounded border border-slate-700">
                      <p className="text-slate-400 mb-0.5">Confiança IA</p>
                      <p className="font-semibold text-white">{(hs.confidence * 100).toFixed(0)}%</p>
                    </div>
                  </div>

                  <div className="mt-3">
                    <p className="text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wider">Evidências / Gatilhos:</p>
                    <ul className="text-sm space-y-1">
                      {hs.riskFactors.map((r, idx) => (
                        <li key={idx} className="flex items-start gap-1.5 text-slate-300">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="w-2/3 h-full relative z-10">
          <MapContainer center={[-21.1215, -42.9427]} zoom={14} className="h-full w-full" zoomControl={false}>
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            {hotspots.map((hs, i) => (
              <Marker key={hs.id} position={[hs.lat, hs.lng]} icon={hs.score > 90 ? iconCritical : hs.type === 'Flood' ? iconFlood : iconLandslide}>
                <Popup className="custom-popup">
                  <div className="text-slate-900 font-sans">
                    <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
                      {hs.type === 'Flood' ? <Waves className="w-4 h-4 text-blue-500" /> : <MapPin className="w-4 h-4 text-orange-500" />}
                      {hs.type}
                    </h3>
                    <p className="text-sm font-semibold mb-2">Rank: #{i + 1} | Urgência: {hs.urgency}</p>
                    <div className="bg-slate-100 p-2 rounded text-xs mb-2">
                      <strong>Pessoas Risco:</strong> {hs.estimatedAffected}
                      <br />
                      <strong>Exposição:</strong> {hs.humanExposure}
                    </div>
                    {hs.type === 'Landslide' && (
                      <div className="flex flex-col gap-1 mt-1">
                        <button
                          onClick={() => setSelectedPanel({ hotspot: hs, mode: 'sim' })}
                          className="w-full flex justify-center items-center gap-1 bg-orange-600 hover:bg-orange-700 text-white py-1.5 px-2 rounded text-xs font-bold transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" /> Ver Simulação 3D
                        </button>
                        <button
                          onClick={() => setSelectedPanel({ hotspot: hs, mode: 'splat' })}
                          className="w-full flex justify-center items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white py-1.5 px-2 rounded text-xs font-bold transition-colors"
                        >
                          <Camera className="w-3 h-3" /> Ver Drone Splatting
                        </button>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}

            {hotspots.map((hs) => (
              <CircleMarker
                key={`circle-${hs.id}`}
                center={[hs.lat, hs.lng]}
                radius={hs.score > 90 ? 30 : 20}
                pathOptions={{
                  color: hs.score > 90 ? '#ef4444' : '#f97316',
                  fillColor: hs.score > 90 ? '#ef4444' : '#f97316',
                  fillOpacity: 0.2,
                  weight: 1,
                }}
              />
            ))}

            {rescueSupport?.probableLocations.map((location) => (
              <CircleMarker
                key={location.label}
                center={[location.latitude, location.longitude]}
                radius={Math.max(8, location.estimatedPeople)}
                pathOptions={{
                  color: '#22c55e',
                  fillColor: '#22c55e',
                  fillOpacity: 0.18,
                  weight: 2,
                }}
              >
                <Popup>
                  <div className="text-slate-900 text-xs">
                    <p className="font-bold">{location.label}</p>
                    <p>Prioridade: {location.priority}</p>
                    <p>Probabilidade: {(location.probability * 100).toFixed(0)}%</p>
                    <p>Pessoas estimadas: {location.estimatedPeople}</p>
                    <p>{location.reasoning}</p>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>

          <div className="absolute top-4 right-4 bg-slate-800/80 backdrop-blur-md border border-slate-700 shadow-xl rounded-xl p-4 w-72 z-[400] text-sm">
            <h4 className="font-bold text-white mb-2 uppercase tracking-wide text-xs">Status Global Ubá</h4>
            <div className="flex justify-between items-center mb-1">
              <span className="text-slate-400">Total Hotspots:</span>
              <span className="font-semibold">{hotspots.length}</span>
            </div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-slate-400">Pop. em Perigo:</span>
              <span className="font-semibold text-yellow-500">{hotspots.reduce((a, b) => a + b.estimatedAffected, 0)}</span>
            </div>
            {rescueSupport && (
              <>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-slate-400">Clusters prováveis:</span>
                  <span className="font-semibold text-emerald-400">{rescueSupport.potentialSurvivorClusters}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Área analisada:</span>
                  <span className="font-semibold">{rescueSupport.areaAnalyzedM2.toFixed(0)} m²</span>
                </div>
              </>
            )}
          </div>

          {selectedPanel && (
            <div
              className={`absolute z-50 bg-slate-900 shadow-2xl border border-slate-600 flex flex-col overflow-hidden animate-in fade-in ${
                selectedPanel.mode === 'splat' ? 'inset-0 rounded-none' : 'bottom-4 left-4 w-96 h-80 rounded-xl slide-in-from-bottom-4'
              }`}
            >
              <div className="flex justify-between items-center p-2 border-b border-slate-700 bg-slate-800">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1">
                  {selectedPanel.mode === 'sim' ? <MapPin className="w-3 h-3 text-orange-500" /> : <Camera className="w-3 h-3 text-blue-500" />}
                  {selectedPanel.mode === 'sim' ? 'Simulação' : 'Drone (Splat) - Tela cheia'}: {selectedPanel.hotspot.id}
                </span>
                <button onClick={() => setSelectedPanel(null)} className="text-slate-400 hover:text-white bg-slate-700 hover:bg-slate-600 rounded p-0.5 transition-colors">
                  <X className="w-4 h-4" />
                </button>
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
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-blue-400" /> Upload de vídeo de desabamento
                </h3>
                <p className="text-xs text-slate-400 mt-1">Permite gravar/enviar vídeos do celular para processamento no pipeline gaussian-splatting.</p>
              </div>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form className="p-4 space-y-3" onSubmit={handleUpload}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  required
                  value={formState.locationName}
                  onChange={(event) => setFormState((prev) => ({ ...prev, locationName: event.target.value }))}
                  className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"
                  placeholder="Nome do local"
                />
                <input
                  value={formState.reporterName}
                  onChange={(event) => setFormState((prev) => ({ ...prev, reporterName: event.target.value }))}
                  className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"
                  placeholder="Seu nome (opcional)"
                />
                <input
                  required
                  value={formState.latitude}
                  onChange={(event) => setFormState((prev) => ({ ...prev, latitude: event.target.value }))}
                  className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"
                  placeholder="Latitude"
                />
                <input
                  required
                  value={formState.longitude}
                  onChange={(event) => setFormState((prev) => ({ ...prev, longitude: event.target.value }))}
                  className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"
                  placeholder="Longitude"
                />
              </div>

              <textarea
                value={formState.description}
                onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
                className="w-full min-h-20 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"
                placeholder="Descreva o desabamento e riscos observados"
              />

              <input
                value={formState.reporterPhone}
                onChange={(event) => setFormState((prev) => ({ ...prev, reporterPhone: event.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"
                placeholder="Contato (telefone/WhatsApp - opcional)"
              />

              <label className="block border border-dashed border-slate-600 rounded-lg p-4 text-center bg-slate-800/60">
                <Film className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                <p className="text-sm text-slate-300">Selecione ou grave um vídeo pelo celular</p>
                <p className="text-xs text-slate-500 mb-3">Formatos comuns: MP4, MOV, 3GP</p>
                <input
                  required
                  type="file"
                  accept="video/*"
                  capture="environment"
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      video: event.target.files && event.target.files.length > 0 ? event.target.files[0] : null,
                    }))
                  }
                  className="text-xs w-full"
                />
                {formState.video && <p className="text-xs text-emerald-400 mt-2">Arquivo: {formState.video.name}</p>}
              </label>

              {uploadError && <p className="text-xs text-red-400">{uploadError}</p>}
              {uploadSuccess && <p className="text-xs text-emerald-400">{uploadSuccess}</p>}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-3 py-2 text-sm rounded border border-slate-600 text-slate-300 hover:text-white"
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-3 py-2 text-sm rounded bg-blue-600 text-white font-semibold hover:bg-blue-500 disabled:opacity-70"
                >
                  {uploading ? 'Enviando...' : 'Enviar para análise'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
