import { Crosshair, Flag, MapPinned, ShieldAlert } from 'lucide-react';
import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import {
  Box,
  Button,
  FormControl,
  FormErrorMessage,
  FormLabel,
  HStack,
  Icon,
  Input,
  Select,
  SimpleGrid,
  Text,
  Textarea,
  VStack,
} from '@chakra-ui/react';
import { ShellSectionEyebrow, ShellTelemetryBadge } from '../../layout/ShellPrimitives';
import type { RescueTask, RescueTaskInput } from '../../../types/rescue';

interface RescueTaskFormProps {
  editingTask: RescueTask | null;
  onCancel: () => void;
  onSubmitTask: (data: RescueTaskInput) => Promise<void>;
}

const defaultValues: RescueTaskInput = {
  title: '',
  team: '',
  priority: 'alta',
  location: '',
  description: '',
  status: 'aberto',
};

const priorityTone = {
  alta: 'critical',
  media: 'warning',
  baixa: 'success',
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

export function RescueTaskForm({ editingTask, onCancel, onSubmitTask }: RescueTaskFormProps) {
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RescueTaskInput>({ defaultValues });

  const currentPriority = useWatch({ control, name: 'priority' }) ?? defaultValues.priority;
  const currentStatus = useWatch({ control, name: 'status' }) ?? defaultValues.status;
  const currentTeam = useWatch({ control, name: 'team' }) ?? defaultValues.team;

  useEffect(() => {
    if (editingTask) {
      reset({
        title: editingTask.title,
        team: editingTask.team,
        priority: editingTask.priority,
        location: editingTask.location,
        description: editingTask.description,
        status: editingTask.status,
      });
      return;
    }
    reset(defaultValues);
  }, [editingTask, reset]);

  return (
    <Box
      as="form"
      onSubmit={handleSubmit(async (data) => {
        await onSubmitTask(data);
        reset(defaultValues);
      })}
    >
      <VStack align="stretch" spacing={4}>
        <SimpleGrid columns={{ base: 1, sm: 3 }} spacing={3}>
          <MetricShell
            icon={Flag}
            label="Prioridade"
            value={currentPriority}
            tone={priorityTone[currentPriority]}
          />
          <MetricShell
            icon={ShieldAlert}
            label="Estado"
            value={statusLabel[currentStatus]}
            tone={statusTone[currentStatus]}
          />
          <MetricShell
            icon={Crosshair}
            label="Equipe"
            value={currentTeam?.trim() || 'A definir'}
            tone="info"
          />
        </SimpleGrid>

        <FormControl isInvalid={Boolean(errors.title)}>
          <FormLabel>Título da missão</FormLabel>
          <Input
            placeholder="Ex.: Varredura e evacuação na encosta leste"
            {...register('title', { required: 'Título é obrigatório.' })}
          />
          <FormErrorMessage>{errors.title?.message}</FormErrorMessage>
        </FormControl>

        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          <FormControl isInvalid={Boolean(errors.team)}>
            <FormLabel>Equipe responsável</FormLabel>
            <Input
              placeholder="Ex.: Equipe Bravo"
              {...register('team', { required: 'Equipe é obrigatória.' })}
            />
            <FormErrorMessage>{errors.team?.message}</FormErrorMessage>
          </FormControl>

          <FormControl isInvalid={Boolean(errors.location)}>
            <FormLabel>Local de atuação</FormLabel>
            <Input
              placeholder="Ex.: Rua da Serra, setor 3"
              {...register('location', { required: 'Local é obrigatório.' })}
            />
            <FormErrorMessage>{errors.location?.message}</FormErrorMessage>
          </FormControl>
        </SimpleGrid>

        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          <FormControl>
            <FormLabel>Prioridade</FormLabel>
            <Select {...register('priority')}>
              <option value="alta">Alta</option>
              <option value="media">Média</option>
              <option value="baixa">Baixa</option>
            </Select>
          </FormControl>

          <FormControl>
            <FormLabel>Status inicial</FormLabel>
            <Select {...register('status')}>
              <option value="aberto">Aberto</option>
              <option value="em_acao">Em ação</option>
              <option value="concluido">Concluído</option>
            </Select>
          </FormControl>
        </SimpleGrid>

        <FormControl>
          <FormLabel>Resumo operacional</FormLabel>
          <Textarea
            minH="140px"
            resize="vertical"
            placeholder="Descreva objetivo, risco, apoio necessário e condição esperada de encerramento."
            {...register('description')}
          />
        </FormControl>

        <Box
          p={4}
          borderRadius="2xl"
          bg="rgba(0,122,255,0.08)"
          border="1px solid"
          borderColor="rgba(0,122,255,0.18)"
        >
          <HStack spacing={2} mb={1.5}>
            <Icon as={MapPinned} boxSize={4} color="sos.blue.300" />
            <ShellSectionEyebrow color="sos.blue.200">Diretriz de preenchimento</ShellSectionEyebrow>
          </HStack>
          <Text fontSize="sm" color="text.secondary">
            Use frases curtas com o formato: objetivo, área, risco principal e condição de saída.
          </Text>
        </Box>

        <HStack spacing={3} pt={1} flexWrap="wrap">
          <Button type="submit" variant="tactical" isLoading={isSubmitting}>
            {editingTask ? 'Salvar missão' : 'Registrar missão'}
          </Button>
          {editingTask ? (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar edição
            </Button>
          ) : null}
        </HStack>
      </VStack>
    </Box>
  );
}

function MetricShell({
  icon,
  label,
  value,
  tone,
}: {
  icon: typeof Flag;
  label: string;
  value: string;
  tone: 'info' | 'success' | 'warning' | 'critical';
}) {
  return (
    <Box
      p={3.5}
      borderRadius="2xl"
      bg="surface.interactive"
      border="1px solid"
      borderColor="border.subtle"
    >
      <HStack justify="space-between" align="flex-start">
        <VStack align="flex-start" spacing={1}>
          <ShellSectionEyebrow>{label}</ShellSectionEyebrow>
          <Text fontSize="sm" fontWeight="700" color="white" textTransform="capitalize">
            {value}
          </Text>
        </VStack>
        <ShellTelemetryBadge tone={tone}>
          <HStack spacing={1.5}>
            <Icon as={icon} boxSize={3} />
            <Text fontSize="10px">{label}</Text>
          </HStack>
        </ShellTelemetryBadge>
      </HStack>
    </Box>
  );
}
