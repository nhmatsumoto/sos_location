import React, { useState, useEffect } from 'react';
import { Box, VStack, Center, Progress, HStack } from '@chakra-ui/react';
import { LogoFull } from '../brand/Logo';
import { TacticalText } from '../atoms/TacticalText';

export const TacticalLoader: React.FC = () => {
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPercent((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        // Simulated tactical load speed
        const next = prev + Math.floor(Math.random() * 15) + 2;
        return next > 100 ? 100 : next;
      });
    }, 150);

    return () => clearInterval(interval);
  }, []);

  return (
    <Box position="fixed" inset={0} bg="sos.dark" zIndex={9999} display="flex" alignItems="center" justifyContent="center">
      <VStack spacing={8} w="full" maxW="400px" px={10}>
        <Center flexDir="column" mb={10}>
          <LogoFull />
          <Box h="2px" w="100px" bg="sos.blue.500" mt={4} boxShadow="0 0 15px var(--chakra-colors-sos-blue-500)" />
        </Center>
        
        <VStack w="full" spacing={4}>
          <Box w="full" position="relative">
            <Progress 
              value={percent} 
              size="xs" 
              colorScheme="blue" 
              bg="whiteAlpha.100" 
              borderRadius="full" 
              h="4px"
              sx={{
                '& > div': {
                   boxShadow: '0 0 10px var(--chakra-colors-blue-400)'
                }
              }}
            />
          </Box>
          <HStack w="full" justify="space-between">
            <TacticalText variant="mono" fontSize="10px" color="whiteAlpha.400">
              INITIALIZING BOOT SEQUENCE...
            </TacticalText>
            <TacticalText variant="mono" fontSize="14px" color="sos.blue.400">
              {percent}%
            </TacticalText>
          </HStack>
        </VStack>

        <VStack align="start" w="full" spacing={1} opacity={0.3}>
          <TacticalText variant="mono" fontSize="8px">CORE_MODULE_GEO_STREAMS: OK</TacticalText>
          <TacticalText variant="mono" fontSize="8px">RISK_ENGINE_ML_V3: CONNECTED</TacticalText>
          <TacticalText variant="mono" fontSize="8px">SIGNAL_R_HUD_SYNC: ACTIVE</TacticalText>
        </VStack>
      </VStack>
    </Box>
  );
};
