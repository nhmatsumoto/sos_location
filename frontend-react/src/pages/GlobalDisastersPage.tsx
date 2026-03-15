import { Globe, AlertCircle, Clock, ExternalLink } from 'lucide-react';
import { 
  Box, 
  VStack, 
  HStack, 
  SimpleGrid, 
  Badge, 
  Icon,
  Container,
  Divider
} from '@chakra-ui/react';

// Atomic Components
import { GlassPanel } from '../components/atoms/GlassPanel';
import { TacticalText } from '../components/atoms/TacticalText';
import { TacticalButton } from '../components/atoms/TacticalButton';

/**
 * Global Crisis Monitoring
 * Strategic dashboard for tracking international disasters and weather events.
 * Refactored with the Guardian Tactical Design System.
 */
export function GlobalDisastersPage() {
  const globalEvents = [
    { id: 1, name: 'Ciclone Tropical - Pacífico Sul', status: 'Monitorando', severity: 'Alta', lastUpdate: '10m atrás' },
    { id: 2, name: 'Sismo 6.2 - Indonésia', status: 'Avaliação de Impacto', severity: 'Crítica', lastUpdate: '1h atrás' },
    { id: 3, name: 'Incêndios Florestais - Austrália', status: 'Ativo', severity: 'Média', lastUpdate: '4h atrás' },
  ];

  return (
    <Box minH="100vh" bg="sos.dark" py={12} className="bg-mesh">
      <Container maxW="container.xl">
        <VStack align="stretch" spacing={10}>
          
          {/* Header Command Shell */}
          <VStack align="flex-start" spacing={3}>
            <HStack spacing={4}>
              <Box p={3} bg="sos.blue.500" borderRadius="2xl" boxShadow="0 0 20px rgba(6, 182, 212, 0.3)">
                <Icon as={Globe} boxSize={6} color="white" />
              </Box>
              <Box>
                <TacticalText variant="heading" fontSize="2xl">Monitoramento Global</TacticalText>
                <HStack spacing={2} mt={1}>
                  <Box w={2} h={2} borderRadius="full" bg="sos.green.500" className="animate-pulse" />
                  <TacticalText variant="mono">GDACS INTEGRATED // LIVE_FEED_ACTIVE</TacticalText>
                </HStack>
              </Box>
            </HStack>
            <TacticalText fontSize="md" color="whiteAlpha.700" maxW="3xl">
              Integração estratégica com redes de satélite e agências internacionais para resposta tática a crises além das fronteiras.
            </TacticalText>
          </VStack>

          <Divider borderColor="whiteAlpha.100" />

          {/* Crisis Intelligence Grid */}
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={8}>
            {globalEvents.map(event => (
              <GlassPanel 
                key={event.id}
                p={6}
                intensity="medium"
                transition="all 0.4s"
                _hover={{ 
                  transform: 'translateY(-4px)', 
                  borderColor: 'sos.blue.500', 
                  boxShadow: '0 12px 40px rgba(0, 163, 255, 0.2)'
                }}
              >
                <HStack justify="space-between" mb={4}>
                  <Badge 
                    px={3} 
                    py={1} 
                    borderRadius="full" 
                    bg={
                      event.severity === 'Crítica' ? 'sos.red.500' : 
                      event.severity === 'Alta' ? 'orange.500' : 'sos.blue.500'
                    }
                    color="white"
                    fontSize="9px"
                  >
                    {event.severity?.toUpperCase()}
                  </Badge>
                  <HStack spacing={1.5}>
                    <Icon as={Clock} boxSize={3} color="whiteAlpha.400" />
                    <TacticalText variant="mono" fontSize="10px">{event.lastUpdate}</TacticalText>
                  </HStack>
                </HStack>

                <TacticalText variant="heading" fontSize="lg" mb={2}>{event.name}</TacticalText>
                
                <HStack spacing={2} mb={8} opacity={0.6}>
                  <Icon as={AlertCircle} boxSize={3.5} color="sos.blue.400" />
                  <TacticalText variant="subheading" fontSize="10px">{event.status}</TacticalText>
                </HStack>

                <TacticalButton 
                  w="full" 
                  h="48px"
                  rightIcon={<Icon as={ExternalLink} boxSize={3.5} />}
                >
                  ACESSAR DADOS GDACS
                </TacticalButton>
              </GlassPanel>
            ))}
          </SimpleGrid>

          {/* Integration Status Placeholder */}
          <GlassPanel p={12} borderStyle="dashed" textAlign="center">
            <VStack spacing={6}>
              <Box 
                w={20} h={20} 
                bg="sos.blue.500/10" 
                borderRadius="full" 
                display="flex" 
                alignItems="center" 
                justifyContent="center"
                border="1px solid"
                borderColor="sos.blue.500/30"
              >
                <Icon as={Globe} boxSize={10} color="sos.blue.400" />
              </Box>
              <VStack spacing={2}>
                <TacticalText variant="heading" fontSize="xl">Visualizador Planetário em Desenvolvimento</TacticalText>
                <TacticalText maxW="lg">
                  A camada de visualização Mapbox Sentinel está sendo calibrada. O monitoramento tático de campo local tem prioridade de processamento no momento.
                </TacticalText>
              </VStack>
              <TacticalButton variant="ghost" color="sos.blue.400">
                REQUISITAR LINK DE SATÉLITE
              </TacticalButton>
            </VStack>
          </GlassPanel>

        </VStack>
      </Container>
    </Box>
  );
}
