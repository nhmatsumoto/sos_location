import { MapContainer, TileLayer, Marker, Popup, Circle as LeafletCircle } from 'react-leaflet';
import { 
  CheckCircle2, 
  Trophy, 
  Clock, 
  Map as MapIcon, 
  LayoutGrid,
  ShieldCheck,
  Power,
  RefreshCw
} from 'lucide-react';
import { VolunteerTaskCard } from '../components/volunteer/VolunteerTaskCard';
import { 
  Box, 
  Flex, 
  HStack, 
  VStack, 
  SimpleGrid, 
  Spinner, 
  Center, 
  Badge,
  Icon,
  Tooltip,
  IconButton,
  Circle
} from '@chakra-ui/react';
import { useVolunteerDashboard } from '../hooks/useVolunteerDashboard';
import { GlassPanel } from '../components/atoms/GlassPanel';
import { TacticalText } from '../components/atoms/TacticalText';
import { TacticalButton } from '../components/atoms/TacticalButton';
import { TacticalStat } from '../components/molecules/TacticalStat';

/**
 * Volunteer Operations Command
 * Centered on community response, task coordination, and individual impact telemétria.
 * Refactored with the Guardian Design System.
 */
export function VolunteerDashboardPage() {
  const { tasks, stats, isOnline, loading, refreshing, actions } = useVolunteerDashboard();

  return (
    <Flex direction="column" h="calc(100vh - 80px)" gap={6} p={8} overflow="hidden">
      
      {/* Tactical Status Header */}
      <GlassPanel p={5} display="flex" alignItems="center" justifyContent="space-between" flexDir={{ base: 'column', md: 'row' }} gap={6}>
        <HStack spacing={6}>
          <HStack spacing={4}>
            <Box p={2.5} bg="sos.blue.500" borderRadius="xl">
              <LayoutGrid size={24} color="white" />
            </Box>
            <VStack align="flex-start" spacing={0}>
              <TacticalText variant="heading" fontSize="xl">Terminal do Voluntário</TacticalText>
              <TacticalText>Coordenação de missões e resposta comunitária ativa.</TacticalText>
            </VStack>
          </HStack>
          
          <Tooltip label="Sincronizar Protocolos">
            <IconButton
              onClick={actions.handleRefresh}
              icon={<RefreshCw size={18} />}
              aria-label="Atualizar"
              variant="ghost"
              className={refreshing ? 'animate-spin' : ''}
              _hover={{ bg: 'whiteAlpha.100', color: 'sos.blue.400' }}
            />
          </Tooltip>
        </HStack>

        <TacticalButton 
          onClick={actions.toggleOnline}
          leftIcon={<Icon as={Power} size={18} strokeWidth={3} color={isOnline ? 'sos.green.400' : 'whiteAlpha.300'} />}
          variant="unstyled"
          h="64px"
          px={8}
          bg={isOnline ? 'sos.green.500/10' : 'whiteAlpha.50'}
          borderColor={isOnline ? 'sos.green.500/20' : 'whiteAlpha.100'}
          borderWidth="1px"
          glow={isOnline}
        >
          <VStack align="flex-start" spacing={0}>
            <TacticalText variant="caption">STATUS DO OPERADOR</TacticalText>
            <TacticalText variant="heading" fontSize="xs" color={isOnline ? 'sos.green.400' : 'whiteAlpha.500'}>
              {isOnline ? 'ON-LINE / EM CAMPO' : 'OFF-LINE / STANDBY'}
            </TacticalText>
          </VStack>
        </TacticalButton>
      </GlassPanel>

      {loading && !tasks.length ? (
        <Center flex={1}>
           <VStack spacing={6}>
              <Spinner size="xl" color="sos.blue.500" thickness="4px" />
              <TacticalText variant="mono">Sincronizando com a Central de Operações...</TacticalText>
           </VStack>
        </Center>
      ) : (
        <Flex flex={1} gap={8} overflow="hidden">
          
          {/* List Section - Left */}
          <VStack w={{ base: 'full', lg: '450px' }} gap={6} overflowY="auto" align="stretch" className="no-scrollbar">
            
            {/* Impact Telemetry Grid */}
            <SimpleGrid columns={2} spacing={4}>
              <GlassPanel p={5}>
                <TacticalStat label="Missões Ativas" value={stats?.activeTasks ?? 0} icon={LayoutGrid} color="sos.blue.400" />
              </GlassPanel>
              <GlassPanel p={5}>
                <TacticalStat label="Sucesso Total" value={stats?.completedTasks ?? 0} icon={CheckCircle2} color="sos.green.400" />
              </GlassPanel>
              <GlassPanel p={5}>
                <TacticalStat label="Pontuação XP" value={stats?.impactScore ?? 0} icon={Trophy} color="orange.400" />
              </GlassPanel>
              <GlassPanel p={5}>
                <TacticalStat label="Ciclos SOS" value={`${stats?.hoursContributed ?? 0}h`} icon={Clock} color="indigo.400" />
              </GlassPanel>
            </SimpleGrid>

            {/* Safety Protocol Banner */}
            <Box 
              bgGradient="linear(to-br, sos.blue.700, sos.blue.900)" 
              borderRadius="3xl" 
              p={6} 
              color="white" 
              position="relative"
              overflow="hidden"
            >
              <Box position="absolute" top={-2} right={-2} opacity={0.1}>
                <ShieldCheck size={100} />
              </Box>
              <HStack spacing={3} mb={2}>
                <Icon as={ShieldCheck} size={24} />
                <TacticalText variant="heading" fontSize="sm">Segurança Prioritária</TacticalText>
              </HStack>
              <TacticalText color="whiteAlpha.800">
                Utilize sempre o EPI obrigatório. Mantenha o link de telemetria ativo com a central para sua proteção.
              </TacticalText>
            </Box>

            {/* Mission Feed */}
            <VStack spacing={4} align="stretch" pb={10}>
              <Flex align="center" justify="space-between" px={2}>
                <TacticalText variant="subheading">Missões de Campo Disponíveis</TacticalText>
                <Badge bg="whiteAlpha.100" color="whiteAlpha.500" borderRadius="full" px={2}>{tasks.length}</Badge>
              </Flex>
              {tasks.length === 0 ? (
                <GlassPanel p={12} textAlign="center" borderStyle="dashed">
                   <TacticalText opacity={0.3}>PROTOCOLOS SILENCIOSOS // NENHUMA MISSÃO</TacticalText>
                </GlassPanel>
              ) : (
                tasks.map(task => (
                  <VolunteerTaskCard key={task.id} task={task} onPickUp={actions.handlePickUpTask} />
                ))
              )}
            </VStack>
          </VStack>

          {/* Tactical Map - Center/Right */}
          <Box 
            flex={1} 
            display={{ base: 'none', lg: 'block' }} 
            borderRadius="3xl" 
            overflow="hidden" 
            border="1px solid" 
            borderColor="whiteAlpha.50" 
            position="relative" 
            boxShadow="dark-lg"
          >
            <Box position="absolute" top={6} right={6} zIndex={1000}>
              <GlassPanel p={4} border="1px solid" borderColor="whiteAlpha.300">
                <HStack spacing={3} mb={3}>
                  <Icon as={MapIcon} size={16} color="sos.blue.400" />
                  <TacticalText variant="heading" fontSize="xs">MAPA OPERACIONAL</TacticalText>
                </HStack>
                <VStack align="flex-start" spacing={2}>
                  <HStack spacing={2}>
                    <Circle size="6px" bg="sos.red.500" />
                    <TacticalText variant="caption">Alta Prioridade / Perigo</TacticalText>
                  </HStack>
                  <HStack spacing={2}>
                    <Circle size="6px" bg="orange.500" />
                    <TacticalText variant="caption">Logística / Civil</TacticalText>
                  </HStack>
                </VStack>
              </GlassPanel>
            </Box>

            <MapContainer 
              center={[-21.1215, -42.9427]} 
              zoom={14} 
              zoomControl={false}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer 
                attribution='&copy; CARTO' 
                url='https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' 
              />
              {tasks.map(task => (
                <LeafletCircle
                  key={task.id}
                  center={[task.location.lat, task.location.lng]}
                  radius={200}
                  pathOptions={{
                    fillColor: task.priority === 'critical' ? '#f43f5e' : task.priority === 'high' ? '#f59e0b' : '#3b82f6',
                    fillOpacity: 0.1,
                    color: 'transparent'
                  }}
                />
              ))}
              {tasks.map(task => (
                <Marker key={task.id} position={[task.location.lat, task.location.lng]}>
                  <Popup className="tactical-popup">
                    <VStack align="flex-start" p={2} spacing={1}>
                      <TacticalText variant="heading" fontSize="xs" color="sos.dark">{task.title}</TacticalText>
                      <TacticalText fontSize="10px" color="gray.600">{task.description}</TacticalText>
                    </VStack>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </Box>
        </Flex>
      )}
    </Flex>
  );
}
