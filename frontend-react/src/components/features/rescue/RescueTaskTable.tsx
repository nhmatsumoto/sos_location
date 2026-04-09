import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  MapPin,
  Pencil,
  PlayCircle,
  RotateCcw,
  Trash2,
  Users,
} from 'lucide-react';
import {
  Box,
  Button,
  HStack,
  Icon,
  SimpleGrid,
  Text,
  VStack,
} from '@chakra-ui/react';
import { PageEmptyState, PageLoadingState, PagePanel } from '../../layout/PagePrimitives';
import { ShellSectionEyebrow, ShellTelemetryBadge } from '../../layout/ShellPrimitives';
import type { RescueTask, RescueTaskId, TaskStatus } from '../../../types/rescue';

interface RescueTaskTableProps {
  tasks: RescueTask[];
  loading: boolean;
  onEdit: (task: RescueTask) => void;
  onDelete: (id: RescueTaskId) => void;
  onStatus: (id: RescueTaskId, status: TaskStatus) => void;
  onCreateFirst?: () => void;
}

const priorityTone = {
  alta: 'critical',
  media: 'warning',
  baixa: 'success',
} as const;

const priorityLabel = {
  alta: 'Alta',
  media: 'Média',
  baixa: 'Baixa',
} as const;

const statusTone = {
  aberto: 'critical',
  em_acao: 'warning',
  concluido: 'success',
} as const;

const statusLabel = {
  aberto: 'Aberto',
  em_acao: 'Em ação',
  concluido: 'Concluído',
} as const;

const laneConfig = [
  {
    status: 'aberto',
    title: 'Fila de despacho',
    description: 'Missões que aguardam operador, confirmação de rádio ou definição de rota.',
    icon: AlertTriangle,
    tone: 'critical',
  },
  {
    status: 'em_acao',
    title: 'Resposta em campo',
    description: 'Operações já acionadas, com equipe em deslocamento ou atuação ativa.',
    icon: PlayCircle,
    tone: 'warning',
  },
  {
    status: 'concluido',
    title: 'Encerradas',
    description: 'Missões com retorno consolidado e sem pendência operacional imediata.',
    icon: CheckCircle2,
    tone: 'success',
  },
] as const satisfies Array<{
  status: TaskStatus;
  title: string;
  description: string;
  icon: typeof AlertTriangle;
  tone: 'critical' | 'warning' | 'success';
}>;

