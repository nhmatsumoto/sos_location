import { Box, HStack, Text, SimpleGrid, Icon } from '@chakra-ui/react';
import { ShieldCheck } from 'lucide-react';

interface Hazard {
  color: string;
  label: string;
}

const DEFAULT_HAZARDS: Hazard[] = [
  { color: 'sos.red.500', label: 'Sismo / Earth' },
  { color: 'sos.blue.500', label: 'Hydrological' },
  { color: 'orange.500', label: 'Wildfire' },
  { color: 'cyan.500', label: 'Tsunami' },
  { color: 'purple.500', label: 'Atmospheric' },
  { color: 'yellow.500', label: 'Climatological' },
];

export function HazardMatrixLegend() {
  return (
    <Box 
      bg="whiteAlpha.50" 
      
      p={5} 
      borderRadius="2xl" 
      border="1px solid" 
      borderColor="whiteAlpha.100" 
      boxShadow="2xl"
    >
      <HStack spacing={3} mb={4}>
        <Icon as={ShieldCheck} color="sos.blue.400" />
        <Text fontSize="10px" fontWeight="black" textTransform="uppercase" letterSpacing="0.2em" color="white">
          Hazard_Matrix
        </Text>
      </HStack>
      <SimpleGrid columns={2} spacingX={6} spacingY={2}>
        {DEFAULT_HAZARDS.map((hazard) => (
          <LegendItem key={hazard.label} color={hazard.color} label={hazard.label} />
        ))}
      </SimpleGrid>
    </Box>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <HStack spacing={2}>
      <Box h="6px" w="6px" borderRadius="full" bg={color} boxShadow={`0 0 8px ${color}`} />
      <Text fontSize="9px" fontWeight="black" color="whiteAlpha.600" textTransform="uppercase">
        {label}
      </Text>
    </HStack>
  );
}
