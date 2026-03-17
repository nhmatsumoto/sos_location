import { Box, BoxProps } from '@chakra-ui/react';
import { MapContainer, TileLayer, MapContainerProps } from 'react-leaflet';
import { TacticalText } from '../../atoms/TacticalText';
import { ReactNode } from 'react';
import { motion } from 'framer-motion';

const MotionBox = motion(Box);

interface TacticalMapProps extends MapContainerProps {
  children?: ReactNode;
  containerProps?: BoxProps;
  showLabel?: boolean;
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
        <MotionBox
          position="absolute"
          top="24px"
          left="24px"
          zIndex={1000}
          bg="rgba(8, 8, 15, 0.7)"
          backdropFilter="blur(16px) saturate(180%)"
          px={4}
          py={2}
          borderRadius="xl"
          border="1px solid"
          borderColor="whiteAlpha.100"
          boxShadow="0 8px 32px 0 rgba(0, 0, 0, 0.4)"
          pointerEvents="none"
          initial={{ opacity: 0, x: -20, filter: 'blur(10px)' }}
          animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
          transition={{ duration: 1, ease: 'easeOut' }}
        >
          <Box position="relative">
            <Box 
              position="absolute" 
              left="-8px" 
              top="50%" 
              transform="translateY(-50%)" 
              w="3px" 
              h="12px" 
              bg="sos.red.500"
              boxShadow="0 0 10px rgba(239, 68, 68, 0.8)"
            />
            <TacticalText 
              variant="mono" 
              fontSize="10px" 
              letterSpacing="2px" 
              color="whiteAlpha.800"
              fontWeight="black"
            >
              GEOLOCALIZAÇÃO_RECORRENTE
            </TacticalText>
          </Box>
          <Box mt={1} h="1px" w="100%" bgGradient="linear(to-r, sos.red.500, transparent)" opacity={0.5} />
        </MotionBox>
      )}
      
      <MapContainer 
        {...props} 
        style={tacticalStyle}
        zoomControl={props.zoomControl ?? false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        {children}
      </MapContainer>
    </Box>
  );
}
