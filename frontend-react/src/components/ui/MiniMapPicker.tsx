import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { Box, Icon } from '@chakra-ui/react';
import { MapPin } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet marker icon
const customIcon = new L.DivIcon({
  html: `<div style="color: #007AFF;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg></div>`,
  className: '',
  iconSize: [24, 24],
  iconAnchor: [12, 24],
});

interface MiniMapPickerProps {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
}

function MapEvents({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function MiniMapPicker({ lat, lng, onChange }: MiniMapPickerProps) {
  return (
    <Box 
      h="200px" 
      w="full" 
      borderRadius="xl" 
      overflow="hidden" 
      border="1px solid" 
      borderColor="whiteAlpha.100"
      position="relative"
    >
      <MapContainer 
        center={[lat, lng]} 
        zoom={13} 
        style={{ height: '100%', width: '100%', background: '#08080F' }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        />
        <MapEvents onChange={onChange} />
        <Marker position={[lat, lng]} icon={customIcon} />
      </MapContainer>
      
      {/* HUD overlay */}
      <Box 
        position="absolute" 
        bottom={2} 
        right={2} 
        zIndex={1000} 
        bg="rgba(0,0,0,0.6)" 
        backdropFilter="blur(4px)"
        px={2} 
        py={1} 
        borderRadius="md"
        pointerEvents="none"
      >
        <Box fontSize="9px" fontFamily="mono" color="sos.blue.400">PICKER_MODE: ACTIVE</Box>
      </Box>
    </Box>
  );
}
