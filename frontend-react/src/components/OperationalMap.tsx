import React from 'react';
import { 
  MapContainer, TileLayer, Marker, Popup, CircleMarker, 
  LayersControl, Polyline, Circle 
} from 'react-leaflet';
import { 
  Waves, MapPin, Camera, ExternalLink
} from 'lucide-react';
import type { 
  Hotspot, Catastrophe, SupportPoint, AttentionAlert, 
  FlowSimulationResponse, SelectedPanel 
} from '../types';
import { iconCritical, iconFlood, iconLandslide } from '../icons';
import { MapFocusController } from './map/MapFocusController';
import { MapClickSelector } from './map/MapClickSelector';

interface OperationalMapProps {
  tacticalMapEnabled: boolean;
  activeCatastrophe: Catastrophe | null;
  catastrophes: Catastrophe[];
  displayedHotspots: Hotspot[];
  selectedIncidentPoint: { lat: number, lng: number } | null;
  setSelectedIncidentPoint: (p: { lat: number, lng: number } | null) => void;
  supportPoints: SupportPoint[];
  setSupportPoints: (p: (prev: SupportPoint[]) => SupportPoint[]) => void;
  attentionAlerts: AttentionAlert[];
  flowResult: FlowSimulationResponse | null;
  flowPathLatLng: [number, number][];
  mapOverlayRef: React.RefObject<HTMLDivElement | null>;
  setLastMapClick: (p: { lat: number, lng: number } | null) => void;
  setMapQuickMenu: (m: { visible: boolean, x: number, y: number, lat: number, lng: number }) => void;
  mapActionMode: string;
  setMapActionMode: (m: 'none' | 'incident' | 'risk' | 'support' | 'demarcation') => void;
  demarcations: MapDemarcation[];
  setDemarcations: (d: (prev: MapDemarcation[]) => MapDemarcation[]) => void;
  setFlowForm: (f: (prev: any) => any) => void;
  setRiskDraftPoint: (p: { lat: number, lng: number } | null) => void;
  setShowRiskModal: (s: boolean) => void;
  setDemarcationDraftPoint: (p: { lat: number, lng: number } | null) => void;
  setShowDemarcationModal: (s: boolean) => void;
  setRiskForm: (f: (prev: any) => any) => void;
  openPanel: (p: SelectedPanel) => void;
  sidebarTab: string;
}

