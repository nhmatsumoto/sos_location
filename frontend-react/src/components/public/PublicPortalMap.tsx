import { useState, useEffect } from 'react';
import { Marker, Popup, Pane } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import '../../styles/MapLayerStyles.css';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import type { NewsNotification } from '../../services/newsApi';
import { Box, VStack, HStack, Badge, Text, Divider } from '@chakra-ui/react';
import { tacticalIntelApi } from '../../services/tacticalIntelApi';
import type { OperationalPoint } from '../../services/tacticalIntelApi';
import { MapContextMenu } from '../features/map/MapContextMenu';
import { IntelPopupContent } from '../ui/IntelPopupContent';
import { HazardMatrixLegend } from '../ui/HazardMatrixLegend';
import { MapArea } from '../ui/MapArea';
import { MapAutoBounds } from '../ui/MapAutoBounds';
import { TacticalMap } from '../features/map/TacticalMap';
import { useMapEvents, useMap } from 'react-leaflet';

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

const getTacticalIcon = (category?: string, index?: number) => {
  const cat = (category || '').toLowerCase();
  let color = '#3182ce'; // Default blue
  
  if (cat.match(/war|conflict|guerra/)) color = '#FF0000';
  else if (cat.match(/flood|enchente|rain|chuva/)) color = '#2b6cb0';
  else if (cat.match(/earthquake|terremoto|tsunami/)) color = '#e53e3e';
  else if (cat.match(/humanitarian|crise/)) color = '#ecc94b';
  else if (cat.match(/heat|clor/)) color = '#dd6b20';
  else if (cat.match(/storm|hurricane|furação/)) color = '#805ad5';

  return L.divIcon({
    className: 'tactical-marker-container',
    html: `
      <div class="tactical-marker-pulse" style="background-color: ${color}44;"></div>
      <div class="tactical-marker-core" style="background-color: ${color}; border: 2px solid white; box-shadow: 0 0 15px ${color};">
        ${index !== undefined ? `<span class="marker-index">${index + 1}</span>` : ''}
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
};

interface PublicPortalMapProps {
  news: NewsNotification[];
  selectedEvent?: NewsNotification | null;
}

export function PublicPortalMap({ news, selectedEvent }: PublicPortalMapProps) {
  const [zoomLevel, setZoomLevel] = useState(4);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, coords: [number, number] } | null>(null);
  const [opPoints, setOpPoints] = useState<OperationalPoint[]>([]);
  const defaultCenter: [number, number] = [-15.793889, -47.882778];

  useEffect(() => {
    const loadPoints = async () => {
      try {
        const data = await tacticalIntelApi.getPoints();
        setOpPoints(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Failed to load operational points", e);
      }
    };
    loadPoints();
    const interval = setInterval(loadPoints, 30000);
    return () => clearInterval(interval);
  }, []);

  const safeNews = Array.isArray(news) ? news : [];
  const sortedNews = [...safeNews].sort((a, b) =>
    new Date(a.at ?? 0).getTime() - new Date(b.at ?? 0).getTime()
  );

  return (
    <Box h="full" w="full" bg="sos.dark" position="relative" zIndex={0}>
      <div className={`map-3d-perspective ${zoomLevel > 6 ? 'map-micro-focus' : ''}`}>
        <TacticalMap 
          center={defaultCenter} 
          zoom={4} 
          containerProps={{ className: "map-3d-content" }}
        >
          <MapEventTracker 
            setZoom={setZoomLevel} 
            onContextMenu={(e) => setContextMenu({ x: e.originalEvent.clientX, y: e.originalEvent.clientY, coords: [e.latlng.lat, e.latlng.lng] })}
          />
          
          <MapSelectedEventFocuser event={selectedEvent} />
          <MapAutoBounds news={news} />

          <Pane name="areas-pane" style={{ zIndex: 200 }}>
            {sortedNews.map((item) => {
              if (!item) return null;
              const lat = item.latitude || (item as any).lat;
              const lng = item.longitude || (item as any).lng;
              if (!lat || !lng) return null;
              return (
                <MapArea 
                  key={`area-${item.id}`}
                  id={item.id}
                  latitude={lat}
                  longitude={lng}
                  category={item.category || ''}
                />
              );
            })}
          </Pane>
          
          <MarkerClusterGroup chunkedLoading maxClusterRadius={40}>
            {sortedNews.map((item, idx) => {
              if (!item) return null;
              const lat = item.latitude || (item as any).lat;
              const lng = item.longitude || (item as any).lng;
              if (!lat || !lng) return null;

              return (
                <Marker 
                  key={item.id} 
                  position={[lat, lng]} 
                  icon={getTacticalIcon(item.category, idx)}
                >
                  <Popup className="guardian-popup">
                    <IntelPopupContent item={item} />
                  </Popup>
                </Marker>
              );
            })}
          </MarkerClusterGroup>

          <Pane name="op-points-pane" style={{ zIndex: 600 }}>
            {opPoints.map((point, index) => (
              <Marker 
                key={point.id} 
                position={[point.latitude, point.longitude]}
                icon={L.divIcon({
                  className: 'tactical-marker-container',
                  html: `
                    <div class="tactical-pulse ${point.type.toLowerCase()}"></div>
                    <div class="tactical-marker-id">${index + 1}</div>
                  `,
                  iconSize: [32, 32],
                  iconAnchor: [16, 16]
                })}
              >
                <Popup className="guardian-popup">
                  <VStack align="stretch" spacing={2} p={1}>
                    <HStack justify="space-between">
                       <Badge colorScheme="blue" variant="solid" fontSize="10px">{point.type.toUpperCase()}</Badge>
                       <Text fontSize="10px" color="whiteAlpha.500">#{index + 1}</Text>
                    </HStack>
                    <Text fontWeight="black" fontSize="xs">{point.title}</Text>
                    <Text fontSize="10px" color="whiteAlpha.700">{point.description}</Text>
                    <Divider borderColor="whiteAlpha.200" />
                    <Text fontSize="8px" color="whiteAlpha.500" fontFamily="mono">
                       COORD: {point.latitude.toFixed(4)}, {point.longitude.toFixed(4)}
                    </Text>
                  </VStack>
                </Popup>
              </Marker>
            ))}
          </Pane>
        </TacticalMap>
      </div>
      
      {contextMenu && (
        <MapContextMenu 
          x={contextMenu.x} 
          y={contextMenu.y} 
          lat={contextMenu.coords[0]}
          lng={contextMenu.coords[1]}
          onClose={() => setContextMenu(null)} 
        />
      )}

      <Box position="absolute" bottom={8} left={8} zIndex={40} display={{ base: 'none', md: 'block' }}>
        <HazardMatrixLegend />
      </Box>
    </Box>
  );
}

function MapEventTracker({ setZoom, onContextMenu }: { 
  setZoom: (z: number) => void, 
  onContextMenu: (e: L.LeafletMouseEvent) => void
}) {
  const map = useMapEvents({
    zoomend: (e) => {
      setZoom(e.target.getZoom());
    },
    contextmenu: (e) => {
      onContextMenu(e);
    }
  });
  return null;
}

function MapSelectedEventFocuser({ event }: { event: NewsNotification | null | undefined }) {
  const map = useMap();
  useEffect(() => {
    let mounted = true;
    if (event) {
      const lat = event.latitude || (event as any).lat;
      const lng = event.longitude || (event as any).lng;
      if (lat && lng && mounted) {
        try {
          map.flyTo([lat, lng], 10, { animate: true, duration: 1.5 });
        } catch (_) {
        }
      }
    }
    return () => { mounted = false; };
  }, [event, map]);
  return null;
}
