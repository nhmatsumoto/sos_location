import React from 'react';
import { 
  Flame, Newspaper, Building2, Users, 
  AlertTriangle, Play, Activity, LayoutGrid, Brain,
  Camera, MapPin
} from 'lucide-react';
import type { 
  Hotspot, NewsUpdate, MissingPerson, AttentionAlert, SupportPoint, 
  DonationTask, Catastrophe, MapDemarcation
} from '../types';
import { MapToolsPanel } from './MapToolsPanel.tsx';

interface MapToolsSidebarProps {
  sidebarTab: 'news' | 'hotspots' | 'support' | 'volunteers' | 'admin';
  hotspots: Hotspot[];
  displayedHotspots: Hotspot[];
  loading: boolean;
  newsUpdates: NewsUpdate[];
  filteredNewsUpdates: NewsUpdate[];
  loadingNews: boolean;
  selectedNewsCity: string;
  setSelectedNewsCity: (city: any) => void;
  missingPeople: MissingPerson[];
  loadingMissing: boolean;
  attentionAlerts: AttentionAlert[];
  supportPoints: SupportPoint[];
  donationTasks: DonationTask[];
  donationForm: any;
  setDonationForm: (form: any) => void;
  handleDonationSubmit: (e: React.FormEvent) => void;
  catastrophes: Catastrophe[];
  selectedCatastropheId: string;
  setSelectedCatastropheId: (id: string) => void;
  activeCatastrophe: Catastrophe | null;
  catastropheEventForm: any;
  setCatastropheEventForm: (form: any) => void;
  handleAddCatastropheEvent: (e: React.FormEvent) => void;
  mapMode: string;
  setMapMode: (mode: 'tactical' | 'topographic') => void;
  flowForm: any;
  setFlowForm: (form: any) => void;
  handleRunFlow: (e: React.FormEvent) => void;
  runningFlow: boolean;
  flowError: string;
  flowResult: any;
  selectedIncidentPoint: { lat: number, lng: number } | null;
  ENABLE_SIMULATION: boolean;
  splatForm: any;
  setSplatForm: (form: any) => void;
  handleSplatUpload: (e: React.FormEvent) => void;
  splatUploading: boolean;
  splatError: string;
  splatPreview: any;
  setShowMissingModal: (show: boolean) => void;
  setShowUploadModal: (show: boolean) => void;
  setUploadError: (err: string) => void;
  setUploadSuccess: (msg: string) => void;
  setMissingError: (err: string) => void;
  setMissingSuccess: (msg: string) => void;
  demarcations: MapDemarcation[];
  setMapActionMode: (mode: any) => void;
}

