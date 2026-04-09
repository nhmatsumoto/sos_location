import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Text,
  IconButton,
  Collapse,
  useDisclosure,
  HStack,
  Badge,
} from '@chakra-ui/react';
import { ChevronUp, ChevronDown, Table as TableIcon, ZoomIn } from 'lucide-react';
import type { GeoPoint } from '../../services/geoCentralApi';

interface GeoAttributeTableProps {
  data: GeoPoint[];
  onFocus?: (point: GeoPoint) => void;
}

/**
 * QGIS-Inspired Attribute Table
 * Displays technical GIS data in a professional, mission-critical format.
 */
export function GeoAttributeTable({ data, onFocus }: GeoAttributeTableProps) {
  const { isOpen, onToggle } = useDisclosure({ defaultIsOpen: false });

  if (data.length === 0) return null;

  return (
    <Box
      position="absolute"
      bottom={0}
      left={0}
      right={0}
      zIndex={1000}
      bg="rgba(10, 15, 25, 0.95)"
      borderTop="1px solid"
      borderColor="whiteAlpha.200"
      
      transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
    >
      <HStack px={4} py={2} justify="space-between" bg="whiteAlpha.50">
        <HStack spacing={3}>
          <TableIcon size={16} color="#3182ce" />
          <Text fontSize="xs" fontWeight="bold" letterSpacing="wider" color="whiteAlpha.800">
            GIS ATTRIBUTE TABLE - {data.length} RECORDS
          </Text>
        </HStack>
        <IconButton
          aria-label="Toggle Table"
          icon={isOpen ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          size="xs"
          variant="ghost"
          onClick={onToggle}
          color="whiteAlpha.700"
          _hover={{ bg: 'whiteAlpha.100' }}
        />
      </HStack>

      <Collapse in={isOpen}>
        <Box maxH="300px" overflowY="auto" className="tactical-scrollbar">
          <Table variant="unstyled" size="sm">
            <Thead position="sticky" top={0} bg="#0a0f19" zIndex={1} borderBottom="1px solid" borderColor="whiteAlpha.100">
              <Tr>
                <Th color="whiteAlpha.500" fontSize="10px">COORDINATES</Th>
                <Th color="whiteAlpha.500" fontSize="10px">SOIL TYPE</Th>
                <Th color="whiteAlpha.500" fontSize="10px">STABILITY</Th>
                <Th color="whiteAlpha.500" fontSize="10px">MOISTURE</Th>
                <Th color="whiteAlpha.500" fontSize="10px">ELEVATION</Th>
                <Th color="whiteAlpha.500" fontSize="10px">CLIMATE</Th>
                <Th textAlign="right"></Th>
              </Tr>
            </Thead>
            <Tbody>
              {data.map((point, idx) => (
                <Tr 
                  key={idx} 
                  _hover={{ bg: 'whiteAlpha.50' }} 
                  transition="background 0.2s"
                  borderBottom="1px solid"
                  borderColor="whiteAlpha.50"
                >
                  <Td fontSize="xs" py={1}>
                    <Text color="#3182ce" fontWeight="bold">
                      {point.latitude.toFixed(4)}, {point.longitude.toFixed(4)}
                    </Text>
                  </Td>
                  <Td fontSize="xs" py={1}>
                    <Badge variant="outline" colorScheme="blue" fontSize="9px">
                      {point.soil.type.toUpperCase()}
                    </Badge>
                  </Td>
                  <Td fontSize="xs" py={1}>
                    <Box w="full" bg="whiteAlpha.100" h="4px" borderRadius="full">
                      <Box 
                        w={`${point.soil.stabilityIndex * 100}%`} 
                        h="full" 
                        bg={point.soil.stabilityIndex < 0.4 ? 'red.400' : 'green.400'} 
                        borderRadius="full"
                      />
                    </Box>
                  </Td>
                  <Td fontSize="xs" py={1}>
                    <Text color="whiteAlpha.800">{(point.soil.moistureContent * 100).toFixed(1)}%</Text>
                  </Td>
                  <Td fontSize="xs" py={1}>
                    <Text color="teal.300">{point.topography.elevation.toFixed(1)}m</Text>
                  </Td>
                  <Td fontSize="xs" py={1}>
                    <Text color="orange.300">{point.climate.temperature.toFixed(1)}°C</Text>
                  </Td>
                  <Td textAlign="right" py={1}>
                    <IconButton
                      aria-label="Focus"
                      icon={<ZoomIn size={14} />}
                      size="xs"
                      variant="ghost"
                      onClick={() => onFocus?.(point)}
                      color="whiteAlpha.500"
                    />
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      </Collapse>
    </Box>
  );
}
