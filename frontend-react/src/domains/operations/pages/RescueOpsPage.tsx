import { Link as RouterLink } from 'react-router-dom';
import {
  Activity,
  BellRing,
  Clock3,
  Compass,
  Filter,
  MapPinned,
  Radio,
  RefreshCw,
  ShieldAlert,
  Siren,
  Users,
} from 'lucide-react';
import {
  Box,
  Button,
  HStack,
  Icon,
  Input,
  Select,
  SimpleGrid,
  Stack,
  Text,
  VStack,
} from '@chakra-ui/react';
import { useMemo } from 'react';
import { PageHeader, PagePanel, MetricCard } from '../../../components/layout/PagePrimitives';
import { ShellLiveIndicator, ShellSectionEyebrow, ShellTelemetryBadge } from '../../../components/layout/ShellPrimitives';
import { useRescueTasks } from '../../../hooks/useRescueTasks';
import { useRescueFiltersStore } from '../../../store/rescueFiltersStore';
import { RescueKpiCards } from '../../../components/features/rescue/RescueKpiCards';
import { RescueTaskForm } from '../../../components/features/rescue/RescueTaskForm';
import { RescueTaskTable } from '../../../components/features/rescue/RescueTaskTable';
import type { RescueTaskInput } from '../../../types/rescue';

const quickLinks = [
  {
    title: 'Mapa operacional',
    description: 'Abrir setores, hotspots e camadas de campo.',
    to: '/app/operational-map',
    icon: MapPinned,
  },
  {
    title: 'Ativos de campo',
    description: 'Consultar abrigos, apoios e zonas críticas.',
    to: '/app/rescue-support',
    icon: Compass,
  },
  {
    title: 'Relatos recebidos',
    description: 'Cruzar evidências com a fila de despacho.',
    to: '/app/reports',
    icon: BellRing,
  },
] as const;

const protocolSteps = [
  {
    title: 'Abrir missão',
    description: 'Registre local, equipe e objetivo com contexto mínimo antes do acionamento.',
  },
  {
    title: 'Despachar e confirmar',
    description: 'Mova para "Em ação" quando a equipe confirmar saída, contato ou varredura.',
  },
  {
    title: 'Encerrar com retorno',
    description: 'Conclua somente após feedback de campo ou transferência formal da ocorrência.',
  },
] as const;

