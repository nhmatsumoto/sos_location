import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Layers,
  MapPin,
  RefreshCw,
} from 'lucide-react';
import {
  Box,
  Button,
  HStack,
  Select,
  Text,
  VStack,
} from '@chakra-ui/react';
import { hotspotsApi, type HotspotApi } from '../../../services/hotspotsApi';
import { useNotifications } from '../../../context/useNotifications';
import { MapPanel } from '../../../components/features/maps/MapPanel';
import {
  MetricCard,
  PageEmptyState,
  PageHeader,
  PageLoadingState,
  PagePanel,
} from '../../../components/layout/PagePrimitives';
import {
  ShellSectionEyebrow,
  ShellTelemetryBadge,
} from '../../../components/layout/ShellPrimitives';

const getSeverityColor = (severity: string) => {
  const normalized = severity.toLowerCase();
  if (normalized.includes('emergencia') || normalized.includes('tier 1') || normalized.includes('crítico')) return '#FF3B30';
  if (normalized.includes('alerta') || normalized.includes('tier 2') || normalized.includes('alto')) return '#FF9500';
  return '#0A84FF';
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

  useEffect(() => {
    void load();
  }, [load]);

  const types = useMemo(() => Array.from(new Set(raw.map((hotspot) => hotspot.type).filter(Boolean))), [raw]);
  const severities = useMemo(
    () => Array.from(new Set(raw.map((hotspot) => hotspot.urgency).filter(Boolean))),
    [raw],
  );

  const filtered = useMemo(
    () =>
      raw
        .filter(
          (hotspot) =>
            (!filterType || hotspot.type === filterType) &&
            (!filterSeverity || hotspot.urgency === filterSeverity),
        )
        .map((hotspot) => ({
          id: hotspot.id,
          name: `Setor ${hotspot.id.slice(0, 4).toUpperCase()}`,
          type: hotspot.type,
          severity: hotspot.urgency || 'Normal',
          score: Math.round(hotspot.score),
          estimatedAffected: hotspot.estimatedAffected,
        }))
        .sort((left, right) => right.score - left.score),
    [raw, filterSeverity, filterType],
  );

  const averageScore = filtered.length > 0
    ? Math.round(filtered.reduce((sum, hotspot) => sum + hotspot.score, 0) / filtered.length)
    : 0;
  const highRiskCount = filtered.filter((hotspot) => hotspot.score >= 80).length;
  const impactedPeople = filtered.reduce((sum, hotspot) => sum + hotspot.estimatedAffected, 0);

  return (
    <Box
      h="full"
      overflowY="auto"
      px={{ base: 4, md: 6, xl: 8 }}
      py={{ base: 4, md: 6 }}
      bgGradient="radial(circle at top left, rgba(255,149,0,0.08), transparent 20%), radial(circle at bottom right, rgba(0,122,255,0.08), transparent 24%), linear(to-b, #030712 0%, #07111f 55%, #08121d 100%)"
    >
      <VStack maxW="7xl" mx="auto" spacing={6} align="stretch">
        <PageHeader
          icon={AlertTriangle}
          eyebrow="HOTSPOT_ENGINE // RISK_DENSITY // PRIORITY_ZONES"
          title="Painel de hotspots com recorte espacial, severidade e priorização de intervenção"
          description="A tela foi redesenhada para cruzar mapa, lista e filtros sem competir pela atenção do operador."
          meta={
            <>
              <ShellTelemetryBadge tone="critical">{highRiskCount} críticos</ShellTelemetryBadge>
              <ShellTelemetryBadge tone="warning">{filtered.length} zonas visíveis</ShellTelemetryBadge>
              <ShellTelemetryBadge tone="info">{impactedPeople} pessoas estimadas</ShellTelemetryBadge>
            </>
          }
          actions={
            <Button
              leftIcon={<RefreshCw size={16} />}
              variant="ghost"
              onClick={() => void load()}
              isLoading={loading}
            >
              Recarregar análise
            </Button>
          }
        />

        <HStack spacing={4} align="stretch" flexWrap="wrap">
          <MetricCard
            flex="1"
            minW={{ base: 'full', md: '220px' }}
            label="Hotspots"
            value={filtered.length}
            helper="Zonas retornadas após os filtros atuais"
            icon={Layers}
            tone="info"
          />
          <MetricCard
            flex="1"
            minW={{ base: 'full', md: '220px' }}
            label="Risco médio"
            value={averageScore}
            helper="Pontuação média de criticidade"
            icon={Activity}
            tone={averageScore >= 70 ? 'warning' : 'default'}
          />
          <MetricCard
            flex="1"
            minW={{ base: 'full', md: '220px' }}
            label="População estimada"
            value={impactedPeople}
            helper="Pessoas potencialmente expostas"
            icon={MapPin}
            tone="critical"
          />
        </HStack>

        <PagePanel
          title="Recorte analítico"
          description="Ajuste o tipo de risco e a severidade para reduzir ruído no quadro."
          icon={Layers}
          tone="info"
        >
          <HStack spacing={4} flexWrap="wrap" align="flex-end">
            <Box flex="1" minW={{ base: 'full', md: '260px' }}>
              <ShellSectionEyebrow mb={2}>Tipo de risco</ShellSectionEyebrow>
              <Select value={filterType} onChange={(event) => setFilterType(event.target.value)}>
                <option value="">Todos os riscos</option>
                {types.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </Select>
            </Box>
            <Box flex="1" minW={{ base: 'full', md: '260px' }}>
              <ShellSectionEyebrow mb={2}>Severidade</ShellSectionEyebrow>
              <Select value={filterSeverity} onChange={(event) => setFilterSeverity(event.target.value)}>
                <option value="">Todas</option>
                {severities.map((severity) => (
                  <option key={severity} value={severity}>
                    {severity}
                  </option>
                ))}
              </Select>
            </Box>
            <Button
              variant="outline"
              onClick={() => {
                setFilterType('');
                setFilterSeverity('');
              }}
            >
              Limpar filtros
            </Button>
          </HStack>
        </PagePanel>

        <Box display="grid" gridTemplateColumns={{ base: '1fr', xl: '1.7fr minmax(320px, 420px)' }} gap={6}>
          <Box position="relative">
            <MapPanel
              title="Distribuição espacial de riscos"
              rightSlot={<ShellTelemetryBadge tone="warning">{filtered.length} zonas</ShellTelemetryBadge>}
            />

            <Box position="absolute" left={6} bottom={6} zIndex={10} maxW="240px">
              <PagePanel title="Legenda" tone="default" p={4}>
                <VStack align="stretch" spacing={2.5}>
                  <LegendItem color="#FF3B30" label="Emergência" />
                  <LegendItem color="#FF9500" label="Alerta alto" />
                  <LegendItem color="#0A84FF" label="Monitoramento" />
                </VStack>
              </PagePanel>
            </Box>
          </Box>

          <PagePanel
            title="Prioridades de intervenção"
            description="Lista ordenada por score para orientar reconhecimento e despacho."
            icon={Activity}
            tone="default"
          >
            {loading ? (
              <PageLoadingState
                minH="420px"
                label="Processando sensores"
                description="A análise está consolidando dados de criticidade e exposição."
              />
            ) : filtered.length === 0 ? (
              <PageEmptyState
                minH="420px"
                title="Nenhum hotspot disponível"
                description="Ajuste os filtros ou aguarde uma nova rodada do motor de análise."
              />
            ) : (
              <VStack
                align="stretch"
                spacing={3}
                maxH={{ xl: '640px' }}
                overflowY="auto"
                pr={1}
                sx={{
                  '&::-webkit-scrollbar': { width: '8px' },
                  '&::-webkit-scrollbar-thumb': {
                    background: 'rgba(255,255,255,0.12)',
                    borderRadius: '999px',
                  },
                }}
              >
                {filtered.map((row, index) => {
                  const color = getSeverityColor(row.severity);
                  return (
                    <Box
                      key={row.id}
                      p={4}
                      borderRadius="2xl"
                      bg="surface.interactive"
                      border="1px solid"
                      borderColor="border.subtle"
                      transition="all 0.2s"
                      _hover={{ bg: 'surface.interactiveHover', borderColor: 'border.strong' }}
                    >
                      <VStack align="stretch" spacing={3}>
                        <HStack justify="space-between" align="flex-start" spacing={3}>
                          <HStack spacing={3} align="flex-start">
                            <Text
                              fontSize="xs"
                              fontWeight="700"
                              fontFamily="mono"
                              color="text.tertiary"
                              pt={0.5}
                            >
                              #{index + 1}
                            </Text>
                            <VStack align="flex-start" spacing={1}>
                              <Text fontSize="sm" fontWeight="700" color="white">
                                {row.name}
                              </Text>
                              <Text fontSize="sm" color="text.secondary">
                                {row.type}
                              </Text>
                            </VStack>
                          </HStack>
                          <ShellTelemetryBadge
                            tone={row.score >= 80 ? 'critical' : row.score >= 55 ? 'warning' : 'info'}
                          >
                            {row.severity}
                          </ShellTelemetryBadge>
                        </HStack>

                        <HStack justify="space-between" flexWrap="wrap" spacing={3}>
                          <Text fontSize="sm" color="text.secondary">
                            Afetados estimados: {row.estimatedAffected}
                          </Text>
                          <Text fontSize="lg" fontWeight="700" color={color}>
                            {row.score}
                          </Text>
                        </HStack>

                        <Box>
                          <Box h={2} borderRadius="full" bg="rgba(255,255,255,0.06)" overflow="hidden">
                            <Box h="full" borderRadius="full" bg={color} width={`${Math.max(row.score, 6)}%`} />
                          </Box>
                        </Box>
                      </VStack>
                    </Box>
                  );
                })}
              </VStack>
            )}
          </PagePanel>
        </Box>
      </VStack>
    </Box>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <HStack spacing={3}>
      <Box w={2.5} h={2.5} borderRadius="full" bg={color} boxShadow={`0 0 6px ${color}`} />
      <Text fontSize="sm" color="white">
        {label}
      </Text>
    </HStack>
  );
}
