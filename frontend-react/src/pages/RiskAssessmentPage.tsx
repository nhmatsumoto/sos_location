import { useEffect, useState, useMemo } from 'react';
import {
  ShieldAlert, RefreshCw, Zap, Search, ChevronDown, ChevronUp,
  Thermometer, Droplets, Activity, AlertTriangle, Globe, Clock,
} from 'lucide-react';
import {
  Box, Flex, VStack, HStack, SimpleGrid, Text, Badge,
  Spinner, Divider, useToast, Input, InputGroup,
  InputLeftElement,
} from '@chakra-ui/react';
import { riskApi, type RiskAssessment, type RiskScore } from '../services/riskApi';
import { GlassPanel } from '../components/atoms/GlassPanel';
import { TacticalText } from '../components/atoms/TacticalText';
import { TacticalButton } from '../components/atoms/TacticalButton';

// ── Severity helpers ──────────────────────────────────────────────────────────
const SEV_COLOR: Record<string, string> = {
  critical: '#FF3B30',
  high:     '#FF9500',
  medium:   '#FFD60A',
  low:      '#34C759',
};

const SEV_BG: Record<string, string> = {
  critical: 'rgba(255,59,48,0.12)',
  high:     'rgba(255,149,0,0.12)',
  medium:   'rgba(255,214,10,0.10)',
  low:      'rgba(52,199,89,0.10)',
};

const SEV_LABEL: Record<string, string> = {
  critical: 'CRÍTICO',
  high:     'ALTO',
  medium:   'MÉDIO',
  low:      'BAIXO',
};

const LEVELS = ['all', 'critical', 'high', 'medium', 'low'] as const;
type LevelFilter = typeof LEVELS[number];

// ── Sub-components ────────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: string }) {
  const color = SEV_COLOR[severity] ?? '#8E8E93';
  const bg    = SEV_BG[severity]    ?? 'rgba(255,255,255,0.06)';
  return (
    <Badge
      bg={bg} color={color}
      border="1px solid" borderColor={`${color}44`}
      borderRadius="full" px={2} py={0.5}
      fontSize="9px" fontWeight="black" letterSpacing="widest"
    >
      {SEV_LABEL[severity] ?? severity.toUpperCase()}
    </Badge>
  );
}

function StatCard({
  label, value, color, bg,
}: { label: string; value: number; color: string; bg: string }) {
  return (
    <GlassPanel depth="raised" p={5} direction="column" gap={1} borderRadius="2xl">
      <HStack spacing={2} mb={1}>
        <Box w="8px" h="8px" borderRadius="full" bg={color} boxShadow={`0 0 6px ${color}`} />
        <TacticalText variant="subheading" fontSize="9px">{label}</TacticalText>
      </HStack>
      <Text
        fontSize="3xl" fontWeight="black" fontFamily="mono"
        color={color} lineHeight={1}
        textShadow={`0 0 20px ${bg}`}
      >
        {value}
      </Text>
      <Text fontSize="10px" color="whiteAlpha.300">locais monitorados</Text>
    </GlassPanel>
  );
}

function ScoreBar({ value, severity }: { value: number; severity: string }) {
  const color = SEV_COLOR[severity] ?? '#8E8E93';
  return (
    <Box w="80px" h="4px" borderRadius="full" bg="rgba(255,255,255,0.06)" flexShrink={0}>
      <Box
        h="100%" borderRadius="full"
        bg={color} boxShadow={`0 0 6px ${color}88`}
        w={`${Math.round(value * 100)}%`}
        transition="width 0.4s ease"
      />
    </Box>
  );
}

function RiskItem({
  item, isSelected, onSelect,
}: { item: RiskScore; isSelected: boolean; onSelect: () => void }) {
  const color = SEV_COLOR[item.severity] ?? '#8E8E93';
  return (
    <Box
      as="button"
      w="100%"
      textAlign="left"
      px={4} py={3}
      cursor="pointer"
      transition="background 0.15s"
      bg={isSelected ? 'rgba(0,122,255,0.08)' : 'transparent'}
      borderLeft="2px solid"
      borderColor={isSelected ? 'rgba(0,122,255,0.6)' : 'transparent'}
      _hover={{ bg: isSelected ? 'rgba(0,122,255,0.10)' : 'rgba(255,255,255,0.03)' }}
      onClick={onSelect}
    >
      <Flex align="center" gap={3}>
        <Box w="6px" h="6px" borderRadius="full" bg={color} boxShadow={`0 0 5px ${color}`} flexShrink={0} />
        <VStack align="flex-start" spacing={0} flex={1} minW={0}>
          <Text fontSize="xs" fontWeight="bold" color="white" noOfLines={1}>{item.location}</Text>
          <Text fontSize="10px" color="whiteAlpha.400" noOfLines={1}>{item.country}</Text>
        </VStack>
        <VStack align="flex-end" spacing={1} flexShrink={0}>
          <Text fontSize="xs" fontFamily="mono" fontWeight="black" color={color}>
            {Math.round(item.riskScore * 100)}%
          </Text>
          <ScoreBar value={item.riskScore} severity={item.severity} />
        </VStack>
      </Flex>
    </Box>
  );
}

