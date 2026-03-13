import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, Pane } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import '../../styles/MapLayerStyles.css';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import type { NewsNotification } from '../../services/newsApi';
import { useEffect } from 'react';
import { Cloud, Calendar, ExternalLink, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Fix Leaflet marker icons in React
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Component to handle automatic map bounds based on markers
function AutoBounds({ news }: { news: NewsNotification[] }) {
  const map = useMap();

  useEffect(() => {
    if (news.length === 0) return;

    const bounds = L.latLngBounds(
      news
        .filter(n => n.latitude && n.longitude)
        .map(n => [n.latitude!, n.longitude!] as [number, number])
    );

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    }
  }, [news, map]);

  return null;
}

interface PublicPortalMapProps {
  news: NewsNotification[];
}

export function PublicPortalMap({ news }: PublicPortalMapProps) {
  const defaultCenter: [number, number] = [-15.7801, -47.9292]; 
  
  const getCategoryStyles = (category: string) => {
    const cat = category.toLowerCase();
    switch (cat) {
      case 'flood': 
        return { color: '#3b82f6', radius: 15000, opacity: 0.15, className: 'glow-pulse soft-area' }; 
      case 'earthquake': 
        return { color: '#ef4444', radius: 40000, opacity: 0.2, className: 'glow-pulse soft-area' }; 
      case 'wildfire': 
        return { color: '#f97316', radius: 10000, opacity: 0.15, className: 'glow-pulse soft-area' }; 
      case 'tsunami': 
        return { color: '#06b6d4', radius: 50000, opacity: 0.2, className: 'glow-pulse soft-area' }; 
      case 'storm': 
        return { color: '#8b5cf6', radius: 25000, opacity: 0.2, className: 'glow-pulse soft-area' }; 
      case 'weather': 
        return { color: '#eab308', radius: 12000, opacity: 0.15, className: 'glow-pulse soft-area' }; 
      default: 
        return { color: '#6366f1', radius: 20000, opacity: 0.1, className: 'soft-area' };
    }
  };

  return (
    <div className="h-full w-full rounded-3xl overflow-hidden border border-slate-200 shadow-inner bg-slate-100 relative z-0">
      <MapContainer 
        center={defaultCenter} 
        zoom={4} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <Pane name="areas-pane" style={{ zIndex: 200 }}>
          {news.map((item: NewsNotification) => {
            if (!item.latitude || !item.longitude) return null;
            const styles = getCategoryStyles(item.category);
            return (
              <Circle 
                key={`area-${item.id}`}
                center={[item.latitude, item.longitude]}
                radius={styles.radius}
                pathOptions={{ 
                  color: styles.color,
                  fillColor: styles.color,
                  fillOpacity: styles.opacity,
                  weight: 1,
                  className: styles.className
                }}
              />
            );
          })}
        </Pane>

        <AutoBounds news={news} />
        
        <MarkerClusterGroup
          chunkedLoading
          maxClusterRadius={40}
          polygonOptions={{
            fillColor: '#3b82f6',
            color: '#3b82f6',
            weight: 1,
            opacity: 0.5,
            fillOpacity: 0.1,
          }}
        >
          {news.map((item: NewsNotification) => {
            if (!item.latitude || !item.longitude) return null;
            
            return (
              <Marker key={item.id} position={[item.latitude, item.longitude]}>
                <Popup className="custom-popup">
                  <div className="p-3 min-w-[240px] font-sans">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black uppercase tracking-tighter px-2 py-1 rounded bg-slate-900 text-white w-fit">
                          {item.category}
                        </span>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                          <Calendar size={10} />
                          {format(new Date(item.publishedAt), "dd/MM/yyyy", { locale: ptBR })}
                        </div>
                      </div>

                      <div className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-black border ${
                        item.riskScore > 80 ? 'bg-rose-50 text-rose-700 border-rose-200' :
                        item.riskScore > 50 ? 'bg-orange-50 text-orange-700 border-orange-200' :
                        'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        <AlertTriangle size={10} />
                        SCORE: {item.riskScore.toFixed(1)}
                      </div>
                    </div>
                    
                    <h4 className="font-bold text-slate-900 text-sm mb-2 leading-tight">{item.title}</h4>
                    
                    {item.climateInfo && (
                      <div className="flex items-start gap-2 mb-3 p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                        <Cloud size={14} className="text-emerald-500 mt-0.5" />
                        <div className="text-[10px] text-emerald-800 font-medium leading-relaxed">
                          {item.climateInfo}
                        </div>
                      </div>
                    )}

                    <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">{item.content}</p>

                    <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-100">
                       <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.source}</span>
                       {item.externalUrl && (
                         <a 
                           href={item.externalUrl} 
                           target="_blank" 
                           rel="noopener noreferrer"
                           className="flex items-center gap-1 text-[10px] font-black text-blue-600 hover:text-blue-700 transition-colors uppercase tracking-widest"
                         >
                           Detalhes <ExternalLink size={10} />
                         </a>
                       )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MarkerClusterGroup>
      </MapContainer>
      
      {/* Map Legend/Overlay */}
      <div className="absolute bottom-6 right-6 z-40 bg-white/90 backdrop-blur-sm p-4 rounded-2xl border border-slate-200 shadow-xl pointer-events-none">
        <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Legenda de Risco</h5>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-700">
            <span className="h-2 w-2 rounded-full bg-red-500" /> Sismo / Terremoto
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-700">
            <span className="h-2 w-2 rounded-full bg-blue-500" /> Inundação
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-700">
            <span className="h-2 w-2 rounded-full bg-orange-500" /> Incêndio
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-700">
            <span className="h-2 w-2 rounded-full bg-cyan-500" /> Tsunami
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-700">
            <span className="h-2 w-2 rounded-full bg-purple-500" /> Tempestade
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-700">
            <span className="h-2 w-2 rounded-full bg-yellow-500" /> Clima / Calor
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-700">
            <span className="h-2 w-2 rounded-full bg-slate-500" /> Histórico
          </div>
        </div>
      </div>
    </div>
  );
}
