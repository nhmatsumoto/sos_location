import { Circle as LeafletCircle, Marker, Popup } from 'react-leaflet';
import {
  CheckCircle2,
  Clock3,
  LayoutGrid,
  Map,
  Power,
  RefreshCw,
  ShieldCheck,
  Trophy,
} from 'lucide-react';
import {
  Box,
  Button,
  HStack,
  SimpleGrid,
  Switch,
  Text,
  VStack,
} from '@chakra-ui/react';
import { VolunteerTaskCard } from '../../../components/features/volunteer/VolunteerTaskCard';
import { TacticalMap } from '../../../components/features/map/TacticalMap';
import {
  MetricCard,
  PageEmptyState,
  PageHeader,
  PageLoadingState,
  PagePanel,
} from '../../../components/layout/PagePrimitives';
import {
  ShellLiveIndicator,
  ShellSectionEyebrow,
  ShellTelemetryBadge,
} from '../../../components/layout/ShellPrimitives';
import { useVolunteerDashboard } from '../../../hooks/useVolunteerDashboard';

const fieldPrinciples = [
  'Entre em missão apenas quando puder confirmar deslocamento seguro e retorno pela central.',
  'Cruze localização, prioridade e categoria antes de assumir tarefas com civis ou rotas instáveis.',
  'Mantenha telemetria e comunicação ativas durante toda a janela de atuação.',
] as const;