function FactorsPanel({ item }: { item: RiskScore }) {
  const color = SEV_COLOR[item.severity] ?? '#8E8E93';
  const f = item.factors;
  return (
    <VStack align="stretch" spacing={4} p={5}>
      <Flex justify="space-between" align="flex-start">
        <VStack align="flex-start" spacing={0.5}>
          <TacticalText variant="heading" fontSize="sm">{item.location}</TacticalText>
          <HStack spacing={1.5}>
            <Globe size={11} color="rgba(255,255,255,0.3)" />
            <Text fontSize="11px" color="whiteAlpha.400">{item.country}</Text>
          </HStack>
        </VStack>
        <SeverityBadge severity={item.severity} />
      </Flex>

      <Divider borderColor="whiteAlpha.100" />

      {/* Score gauge */}
      <GlassPanel depth="base" p={4} borderRadius="xl" direction="column" gap={3}>
        <TacticalText variant="subheading" fontSize="9px">Score de Risco</TacticalText>
        <Flex align="center" gap={4}>
          <Text fontSize="4xl" fontWeight="black" fontFamily="mono" color={color} lineHeight={1}>
            {Math.round(item.riskScore * 100)}
          </Text>
          <VStack align="flex-start" spacing={1} flex={1}>
            <Text fontSize="9px" color="whiteAlpha.400">/ 100</Text>
            <Box w="100%" h="6px" borderRadius="full" bg="rgba(255,255,255,0.06)">
              <Box
                h="100%" borderRadius="full" bg={color}
                boxShadow={`0 0 8px ${color}88`}
                w={`${Math.round(item.riskScore * 100)}%`}
              />
            </Box>
          </VStack>
        </Flex>
      </GlassPanel>

      {/* Environmental factors */}
      {f && (
        <GlassPanel depth="base" p={4} borderRadius="xl" direction="column" gap={3}>
          <TacticalText variant="subheading" fontSize="9px">Fatores Ambientais</TacticalText>
          <SimpleGrid columns={3} spacing={3}>
            <VStack spacing={1}>
              <Box p={2} bg="rgba(0,122,255,0.10)" borderRadius="lg">
                <Thermometer size={14} color="#007AFF" />
              </Box>
              <Text fontSize="lg" fontFamily="mono" fontWeight="black" color="white">
                {f.environmental.temp.toFixed(1)}°
              </Text>
              <Text fontSize="9px" color="whiteAlpha.400">Temperatura</Text>
            </VStack>
            <VStack spacing={1}>
              <Box p={2} bg="rgba(52,199,89,0.10)" borderRadius="lg">
                <Droplets size={14} color="#34C759" />
              </Box>
              <Text fontSize="lg" fontFamily="mono" fontWeight="black" color="white">
                {f.environmental.humidity.toFixed(0)}%
              </Text>
              <Text fontSize="9px" color="whiteAlpha.400">Umidade</Text>
            </VStack>
            <VStack spacing={1}>
              <Box p={2} bg="rgba(255,149,0,0.10)" borderRadius="lg">
                <Activity size={14} color="#FF9500" />
              </Box>
              <Text fontSize="lg" fontFamily="mono" fontWeight="black" color="white">
                {f.environmental.seismic.toFixed(3)}
              </Text>
              <Text fontSize="9px" color="whiteAlpha.400">Sísmico</Text>
            </VStack>
          </SimpleGrid>
        </GlassPanel>
      )}

      {/* Alert count */}
      {f && (
        <GlassPanel depth="base" p={4} borderRadius="xl" direction="row" align="center" gap={3}>
          <Box p={2} bg="rgba(255,59,48,0.10)" borderRadius="lg" flexShrink={0}>
            <AlertTriangle size={14} color="#FF3B30" />
          </Box>
          <VStack align="flex-start" spacing={0}>
            <Text fontSize="xs" fontWeight="bold" color="white">{f.alertCount} alerta{f.alertCount !== 1 ? 's' : ''} ativos</Text>
            {f.alertsSample.length > 0 && (
              <Text fontSize="10px" color="whiteAlpha.400" noOfLines={2}>{f.alertsSample[0]}</Text>
            )}
          </VStack>
        </GlassPanel>
      )}

      {/* Coords */}
      {item.lat != null && item.lon != null && (
        <Text fontSize="10px" fontFamily="mono" color="whiteAlpha.300">
          {item.lat.toFixed(4)}, {item.lon.toFixed(4)}
        </Text>
      )}

      {/* Last updated */}
      {item.lastUpdated && (
        <HStack spacing={1.5}>
          <Clock size={10} color="rgba(255,255,255,0.2)" />
          <Text fontSize="10px" color="whiteAlpha.300">
            {new Date(item.lastUpdated).toLocaleString('pt-BR')}
          </Text>
        </HStack>
      )}
    </VStack>
  );
}

