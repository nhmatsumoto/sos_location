import { useMemo } from 'react';
import {
  Activity,
  AlertCircle,
  Clock3,
  Droplets,
  ExternalLink,
  Flame,
  Globe,
  Mountain,
  RefreshCw,
  ShieldCheck,
  Wind,
} from 'lucide-react';
import {
  Box,
  Button,
  HStack,
  SimpleGrid,
  Text,
  VStack,
} from '@chakra-ui/react';
import { useGlobalDisasters, type GlobalEvent } from '../../../hooks/useGlobalDisasters';
import {
  MetricCard,
  PageEmptyState,
  PageHeader,
  PageLoadingState,
  PagePanel,
} from '../../../components/layout/PagePrimitives';
import {
  ShellLiveIndicator,
  ShellTelemetryBadge,
} from '../../../components/layout/ShellPrimitives';

const eventTypeIcon = {
  Earthquake: Activity,
  Cyclone: Wind,
  Flood: Droplets,
  Wildfire: Flame,
  Volcano: Mountain,
} as const;

const severityTone = {
  Critical: 'critical',
  High: 'warning',
  Medium: 'info',
  Low: 'default',
} as const;

const severityColor = {
  Critical: 'sos.red.300',
  High: 'sos.amber.300',
  Medium: 'sos.blue.300',
  Low: 'text.secondary',
} as const;

export function GlobalDisastersPage() {
  const { events, loading, error, reload, lastLoadedAt } = useGlobalDisasters();

  const renderedAtMs = useMemo(
    () => (lastLoadedAt ? Date.parse(lastLoadedAt) : undefined),
    [lastLoadedAt],
  );
  const highImpactCount = events.filter((event) => ['Critical', 'High'].includes(event.severity)).length;
  const countriesCount = new Set(events.map((event) => event.countryCode).filter(Boolean)).size;
  const eventTypesCount = new Set(events.map((event) => event.type)).size;

  const syncLabel = useMemo(
    () => (lastLoadedAt ? new Date(lastLoadedAt).toLocaleTimeString() : 'aguardando'),
    [lastLoadedAt],
  );

  return (
    <Box
      h="full"
      overflowY="auto"
      px={{ base: 4, md: 6, xl: 8 }}
      py={{ base: 4, md: 6 }}
      bgGradient="radial(circle at top left, rgba(0,122,255,0.10), transparent 20%), radial(circle at bottom right, rgba(255,149,0,0.08), transparent 24%), linear(to-b, #030712 0%, #07111f 55%, #08121d 100%)"
    >
      <VStack maxW="7xl" mx="auto" spacing={6} align="stretch">
        <PageHeader
          icon={Globe}
          eyebrow="GLOBAL_MONITORING // DISASTER_FEED // STRATEGIC_AWARENESS"
          title="Monitoramento global com foco em eventos, países impactados e severidade"
          description="A tela foi reorganizada para leitura executiva: métricas no topo, feed internacional em cards e sincronização clara do estado do sistema."
          meta={
            <>
              <ShellLiveIndicator label="feed internacional ativo" />
              <ShellTelemetryBadge tone="info">última sincronização {syncLabel}</ShellTelemetryBadge>
            </>
          }
          actions={
            <Button
              leftIcon={<RefreshCw size={16} />}
              variant="ghost"
              onClick={() => void reload()}
              isLoading={loading}
            >
              Atualizar feed
            </Button>
          }
        />

        <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacing={4}>
          <MetricCard
            label="Eventos ativos"
            value={events.length}
            helper="Ocorrências internacionais válidas no feed"
            icon={Activity}
            tone="critical"
          />
          <MetricCard
            label="High impact"
            value={highImpactCount}
            helper="Eventos com severidade alta ou crítica"
            icon={AlertCircle}
            tone="warning"
          />
          <MetricCard
            label="Países em alerta"
            value={countriesCount}
            helper="Países distintos presentes no monitoramento"
            icon={ShieldCheck}
            tone="success"
          />
          <MetricCard
            label="Tipos de ameaça"
            value={eventTypesCount}
            helper="Categorias de desastre visíveis no feed"
            icon={Globe}
            tone="info"
          />
        </SimpleGrid>

        <PagePanel
          title="Feed internacional priorizado"
          description="Cada card destaca natureza do evento, severidade, localização e tempo desde o último disparo conhecido."
          icon={Globe}
          tone="default"
        >
          {loading ? (
            <PageLoadingState
              minH="420px"
              label="Coletando inteligência internacional"
              description="O shell está consolidando o feed externo de desastres."
            />
          ) : error ? (
            <PageEmptyState
              minH="420px"
              title="Feed indisponível"
              description={error}
              tone="critical"
              action={
                <Button variant="tactical" onClick={() => void reload()}>
                  Tentar novamente
                </Button>
              }
            />
          ) : events.length === 0 ? (
            <PageEmptyState
              minH="420px"
              title="Nenhum evento global disponível"
              description="O feed retornou vazio para a janela atual."
            />
          ) : (
            <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={5}>
              {events.map((event) => (
                <GlobalEventCard key={event.id} event={event} renderedAtMs={renderedAtMs} />
              ))}
            </SimpleGrid>
          )}
        </PagePanel>
      </VStack>
    </Box>
  );
}

