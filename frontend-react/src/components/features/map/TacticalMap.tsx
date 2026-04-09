import { Box } from '@chakra-ui/react';
import type { BoxProps } from '@chakra-ui/react';
import { MapContainer, TileLayer } from 'react-leaflet';
import type { MapContainerProps } from 'react-leaflet';
import { TacticalText } from '../../atoms/TacticalText';
import type { ReactNode } from 'react';


const TILE_PROVIDERS = {
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  satellite: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  topo: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
  streets: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
};

interface TacticalMapProps extends MapContainerProps {
  children?: ReactNode;
  containerProps?: BoxProps;
  showLabel?: boolean;
  tileType?: keyof typeof TILE_PROVIDERS;
}

/**
 * Standard tactical map for SOS Location
 * Style: High-contrast, dark-mode filtered tiles or native dark tiles
 * Signature Label: GEOLOCALIZAÇÃO_RECORRENTE
 */
export function TacticalMap({ 
  children, 
  containerProps, 
  showLabel = true, 
  tileType = 'dark',
  style,
  ...props 
}: TacticalMapProps) {
  
  const tacticalStyle = {
    height: '100%',
    width: '100%',
    background: '#08080F',
    ...style
  };

  return (
    <Box 
      position="relative" 
      h="full" 
      w="full" 
      overflow="hidden" 
      bg="#08080F"
      {...containerProps}
    >
      {showLabel && (
        <Box
          position="absolute"
          top="16px"
          left="16px"
          zIndex={1000}
          bg="#111119"
          px={3}
          py={2}
          borderRadius="md"
          border="1px solid rgba(255,255,255,0.08)"
          borderLeft="3px solid"
          borderLeftColor="sos.red.500"
          pointerEvents="none"
          className="animate-fade-in"
        >
          <TacticalText
            variant="mono"
            fontSize="11px"
            color="rgba(255,255,255,0.65)"
          >
            Geolocalização ativa
          </TacticalText>
        </Box>
      )}
      
      <MapContainer 
        {...props} 
        style={tacticalStyle}
        zoomControl={props.zoomControl ?? false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url={TILE_PROVIDERS[tileType] || TILE_PROVIDERS.dark}
        />
        {children}
      </MapContainer>
    </Box>
  );
}