export function VolunteerDashboardPage() {
  const { tasks, stats, isOnline, loading, refreshing, actions } = useVolunteerDashboard();

  return (
    <Box
      h="full"
      overflowY="auto"
      px={{ base: 4, md: 6, xl: 8 }}
      py={{ base: 4, md: 6 }}
      bgGradient="radial(circle at top right, rgba(0,122,255,0.10), transparent 22%), radial(circle at bottom left, rgba(52,199,89,0.08), transparent 24%), linear(to-b, #030712 0%, #07111f 55%, #08121d 100%)"
    >
      <VStack maxW="7xl" mx="auto" spacing={6} align="stretch">
        <PageHeader
          icon={LayoutGrid}
          eyebrow="VOLUNTEER_TERMINAL // COMMUNITY_RESPONSE // FIELD_ASSIGNMENT"
          title="Central do voluntário com foco em missão, segurança e resposta comunitária"
          description="O painel foi reorganizado para reduzir ruído: estado do operador, telemetria de impacto, fila de missões e visão geográfica na mesma superfície."
          meta={
            <>
              <ShellLiveIndicator label={`${tasks.length} missão(ões) disponíveis`} />
              <ShellTelemetryBadge tone={isOnline ? 'success' : 'default'}>
                {isOnline ? 'Operador online' : 'Operador em standby'}
              </ShellTelemetryBadge>
            </>
          }
          actions={
            <>
              <Button
                variant="ghost"
                onClick={() => void actions.handleRefresh()}
                isLoading={refreshing}
                leftIcon={<RefreshCw size={16} />}
              >
                Atualizar protocolos
              </Button>
              <PagePanel
                title="Estado do operador"
                icon={Power}
                tone={isOnline ? 'success' : 'default'}
                p={3.5}
                minW={{ base: 'full', sm: '280px' }}
              >
                <HStack justify="space-between" align="center">
                  <VStack align="flex-start" spacing={0.5}>
                    <ShellSectionEyebrow>Status de campo</ShellSectionEyebrow>
                    <Text fontSize="sm" fontWeight="700" color="white">
                      {isOnline ? 'On-line / pronto para despacho' : 'Off-line / observação'}
                    </Text>
                  </VStack>
                  <Switch isChecked={isOnline} onChange={actions.toggleOnline} />
                </HStack>
              </PagePanel>
            </>
          }
        />

        <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacing={4}>
          <MetricCard
            label="Missões ativas"
            value={stats?.activeTasks ?? 0}
            helper="Tarefas disponíveis para assunção imediata"
            icon={LayoutGrid}
            tone="info"
          />
          <MetricCard
            label="Sucesso total"
            value={stats?.completedTasks ?? 0}
            helper="Missões concluídas com retorno registrado"
            icon={CheckCircle2}
            tone="success"
          />
          <MetricCard
            label="Pontuação de impacto"
            value={stats?.impactScore ?? 0}
            helper="Indicador acumulado de contribuição em campo"
            icon={Trophy}
            tone="warning"
          />
          <MetricCard
            label="Horas de presença"
            value={`${stats?.hoursContributed ?? 0}h`}
            helper="Tempo total de atuação voluntária rastreado"
            icon={Clock3}
            tone="default"
          />
        </SimpleGrid>

        <SimpleGrid columns={{ base: 1, xl: 3 }} spacing={6} alignItems="start">
          <VStack gridColumn={{ xl: 'span 1' }} align="stretch" spacing={6}>
            <PagePanel
              title="Protocolo de segurança"
              description="Lembretes rápidos para atuação segura e previsível no turno atual."
              icon={ShieldCheck}
              tone="success"
            >
              <VStack align="stretch" spacing={3}>
                {fieldPrinciples.map((item) => (
                  <Box
                    key={item}
                    p={3.5}
                    borderRadius="2xl"
                    bg="surface.interactive"
                    border="1px solid"
                    borderColor="border.subtle"
                  >
                    <Text fontSize="sm" color="text.secondary" lineHeight={1.7}>
                      {item}
                    </Text>
                  </Box>
                ))}
              </VStack>
            </PagePanel>

            <PagePanel
              title="Fila de missões de campo"
              description="Assuma somente missões compatíveis com sua janela operacional e contexto físico."
              icon={LayoutGrid}
              tone="info"
              actions={<ShellTelemetryBadge tone="info">{tasks.length} disponíveis</ShellTelemetryBadge>}
            >
              {loading && tasks.length === 0 ? (
                <PageLoadingState
                  minH="360px"
                  label="Sincronizando fila voluntária"
                  description="O console está coletando missões e consolidando telemetria de campo."
                />
              ) : tasks.length === 0 ? (
                <PageEmptyState
                  minH="280px"
                  title="Nenhuma missão disponível"
                  description="A central ainda não publicou novas tarefas para esta estação."
                  tone="default"
                />
              ) : (
                <VStack align="stretch" spacing={4}>
                  {tasks.map((task) => (
                    <VolunteerTaskCard key={task.id} task={task} onPickUp={actions.handlePickUpTask} />
                  ))}
                </VStack>
              )}
            </PagePanel>
          </VStack>

          <PagePanel
            gridColumn={{ xl: 'span 2' }}
            title="Mapa de missões e zonas de atuação"
            description="Cada missão é exibida no território com ênfase por prioridade para orientar a decisão de assunção."
            icon={Map}
            tone="info"
            p={0}
          >
            <Box position="relative" h={{ base: '420px', xl: '880px' }}>
              <Box position="absolute" top={4} right={4} zIndex={1000} maxW="320px">
                <PagePanel title="Legenda operacional" icon={Map} tone="default" p={4}>
                  <VStack align="stretch" spacing={2.5}>
                    <LegendItem color="sos.red.400" label="Crítica" description="Janela imediata ou risco elevado." />
                    <LegendItem color="sos.amber.400" label="Alta / média" description="Exige validação rápida antes de assumir." />
                    <LegendItem color="sos.blue.300" label="Baixa" description="Missões de apoio e sustentação." />
                  </VStack>
                </PagePanel>
              </Box>

              <TacticalMap
                center={[-21.1215, -42.9427]}
                zoom={14}
                containerProps={{ style: { height: '100%', width: '100%' } }}
              >
                {tasks.map((task) => (
                  <LeafletCircle
                    key={`${task.id}-coverage`}
                    center={[task.location.lat, task.location.lng]}
                    radius={200}
                    pathOptions={{
                      fillColor:
                        task.priority === 'critical'
                          ? '#FF3B30'
                          : task.priority === 'high' || task.priority === 'medium'
                            ? '#FF9500'
                            : '#0A84FF',
                      fillOpacity: 0.12,
                      color: 'transparent',
                    }}
                  />
                ))}
                {tasks.map((task) => (
                  <Marker key={task.id} position={[task.location.lat, task.location.lng]}>
                    <Popup>
                      <VStack align="stretch" spacing={2} p={1}>
                        <Text fontSize="sm" fontWeight="700" color="gray.900">
                          {task.title}
                        </Text>
                        <Text fontSize="xs" color="gray.600">
                          {task.description}
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          {task.location.address || 'Coordenada operacional'}
                        </Text>
                      </VStack>
                    </Popup>
                  </Marker>
                ))}
              </TacticalMap>
            </Box>
          </PagePanel>
        </SimpleGrid>
      </VStack>
    </Box>
  );
}

function LegendItem({
  color,
  label,
  description,
}: {
  color: string;
  label: string;
  description: string;
}) {
  return (
    <HStack align="flex-start" spacing={3}>
      <Box mt={1.5} w={2.5} h={2.5} borderRadius="full" bg={color} flexShrink={0} />
      <VStack align="flex-start" spacing={0.5}>
        <Text fontSize="sm" fontWeight="600" color="white">
          {label}
        </Text>
        <Text fontSize="sm" color="text.secondary">
          {description}
        </Text>
      </VStack>
    </HStack>
  );
}
