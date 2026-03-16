import { VStack, HStack, Icon } from '@chakra-ui/react';
import type { LucideIcon } from 'lucide-react';
import { TacticalText } from '../atoms/TacticalText';

interface TacticalStatProps {
  label: string;
  value: string | number;
  unit?: string;
  icon: LucideIcon;
  color?: string;
}

/**
 * Tactical Stat Component
 * Displays mission-critical metrics with high-contrast priority.
 */
export function TacticalStat({ label, value, unit, icon, color = 'sos.blue.400' }: TacticalStatProps) {
  return (
    <VStack align="start" spacing={1} p={3} bg="whiteAlpha.50" borderRadius="xl" border="1px solid" borderColor="whiteAlpha.100" minW="140px">
      <HStack spacing={2} color={color}>
        <Icon as={icon} boxSize="12px" />
        <TacticalText variant="caption" color={color}>{label}</TacticalText>
      </HStack>
      <HStack align="baseline" spacing={1} mt={1}>
        <TacticalText fontSize="lg" fontWeight="black" color="white">
          {value}
        </TacticalText>
        {unit && (
          <TacticalText variant="caption" fontSize="9px" color="whiteAlpha.400">
            {unit}
          </TacticalText>
        )}
      </HStack>
    </VStack>
  );
}
