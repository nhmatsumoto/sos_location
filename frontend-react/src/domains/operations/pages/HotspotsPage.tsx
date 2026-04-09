import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, VStack, HStack, Text, Spinner, Center,
  IconButton, Tooltip, Progress, Flex
} from '@chakra-ui/react';
import { AlertTriangle, MapPin, RefreshCw, Layers, Activity } from 'lucide-react';
import { hotspotsApi, type HotspotApi } from '../../../services/hotspotsApi';
import { useNotifications } from '../../../context/useNotifications';
import { TacticalText } from '../../../components/atoms/TacticalText';
import { MapPanel } from '../../../components/features/maps/MapPanel';

const getSeverityColor = (severity: string) => {
  const s = severity.toLowerCase();
  if (s.includes('emergencia') || s.includes('tier 1') || s.includes('crítico')) return '#FF3B30';
  if (s.includes('alerta') || s.includes('tier 2') || s.includes('alto')) return '#FF9500';
  return '#007AFF';
};

export function HotspotsPage() {
  const [raw, setRaw] = useState<HotspotApi[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const { pushNotice } = useNotifications();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await hotspotsApi.list();
      setRaw(data || []);
    } catch {
      setRaw([]);
      pushNotice({
        type: 'warning',
        title: 'Hotspots indisponíveis',
        message: 'Falha ao conectar com o motor de análise.',
      });
    } finally {
      setLoading(false);
    }
  }, [pushNotice]);

  useEffect(() => { void load(); }, [load]);

  const types      = useMemo(() => Array.from(new Set(raw.map(h => h.type).filter(Boolean))), [raw]);
  const severities = useMemo(() => Array.from(new Set(raw.map(h => h.urgency).filter(Boolean))), [raw]);

  const filtered = useMemo(() =>
    raw
      .filter(h => (!filterType || h.type === filterType) && (!filterSeverity || h.urgency === filterSeverity))
      .map(h => ({
        id:         h.id,
        nome:       `Setor ${h.id.slice(0, 4).toUpperCase()}`,
        tipoRisco:  h.type,
        severidade: h.urgency || 'Normal',
        score:      Math.round(h.score),
      }))
      .sort((a, b) => b.score - a.score),
  [raw, filterType, filterSeverity]);

  const selectStyle = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.10)',
    borderRadius: '8px',
    color: 'white',
    fontSize: '12px',
    padding: '6px 10px',
    outline: 'none',
    width: '100%',
  };

  return (
    <Flex h="full" direction="column" overflow="hidden" bg="sos.dark">

      {/* ── Compact header ── */}
      <Flex
        flexShrink={0}
        align="center"
        justify="space-between"
        px={5}
        py={3}
        borderBottom="1px solid"
        borderColor="whiteAlpha.100"
      >
        <HStack spacing={3}>
          <Box p={2} bg="rgba(255,149,0,0.12)" borderRadius="lg">
            <AlertTriangle size={18} color="#FF9500" />
          </Box>
          <VStack align="start" spacing={0}>
            <TacticalText variant="heading" fontSize="sm" color="white">Análise de Hotspots</TacticalText>
            <Text fontSize="10px" color="whiteAlpha.400">Monitoramento de zonas críticas em tempo real</Text>
          </VStack>
        </HStack>

        <Tooltip label="Recarregar dados">
          <IconButton
            icon={<RefreshCw size={16} />}
            aria-label="Reload"
            onClick={() => void load()}
            isLoading={loading}
            variant="ghost"
            size="sm"
            borderRadius="lg"
            color="whiteAlpha.500"
            _hover={{ color: 'white', bg: 'whiteAlpha.100' }}
          />
        </Tooltip>
      </Flex>

      {/* ── Main content: Map 70% | Panel 30% ── */}
      <Flex flex={1} overflow="hidden">

        {/* Map — 70% */}
        <Box flex="7" position="relative" overflow="hidden">
          <MapPanel title="Distribuição Espacial de Riscos" />

          {/* Legend overlay */}
          <Box
            position="absolute" bottom={4} left={4} zIndex={10}
            p={3} borderRadius="xl"
            bg="rgba(8,8,15,0.85)" 
            border="1px solid rgba(255,255,255,0.10)"
          >
            <VStack align="start" spacing={1.5}>
              <HStack spacing={2}>
                <Box w={2} h={2} borderRadius="full" bg="#FF3B30" style={{ boxShadow: '0 0 4px #FF3B30' }} />
                <Text fontSize="9px" fontWeight="700" color="white">Emergência</Text>
              </HStack>
              <HStack spacing={2}>
                <Box w={2} h={2} borderRadius="full" bg="#FF9500" style={{ boxShadow: '0 0 4px #FF9500' }} />
                <Text fontSize="9px" fontWeight="700" color="white">Alerta Alto</Text>
              </HStack>
              <HStack spacing={2}>
                <Box w={2} h={2} borderRadius="full" bg="#007AFF" style={{ boxShadow: '0 0 4px #007AFF' }} />
                <Text fontSize="9px" fontWeight="700" color="white">Monitoramento</Text>
              </HStack>
            </VStack>
          </Box>
        </Box>

        {/* Divider */}
        <Box w="1px" bg="whiteAlpha.100" flexShrink={0} />

        {/* Priority panel — 30% */}
        <Flex flex="3" direction="column" overflow="hidden" bg="rgba(8,8,15,0.6)" minW="280px" maxW="420px">

          {/* Panel header */}
          <Flex px={4} py={3} align="center" justify="space-between" borderBottom="1px solid" borderColor="whiteAlpha.100" flexShrink={0}>
            <HStack spacing={2}>
              <Activity size={14} color="rgba(255,255,255,0.40)" />
              <TacticalText variant="subheading" fontSize="xs">Prioridades de Intervenção</TacticalText>
            </HStack>
            <Box px={2} py={0.5} bg="whiteAlpha.100" borderRadius="md">
              <TacticalText variant="mono" fontSize="9px">{filtered.length} ZONAS</TacticalText>
            </Box>
          </Flex>

          {/* Filters */}
          <Box px={4} py={3} borderBottom="1px solid" borderColor="whiteAlpha.100" flexShrink={0}>
            <VStack spacing={2} align="stretch">
              <Box>
                <Text fontSize="9px" fontWeight="700" color="whiteAlpha.300" textTransform="uppercase" letterSpacing="wider" mb={1}>
                  Tipo de Risco
                </Text>
                <select
                  value={filterType}
                  onChange={e => setFilterType(e.target.value)}
                  style={selectStyle}
                >
                  <option value="">Todos os riscos</option>
                  {types.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Box>
              <Box>
                <Text fontSize="9px" fontWeight="700" color="whiteAlpha.300" textTransform="uppercase" letterSpacing="wider" mb={1}>
                  Severidade
                </Text>
                <select
                  value={filterSeverity}
                  onChange={e => setFilterSeverity(e.target.value)}
                  style={selectStyle}
                >
                  <option value="">Todas</option>
                  {severities.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Box>
            </VStack>
          </Box>

          {/* List */}
          <Box flex={1} overflowY="auto" px={3} py={3} className="custom-scrollbar">
            {loading ? (
              <Center h="full" flexDir="column" gap={3}>
                <Spinner size="md" color="sos.blue.500" />
                <TacticalText variant="mono" fontSize="10px" opacity={0.4}>Processando sensores...</TacticalText>
              </Center>
            ) : filtered.length === 0 ? (
              <Center h="full" flexDir="column" opacity={0.3} gap={3} py={16}>
                <Layers size={32} color="white" />
                <TacticalText fontSize="xs">Nenhum dado encontrado</TacticalText>
              </Center>
            ) : (
              <VStack spacing={2} align="stretch">
                {filtered.map((row, idx) => {
                  const color = getSeverityColor(row.severidade);
                  return (
                    <Box
                      key={row.id}
                      p={3}
                      borderRadius="xl"
                      border="1px solid"
                      borderColor="whiteAlpha.100"
                      bg="rgba(255,255,255,0.02)"
                      cursor="pointer"
                      transition="all 0.15s"
                      _hover={{ bg: 'rgba(255,255,255,0.05)', borderColor: 'whiteAlpha.200', transform: 'translateX(2px)' }}
                    >
                      {/* Rank + name + badge */}
                      <HStack justify="space-between" mb={2}>
                        <HStack spacing={2}>
                          <Text
                            fontSize="10px"
                            fontWeight="900"
                            fontFamily="mono"
                            color="whiteAlpha.300"
                            w="18px"
                          >
                            #{idx + 1}
                          </Text>
                          <Text fontSize="xs" fontWeight="700" color="white" noOfLines={1}>
                            {row.nome}
                          </Text>
                        </HStack>
                        <Box
                          px={1.5} py={0.5}
                          borderRadius="full"
                          border="1px solid"
                          style={{ borderColor: color + '60', backgroundColor: color + '18' }}
                        >
                          <Text fontSize="9px" fontWeight="700" style={{ color }}>
                            {row.severidade}
                          </Text>
                        </Box>
                      </HStack>

                      {/* Type + score */}
                      <HStack justify="space-between" mb={2}>
                        <HStack spacing={1}>
                          <MapPin size={9} color="rgba(255,255,255,0.25)" />
                          <Text fontSize="10px" color="whiteAlpha.400" noOfLines={1}>{row.tipoRisco}</Text>
                        </HStack>
                        <Text
                          fontSize="sm"
                          fontWeight="900"
                          fontFamily="mono"
                          style={{ color }}
                        >
                          {row.score}
                        </Text>
                      </HStack>

                      {/* Progress bar */}
                      <Progress
                        value={row.score}
                        size="xs"
                        borderRadius="full"
                        bg="whiteAlpha.100"
                        colorScheme={row.score > 80 ? 'red' : row.score > 50 ? 'orange' : 'blue'}
                      />
                    </Box>
                  );
                })}
              </VStack>
            )}
          </Box>
        </Flex>
      </Flex>
    </Flex>
  );
}
