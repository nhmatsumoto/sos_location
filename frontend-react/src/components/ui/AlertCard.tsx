import { Box, VStack, HStack, type BoxProps } from '@chakra-ui/react';
import { TacticalText } from '../atoms/TacticalText';

interface AlertCardProps extends BoxProps {
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  timestamp?: string;
  onClick?: () => void;
}

const severityConfig = {
  critical: { color: '#FF3B30', dotBg: '#FF3B30', label: 'Crítico' },
  warning:  { color: '#FF9500', dotBg: '#FF9500', label: 'Atenção' },
  info:     { color: '#007AFF', dotBg: '#007AFF', label: 'Info' },
};

export function AlertCard({ title, description, severity, timestamp, onClick, ...props }: AlertCardProps) {
  const config = severityConfig[severity];

  return (
    <Box
      p={3}
      bg="#111119"
      borderRadius="md"
      border="1px solid rgba(255,255,255,0.07)"
      borderLeft="3px solid"
      borderLeftColor={config.color}
      transition="background 0.15s"
      cursor="pointer"
      _hover={{ bg: '#16161F' }}
      onClick={onClick}
      {...props}
    >
      <VStack align="stretch" spacing={1.5}>
        <HStack justify="space-between" align="center">
          <HStack spacing={2}>
            <Box w="6px" h="6px" borderRadius="full" bg={config.dotBg} flexShrink={0} />
            <TacticalText variant="caption" color={config.color} fontWeight="600" fontSize="10px">
              {config.label}
            </TacticalText>
          </HStack>
          {timestamp && (
            <TacticalText variant="mono" fontSize="10px" color="rgba(255,255,255,0.30)">
              {timestamp}
            </TacticalText>
          )}
        </HStack>

        <Box>
          <TacticalText variant="heading" fontSize="xs" color="white" mb={0.5} noOfLines={1}>
            {title}
          </TacticalText>
          <TacticalText fontSize="11px" color="rgba(255,255,255,0.50)" noOfLines={2} lineHeight="1.5">
            {description}
          </TacticalText>
        </Box>
      </VStack>
    </Box>
  );
}
