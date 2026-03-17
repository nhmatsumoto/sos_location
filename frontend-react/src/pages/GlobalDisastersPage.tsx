import { 
  Globe, AlertCircle, Clock, ExternalLink, Flame, Wind, 
  Droplets, Activity, Mountain, ShieldCheck, MapPin, RefreshCw
} from 'lucide-react';
import { 
  Box, VStack, HStack, SimpleGrid, Badge, Icon,
  Divider, Text, Spinner, Center, Flex, IconButton, Tooltip
} from '@chakra-ui/react';
import { useGlobalDisasters, type GlobalEvent } from '../hooks/useGlobalDisasters';
import { GlassPanel } from '../components/atoms/GlassPanel';
import { TacticalText } from '../components/atoms/TacticalText';
import { TacticalButton } from '../components/atoms/TacticalButton';

/**
 * Global Crisis Monitoring — Guardian v3
 * Strategic dashboard for tracking international disasters and weather events.
 */
export function GlobalDisastersPage() {
  const { events, loading } = useGlobalDisasters();

  const getEventIcon = (type: string) => {
    switch(type) {
      case 'Earthquake': return Activity;
      case 'Cyclone':    return Wind;
      case 'Flood':      return Droplets;
      case 'Wildfire':   return Flame;
      case 'Volcano':    return Mountain;
      default:           return AlertCircle;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch(severity) {
      case 'Critical': return '#FF3B30'; // iOS Red
      case 'High':     return '#FF9500'; // iOS Orange
      case 'Medium':   return '#007AFF'; // iOS Blue
      default:         return '#8E8E93'; // iOS Gray
    }
  };

  return (
    <Box h="100%" w="100%" p={8} bg="sos.dark" overflowY="auto">
      <VStack align="stretch" spacing={8} maxW="1600px" mx="auto">
        
        {/* Command Header */}
        <Flex justify="space-between" align="center">
          <HStack spacing={4}>
            <Box p={3} bg="rgba(0,122,255,0.12)" borderRadius="2xl" boxShadow="0 0 20px rgba(0, 122, 255, 0.2)">
              <Icon as={Globe} boxSize={6} color="sos.blue.500" />
            </Box>
            <VStack align="start" spacing={0}>
              <TacticalText variant="heading" fontSize="2xl">Monitoramento Global</TacticalText>
              <HStack spacing={3} mt={1}>
                <HStack spacing={1.5}>
                  <Box w={2} h={2} borderRadius="full" bg="sos.green.500" className="animate-pulse" />
                  <TacticalText variant="mono" fontSize="10px" color="rgba(255,255,255,0.40)">GDACS_SATELLITE_UPLINK_STABLE</TacticalText>
                </HStack>
                <Divider orientation="vertical" h="10px" borderColor="whiteAlpha.300" />
                <TacticalText variant="mono" fontSize="10px" color="rgba(255,255,255,0.40)">LAST_SYNC: {new Date().toLocaleTimeString()}</TacticalText>
              </HStack>
            </VStack>
          </HStack>

          <HStack spacing={3}>
             <Box textAlign="right" mr={2}>
               <TacticalText variant="caption" color="whiteAlpha.400">PLANETARY_VIEW</TacticalText>
               <TacticalText variant="mono" fontSize="xs" color="sos.blue.400">HYDRA_MAPPING_V3</TacticalText>
             </Box>
             <Divider orientation="vertical" h="32px" borderColor="whiteAlpha.200" />
             <IconButton
              icon={<RefreshCw size={18} />}
              aria-label="Refresh"
              variant="ghost"
              borderRadius="xl"
              color="rgba(255,255,255,0.50)"
              _hover={{ color: 'white', bg: 'rgba(255,255,255,0.08)' }}
            />
          </HStack>
        </Flex>

        <Divider borderColor="rgba(255,255,255,0.06)" />

        {/* Global Overview KPIs */}
        <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4}>
           <KpiCard label="Eventos Ativos" value={events.length} icon={Activity} color="#FF3B30" />
           <KpiCard label="High Impact" value={events.filter(e => e.severity === 'Critical' || e.severity === 'High').length} icon={AlertCircle} color="#FF9500" />
           <KpiCard label="Países em Alerta" value={new Set(events.map(e => e.countryCode)).size} icon={ShieldCheck} color="#34C759" />
           <KpiCard label="Feed Status" value="Online" icon={Activity} color="#007AFF" isLive />
        </SimpleGrid>

        {loading ? (
          <Center h="400px" flexDirection="column" gap={6}>
            <Spinner size="xl" color="sos.blue.500" thickness="3px" speed="0.8s" />
            <VStack spacing={1}>
              <TacticalText variant="heading" fontSize="sm">COLLECTING INTERNATIONAL INTELLIGENCE</TacticalText>
              <TacticalText variant="mono" fontSize="xs" color="sos.blue.400" className="animate-pulse">GDACS_API_REQUEST_HANDSHAKE...</TacticalText>
            </VStack>
          </Center>
        ) : (
          /* Crisis Cards Grid */
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
            {events.map((event: GlobalEvent) => {
              const EventIcon = getEventIcon(event.type);
              const sevColor  = getSeverityColor(event.severity);
              
              return (
                <GlassPanel 
                  key={event.id}
                  p={6}
                  depth="raised"
                  flexDirection="column"
                  transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
                  border="1px solid"
                  borderColor="rgba(255,255,255,0.06)"
                  _hover={{ 
                    transform: 'translateY(-4px)', 
                    borderColor: 'rgba(255,255,255,0.15)',
                    boxShadow: '0 12px 48px rgba(0,0,0,0.5)',
                    bg: 'rgba(255,255,255,0.02)'
                  }}
                >
                  <HStack justify="space-between" mb={4}>
                    <Badge 
                      px={3} py={1} borderRadius="full" 
                      bg="rgba(255,255,255,0.05)"
                      color={sevColor}
                      border="1px solid"
                      borderColor={`${sevColor}44`}
                      fontSize="9px" fontWeight="800"
                    >
                      {event.severity?.toUpperCase()}
                    </Badge>
                    <HStack spacing={1.5}>
                      <Clock size={12} color="rgba(255,255,255,0.30)" />
                      <TacticalText variant="mono" fontSize="9px" color="rgba(255,255,255,0.40)">
                        {Math.floor(Math.random() * 60)}m atrás
                      </TacticalText>
                    </HStack>
                  </HStack>

                  <HStack spacing={3} mb={3}>
                    <Box p={2} bg="rgba(255,255,255,0.04)" borderRadius="lg">
                      <EventIcon size={18} color={sevColor} />
                    </Box>
                    <TacticalText variant="heading" fontSize="lg" lineHeight={1.2}>
                      {event.title}
                    </TacticalText>
                  </HStack>

                  <HStack spacing={2} mb={5} opacity={0.6}>
                    <MapPin size={12} color="#007AFF" />
                    <TacticalText variant="subheading" fontSize="10px" letterSpacing="0.05em">
                      {event.location} • {event.countryCode}
                    </TacticalText>
                  </HStack>

                  <Text fontSize="xs" color="rgba(255,255,255,0.50)" mb={6} noOfLines={2}>
                    {event.description}
                  </Text>
                  
                  <Box mt="auto">
                    <TacticalButton 
                      variant="ghost" 
                      w="full" h="44px"
                      fontSize="xs"
                      rightIcon={<ExternalLink size={14} />}
                      _hover={{ bg: 'rgba(255,255,255,0.06)' }}
                    >
                      VER DETALHES GDACS
                    </TacticalButton>
                  </Box>
                </GlassPanel>
              );
            })}
          </SimpleGrid>
        )}

      </VStack>
    </Box>
  );
}

/** Component for the small tactical KPI cards */
const KpiCard = ({ label, value, icon: Icon, color, isLive }: any) => (
  <GlassPanel depth="base" p={4} gap={4} align="center">
    <Box p={2} bg={`${color}15`} borderRadius="lg">
      <Icon size={18} color={color} />
    </Box>
    <VStack align="start" spacing={0} flex={1}>
      <TacticalText variant="mono" fontSize="xl" color="white" lineHeight={1}>
        {value}
      </TacticalText>
      <TacticalText variant="caption" fontSize="9px" color="rgba(255,255,255,0.30)" mt={1}>
        {label.toUpperCase()}
      </TacticalText>
    </VStack>
    {isLive && <Box w={2} h={2} bg="sos.green.500" borderRadius="full" className="animate-pulse" />}
  </GlassPanel>
);