function LevelDistribution({ data }: { data: RiskAssessment }) {
  const { analytics } = data;
  const total = analytics.totalLocations || 1;
  const bars = [
    { key: 'critical', label: 'Crítico', count: analytics.criticalCount },
    { key: 'high',     label: 'Alto',    count: analytics.highCount     },
    { key: 'medium',   label: 'Médio',   count: analytics.mediumCount   },
    { key: 'low',      label: 'Baixo',   count: analytics.lowCount      },
  ];

  return (
    <GlassPanel depth="base" p={5} direction="column" gap={4} borderRadius="2xl">
      <TacticalText variant="subheading" fontSize="9px">Distribuição por Nível</TacticalText>
      <VStack align="stretch" spacing={3}>
        {bars.map(b => (
          <Flex key={b.key} align="center" gap={3}>
            <Text fontSize="10px" color="whiteAlpha.500" w="52px" textAlign="right" flexShrink={0}>{b.label}</Text>
            <Box flex={1} h="6px" borderRadius="full" bg="rgba(255,255,255,0.05)">
              <Box
                h="100%" borderRadius="full"
                bg={SEV_COLOR[b.key]}
                boxShadow={`0 0 6px ${SEV_COLOR[b.key]}66`}
                w={`${Math.round((b.count / total) * 100)}%`}
                transition="width 0.5s ease"
              />
            </Box>
            <Text fontSize="10px" fontFamily="mono" fontWeight="bold" color={SEV_COLOR[b.key]} w="28px" flexShrink={0}>
              {b.count}
            </Text>
          </Flex>
        ))}
      </VStack>
    </GlassPanel>
  );
}