export function RescueOpsPage() {
  const {
    loading,
    allTasks,
    tasks,
    summary,
    editingTask,
    setEditingTask,
    createTask,
    updateTask,
    removeTask,
    updateStatus,
    refreshTasks,
    storageMode,
  } = useRescueTasks();

  const { query, priority, status, setQuery, setPriority, setStatus } = useRescueFiltersStore();

  const highPriorityCount = useMemo(
    () => allTasks.filter((task) => task.priority === 'alta' && task.status !== 'concluido').length,
    [allTasks],
  );
  const activeTeamsCount = useMemo(
    () => new Set(allTasks.map((task) => task.team.trim().toLowerCase()).filter(Boolean)).size,
    [allTasks],
  );
  const completionRate = summary.total > 0 ? Math.round((summary.done / summary.total) * 100) : 0;
  const lastTask = useMemo(
    () => [...allTasks].sort((a, b) => Date.parse(b.createdAtUtc) - Date.parse(a.createdAtUtc))[0] ?? null,
    [allTasks],
  );
  const oldestOpenTask = useMemo(
    () => [...allTasks]
      .filter((task) => task.status === 'aberto')
      .sort((a, b) => Date.parse(a.createdAtUtc) - Date.parse(b.createdAtUtc))[0] ?? null,
    [allTasks],
  );
  const priorityMix = useMemo(() => ({
    alta: allTasks.filter((task) => task.priority === 'alta').length,
    media: allTasks.filter((task) => task.priority === 'media').length,
    baixa: allTasks.filter((task) => task.priority === 'baixa').length,
  }), [allTasks]);

  const onSubmitTask = async (data: RescueTaskInput) => {
    if (editingTask) {
      await updateTask(editingTask.id, data);
      setEditingTask(null);
      return;
    }
    await createTask(data);
  };

  const clearFilters = () => {
    setQuery('');
    setPriority('todas');
    setStatus('todos');
  };

  return (
    <Box
      h="full"
      overflowY="auto"
      px={{ base: 4, md: 6, xl: 8 }}
      py={{ base: 4, md: 6 }}
      bgGradient="radial(circle at top left, rgba(34,211,238,0.10), transparent 24%), radial(circle at bottom right, rgba(248,113,113,0.08), transparent 22%), linear(to-b, #030712 0%, #07111f 55%, #08121d 100%)"
    >
      <VStack maxW="7xl" mx="auto" spacing={6} align="stretch">
        <PageHeader
          icon={Radio}
          eyebrow="DISPATCH_MATRIX // MISSION_CONTROL // FIELD_CLOSURE"
          title="Quadro de despacho com visão tática e controle de missão"
          description="A estação foi reorganizada para leitura rápida em campo: missão crítica no topo, quadro central por status e trilhos laterais para filtro e composição da próxima ação."
          meta={
            <>
              <ShellLiveIndicator label={`${tasks.length} visíveis de ${summary.total} registradas`} />
              <ShellTelemetryBadge tone={storageMode === 'local' ? 'warning' : 'success'}>
                {storageMode === 'local' ? 'Memória local' : 'Online'}
              </ShellTelemetryBadge>
            </>
          }
          actions={
            <>
              <Button
                leftIcon={<RefreshCw size={16} />}
                variant="ghost"
                onClick={() => void refreshTasks()}
                isLoading={loading}
              >
                Atualizar quadro
              </Button>
              {quickLinks.slice(0, 2).map((link) => (
                <Button
                  key={link.to}
                  as={RouterLink}
                  to={link.to}
                  leftIcon={<Icon as={link.icon} boxSize={4} />}
                  variant="outline"
                >
                  {link.title}
                </Button>
              ))}
            </>
          }
        />

        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
          <MetricCard
            label="Pressão crítica"
            value={highPriorityCount}
            helper="Missões de prioridade alta ainda sem encerramento"
            icon={Siren}
            tone={highPriorityCount > 0 ? 'critical' : 'success'}
          />
          <MetricCard
            label="Malha ativa"
            value={activeTeamsCount}
            helper="Equipes diferentes operando ou atribuídas no quadro atual"
            icon={Users}
            tone="warning"
          />
          <MetricCard
            label="Fechamento"
            value={`${completionRate}%`}
            helper="Taxa de conclusão sobre o total de missões registradas"
            icon={Activity}
            tone={completionRate >= 70 ? 'success' : 'info'}
          />
        </SimpleGrid>

        <PagePanel
          title="Pulso operacional"
          description="Leitura rápida de pressão de fila, último movimento e distribuição de prioridade."
          icon={Compass}
          tone="info"
        >
          <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={4}>
            <TelemetryCard
              icon={Clock3}
              title="Fila mais antiga"
              value={oldestOpenTask ? oldestOpenTask.title : 'Nenhuma ocorrência aguardando despacho'}
              detail={
                oldestOpenTask
                  ? `${oldestOpenTask.team} • ${new Date(oldestOpenTask.createdAtUtc).toLocaleString('pt-BR')}`
                  : 'A coluna aberta está zerada no momento.'
              }
            />
            <TelemetryCard
              icon={Activity}
              title="Última movimentação"
              value={lastTask ? lastTask.title : 'Nenhuma movimentação registrada'}
              detail={
                lastTask
                  ? `${lastTask.team} em ${new Date(lastTask.createdAtUtc).toLocaleString('pt-BR')}`
                  : 'A atividade mais recente aparecerá aqui conforme a fila evoluir.'
              }
            />
            <PagePanel title="Distribuição de prioridade" icon={ShieldAlert} tone="warning" p={4}>
              <VStack align="stretch" spacing={3}>
                {([
                  { key: 'alta', label: 'Alta', color: 'sos.red.400' },
                  { key: 'media', label: 'Média', color: 'sos.amber.400' },
                  { key: 'baixa', label: 'Baixa', color: 'sos.green.400' },
                ] as const).map((entry) => {
                  const value = priorityMix[entry.key];
                  const percentage = summary.total > 0 ? Math.max(8, Math.round((value / summary.total) * 100)) : 0;
                  return (
                    <Box key={entry.key}>
                      <HStack justify="space-between" mb={1.5}>
                        <Text fontSize="sm" color="white">{entry.label}</Text>
                        <Text fontSize="sm" color="text.secondary">{value}</Text>
                      </HStack>
                      <Box h={1.5} borderRadius="full" bg="rgba(255,255,255,0.08)" overflow="hidden">
                        <Box h="full" borderRadius="full" bg={entry.color} width={`${percentage}%`} />
                      </Box>
                    </Box>
                  );
                })}
              </VStack>
            </PagePanel>
          </SimpleGrid>
        </PagePanel>

        <RescueKpiCards total={summary.total} open={summary.open} active={summary.active} done={summary.done} />

        <SimpleGrid columns={{ base: 1, xl: 3 }} spacing={6} alignItems="start">
          <VStack align="stretch" spacing={6}>
            <PagePanel
              title="Console de filtro"
              description="Recorte a fila por texto, status e prioridade."
              icon={Filter}
              tone="info"
            >
              <VStack align="stretch" spacing={4}>
                <Box>
                  <ShellSectionEyebrow mb={2}>Busca</ShellSectionEyebrow>
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Missão, equipe ou localização"
                  />
                </Box>

                <Box>
                  <ShellSectionEyebrow mb={2}>Status</ShellSectionEyebrow>
                  <Select
                    value={status}
                    onChange={(event) => setStatus(event.target.value as typeof status)}
                  >
                    <option value="todos">Todos os status</option>
                    <option value="aberto">Aberto</option>
                    <option value="em_acao">Em ação</option>
                    <option value="concluido">Concluído</option>
                  </Select>
                </Box>

                <Box>
                  <ShellSectionEyebrow mb={2}>Prioridade</ShellSectionEyebrow>
                  <Select
                    value={priority}
                    onChange={(event) => setPriority(event.target.value as typeof priority)}
                  >
                    <option value="todas">Todas as prioridades</option>
                    <option value="alta">Alta</option>
                    <option value="media">Média</option>
                    <option value="baixa">Baixa</option>
                  </Select>
                </Box>

                <Button variant="outline" onClick={clearFilters}>
                  Limpar filtros
                </Button>
              </VStack>
            </PagePanel>

            <PagePanel
              title="Diretrizes de turno"
              description="Critérios operacionais para despacho, verificação e encerramento."
              icon={ShieldAlert}
              tone="default"
            >
              <VStack align="stretch" spacing={3}>
                <GuidelineCard
                  title="Priorize"
                  description="Missões altas sem despacho e chamadas com dependência de abrigo ou evacuação."
                />
                <GuidelineCard
                  title="Cruze"
                  description="Use o mapa operacional e relatórios para validar conflito de localização antes de acionar equipe."
                />
                <GuidelineCard
                  title="Feche"
                  description="Não mantenha missão em aberto sem dono ou retorno de rádio por longos períodos."
                />
              </VStack>
            </PagePanel>
          </VStack>

          <PagePanel
            title="Board de despacho por status"
            description="A fila foi reorganizada em colunas operacionais para leitura rápida no desktop e empilhamento claro no mobile."
            icon={Activity}
            tone="info"
            gridColumn={{ xl: 'span 1' }}
            actions={
              <HStack spacing={2} flexWrap="wrap">
                <ShellTelemetryBadge tone="critical">Fila de despacho</ShellTelemetryBadge>
                <ShellTelemetryBadge tone="warning">Em campo</ShellTelemetryBadge>
                <ShellTelemetryBadge tone="success">Encerradas</ShellTelemetryBadge>
              </HStack>
            }
          >
            <RescueTaskTable
              tasks={tasks}
              loading={loading}
              onEdit={setEditingTask}
              onDelete={removeTask}
              onStatus={updateStatus}
              onCreateFirst={() => setEditingTask(null)}
            />
          </PagePanel>

          <VStack align="stretch" spacing={6}>
            <PagePanel
              title={editingTask ? 'Atualizar missão selecionada' : 'Compor próxima operação'}
              description="Mantenha a escrita curta e objetiva: destino, equipe, risco e status esperado."
              icon={MapPinned}
              tone="info"
              eyebrow={editingTask ? 'Editar missão' : 'Nova missão'}
            >
              <RescueTaskForm
                editingTask={editingTask}
                onCancel={() => setEditingTask(null)}
                onSubmitTask={onSubmitTask}
              />
            </PagePanel>

            <PagePanel
              title="Cadência de resposta"
              description="Macroetapas esperadas para manter rastreabilidade do turno."
              icon={Activity}
              tone="warning"
            >
              <VStack align="stretch" spacing={3}>
                {protocolSteps.map((step, index) => (
                  <GuidelineCard
                    key={step.title}
                    title={`Etapa ${index + 1} · ${step.title}`}
                    description={step.description}
                  />
                ))}
              </VStack>
            </PagePanel>

            <PagePanel
              title="Atalhos táticos"
              description="Navegação rápida para superfícies adjacentes ao fluxo de resgate."
              icon={MapPinned}
              tone="default"
            >
              <VStack align="stretch" spacing={3}>
                {quickLinks.map((link) => (
                  <Box
                    key={link.to}
                    as={RouterLink}
                    to={link.to}
                    p={3.5}
                    borderRadius="2xl"
                    bg="surface.interactive"
                    border="1px solid"
                    borderColor="border.subtle"
                    transition="all 0.2s"
                    _hover={{ bg: 'surface.interactiveHover', borderColor: 'border.strong' }}
                  >
                    <HStack align="flex-start" spacing={3}>
                      <Box
                        p={2}
                        borderRadius="2xl"
                        bg="surface.base"
                        border="1px solid"
                        borderColor="border.subtle"
                        color="sos.blue.300"
                      >
                        <Icon as={link.icon} boxSize={4} />
                      </Box>
                      <VStack align="flex-start" spacing={1}>
                        <Text fontSize="sm" fontWeight="600" color="white">
                          {link.title}
                        </Text>
                        <Text fontSize="sm" color="text.secondary">
                          {link.description}
                        </Text>
                      </VStack>
                    </HStack>
                  </Box>
                ))}
              </VStack>
            </PagePanel>
          </VStack>
        </SimpleGrid>
      </VStack>
    </Box>
  );
}

function TelemetryCard({
  icon,
  title,
  value,
  detail,
}: {
  icon: typeof Clock3;
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <PagePanel title={title} icon={icon} tone="default" p={4}>
      <Stack spacing={2}>
        <Text fontSize="sm" fontWeight="700" color="white">
          {value}
        </Text>
        <Text fontSize="xs" color="text.secondary">
          {detail}
        </Text>
      </Stack>
    </PagePanel>
  );
}

function GuidelineCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Box
      p={3.5}
      borderRadius="2xl"
      bg="surface.interactive"
      border="1px solid"
      borderColor="border.subtle"
    >
      <ShellSectionEyebrow mb={1.5}>{title}</ShellSectionEyebrow>
      <Text fontSize="sm" color="text.secondary">
        {description}
      </Text>
    </Box>
  );
}
