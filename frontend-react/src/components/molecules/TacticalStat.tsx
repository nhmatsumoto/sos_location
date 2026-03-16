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
    <VStack 
      align="start" 
      spacing={1} 
      minW="120px" 
      position="relative"
    >
      <HStack spacing={2} color={color} opacity={0.8}>
        <Icon as={icon} boxSize="10px" />
        <TacticalText 
          variant="caption" 
          color={color} 
          fontSize="9px" 
          fontWeight="black" 
          letterSpacing="0.1em"
        >
          {label.toUpperCase()}
        </TacticalText>
      </HStack>
      <HStack align="baseline" spacing={1}>
        <TacticalText 
          variant="mono"
          fontSize="xl" 
          fontWeight="bold" 
          color="white"
          textShadow={`0 0 10px ${color}33`}
        >
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
