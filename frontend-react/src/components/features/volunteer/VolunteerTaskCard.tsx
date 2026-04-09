import { AlertCircle, Clock3, HandHeart, MapPin } from 'lucide-react';
import { Box, Button, HStack, Icon, Text, VStack } from '@chakra-ui/react';
import { ShellSectionEyebrow, ShellTelemetryBadge, ShellSurface } from '../../layout/ShellPrimitives';
import type { VolunteerTask } from '../../../types/volunteer';

interface VolunteerTaskCardProps {
  task: VolunteerTask;
  onPickUp: (taskId: string) => void;
}

const priorityTone = {
  low: 'info',
  medium: 'warning',
  high: 'warning',
  critical: 'critical',
} as const;

const categoryLabel = {
  rescue: 'Resgate',
  delivery: 'Suprimentos',
  'first-aid': 'Primeiros socorros',
  logistics: 'Logística',
} as const;

export function VolunteerTaskCard({ task, onPickUp }: VolunteerTaskCardProps) {
  const createdAtLabel = new Date(task.createdAt).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <ShellSurface
      variant="panel"
      p={4}
      transition="all 0.2s"
      _hover={{ borderColor: 'border.strong', transform: 'translateY(-2px)' }}
    >
      <VStack align="stretch" spacing={4}>
        <HStack justify="space-between" align="flex-start" spacing={3}>
          <VStack align="flex-start" spacing={2}>
            <HStack spacing={2} flexWrap="wrap">
              <ShellTelemetryBadge tone={priorityTone[task.priority]}>
                {task.priority}
              </ShellTelemetryBadge>
              <ShellTelemetryBadge tone="default">
                {categoryLabel[task.category]}
              </ShellTelemetryBadge>
            </HStack>
            <Text fontSize="lg" fontWeight="700" color="white" lineHeight={1.2}>
              {task.title}
            </Text>
          </VStack>
          <Box
            p={2.5}
            borderRadius="2xl"
            bg={task.priority === 'critical' ? 'rgba(255,59,48,0.12)' : 'surface.interactive'}
            border="1px solid"
            borderColor={task.priority === 'critical' ? 'rgba(255,59,48,0.22)' : 'border.subtle'}
          >
            <Icon
              as={AlertCircle}
              boxSize={4.5}
              color={task.priority === 'critical' ? 'sos.red.300' : 'text.secondary'}
            />
          </Box>
        </HStack>

        <Text fontSize="sm" color="text.secondary" lineHeight={1.7} noOfLines={3}>
          {task.description}
        </Text>

        <HStack spacing={3} flexWrap="wrap">
          <DataPoint icon={MapPin} label="Local" value={task.location.address || 'Coordenada operacional'} />
          <DataPoint icon={Clock3} label="Emitida" value={createdAtLabel} />
        </HStack>

        <Box
          px={3.5}
          py={3}
          borderRadius="2xl"
          bg="surface.interactive"
          border="1px solid"
          borderColor="border.subtle"
        >
          <ShellSectionEyebrow mb={1.5}>Janela de atuação</ShellSectionEyebrow>
          <Text fontSize="sm" color="text.secondary">
            Assuma somente se puder confirmar deslocamento e retorno de campo com a central.
          </Text>
        </Box>

        <Button
          leftIcon={<Icon as={HandHeart} boxSize={4} />}
          variant="tactical"
          onClick={() => onPickUp(task.id)}
        >
          Assumir missão
        </Button>
      </VStack>
    </ShellSurface>
  );
}

function DataPoint({
  icon,
  label,
  value,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
}) {
  return (
    <Box
      flex="1"
      minW={{ base: '100%', sm: 'unset' }}
      px={3}
      py={2.5}
      borderRadius="2xl"
      bg="surface.interactive"
      border="1px solid"
      borderColor="border.subtle"
    >
      <HStack spacing={2} mb={1}>
        <Icon as={icon} boxSize={3.5} color="text.secondary" />
        <ShellSectionEyebrow>{label}</ShellSectionEyebrow>
      </HStack>
      <Text fontSize="sm" fontWeight="600" color="white">
        {value}
      </Text>
    </Box>
  );
}