function GlobalEventCard({
  event,
  renderedAtMs,
}: {
  event: GlobalEvent;
  renderedAtMs?: number;
}) {
  const EventIcon = eventTypeIcon[event.type] ?? AlertCircle;
  const tone = severityTone[event.severity];
  const color = severityColor[event.severity];
  const eventMs = Date.parse(event.timestamp);
  const minutesAgo = Number.isFinite(eventMs) && typeof renderedAtMs === 'number'
    ? `${Math.max(0, Math.floor((renderedAtMs - eventMs) / 60_000))}m atrás`
    : 'agora';

  return (
    <Box
      p={5}
      borderRadius="3xl"
      bg="surface.panel"
      border="1px solid"
      borderColor="border.subtle"
      boxShadow="panel"
      transition="all 0.2s"
      _hover={{ transform: 'translateY(-2px)', borderColor: 'border.strong' }}
    >
      <VStack align="stretch" spacing={4} h="full">
        <HStack justify="space-between" align="flex-start" spacing={3}>
          <ShellTelemetryBadge tone={tone}>{event.severity}</ShellTelemetryBadge>
          <HStack spacing={1.5}>
            <Clock3 size={12} color="rgba(255,255,255,0.35)" />
            <Text fontSize="xs" color="text.secondary">
              {minutesAgo}
            </Text>
          </HStack>
        </HStack>

        <HStack align="flex-start" spacing={3}>
          <Box
            p={2.5}
            borderRadius="2xl"
            bg="surface.interactive"
            border="1px solid"
            borderColor="border.subtle"
            color={color}
          >
            <EventIcon size={18} color={color === 'text.secondary' ? 'rgba(255,255,255,0.45)' : 'currentColor'} />
          </Box>
          <VStack align="flex-start" spacing={1}>
            <Text fontSize="lg" fontWeight="700" color="white" lineHeight={1.2}>
              {event.title}
            </Text>
            <HStack spacing={2} flexWrap="wrap">
              <ShellTelemetryBadge tone="default">{event.type}</ShellTelemetryBadge>
              <ShellTelemetryBadge tone="info">
                {event.location || 'localização não informada'}
                {event.countryCode ? ` • ${event.countryCode}` : ''}
              </ShellTelemetryBadge>
            </HStack>
          </VStack>
        </HStack>

        <Text fontSize="sm" color="text.secondary" lineHeight={1.7} noOfLines={3}>
          {event.description || 'Sem descrição operacional complementar.'}
        </Text>

        <Box
          mt="auto"
          p={3.5}
          borderRadius="2xl"
          bg="surface.interactive"
          border="1px solid"
          borderColor="border.subtle"
        >
          <HStack justify="space-between" align="center" flexWrap="wrap" spacing={3}>
            <Text fontSize="sm" color="text.secondary">
              Evento em {event.location || 'região não informada'}
            </Text>
            {event.sourceUrl ? (
              <Button
                as="a"
                href={event.sourceUrl}
                target="_blank"
                rel="noreferrer"
                size="sm"
                variant="outline"
                leftIcon={<ExternalLink size={14} />}
              >
                Fonte
              </Button>
            ) : null}
          </HStack>
        </Box>
      </VStack>
    </Box>
  );
}
