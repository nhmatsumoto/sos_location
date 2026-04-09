import { Box, Icon, Text, type BoxProps } from '@chakra-ui/react';
import { MapContainer, TileLayer, type MapContainerProps } from 'react-leaflet';
import { MapPinned } from 'lucide-react';
import type { ReactNode } from 'react';
import { ShellSectionEyebrow, ShellSurface } from '../../layout/ShellPrimitives';

const TILE_PROVIDERS = {
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  topo: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
  streets: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
};

interface TacticalMapProps extends MapContainerProps {
  children?: ReactNode;
  containerProps?: BoxProps;
  showLabel?: boolean;
  tileType?: keyof typeof TILE_PROVIDERS;
}

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
    ...style,
  };

  return (
    <Box position="relative" h="full" w="full" overflow="hidden" bg="#08080F" {...containerProps}>
      {showLabel ? (
        <ShellSurface
          variant="toolbar"
          position="absolute"
          top={4}
          left={4}
          zIndex={1000}
          px={3}
          py={2.5}
          pointerEvents="none"
        >
          <Box
            position="absolute"
            left={0}
            top={0}
            bottom={0}
            w="3px"
            bg="sos.red.400"
            borderLeftRadius="inherit"
          />
          <ShellSectionEyebrow pl={2}>Geolocalização ativa</ShellSectionEyebrow>
          <Text pl={2} fontSize="xs" color="text.secondary">
            Telemetria e base cartográfica em tempo real
          </Text>
        </ShellSurface>
      ) : null}

      <MapContainer {...props} style={tacticalStyle} zoomControl={props.zoomControl ?? false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url={TILE_PROVIDERS[tileType] || TILE_PROVIDERS.dark}
        />
        {children}
      </MapContainer>

      <Box position="absolute" right={4} bottom={4} zIndex={1000} pointerEvents="none">
        <ShellSurface variant="subtle" px={3} py={2}>
          <Icon as={MapPinned} boxSize={3.5} color="sos.blue.300" mr={2} verticalAlign="middle" />
          <Text as="span" fontSize="11px" color="text.secondary">
            Base vetorial + tiles táticos
          </Text>
        </ShellSurface>
      </Box>
    </Box>
  );
}
