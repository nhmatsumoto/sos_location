import { MapContainer, TileLayer, Marker, Popup, Pane } from 'react-leaflet';
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
}

export function PublicPortalMap({ news }: PublicPortalMapProps) {
  const defaultCenter: [number, number] = [-15.7801, -47.9292]; 

  return (
    <Box h="full" w="full" bg="sos.dark" position="relative" zIndex={0}>
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
        
        <Pane name="areas-pane" style={{ zIndex: 200 }}>
          {news.map((item: NewsNotification) => {
            if (!item.latitude || !item.longitude) return null;
            return (
              <MapArea 
                key={`area-${item.id}`}
                id={item.id}
                latitude={item.latitude}
                longitude={item.longitude}
                category={item.category || 'EVENTO'}
              />
            );
          })}
        </Pane>

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
            if (!item.latitude || !item.longitude) return null;
            
            return (
              <Marker key={item.id} position={[item.latitude, item.longitude]}>
                <Popup className="guardian-popup">
                  <IntelPopupContent item={item} />
                </Popup>
              </Marker>
            );
          })}
        </MarkerClusterGroup>
      </MapContainer>
      
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
