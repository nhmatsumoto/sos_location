import { useEffect, useState } from 'react';
import { 
  Box, VStack, Heading, Text, Table, Tbody, Tr, Td, Th, Thead, 
  Badge, Button, HStack, useToast, Icon, Container, Flex,
  Spinner 
} from '@chakra-ui/react';
import { X, AlertCircle, MapPin, ShieldCheck } from 'lucide-react';
import { tacticalIntelApi } from '../services/tacticalIntelApi';
import type { OperationalPoint } from '../services/tacticalIntelApi';


export default function TacticalAdminPage() {
  const [points, setPoints] = useState<OperationalPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    loadPoints();
  }, []);

  const loadPoints = async () => {
    try {
      setLoading(true);
      const data = await tacticalIntelApi.getPoints();
      setPoints(data);
    } catch (e) {
      toast({ title: 'Erro ao carregar dados', status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await tacticalIntelApi.approvePoint(id);
      toast({ title: 'Aprovado com sucesso', status: 'success' });
      loadPoints();
    } catch (e) {
       toast({ title: 'Erro na aprovação', status: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await tacticalIntelApi.deletePoint(id);
      toast({ title: 'Removido com sucesso', status: 'warning' });
      loadPoints();
    } catch (e) {
      toast({ title: 'Erro ao remover', status: 'error' });
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Alert': return AlertCircle;
      case 'Support': return ShieldCheck;
      case 'Mark': return MapPin;
      default: return MapPin;
    }
  };

  return (
    <Box bg="sos.dark" minH="100vh" py={8} color="white">
      <Container maxW="container.xl">
        <Flex justify="space-between" align="center" mb={8}>
          <VStack align="start" spacing={0}>
             <Text fontSize="xs" fontWeight="black" color="sos.blue.400" letterSpacing="widest">ADMIN_PANEL</Text>
             <Heading size="lg" letterSpacing="tight">TACTICAL INTEL APPROVAL</Heading>
          </VStack>
          <Button leftIcon={<Icon as={X} size={14} />} variant="ghost" color="whiteAlpha.600" onClick={loadPoints}>
            REFRESH_SYNC
          </Button>
        </Flex>

        <Box 
          bg="whiteAlpha.50" 
          borderRadius="xl" 
          border="1px solid" 
          borderColor="whiteAlpha.100" 
          overflow="hidden"
          backdropFilter="blur(20px)"
        >
          {loading ? (
            <Flex p={20} justify="center"><Spinner color="sos.blue.400" /></Flex>
          ) : (
            <Table variant="simple" size="sm">
              <Thead bg="whiteAlpha.100">
                <Tr>
                  <Th color="whiteAlpha.600">TYPE</Th>
                  <Th color="whiteAlpha.600">TITLE</Th>
                  <Th color="whiteAlpha.600">COORDINATES</Th>
                  <Th color="whiteAlpha.600">STATUS</Th>
                  <Th color="whiteAlpha.600">ACTIONS</Th>
                </Tr>
              </Thead>
              <Tbody>
                {points.length === 0 && (
                  <Tr><Td colSpan={5} py={20} textAlign="center" color="whiteAlpha.400">NO PENDING INTEL DETECTED</Td></Tr>
                )}
                {points.map((p) => (
                  <Tr key={p.id} _hover={{ bg: 'whiteAlpha.50' }}>
                    <Td>
                      <HStack spacing={2}>
                        <Icon as={getTypeIcon(p.type)} color="sos.blue.400" />
                        <Text fontSize="xs" fontWeight="bold">{p.type.toUpperCase()}</Text>
                      </HStack>
                    </Td>
                    <Td>
                      <VStack align="start" spacing={0}>
                        <Text fontWeight="bold">{p.title}</Text>
                        <Text fontSize="2xs" color="whiteAlpha.500">{p.description}</Text>
                      </VStack>
                    </Td>
                    <Td>
                       <Text fontSize="10px" fontFamily="mono" color="whiteAlpha.700">
                        {p.latitude.toFixed(6)}, {p.longitude.toFixed(6)}
                      </Text>
                    </Td>
                    <Td>
                      <Badge colorScheme={p.isApproved ? 'green' : 'orange'} variant="subtle" fontSize="9px">
                        {p.status?.toUpperCase() || 'PENDING'}
                      </Badge>
                    </Td>
                    <Td>
                      <HStack spacing={2}>
                        {!p.isApproved && (
                          <Button size="xs" colorScheme="green" variant="tactical" onClick={() => handleApprove(p.id!)}>
                            APPROVE
                          </Button>
                        )}
                        <Button size="xs" colorScheme="red" variant="ghost" onClick={() => handleDelete(p.id!)}>
                          ARCHIVE
                        </Button>
                      </HStack>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </Box>
      </Container>
    </Box>
  );
}
