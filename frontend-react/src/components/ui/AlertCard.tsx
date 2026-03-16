import { Box, VStack, HStack, Circle, type BoxProps } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';

interface AlertCardProps extends BoxProps {
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  timestamp?: string;
  onClick?: () => void;
}

const severityConfig = {
  critical: { color: 'sos.red.500', label: 'Critical' },
  warning: { color: 'orange.400', label: 'Warning' },
  info: { color: 'sos.blue.400', label: 'Info' },
};

const pulseAnimation = keyframes`
  0% { transform: scale(0.95); opacity: 0.5; }
  50% { transform: scale(1.05); opacity: 0.8; }
  100% { transform: scale(0.95); opacity: 0.5; }
`;

import { TacticalText } from '../atoms/TacticalText';

export function AlertCard({ title, description, severity, timestamp, onClick, ...props }: AlertCardProps) {
  const config = severityConfig[severity];

  return (
    <Box 
      p={4} 
      bg="rgba(15, 23, 42, 0.4)" 
      borderRadius="2xl" 
      border="1px solid" 
      borderColor="whiteAlpha.100"
      borderLeft="4px solid"
      borderLeftColor={config.color}
      transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
      cursor="pointer"
      _hover={{ 
        transform: 'translateX(6px)', 
        bg: 'whiteAlpha.100', 
        borderColor: 'whiteAlpha.300',
        borderLeftColor: config.color,
        boxShadow: `0 10px 30px -10px ${config.color}33`,
      }}
      onClick={onClick}
      position="relative"
      overflow="hidden"
      {...props}
    >
      <VStack align="stretch" spacing={2.5}>
        <HStack justify="space-between" align="center">
          <HStack spacing={2}>
            <Circle 
              size="6px" 
              bg={config.color} 
              animation={`${pulseAnimation} 1.5s infinite ease-in-out`}
              boxShadow={`0 0 12px ${config.color}`}
            />
            <TacticalText 
              variant="caption" 
              color={config.color} 
              fontWeight="black" 
              fontSize="9px"
            >
              {config.label.toUpperCase()}
            </TacticalText>
          </HStack>
          {timestamp && (
            <TacticalText variant="mono" fontSize="9px" color="whiteAlpha.400">
              {timestamp}
            </TacticalText>
          )}
        </HStack>
        
        <Box>
          <TacticalText 
            variant="heading"
            fontSize="xs" 
            color="white" 
            mb={0.5} 
            noOfLines={1}
            letterSpacing="tight"
          >
            {title}
          </TacticalText>
          <TacticalText 
            fontSize="10px" 
            color="whiteAlpha.600" 
            noOfLines={2} 
            lineHeight="1.5"
          >
            {description}
          </TacticalText>
        </Box>
      </VStack>
      
      {/* Decorative scanline on top */}
      <Box 
        position="absolute" 
        top={0} 
        left={0} 
        right={0} 
        h="1px" 
        bg={config.color} 
        opacity={0.05} 
      />
    </Box>
  );
}