export const OperationalMap: React.FC<OperationalMapProps> = (props) => {
  const {
    tacticalMapEnabled, activeCatastrophe, catastrophes,
    displayedHotspots, selectedIncidentPoint, setSelectedIncidentPoint,
    supportPoints, setSupportPoints,    attentionAlerts, flowResult,
    flowPathLatLng, mapOverlayRef, setLastMapClick,
    setMapQuickMenu, mapActionMode, setMapActionMode,
    demarcations, setDemarcations,
    setFlowForm, setRiskDraftPoint, setShowRiskModal, 
    setDemarcationDraftPoint, setShowDemarcationModal,
    setRiskForm, openPanel, sidebarTab
  } = props;

  return (
    <div ref={mapOverlayRef} className="w-full flex-1 relative z-10">
      <MapContainer 
        key={`map-${tacticalMapEnabled ? 'tactical' : 'default'}`} 
        center={[-21.1215, -42.9427]} 
        zoom={14} 
        className="h-full w-full" 
        zoomControl={false}
      >
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked={!tacticalMapEnabled} name="Mapa em relevo">
            <TileLayer 
              attribution='Map data: &copy; OpenStreetMap contributors' 
              url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png" 
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer checked={tacticalMapEnabled} name="Mapa escuro tático">
            <TileLayer 
              attribution='&copy; CartoDB' 
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" 
            />
          </LayersControl.BaseLayer>
        </LayersControl>

        <MapFocusController target={activeCatastrophe ? { lat: activeCatastrophe.centerLat, lng: activeCatastrophe.centerLng } : null} />

        <MapClickSelector
          enabled
          onSelect={(lat, lng, clientX, clientY) => {
            setLastMapClick({ lat, lng });

            const mapRect = mapOverlayRef.current?.getBoundingClientRect();
            const x = mapRect ? Math.max(12, Math.min(mapRect.width - 220, clientX - mapRect.left)) : 24;
            const y = mapRect ? Math.max(12, Math.min(mapRect.height - 260, clientY - mapRect.top)) : 24;
            setMapQuickMenu({ visible: true, x, y, lat, lng });

            if (mapActionMode === 'incident') {
              setSelectedIncidentPoint({ lat, lng });
              setFlowForm((prev: { sourceLat: string; sourceLng: string }) => ({ ...prev, sourceLat: lat.toFixed(5), sourceLng: lng.toFixed(5) }));
              setMapActionMode('none');
              return;
            }

            if (mapActionMode === 'risk') {
              setRiskDraftPoint({ lat, lng });
              setShowRiskModal(true);
              setMapActionMode('none');
              setRiskForm((prev: { message: string }) => ({
                ...prev,
                message: `Risco reportado próximo a ${lat.toFixed(5)}, ${lng.toFixed(5)}.`,
              }));
              return;
            }

            if (mapActionMode === 'support') {
              setSupportPoints((prev: SupportPoint[]) => ([{
                id: `SP-${Date.now()}`,
                type: 'Atendimento',
                lat,
                lng,
                notes: 'Criado via ferramenta ativa no mapa.',
                createdAtUtc: new Date().toISOString(),
              }, ...prev]));
              setMapActionMode('none');
              return;
            }

            if (mapActionMode === 'demarcation') {
              setDemarcationDraftPoint({ lat, lng });
              setShowDemarcationModal(true);
              setMapActionMode('none');
              return;
            }
          }}
        />

        {catastrophes.map((catastrophe) => (
          <Circle
            key={`cat-area-${catastrophe.id}`}
            center={[catastrophe.centerLat, catastrophe.centerLng]}
            radius={Math.max(120, 80 + catastrophe.events.length * 30)}
            pathOptions={{
              color: catastrophe.status === 'Ativa' ? '#ef4444' : catastrophe.status === 'Monitorada' ? '#f59e0b' : '#10b981',
              fillColor: catastrophe.status === 'Ativa' ? '#ef4444' : catastrophe.status === 'Monitorada' ? '#f59e0b' : '#10b981',
              fillOpacity: 0.08,
              weight: 1.5,
            }}
          >
            <Popup className="custom-popup">
              <div className="text-slate-900 text-xs">
                <p><strong>{catastrophe.name}</strong></p>
                <p>{catastrophe.type} • {catastrophe.status}</p>
                <p><strong>Eventos:</strong> {catastrophe.events.length}</p>
              </div>
            </Popup>
          </Circle>
        ))}

        {activeCatastrophe && activeCatastrophe.events.length > 1 && (
          <Polyline
            positions={activeCatastrophe.events.map((evt) => [evt.lat, evt.lng] as [number, number])}
            pathOptions={{ color: '#f43f5e', weight: 2.5, opacity: 0.9 }}
          />
        )}

        {displayedHotspots.map((hs, i) => (
          <Marker key={hs.id} position={[hs.lat, hs.lng]} icon={hs.score > 90 ? iconCritical : hs.type === 'Flood' ? iconFlood : iconLandslide}>
            <Popup className="custom-popup">
              <div className="text-slate-900 font-sans">
                <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
                  {hs.type === 'Flood' ? <Waves className="w-4 h-4 text-blue-500" /> : <MapPin className="w-4 h-4 text-orange-500" />}
                  {hs.type}
                </h3>
                <p className="text-sm font-semibold mb-2">Rank: #{i + 1} | Urgência: {hs.urgency}</p>
                <div className="bg-slate-100 p-2 rounded text-xs mb-2">
                  <strong>Pessoas Risco:</strong> {hs.estimatedAffected}<br />
                  <strong>Exposição:</strong> {hs.humanExposure}
                </div>
                {hs.type === 'Landslide' && (
                  <div className="flex flex-col gap-1 mt-1">
                    <button type="button" disabled className="w-full flex justify-center items-center gap-1 bg-slate-600 text-slate-300 py-1.5 px-2 rounded text-xs font-bold cursor-not-allowed">
                      <ExternalLink className="w-3 h-3" /> Simulação desabilidada
                    </button>
                    <button onClick={() => openPanel({ hotspot: hs, mode: 'splat' })} className="w-full flex justify-center items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white py-1.5 px-2 rounded text-xs font-bold transition-colors">
                      <Camera className="w-3 h-3" /> Ver Drone Splatting
                    </button>
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
                  <p><strong>Raio operacional:</strong> 500m</p>
                </div>
              </Popup>
            </Marker>
            <Circle 
              center={[selectedIncidentPoint.lat, selectedIncidentPoint.lng]} 
              radius={500} 
              pathOptions={{ color: '#f97316', fillColor: '#fb923c', fillOpacity: 0.12, weight: 1.5 }} 
            />
          </>
        )}

        {sidebarTab === 'support' && selectedIncidentPoint && supportPoints.map((point) => (
          <Polyline
            key={`route-${point.id}`}
            positions={[[selectedIncidentPoint.lat, selectedIncidentPoint.lng], [point.lat, point.lng]]}
            pathOptions={{ color: '#22d3ee', weight: 2, opacity: 0.8, dashArray: '4 4' }}
          />
        ))}

        {supportPoints.map((point) => (
          <Marker key={point.id} position={[point.lat, point.lng]} icon={iconCritical}>
            <Popup className="custom-popup">
              <div className="text-slate-900 text-xs">
                <p><strong>{point.type}</strong></p>
                <p>{point.lat.toFixed(5)}, {point.lng.toFixed(5)}</p>
                {point.notes ? <p>{point.notes}</p> : null}
              </div>
            </Popup>
          </Marker>
        ))}

        {demarcations.map((dm) => (
          <Marker key={dm.id} position={[dm.latitude, dm.longitude]} icon={iconCritical}>
            <Popup className="custom-popup">
              <div className="p-1 min-w-[180px]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-black uppercase bg-blue-600 text-white px-1.5 py-0.5 rounded">
                    {dm.type}
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">{dm.title}</h4>
                <p className="text-xs text-slate-500 mb-2">{dm.description}</p>
                <div className="flex flex-wrap gap-1">
                  {dm.tags.map(tag => (
                    <span key={tag} className="text-[9px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

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
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {flowPathLatLng.length > 1 && (
          <Polyline positions={flowPathLatLng} pathOptions={{ color: '#06b6d4', weight: 3, opacity: 0.9, dashArray: '6 6' }} />
        )}
      </MapContainer>
    </div>
  );
};