export function RescueTaskTable({
  tasks,
  loading,
  onEdit,
  onDelete,
  onStatus,
  onCreateFirst,
}: RescueTaskTableProps) {
  const groupedTasks = laneConfig.map((lane) => ({
    ...lane,
    tasks: tasks.filter((task) => task.status === lane.status),
  }));

  if (loading) {
    return (
      <SimpleGrid columns={{ base: 1, xl: 3 }} spacing={4}>
        {laneConfig.map((lane) => (
          <PagePanel
            key={lane.status}
            title={lane.title}
            description={lane.description}
            icon={lane.icon}
            tone={lane.tone}
          >
            <PageLoadingState
              minH="220px"
              label="Sincronizando quadro"
              description="A estação está reorganizando a fila desta coluna."
              tone={lane.tone}
            />
          </PagePanel>
        ))}
      </SimpleGrid>
    );
  }

  return (
    <SimpleGrid columns={{ base: 1, xl: 3 }} spacing={4}>
      {groupedTasks.map((lane) => (
        <PagePanel
          key={lane.status}
          title={lane.title}
          description={lane.description}
          icon={lane.icon}
          tone={lane.tone}
          actions={<ShellTelemetryBadge tone={lane.tone}>{lane.tasks.length} missão(ões)</ShellTelemetryBadge>}
        >
          <VStack align="stretch" spacing={3}>
            {lane.tasks.length === 0 ? (
              <PageEmptyState
                minH="220px"
                title="Nenhuma missão nesta coluna"
                description={
                  lane.status === 'aberto'
                    ? 'Crie uma nova ocorrência para alimentar o fluxo de despacho.'
                    : lane.status === 'em_acao'
                      ? 'As missões acionadas aparecerão aqui.'
                      : 'As operações concluídas serão arquivadas aqui.'
                }
                icon={lane.icon}
                tone={lane.tone}
                action={
                  lane.status === 'aberto' && onCreateFirst ? (
                    <Button variant="tactical" onClick={onCreateFirst}>
                      Registrar primeira missão
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              lane.tasks.map((task) => (
                <Box
                  key={task.id}
                  p={4}
                  borderRadius="3xl"
                  bg="surface.base"
                  border="1px solid"
                  borderColor="border.subtle"
                  boxShadow="panel"
                >
                  <VStack align="stretch" spacing={4}>
                    <HStack justify="space-between" align="flex-start" spacing={3}>
                      <VStack align="flex-start" spacing={2}>
                        <HStack spacing={2} flexWrap="wrap">
                          <ShellTelemetryBadge tone={statusTone[task.status]}>
                            {statusLabel[task.status]}
                          </ShellTelemetryBadge>
                          <ShellTelemetryBadge tone={priorityTone[task.priority]}>
                            {priorityLabel[task.priority]}
                          </ShellTelemetryBadge>
                        </HStack>
                        <Text fontSize="md" fontWeight="700" color="white">
                          {task.title}
                        </Text>
                      </VStack>
                      <ShellTelemetryBadge tone="default">
                        {new Date(task.createdAtUtc).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </ShellTelemetryBadge>
                    </HStack>

                    <Text fontSize="sm" lineHeight={1.7} color="text.secondary">
                      {task.description || 'Sem resumo operacional registrado.'}
                    </Text>

                    <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3}>
                      <DataPoint icon={Users} label="Equipe" value={task.team} />
                      <DataPoint icon={MapPin} label="Setor" value={task.location} />
                    </SimpleGrid>

                    <HStack spacing={2} flexWrap="wrap">
                      {task.status !== 'aberto' ? (
                        <ActionButton
                          icon={RotateCcw}
                          label="Reabrir"
                          tone="default"
                          onClick={() => onStatus(task.id, 'aberto')}
                        />
                      ) : null}
                      {task.status !== 'em_acao' ? (
                        <ActionButton
                          icon={PlayCircle}
                          label="Acionar"
                          tone="warning"
                          onClick={() => onStatus(task.id, 'em_acao')}
                        />
                      ) : null}
                      {task.status !== 'concluido' ? (
                        <ActionButton
                          icon={CheckCircle2}
                          label="Concluir"
                          tone="success"
                          onClick={() => onStatus(task.id, 'concluido')}
                        />
                      ) : null}
                      <ActionButton
                        icon={Pencil}
                        label="Editar"
                        tone="default"
                        onClick={() => onEdit(task)}
                      />
                      <ActionButton
                        icon={Trash2}
                        label="Remover"
                        tone="critical"
                        onClick={() => onDelete(task.id)}
                      />
                    </HStack>

                    <Box
                      px={3}
                      py={2.5}
                      borderRadius="2xl"
                      bg="surface.interactive"
                      border="1px solid"
                      borderColor="border.subtle"
                    >
                      <HStack spacing={2}>
                        <Icon as={Clock3} boxSize={3.5} color="text.secondary" />
                        <Text fontSize="xs" color="text.secondary">
                          {task.status === 'concluido'
                            ? 'Janela encerrada e pronta para histórico.'
                            : task.status === 'em_acao'
                              ? 'Missão com equipe em atuação ou deslocamento.'
                              : 'Aguardando operador para despacho ou revisão.'}
                        </Text>
                      </HStack>
                    </Box>
                  </VStack>
                </Box>
              ))
            )}
          </VStack>
        </PagePanel>
      ))}
    </SimpleGrid>
  );
}

function DataPoint({
  icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <Box
      p={3}
      borderRadius="2xl"
      bg="surface.interactive"
      border="1px solid"
      borderColor="border.subtle"
    >
      <HStack spacing={2} mb={1.5}>
        <Icon as={icon} boxSize={3.5} color="text.secondary" />
        <ShellSectionEyebrow>{label}</ShellSectionEyebrow>
      </HStack>
      <Text fontSize="sm" fontWeight="600" color="white">
        {value}
      </Text>
    </Box>
  );
}

function ActionButton({
  icon,
  label,
  tone,
  onClick,
}: {
  icon: typeof PlayCircle;
  label: string;
  tone: 'default' | 'success' | 'warning' | 'critical';
  onClick: () => void;
}) {
  const variant = tone === 'critical' ? 'outline' : tone === 'default' ? 'ghost' : 'tinted';
  const colorScheme = tone === 'success' ? 'green' : tone === 'warning' ? 'orange' : tone === 'critical' ? 'red' : 'gray';

  return (
    <Button
      size="sm"
      leftIcon={<Icon as={icon} boxSize={3.5} />}
      variant={variant}
      colorScheme={colorScheme}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}
