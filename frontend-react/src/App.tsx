import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import { AlertTriangle, MapPin, Waves, ShieldAlert, Activity, CheckCircle2, X, ExternalLink, Camera } from 'lucide-react';
import LandslideSimulation from './LandslideSimulation';
import PostDisasterSplat from './PostDisasterSplat';

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

export default function App() {
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPanel, setSelectedPanel] = useState<{ hotspot: Hotspot, mode: 'sim' | 'splat' } | null>(null);

  useEffect(() => {
    fetch('http://localhost:5031/api/hotspots')
      .then(res => res.json())
      .then(data => {
        setHotspots(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="flex h-screen w-full bg-slate-900 text-slate-200 font-sans overflow-hidden">
      {/* Sidebar - Hotspots Ranking */}
      <div className="w-1/3 h-full border-r border-slate-700 bg-slate-800 flex flex-col z-20 shadow-2xl">
        <div className="p-6 border-b border-slate-700 bg-slate-800/80 backdrop-blur-md">
          <div className="flex items-center gap-3 mb-2">
            <ShieldAlert className="text-red-500 w-8 h-8" />
            <h1 className="text-2xl font-bold tracking-tight text-white">Centro de Comando</h1>
          </div>
          <p className="text-sm text-slate-400">
            Triagem Tática: Onde agir primeiro para maximizar vidas salvas.
          </p>
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
                  hs.score > 90 
                    ? 'bg-red-950/40 border-red-500/50 hover:bg-red-900/40' 
                    : 'bg-slate-700/50 border-orange-500/30 hover:bg-slate-700'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${hs.score > 90 ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'}`}>
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
                      <AlertTriangle className="w-3 h-3 text-yellow-500"/> {hs.estimatedAffected}
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
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0"/>
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

      {/* Map Area */}
      <div className="w-2/3 h-full relative z-10">
        <MapContainer 
          center={[-21.1215, -42.9427]} // Ubá MG as center
          zoom={14} 
          className="h-full w-full"
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          {hotspots.map((hs, i) => (
            <Marker 
              key={hs.id} 
              position={[hs.lat, hs.lng]} 
              icon={hs.score > 90 ? iconCritical : (hs.type === 'Flood' ? iconFlood : iconLandslide)}
            >
              <Popup className="custom-popup">
                <div className="text-slate-900 font-sans">
                  <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
                    {hs.type === 'Flood' ? <Waves className="w-4 h-4 text-blue-500"/> : <MapPin className="w-4 h-4 text-orange-500"/>}
                    {hs.type}
                  </h3>
                  <p className="text-sm font-semibold mb-2">Rank: #{i + 1} | Urgência: {hs.urgency}</p>
                  <div className="bg-slate-100 p-2 rounded text-xs mb-2">
                    <strong>Pessoas Risco:</strong> {hs.estimatedAffected}<br/>
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

          {/* Render Heat/Risk Radials to simulate affected areas */}
          {hotspots.map(hs => (
            <CircleMarker 
              key={`circle-${hs.id}`}
              center={[hs.lat, hs.lng]}
              radius={hs.score > 90 ? 30 : 20}
              pathOptions={{
                color: hs.score > 90 ? '#ef4444' : '#f97316',
                fillColor: hs.score > 90 ? '#ef4444' : '#f97316',
                fillOpacity: 0.2,
                weight: 1
              }}
            />
          ))}
        </MapContainer>

        {/* Floating Ticker/Stats */}
        <div className="absolute top-4 right-4 bg-slate-800/80 backdrop-blur-md border border-slate-700 shadow-xl rounded-xl p-4 w-64 z-[400] text-sm">
          <h4 className="font-bold text-white mb-2 uppercase tracking-wide text-xs">Status Global Ubá</h4>
          <div className="flex justify-between items-center mb-1">
            <span className="text-slate-400">Total Hotspots:</span>
            <span className="font-semibold">{hotspots.length}</span>
          </div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-slate-400">Pop. em Perigo:</span>
            <span className="font-semibold text-yellow-500">{hotspots.reduce((a, b) => a + b.estimatedAffected, 0)}</span>
          </div>
        </div>

        {/* 3D Simulation Overlay */}
        {selectedPanel && (
          <div className="absolute bottom-4 left-4 w-96 h-80 z-50 bg-slate-900 rounded-xl shadow-2xl border border-slate-600 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center p-2 border-b border-slate-700 bg-slate-800">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1">
                {selectedPanel.mode === 'sim' ? <MapPin className="w-3 h-3 text-orange-500" /> : <Camera className="w-3 h-3 text-blue-500" />}
                {selectedPanel.mode === 'sim' ? 'Simulação' : 'Drone (Splat)'}: {selectedPanel.hotspot.id}
              </span>
              <button onClick={() => setSelectedPanel(null)} className="text-slate-400 hover:text-white bg-slate-700 hover:bg-slate-600 rounded p-0.5 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 w-full h-full relative">
              {selectedPanel.mode === 'sim' ? <LandslideSimulation /> : <PostDisasterSplat />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
