import { VStack, Flex, HStack, Box } from '@chakra-ui/react';
import { TacticalText } from '../atoms/TacticalText';

interface StreamStep {
  step: number;
  lat: number;
  lng: number;
  depth: number;
  risk: string;
}

interface EventTimelineProps {
  steps: StreamStep[];
}

/**
 * Tactical Event Timeline
 * Renders a high-density operational log for the simulation stream.
 */
export function EventTimeline({ steps }: EventTimelineProps) {
  if (steps.length === 0) return null;

  return (
    <VStack flex={1} spacing={2} align="stretch">
      {steps.slice().reverse().map((step) => (
        <Flex
          key={`${step.step}-${step.lat}`}
          justify="space-between"
          align="center"
          bg="whiteAlpha.50"
          px={3}
          py={2}
          borderRadius="md"
          border="1px solid"
          borderColor="whiteAlpha.100"
          _hover={{ bg: 'whiteAlpha.100', borderColor: 'sos.blue.400' }}
          transition="all 0.2s"
        >
          <HStack spacing={3}>
            <Box 
              px={1.5} 
              py={0.5} 
              bg="sos.blue.500" 
              borderRadius="sm"
              boxShadow="0 0 10px rgba(6, 182, 212, 0.3)"
            >
              <TacticalText variant="mono" fontSize="9px" color="white" fontWeight="black">
                #{step.step}
              </TacticalText>
            </Box>
            <TacticalText variant="mono" fontSize="10px" color="whiteAlpha.600">
              {step.lat.toFixed(4)} / {step.lng.toFixed(4)}
            </TacticalText>
          </HStack>
          <HStack spacing={2}>
            <TacticalText variant="mono" fontSize="10px" fontWeight="black" color="sos.blue.400">
              {step.depth.toFixed(2)}M
            </TacticalText>
            <Box boxSize="4px" borderRadius="full" bg={step.depth > 1 ? "sos.red.500" : "sos.blue.400"} />
          </HStack>
        </Flex>
      ))}
    </VStack>
  );
}