function TopRisks({ items, onSelect }: { items: RiskScore[]; onSelect: (item: RiskScore) => void }) {
  const top5 = items.slice(0, 5);
  return (
    <GlassPanel depth="base" p={5} direction="column" gap={3} borderRadius="2xl">
      <TacticalText variant="subheading" fontSize="9px">Top 5 — Maior Risco</TacticalText>
      <VStack align="stretch" spacing={0}>
        {top5.map((item, i) => {
          const color = SEV_COLOR[item.severity] ?? '#8E8E93';
          return (
            <Flex
              key={`${item.country}-${item.location}`}
              as="button"
              align="center" gap={3}
              px={3} py={2.5}
              borderRadius="xl"
              cursor="pointer"
              transition="background 0.15s"
              _hover={{ bg: 'rgba(255,255,255,0.04)' }}
              onClick={() => onSelect(item)}
            >
              <Text fontSize="10px" fontFamily="mono" color="whiteAlpha.300" w="16px" flexShrink={0}>
                {String(i + 1).padStart(2, '0')}
              </Text>
              <VStack align="flex-start" spacing={0} flex={1} minW={0}>
                <Text fontSize="xs" fontWeight="bold" color="white" noOfLines={1}>{item.location}</Text>
                <Text fontSize="10px" color="whiteAlpha.400">{item.country}</Text>
              </VStack>
              <Text fontSize="sm" fontFamily="mono" fontWeight="black" color={color}>
                {Math.round(item.riskScore * 100)}%
              </Text>
            </Flex>
          );
        })}
      </VStack>
    </GlassPanel>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function RiskAssessmentPage() {
  const [loading,    setLoading]    = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [assessment, setAssessment] = useState<RiskAssessment | null>(null);
  const [selected,   setSelected]   = useState<RiskScore | null>(null);
  const [filter,     setFilter]     = useState<LevelFilter>('all');
  const [search,     setSearch]     = useState('');
  const toast = useToast();

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const data = await riskApi.getAssessment();
      setAssessment(data);
      if (!selected && data.riskMap.length > 0) setSelected(data.riskMap[0]);
    } catch {
      toast({
        title:       'Falha na Matriz de Risco',
        description: 'Não foi possível carregar os dados de análise.',
        status:      'error',
        duration:    5000,
        isClosable:  true,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const handleSync = async () => {
    setRefreshing(true);
    try {
      const res = await riskApi.pipelineSync();
      toast({ title: res.message, status: res.status === 'sync_requested' ? 'success' : 'warning', duration: 4000 });
      await load(true);
    } catch {
      toast({ title: 'Erro ao sincronizar pipeline', status: 'error', duration: 3000 });
      setRefreshing(false);
    }
  };

  const filtered = useMemo(() => {
    if (!assessment) return [];
    let list = assessment.riskMap;
    if (filter !== 'all') list = list.filter(r => r.severity === filter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(r =>
        r.location.toLowerCase().includes(q) || r.country.toLowerCase().includes(q)
      );
    }
    return list;
  }, [assessment, filter, search]);

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Flex h="100%" w="100%" align="center" justify="center" bg="sos.dark" direction="column" gap={4}>
        <Spinner size="lg" color="rgba(255,149,0,0.8)" thickness="3px" />
        <TacticalText variant="mono" color="whiteAlpha.400">CARREGANDO MATRIZ DE RISCO...</TacticalText>
      </Flex>
    );
  }

  const analytics = assessment?.analytics;

  return (
    <Box h="100%" w="100%" bg="sos.dark" overflowY="auto" p={{ base: 4, md: 6 }}>
      <VStack spacing={6} align="stretch" maxW="1500px" mx="auto">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <Flex justify="space-between" align="center" flexWrap="wrap" gap={4}>
          <HStack spacing={4}>
            <Box p={3} bg="rgba(255,149,0,0.10)" borderRadius="2xl" boxShadow="0 0 24px rgba(255,149,0,0.15)">
              <ShieldAlert size={20} color="#FF9500" />
            </Box>
            <VStack align="flex-start" spacing={0.5}>
              <TacticalText variant="heading" fontSize="lg">Matriz de Risco</TacticalText>
              <HStack spacing={3}>
                <HStack spacing={1.5}>
                  <Box w={1.5} h={1.5} borderRadius="full" bg="#34C759" />
                  <TacticalText variant="mono" fontSize="9px" color="whiteAlpha.400">ENGINE ATIVO</TacticalText>
                </HStack>
                {assessment?.generatedAt && (
                  <>
                    <Text fontSize="9px" color="whiteAlpha.200">·</Text>
                    <HStack spacing={1}>
                      <Clock size={9} color="rgba(255,255,255,0.25)" />
                      <Text fontSize="9px" fontFamily="mono" color="whiteAlpha.300">
                        {new Date(assessment.generatedAt).toLocaleTimeString('pt-BR')}
                      </Text>
                    </HStack>
                  </>
                )}
              </HStack>
            </VStack>
          </HStack>

          <HStack spacing={3}>
            {refreshing && <Spinner size="xs" color="whiteAlpha.400" />}
            <TacticalButton
              height="36px" px={4} fontSize="10px" gap={1.5}
              onClick={() => void load(true)}
              isDisabled={refreshing}
            >
              <RefreshCw size={13} /> RECALCULAR
            </TacticalButton>
            <TacticalButton
              height="36px" px={4} fontSize="10px" gap={1.5} glow
              bg="rgba(255,149,0,0.15)"
              borderColor="rgba(255,149,0,0.35)"
              _hover={{ bg: 'rgba(255,149,0,0.25)', borderColor: 'rgba(255,149,0,0.55)' }}
              onClick={() => void handleSync()}
              isDisabled={refreshing}
            >
              <Zap size={13} /> SINC PIPELINE
            </TacticalButton>
          </HStack>
        </Flex>

        {/* ── Stats cards ─────────────────────────────────────────────────── */}
        {analytics && (
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
            <StatCard label="CRÍTICO" value={analytics.criticalCount} color={SEV_COLOR.critical} bg={SEV_BG.critical} />
            <StatCard label="ALTO"    value={analytics.highCount}     color={SEV_COLOR.high}     bg={SEV_BG.high}     />
            <StatCard label="MÉDIO"   value={analytics.mediumCount}   color={SEV_COLOR.medium}   bg={SEV_BG.medium}   />
            <StatCard label="BAIXO"   value={analytics.lowCount}      color={SEV_COLOR.low}      bg={SEV_BG.low}      />
          </SimpleGrid>
        )}

        {/* ── Main content ────────────────────────────────────────────────── */}
        {assessment ? (
          <Flex gap={4} align="flex-start" flexDirection={{ base: 'column', lg: 'row' }}>

            {/* Left — Filtered list */}
            <GlassPanel depth="raised" direction="column" borderRadius="2xl" overflow="hidden"
              w={{ base: '100%', lg: '340px' }} minW={{ lg: '300px' }} flexShrink={0}
            >
              {/* Search */}
              <Box px={4} pt={4} pb={2}>
                <InputGroup size="sm">
                  <InputLeftElement pointerEvents="none">
                    <Search size={12} color="rgba(255,255,255,0.25)" />
                  </InputLeftElement>
                  <Input
                    placeholder="Buscar localização..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    bg="rgba(255,255,255,0.04)"
                    border="1px solid" borderColor="whiteAlpha.100"
                    borderRadius="lg" color="white" fontSize="xs"
                    _placeholder={{ color: 'whiteAlpha.250' }}
                    _focus={{ borderColor: 'rgba(255,149,0,0.4)', boxShadow: '0 0 0 1px rgba(255,149,0,0.2)' }}
                    _hover={{ borderColor: 'whiteAlpha.200' }}
                    pl="30px"
                  />
                </InputGroup>
              </Box>

              {/* Level filter tabs */}
              <Flex px={4} pb={3} gap={1.5} flexWrap="wrap">
                {LEVELS.map(lv => {
                  const active = filter === lv;
                  const color  = lv === 'all' ? '#8E8E93' : SEV_COLOR[lv];
                  return (
                    <Box
                      key={lv}
                      as="button"
                      px={2.5} py={1}
                      borderRadius="full"
                      fontSize="9px"
                      fontWeight="black"
                      letterSpacing="widest"
                      textTransform="uppercase"
                      border="1px solid"
                      cursor="pointer"
                      transition="all 0.15s"
                      bg={active ? `${color}22` : 'transparent'}
                      borderColor={active ? `${color}55` : 'whiteAlpha.100'}
                      color={active ? color : 'whiteAlpha.400'}
                      _hover={{ borderColor: `${color}44`, color }}
                      onClick={() => setFilter(lv)}
                    >
                      {lv === 'all' ? 'TODOS' : SEV_LABEL[lv]}
                    </Box>
                  );
                })}
              </Flex>

              <Divider borderColor="whiteAlpha.100" />

              {/* List */}
              <Box overflowY="auto" maxH="520px">
                {filtered.length === 0 ? (
                  <Flex direction="column" align="center" justify="center" py={12} gap={2}>
                    <ShieldAlert size={24} color="rgba(255,255,255,0.10)" />
                    <Text fontSize="xs" color="whiteAlpha.300">Nenhum local encontrado</Text>
                  </Flex>
                ) : (
                  filtered.map(item => (
                    <RiskItem
                      key={`${item.country}-${item.location}`}
                      item={item}
                      isSelected={selected?.location === item.location && selected?.country === item.country}
                      onSelect={() => setSelected(item)}
                    />
                  ))
                )}
              </Box>

              {/* Count footer */}
              <Box px={4} py={2} borderTop="1px solid" borderColor="whiteAlpha.100">
                <Text fontSize="10px" fontFamily="mono" color="whiteAlpha.300">
                  {filtered.length} de {assessment.riskMap.length} locais
                </Text>
              </Box>
            </GlassPanel>

            {/* Right — Detail + overview */}
            <VStack flex={1} spacing={4} align="stretch" minW={0}>

              {/* Selected item detail */}
              {selected ? (
                <GlassPanel depth="raised" direction="column" borderRadius="2xl" overflow="hidden">
                  <FactorsPanel item={selected} />
                </GlassPanel>
              ) : (
                <GlassPanel depth="raised" direction="column" align="center" justify="center"
                  p={10} borderRadius="2xl" minH="160px"
                >
                  <Text fontSize="xs" color="whiteAlpha.300">Selecione uma localização para ver os detalhes</Text>
                </GlassPanel>
              )}

              {/* Level distribution */}
              <LevelDistribution data={assessment} />

              {/* Top 5 */}
              <TopRisks items={assessment.riskMap} onSelect={setSelected} />

            </VStack>
          </Flex>
        ) : (
          <GlassPanel depth="raised" p={16} borderRadius="2xl" direction="column" align="center" justify="center" gap={4}>
            <ShieldAlert size={36} color="rgba(255,255,255,0.08)" />
            <TacticalText variant="subheading">Sem dados de risco disponíveis</TacticalText>
            <TacticalButton height="36px" px={4} fontSize="10px" onClick={() => void load()}>
              <RefreshCw size={13} /> Tentar novamente
            </TacticalButton>
          </GlassPanel>
        )}

      </VStack>
    </Box>
  );
}
