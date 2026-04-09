import React from 'react';
import { Box, Center, HStack, Icon, Spinner, Text, VStack } from '@chakra-ui/react';
import { ShieldAlert } from 'lucide-react';
import { ShellSurface } from '../layout/ShellPrimitives';

interface LoadingOverlayProps {
  message?: string;
  variant?: 'fullscreen' | 'contained';
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ 
  message = "Sincronizando Dados...", 
  variant = 'fullscreen' 
}) => {
  const isFullscreen = variant === 'fullscreen';
  
  return (
    <Box
      position={isFullscreen ? 'fixed' : 'absolute'}
      inset={0}
      zIndex={isFullscreen ? 9999 : 50}
      borderRadius={isFullscreen ? undefined : 'inherit'}
      bg="rgba(9,9,15,0.76)"
      backdropFilter="blur(14px)"
    >
      <Center w="full" h="full" p={6}>
        <ShellSurface variant="panel" px={6} py={5} maxW="sm" w="full">
          <VStack spacing={4} textAlign="center">
            <Center
              w={14}
              h={14}
              borderRadius="3xl"
              bg="rgba(0,122,255,0.12)"
              border="1px solid"
              borderColor="rgba(0,122,255,0.20)"
              position="relative"
            >
              <Spinner size="lg" color="sos.blue.300" thickness="3px" speed="0.75s" />
              <Icon as={ShieldAlert} boxSize={4} color="sos.blue.200" position="absolute" />
            </Center>
            <VStack spacing={1}>
              <Text fontSize="sm" fontWeight="700" color="white">
                {message}
              </Text>
              <HStack spacing={2} justify="center">
                <Text fontSize="xs" color="text.secondary">
                  O shell está compondo o estado operacional.
                </Text>
              </HStack>
            </VStack>
          </VStack>
        </ShellSurface>
      </Center>
    </Box>
  );
};
