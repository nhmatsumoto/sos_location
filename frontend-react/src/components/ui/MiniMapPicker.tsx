import { Box, HStack, Button } from '@chakra-ui/react';
import { Marker, useMapEvents, Polygon } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { TacticalMap } from '../features/map/TacticalMap';
import { Globe, Mountain, Moon } from 'lucide-react';
import { useMemo } from 'react';

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
  rotation?: number;
  size?: number; // Span in degrees
  tileType?: 'dark' | 'satellite' | 'topo';
  onChange: (lat: number, lng: number) => void;
  onTileTypeChange?: (type: 'dark' | 'satellite' | 'topo') => void;
}

function MapEvents({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function MiniMapPicker({ lat, lng, rotation = 0, size = 0.04, tileType = 'dark', onChange, onTileTypeChange }: MiniMapPickerProps) {
  // Calculate BBOX points with rotation
  const bboxPoints = useMemo(() => {
    const half = size / 2;
    const rad = (rotation * Math.PI) / 180;
    
    // Core points [relLat, relLng]
    const p = [
      [-half, -half],
      [half, -half],
      [half, half],
      [-half, half]
    ];

    // Rotate and Offset
    return p.map(([rlat, rlng]) => {
      const rotLat = rlat * Math.cos(rad) - rlng * Math.sin(rad);
      const rotLng = rlat * Math.sin(rad) + rlng * Math.cos(rad);
      return [lat + rotLat, lng + rotLng] as [number, number];
    });
  }, [lat, lng, rotation, size]);

  return (
    <Box
      h="full"
      w="full"
      overflow="hidden"
      position="relative"
    >
      <TacticalMap 
        center={[lat, lng]} 
        zoom={13} 
        showLabel={false}
        tileType={tileType}
      >
        <MapEvents onChange={onChange} />
        <Polygon 
          positions={bboxPoints} 
          pathOptions={{ 
            color: '#007AFF', 
            fillColor: '#007AFF', 
            fillOpacity: 0.1, 
            weight: 2, 
            dashArray: '5, 5' 
          }} 
        />
        <Marker position={[lat, lng]} icon={customIcon} />
      </TacticalMap>

      {/* Layer Switcher HUD */}
      <Box 
        position="absolute" 
        top={2} 
        right={2} 
        zIndex={1000} 
        bg="rgba(0,10,20,0.8)" 
        
        p={1} 
        borderRadius="lg"
        border="1px solid rgba(0,255,255,0.2)"
      >
        <HStack spacing={1}>
          <Button 
            size="xs" variant="ghost" colorScheme="cyan" 
            isActive={tileType === 'dark'}
            onClick={() => onTileTypeChange?.('dark')}
            title="Dark Tactical"
          >
            <Moon size={14} />
          </Button>
          <Button 
            size="xs" variant="ghost" colorScheme="cyan" 
            isActive={tileType === 'satellite'}
            onClick={() => onTileTypeChange?.('satellite')}
            title="Satellite"
          >
            <Globe size={14} />
          </Button>
          <Button 
            size="xs" variant="ghost" colorScheme="cyan" 
            isActive={tileType === 'topo'}
            onClick={() => onTileTypeChange?.('topo')}
            title="Topography"
          >
            <Mountain size={14} />
          </Button>
        </HStack>
      </Box>
      
      {/* HUD overlay */}
      <Box 
        position="absolute" 
        bottom={2} 
        right={2} 
        zIndex={1000} 
        bg="rgba(0,0,0,0.6)" 
        
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
