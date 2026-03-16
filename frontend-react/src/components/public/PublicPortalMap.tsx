import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Pane, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import '../../styles/MapLayerStyles.css';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import type { NewsNotification } from '../../services/newsApi';
import { Box } from '@chakra-ui/react';

// Atomic Components
import { MapAutoBounds } from '../ui/MapAutoBounds';
import { WebGLSimulationLayer } from '../map/WebGLSimulationLayer';
import { MapArea } from '../ui/MapArea';
import { IntelPopupContent } from '../ui/IntelPopupContent';
import { HazardMatrixLegend } from '../ui/HazardMatrixLegend';
import { TacticalStateBoundaries } from '../map/TacticalStateBoundaries';
import { TacticalLocalBoundaries } from '../map/TacticalLocalBoundaries';

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

interface PublicPortalMapProps {
  news: NewsNotification[];
  selectedEvent?: NewsNotification | null;
}

export function PublicPortalMap({ news, selectedEvent }: PublicPortalMapProps) {
  const [zoomLevel, setZoomLevel] = useState(4);
  const [selectedStateId, setSelectedStateId] = useState<string | null>(null);
  const defaultCenter: [number, number] = [-15.793889, -47.882778];

  // Logic for dynamic 3D perspective based on zoom (Macro vs Micro)
  const isMicroView = zoomLevel > 6 || !!selectedStateId || !!selectedEvent;

  return (
    <Box h="full" w="full" bg="sos.dark" position="relative" zIndex={0}>
      <div className={`map-3d-perspective ${isMicroView ? 'map-micro-focus' : ''}`}>
        <div className="map-3d-content">
          <MapContainer 
            center={defaultCenter} 
            zoom={4} 
            style={{ height: '100%', width: '100%', background: '#0A0B10' }}
            scrollWheelZoom={true}
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            
            <MapEventTracker 
              setZoom={setZoomLevel} 
              onBackgroundClick={() => setSelectedStateId(null)} 
            />
            
            <MapSelectedEventFocuser event={selectedEvent} />

            <Pane name="areas-pane" style={{ zIndex: 200 }}>
              {news.map((item: NewsNotification) => {
                const lat = item.latitude || (item as any).lat;
                const lng = item.longitude || (item as any).lng;
                if (!lat || !lng) return null;
                return (
                  <MapArea 
                    key={`area-${item.id}`}
                    id={item.id}
                    latitude={lat}
                    longitude={lng}
                    category={item.category || 'EVENTO'}
                  />
                );
              })}
            </Pane>
    
            <TacticalStateBoundaries 
              selectedStateId={selectedStateId} 
              onStateSelect={setSelectedStateId} 
            />
            <TacticalLocalBoundaries onSelect={setSelectedStateId} />
            <MapAutoBounds news={news} />
    
          {/* Next-Gen WebGL GIS Layer */}
          <WebGLSimulationLayer 
            minLat={-21.2} 
            minLng={-43.0} 
            maxLat={-21.0} 
            maxLng={-42.8} 
          />
            
            <MarkerClusterGroup chunkedLoading maxClusterRadius={40}>
              {news.map((item: NewsNotification) => {
                const lat = item.latitude || (item as any).lat;
                const lng = item.longitude || (item as any).lng;
                if (!lat || !lng) return null;
                
                return (
                  <Marker key={item.id} position={[lat, lng]}>
                    <Popup className="guardian-popup">
                      <IntelPopupContent item={item} />
                    </Popup>
                  </Marker>
                );
              })}
            </MarkerClusterGroup>
          </MapContainer>
        </div>
      </div>
      
      {/* Tactical Map Overlay */}
      <Box 
        position="absolute" 
        bottom={8} 
        left={8} 
        zIndex={40} 
        display={{ base: 'none', md: 'block' }}
      >
        <HazardMatrixLegend />
      </Box>
    </Box>
  );
}

/**
 * Helpler component to sync Leaflet events with React state
 */
function MapEventTracker({ setZoom, onBackgroundClick }: { setZoom: (z: number) => void, onBackgroundClick: () => void }) {
  useMapEvents({
    zoomend: (e) => {
      setZoom(e.target.getZoom());
    },
    click: (e) => {
      // If clicking background (not a marker or layer), reset selection
      if (e.originalEvent.target && (e.originalEvent.target as any).classList.contains('leaflet-container')) {
        onBackgroundClick();
      }
    }
  });
  return null;
}

/**
 * Jump to event location with tactical high-speed animation
 */
function MapSelectedEventFocuser({ event }: { event: NewsNotification | null | undefined }) {
  const map = useMap();

  useEffect(() => {
    if (event) {
      const lat = event.latitude || (event as any).lat;
      const lng = event.longitude || (event as any).lng;
      if (lat && lng) {
        map.flyTo([lat, lng], 10, {
          animate: true,
          duration: 1.5, // High speed jump
          easeLinearity: 0.1
        });
      }
    }
  }, [event, map]);

  return null;
}
