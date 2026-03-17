import { MapPin, Clock, AlertCircle } from 'lucide-react';
import type { VolunteerTask } from '../../../types/volunteer';
import { Box, VStack, HStack, Icon, Badge } from '@chakra-ui/react';
import { GlassPanel } from '../../atoms/GlassPanel';
import { TacticalText } from '../../atoms/TacticalText';
import { TacticalButton } from '../../atoms/TacticalButton';

interface VolunteerTaskCardProps {
  task: VolunteerTask;
  onPickUp: (taskId: string) => void;
}

/**
 * Volunteer Mission Card
 * Redesigned for the Guardian Tactical System.
 * Highlights mission priority and provides clear action for engagement.
 */
export function VolunteerTaskCard({ task, onPickUp }: VolunteerTaskCardProps) {
  const priorityColors: Record<string, string> = {
    low: 'sos.blue.400',
    medium: 'orange.400',
    high: 'orange.500',
    critical: 'sos.red.500',
  };

  const priorityColor = priorityColors[task.priority] || 'whiteAlpha.600';

  return (
    <GlassPanel 
      p={5} 
      transition="all 0.3s cubic-bezier(0.23, 1, 0.32, 1)"
      _hover={{ borderColor: 'sos.blue.500', transform: 'translateX(4px)' }}
    >
      <VStack align="stretch" spacing={4}>
        <HStack justify="space-between" align="flex-start">
          <VStack align="flex-start" spacing={1}>
            <HStack spacing={2}>
              <Badge 
                variant="outline" 
                borderColor={`${priorityColor}/30`} 
                color={priorityColor} 
                fontSize="9px" 
                px={2} 
                borderRadius="md"
              >
                {task.priority?.toUpperCase()}
              </Badge>
              <TacticalText variant="subheading" fontSize="9px">{task.category}</TacticalText>
            </HStack>
            <TacticalText variant="heading" fontSize="md">{task.title}</TacticalText>
          </VStack>
          <Box p={2} bg="whiteAlpha.50" borderRadius="lg">
            <Icon 
              as={AlertCircle} 
              size={18} 
              color={task.priority === 'critical' ? 'sos.red.400' : 'whiteAlpha.400'} 
              className={task.priority === 'critical' ? 'animate-pulse' : ''}
            />
          </Box>
        </HStack>

        <TacticalText color="whiteAlpha.600" noOfLines={2} fontSize="xs">
          {task.description}
        </TacticalText>

        <HStack spacing={4} pt={4} borderTop="1px solid" borderColor="whiteAlpha.100">
          <HStack spacing={1.5}>
            <Icon as={MapPin} size={14} color="sos.blue.400" />
            <TacticalText fontSize="9px">{task.location.address || 'Coordenação Local'}</TacticalText>
          </HStack>
          <HStack spacing={1.5}>
            <Icon as={Clock} size={14} color="whiteAlpha.300" />
            <TacticalText variant="mono" fontSize="9px">T-2H</TacticalText>
          </HStack>
        </HStack>

        <TacticalButton 
          h="44px" 
          bg="sos.blue.500" 
          fontSize="xs"
          onClick={() => onPickUp(task.id)}
          _hover={{ bg: 'sos.blue.400', boxShadow: '0 0 15px rgba(6, 182, 212, 0.3)' }}
        >
          ASSUMIR MISSÃO
        </TacticalButton>
      </VStack>
    </GlassPanel>
  );
}
