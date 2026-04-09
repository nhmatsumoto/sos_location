import React from 'react';
import { Box, Heading, Text, VStack } from '@chakra-ui/react';
import { PageLoadingState } from '../layout/PagePrimitives';

export const LoadingScreen: React.FC<{ message?: string }> = ({ message = 'Carregando...' }) => {
  return (
    <Box minH="100vh" bg="surface.canvas" px={4}>
      <VStack minH="100vh" justify="center" spacing={6}>
        <VStack spacing={2}>
          <Heading size="sm" color="sos.blue.300" letterSpacing="widest">
            SOS LOCATION
          </Heading>
          <Text fontSize="xs" color="text.secondary" textTransform="uppercase" letterSpacing="widest">
            Plataforma operacional multiameaça
          </Text>
        </VStack>
        <PageLoadingState
          minH="auto"
          label={message}
          description="Inicializando autenticação, telemetria e shell operacional."
        />
      </VStack>
    </Box>
  );
};
