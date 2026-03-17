import { useEffect, useMemo, useState } from 'react';
import {
  Box, VStack, HStack, Text, Badge, Spinner, Center,
  Select, Grid, IconButton, Tooltip, Progress, Flex
} from '@chakra-ui/react';
import { AlertTriangle, MapPin, RefreshCw, Layers, Filter, Activity } from 'lucide-react';
import { hotspotsApi, type HotspotApi } from '../services/hotspotsApi';
import { useNotifications } from '../context/NotificationsContext';
import { GlassPanel } from '../components/atoms/GlassPanel';
import { TacticalText } from '../components/atoms/TacticalText';
import { MapPanel } from '../components/features/maps/MapPanel';

const getSeverityColor = (severity: string) => {
  const s = severity.toLowerCase();
  if (s.includes('emergencia') || s.includes('tier 1') || s.includes('crítico')) return 'sos.red.500';
  if (s.includes('alerta') || s.includes('tier 2') || s.includes('alto')) return 'sos.amber.500';
  return 'sos.blue.500';
};

export function HotspotsPage() {
  const [raw, setRaw] = useState<HotspotApi[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const { pushNotice } = useNotifications();

  const load = async () => {
    setLoading(true);
    try {
      const data = await hotspotsApi.list();
      setRaw(data || []);
    } catch {
      setRaw([]);
      pushNotice({ 
        type: 'warning', 
        title: 'Hotspots indisponíveis', 
        message: 'Falha ao conectar com o motor de análise.' 
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const types = useMemo(() => Array.from(new Set(raw.map(h => h.type).filter(Boolean))), [raw]);
  const severities = useMemo(() => Array.from(new Set(raw.map(h => h.urgency).filter(Boolean))), [raw]);

  const filtered = useMemo(() => {
    return raw.filter(h => {
      const matchType = !filterType || h.type === filterType;
      const matchSeverity = !filterSeverity || h.urgency === filterSeverity;
      return matchType && matchSeverity;
    }).map(h => ({
      id: h.id,
      nome: `Setor ${h.id.slice(0, 4).toUpperCase()}`,
      tipoRisco: h.type,
      severidade: h.urgency || 'Normal',
      score: Math.round(h.score)
    }));
  }, [raw, filterType, filterSeverity]);

  return (
    <Box h="100%" w="100%" p={6} bg="sos.dark" overflowY="auto">
      <VStack spacing={6} align="stretch" maxW="1600px" mx="auto">
        
        {/* Header Section */}
        <Flex justify="space-between" align="center">
          <HStack spacing={4}>
            <Box p={2.5} bg="rgba(255,149,0,0.12)" borderRadius="xl">
              <AlertTriangle size={22} color="#FF9500" />
            </Box>
            <VStack align="start" spacing={0}>
              <TacticalText variant="heading" fontSize="xl" color="white">
                Análise de Hotspots
              </TacticalText>
              <Text fontSize="xs" color="rgba(255,255,255,0.40)" mt={0.5}>
                Monitoramento de zonas críticas em tempo real
              </Text>
            </VStack>
          </HStack>

          <HStack spacing={3}>
             <Tooltip label="Recarregar dados">
              <IconButton
                icon={<RefreshCw size={18} />}
                aria-label="Reload"
                onClick={() => void load()}
                isLoading={loading}
                variant="ghost"
                borderRadius="xl"
                color="rgba(255,255,255,0.50)"
                _hover={{ color: 'white', bg: 'rgba(255,255,255,0.08)' }}
              />
            </Tooltip>
          </HStack>
        </Flex>

        {/* Filters Panel */}
        <GlassPanel depth="base" p={4} flexDirection={{ base: 'column', md: 'row' }} gap={4} alignItems="center">
          <HStack flex={1} spacing={4} w="full">
            <Box flex={1}>
              <TacticalText variant="caption" mb={2} color="rgba(255,255,255,0.30)">TIPO DE RISCO</TacticalText>
              <Select 
                placeholder="Todos os riscos" 
                value={filterType} 
                onChange={e => setFilterType(e.target.value)}
                variant="tactical"
              >
                {types.map(t => <option key={t} value={t}>{t}</option>)}
              </Select>
            </Box>
            <Box flex={1}>
              <TacticalText variant="caption" mb={2} color="rgba(255,255,255,0.30)">SEVERIDADE</TacticalText>
              <Select 
                placeholder="Todas as severidades" 
                value={filterSeverity} 
                onChange={e => setFilterSeverity(e.target.value)}
                variant="tactical"
              >
                {severities.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </Box>
          </HStack>
          <Box h="40px" w="1px" bg="rgba(255,255,255,0.08)" display={{ base: 'none', md: 'block' }} mx={2} />
          <HStack spacing={4} w={{ base: 'full', md: 'auto' }}>
            <VStack align="end" spacing={0}>
              <TacticalText variant="mono" fontSize="md" color="sos.blue.400">{filtered.length}</TacticalText>
              <TacticalText variant="caption" fontSize="9px">ZONAS FILTRADAS</TacticalText>
            </VStack>
            <Box p={2.5} bg="rgba(0,122,255,0.12)" borderRadius="lg">
              <Filter size={18} color="#007AFF" />
            </Box>
          </HStack>
        </GlassPanel>

        {/* Main Grid: Map + List */}
        <Grid templateColumns={{ base: '1fr', xl: '1.2fr 1fr' }} gap={6}>
          
          {/* Spatial Visualization */}
          <GlassPanel depth="raised" overflow="hidden" position="relative" minH="500px">
            <Box w="full" h="full" p={0}>
               <MapPanel title="Distribuição Espacial de Riscos" />
            </Box>
            {/* Legend Overlay */}
            <Box position="absolute" bottom={4} left={4} p={3} bg="rgba(8,8,15,0.80)" backdropFilter="blur(16px)" borderRadius="xl" border="1px solid rgba(255,255,255,0.10)" zIndex={10}>
              <VStack align="start" spacing={2}>
                <HStack spacing={2}><Box w={2} h={2} bg="sos.red.500" borderRadius="full" /><Text fontSize="9px" fontWeight="700" color="white">Emergência</Text></HStack>
                <HStack spacing={2}><Box w={2} h={2} bg="sos.amber.500" borderRadius="full" /><Text fontSize="9px" fontWeight="700" color="white">Alerta Alto</Text></HStack>
                <HStack spacing={2}><Box w={2} h={2} bg="sos.blue.500" borderRadius="full" /><Text fontSize="9px" fontWeight="700" color="white">Monitoramento</Text></HStack>
              </VStack>
            </Box>
          </GlassPanel>

          {/* List/Table View */}
          <GlassPanel depth="raised" p={5} flexDirection="column" maxH="700px">
            <HStack mb={4} justify="space-between">
              <HStack spacing={2}>
                <Activity size={16} color="rgba(255,255,255,0.40)" />
                <TacticalText variant="subheading">Prioridades de Intervenção</TacticalText>
              </HStack>
              <Box px={2} py={0.5} bg="rgba(255,255,255,0.06)" borderRadius="md">
                <TacticalText variant="mono" fontSize="9px">SCORE_RANKING</TacticalText>
              </Box>
            </HStack>

            <VStack spacing={3} overflowY="auto" flex={1} pr={2} className="no-scrollbar" align="stretch">
              {loading ? (
                <Center h="full" flexDir="column" gap={4}>
                  <Spinner size="lg" color="sos.blue.500" />
                  <TacticalText variant="mono" opacity={0.4}>Processando dados de sensor...</TacticalText>
                </Center>
              ) : filtered.length === 0 ? (
                <Center h="full" flexDir="column" opacity={0.3} gap={4} py={20}>
                  <Layers size={40} />
                  <TacticalText>Nenhum dado encontrado</TacticalText>
                </Center>
              ) : (
                filtered.sort((a,b) => b.score - a.score).map(row => (
                  <GlassPanel 
                    key={row.id} 
                    depth="base" 
                    p={4} 
                    gap={4}
                    _hover={{ bg: 'rgba(255,255,255,0.04)', transform: 'translateX(4px)' }}
                    transition="all 0.2s"
                    cursor="pointer"
                  >
                    <VStack align="start" spacing={1} flex={1}>
                      <HStack w="full" justify="space-between">
                        <TacticalText variant="heading" fontSize="xs" color="white">{row.nome}</TacticalText>
                        <Badge fontSize="9px" bg="transparent" border="1px solid" borderColor={getSeverityColor(row.severidade)} color={getSeverityColor(row.severidade)}>
                          {row.severidade}
                        </Badge>
                      </HStack>
                      <HStack spacing={4} mt={1}>
                        <HStack spacing={1}>
                          <MapPin size={10} color="rgba(255,255,255,0.30)" />
                          <Text fontSize="10px" color="rgba(255,255,255,0.40)">{row.tipoRisco}</Text>
                        </HStack>
                        <HStack spacing={1}>
                          <TacticalText variant="mono" fontSize="10px" color="rgba(255,255,255,0.30)">SCORE:</TacticalText>
                          <TacticalText variant="mono" fontSize="10px" color={row.score > 80 ? 'sos.red.400' : 'sos.blue.400'}>{row.score}</TacticalText>
                        </HStack>
                      </HStack>
                      <Box w="full" mt={3}>
                        <Progress 
                          value={row.score} 
                          size="xs" 
                          borderRadius="full" 
                          bg="rgba(255,255,255,0.06)" 
                          colorScheme={row.score > 80 ? 'red' : 'blue'}
                        />
                      </Box>
                    </VStack>
                  </GlassPanel>
                ))
              )}
            </VStack>
          </GlassPanel>

        </Grid>
      </VStack>
    </Box>
  );
}