export const MapToolsSidebar: React.FC<MapToolsSidebarProps> = (props) => {
  const {
    sidebarTab, displayedHotspots, loading, 
    filteredNewsUpdates, loadingNews, selectedNewsCity, setSelectedNewsCity,
    missingPeople, attentionAlerts, supportPoints, 
    donationTasks, donationForm, setDonationForm, handleDonationSubmit,
    catastrophes, selectedCatastropheId, setSelectedCatastropheId,
    activeCatastrophe, catastropheEventForm, setCatastropheEventForm,
    handleAddCatastropheEvent, mapMode, setMapMode, flowForm, setFlowForm,
    handleRunFlow, runningFlow, flowError, flowResult, selectedIncidentPoint,
    ENABLE_SIMULATION, splatForm, setSplatForm, handleSplatUpload,
    splatUploading, splatError, setShowMissingModal,
    setShowUploadModal, setUploadError, setUploadSuccess, setMissingError,
    setMissingSuccess, demarcations, setMapActionMode
  } = props;

  return (
    <MapToolsPanel title="Painel de ferramentas">
      <>
        <div className={`px-4 py-3 border-b border-slate-700 bg-slate-800/50 transition-all duration-300 ${sidebarTab === 'hotspots' ? 'opacity-100 translate-y-0' : 'hidden opacity-0 -translate-y-1'}`}>
          <h2 className="text-xs uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-2">
            <Flame className="w-3 h-3" /> Catástrofe (modo operacional)
          </h2>
          <p className="text-[11px] text-slate-400 mb-2">Painel operacional do menu Hotspots: foco em resgate e marcações no mapa.</p>
          <div className="flex items-center gap-2 mb-3">
            <button type="button" onClick={() => setMapMode('tactical')} className={`text-xs px-2 py-1 rounded border ${mapMode === 'tactical' ? 'bg-cyan-600 border-cyan-400 text-white' : 'border-slate-600 text-slate-300'}`}>Mapa tático</button>
            <button type="button" onClick={() => setMapMode('topographic')} className={`text-xs px-2 py-1 rounded border ${mapMode === 'topographic' ? 'bg-cyan-600 border-cyan-400 text-white' : 'border-slate-600 text-slate-300'}`}>Mapa topográfico</button>
          </div>

          <div className="space-y-2 mb-3">
            <p className="text-[11px] text-slate-400">Catástrofes em tempo real</p>
            <ul className="space-y-1 max-h-24 overflow-y-auto">
              {catastrophes.map((cat) => (
                <li key={cat.id}>
                  <button type="button" onClick={() => setSelectedCatastropheId(cat.id)} className={`w-full text-left text-xs px-2 py-1 rounded border ${selectedCatastropheId === cat.id ? 'border-fuchsia-400 bg-fuchsia-900/30 text-fuchsia-100' : 'border-slate-700 bg-slate-900/60 text-slate-300 hover:bg-slate-800'}`}>
                    <span className="font-semibold">{cat.name}</span> · {cat.type} · {cat.status}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <form className="space-y-2 mb-3" onSubmit={handleAddCatastropheEvent}>
            <p className="text-[11px] text-slate-400">Linha do tempo da catástrofe ativa</p>
            <input value={catastropheEventForm.title} onChange={(e) => setCatastropheEventForm((prev: any) => ({ ...prev, title: e.target.value }))} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs" placeholder="Título do acontecimento" required />
            <textarea value={catastropheEventForm.description} onChange={(e) => setCatastropheEventForm((prev: any) => ({ ...prev, description: e.target.value }))} className="w-full min-h-14 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs" placeholder="Descrição (use clique no mapa para coordenadas)" required />
            <button type="submit" disabled={!activeCatastrophe} className="w-full text-xs px-2 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white disabled:opacity-60">Adicionar evento na posição clicada</button>
            {activeCatastrophe ? (
              <ul className="space-y-1 max-h-24 overflow-y-auto mt-2">
                {activeCatastrophe.events.slice(0, 5).map((evt) => (
                  <li key={evt.id} className="text-[11px] bg-slate-900/60 border border-slate-700 rounded px-2 py-1">
                    <p className="text-white font-semibold">{evt.title}</p>
                    <p className="text-slate-400">{new Date(evt.atUtc).toLocaleString('pt-BR')} · {evt.lat.toFixed(4)}, {evt.lng.toFixed(4)}</p>
                  </li>
                ))}
              </ul>
            ) : null}
          </form>

          <p className="text-[11px] text-slate-400 mb-2 mt-4">Simulações operacionais</p>
          <form className="space-y-2" onSubmit={handleRunFlow}>
            <div className="grid grid-cols-2 gap-2">
              <input value={flowForm.sourceLat} onChange={(e) => setFlowForm((prev: any) => ({ ...prev, sourceLat: e.target.value }))} className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs" placeholder="Latitude" />
              <input value={flowForm.sourceLng} onChange={(e) => setFlowForm((prev: any) => ({ ...prev, sourceLng: e.target.value }))} className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs" placeholder="Longitude" />
            </div>
            {selectedIncidentPoint && (
              <button
                type="button"
                onClick={() => setFlowForm((prev: any) => ({ ...prev, sourceLat: selectedIncidentPoint.lat.toFixed(5), sourceLng: selectedIncidentPoint.lng.toFixed(5) }))}
                className="w-full text-xs px-2 py-1 rounded border border-slate-600 text-slate-200 hover:border-cyan-400"
                disabled={!ENABLE_SIMULATION}
              >
                Usar ponto marcado no mapa
              </button>
            )}
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[11px] text-slate-300 space-y-1">
                <span>Cenário</span>
                <select value={flowForm.scenario} onChange={(e) => setFlowForm((prev: any) => ({ ...prev, scenario: e.target.value as any }))} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs">
                  <option value="encosta">Encosta crítica</option>
                  <option value="urbano">Bairro urbano</option>
                  <option value="rural">Área rural</option>
                </select>
              </label>
              <label className="text-[11px] text-slate-300 space-y-1">
                <span>Chuva (mm/h)</span>
                <input type="range" min={20} max={140} step={5} value={flowForm.rainfallMmPerHour} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFlowForm((prev: any) => ({ ...prev, rainfallMmPerHour: e.target.value }))} className="w-full" />
                <span className="text-cyan-300 font-semibold">{flowForm.rainfallMmPerHour} mm/h</span>
              </label>
            </div>
            <button type="submit" disabled={!ENABLE_SIMULATION || runningFlow} className="w-full flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-70 text-white px-3 py-1.5 rounded text-xs font-semibold">
              <Play className="w-3 h-3" /> {ENABLE_SIMULATION ? (runningFlow ? 'Simulando...' : 'Simular área de alagamento') : 'Simulações temporariamente desabilitadas'}
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

        <div className={`px-4 py-3 border-b border-slate-700 bg-slate-800/50 transition-all duration-300 ${sidebarTab === 'news' ? 'opacity-100 translate-y-0' : 'hidden opacity-0 -translate-y-1'}`}>
          <h2 className="text-xs uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-2"><Newspaper className="w-3 h-3" />Notícias e ações do governo</h2>
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
              <ul className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {filteredNewsUpdates.map((news) => (
                  <li key={news.id} className="text-xs bg-slate-900/60 border border-slate-700 rounded-md p-2">
                    <div className="flex gap-2">
                      <img
                        src={news.thumbnailUrl || 'https://portaldatransparencia.gov.br/favicon.ico'}
                        alt={`thumb ${news.source}`}
                        className="w-10 h-10 rounded object-cover border border-slate-700 bg-slate-800"
                        loading="lazy"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] border ${news.kind === 'government_action' ? 'border-emerald-500 text-emerald-300' : 'border-amber-500 text-amber-300'}`}>
                            {news.kind === 'government_action' ? 'Ação gov' : 'Alerta'}
                          </span>
                          <span className="text-slate-500 text-[10px]">{new Date(news.publishedAtUtc).toLocaleString('pt-BR')}</span>
                        </div>
                        <p className="font-semibold text-white line-clamp-3">{news.city}: {news.title}</p>
                        <a href={news.url} target="_blank" rel="noreferrer" className="text-blue-300 hover:text-blue-200 underline">{news.source}</a>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : <p className="text-xs text-slate-500">Sem alertas/notícias governamentais para o filtro selecionado.</p>
          )}
        </div>

        <div className={`px-4 py-3 border-b border-slate-700 bg-slate-800/50 transition-all duration-300 ${sidebarTab === 'volunteers' ? 'opacity-100 translate-y-0' : 'hidden opacity-0 -translate-y-1'}`}>
          <h2 className="text-xs uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-2"><Users className="w-3 h-3" /> Central de voluntários</h2>
          <div className="grid grid-cols-2 gap-2 mb-2 text-[11px]">
            <div className="bg-slate-900/60 border border-slate-700 rounded p-2"><p className="text-slate-400">Prioridade alta</p><p className="text-rose-300 font-semibold">{attentionAlerts.filter((a) => a.severity === 'critical' || a.severity === 'high').length} áreas</p></div>
            <div className="bg-slate-900/60 border border-slate-700 rounded p-2"><p className="text-slate-400">Desaparecidos ativos</p><p className="text-amber-300 font-semibold">{missingPeople.length}</p></div>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button onClick={() => { setShowMissingModal(true); setMissingError(''); setMissingSuccess(''); }} className="text-xs px-2 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white">Cadastrar desaparecido</button>
            <button onClick={() => { setShowUploadModal(true); setUploadError(''); setUploadSuccess(''); }} className="text-xs px-2 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white">Enviar evidência</button>
          </div>

          <h3 className="text-[11px] uppercase tracking-wide text-slate-400 mb-2">Demandas de doação</h3>
          <form className="space-y-2 mb-2" onSubmit={handleDonationSubmit}>
            <input value={donationForm.item} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDonationForm((prev: any) => ({ ...prev, item: e.target.value }))} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs" placeholder="Item de doação" required />
            <div className="grid grid-cols-2 gap-2">
              <input value={donationForm.quantity} onChange={(e) => setDonationForm((prev: any) => ({ ...prev, quantity: e.target.value }))} className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs" placeholder="Quantidade" required />
              <input value={donationForm.location} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDonationForm((prev: any) => ({ ...prev, location: e.target.value }))} className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs" placeholder="Local de entrega" required />
            </div>
            <button type="submit" className="w-full text-xs px-2 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white">Adicionar demanda</button>
          </form>
          <ul className="space-y-2 max-h-32 overflow-y-auto pr-1">
            {donationTasks.map((task) => (
              <li key={task.id} className="text-xs bg-slate-900/60 border border-slate-700 rounded-md p-2">
                <p className="font-semibold text-white">{task.item} • {task.quantity}</p>
                <p className="text-slate-400">{task.location}</p>
              </li>
            ))}
          </ul>

          <div className="mt-4 border-t border-slate-700 pt-3">
            <h3 className="text-[11px] uppercase tracking-wide text-slate-400 mb-2 flex items-center gap-1"><Camera className="w-3 h-3 text-violet-400" /> Drone Splatting</h3>
            <form className="space-y-2" onSubmit={handleSplatUpload}>
              <div className="grid grid-cols-2 gap-2">
                <input value={splatForm.latitude} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSplatForm((prev: any) => ({ ...prev, latitude: e.target.value }))} className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs" placeholder="Lat" required />
                <input value={splatForm.longitude} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSplatForm((prev: any) => ({ ...prev, longitude: e.target.value }))} className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs" placeholder="Lng" required />
              </div>
              <input type="file" accept="video/*" onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSplatForm((prev: any) => ({ ...prev, video: e.target.files && e.target.files.length > 0 ? e.target.files[0] : null }))} className="text-[10px] w-full file:bg-slate-800 file:border-slate-700 file:text-slate-300 file:rounded file:px-2 file:py-1" required />
              <button type="submit" disabled={splatUploading} className="w-full text-xs px-2 py-1.5 rounded bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-70">
                {splatUploading ? 'Processando...' : 'Gerar cena 3D'}
              </button>
              {splatError && <p className="text-xs text-red-400">{splatError}</p>}
            </form>
          </div>
        </div>

        <div className={`px-4 py-3 border-b border-slate-700 bg-slate-800/50 transition-all duration-300 ${sidebarTab === 'support' ? 'opacity-100 translate-y-0' : 'hidden opacity-0 -translate-y-1'}`}>
        </div>

        <div className={`px-4 py-3 border-b border-slate-700 bg-slate-800/50 transition-all duration-300 ${sidebarTab === 'admin' ? 'opacity-100 translate-y-0' : 'hidden opacity-0 -translate-y-1'}`}>
          <h2 className="text-xs uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-2">
            <Brain className="w-3 h-3 text-purple-400" /> Gestão Humanitária (Restrito)
          </h2>
          <p className="text-[11px] text-slate-400 mb-3">Suporte à tomada de decisão e logística humanitária.</p>

          <div className="space-y-3">
            <div className="bg-purple-900/20 border border-purple-500/30 rounded-xl p-3">
              <h3 className="text-[10px] font-bold text-purple-300 uppercase mb-2 flex items-center gap-1">
                <LayoutGrid className="w-3 h-3" /> Ferramentas de Campo
              </h3>
              <button
                onClick={() => setMapActionMode('demarcation')}
                className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
              >
                <MapPin className="w-3 h-3" /> Demarcar Ponto Operacional
              </button>
            </div>

            <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-3">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase mb-2">Pontos Demarcados ({demarcations.length})</h3>
              <ul className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {demarcations.map(dm => (
                  <li key={dm.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-2 hover:bg-slate-800 transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[9px] font-black uppercase bg-slate-700 text-slate-300 px-1.2 py-0.5 rounded">{dm.type}</span>
                      <span className="text-[10px] text-slate-500">#{dm.id.slice(0, 4)}</span>
                    </div>
                    <p className="text-xs font-bold text-slate-200">{dm.title}</p>
                  </li>
                ))}
                {demarcations.length === 0 && <p className="text-[10px] text-slate-500 italic">Nenhuma demarcação ativa.</p>}
              </ul>
            </div>
          </div>
        </div>

        <div className={`p-4 space-y-4 transition-all duration-300 ${sidebarTab === 'hotspots' ? 'opacity-100 translate-y-0' : 'hidden opacity-0 -translate-y-1'}`}>
          {loading ? <div className="flex items-center justify-center p-8"><Activity className="w-8 h-8 text-blue-500 animate-spin" /></div> : displayedHotspots.map((hs, i) => (
            <div key={hs.id} className={`rounded-xl p-4 border transition-all ${hs.score > 90 ? 'bg-red-950/40 border-red-500/50 hover:bg-red-900/40' : 'bg-slate-700/50 border-orange-500/30 hover:bg-slate-700'}`}>
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${hs.score > 90 ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'}`}>{i + 1}</span>
                  <h3 className="font-bold text-lg">{hs.type === 'Flood' ? 'Enchente' : 'Deslizamento'}</h3>
                </div>
                <div className="bg-slate-900 px-2 py-1 rounded-md border border-slate-600"><span className="text-xs font-mono text-slate-300">Score: {hs.score.toFixed(1)}</span></div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div className="bg-slate-800 p-2 rounded border border-slate-700"><p className="text-slate-400 mb-0.5">Vítimas</p><p className="font-semibold text-white flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-yellow-500" /> {hs.estimatedAffected}</p></div>
                <div className="bg-slate-800 p-2 rounded border border-slate-700"><p className="text-slate-400 mb-0.5">Confiança IA</p><p className="font-semibold text-white">{(hs.confidence * 100).toFixed(0)}%</p></div>
              </div>
            </div>
          ))}
        </div>
      </>
    </MapToolsPanel>
  );
};
```
