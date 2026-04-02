import { useCallback, useEffect, useState } from 'react';
import type { ComponentProps } from 'react';
import { 
  Box, VStack, Text, Table, Tbody, Tr, Td, Th, Thead, 
  Badge, HStack, useToast, Icon, Flex,
  Spinner, IconButton, Tooltip, Center
} from '@chakra-ui/react';
import { AlertCircle, MapPin, ShieldCheck, RefreshCw, Check, Trash2, ShieldAlert } from 'lucide-react';
import { tacticalIntelApi } from '../../../services/tacticalIntelApi';
import type { OperationalPoint } from '../../../services/tacticalIntelApi';
import { GlassPanel } from '../../../components/atoms/GlassPanel';
import { TacticalText } from '../../../components/atoms/TacticalText';

/**
 * Tactical Intel Approval Admin — Guardian v3
 * High-security administrative interface for validating user-generated operational data.
 */
export default function TacticalAdminPage() {
  const [points, setPoints] = useState<OperationalPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const loadPoints = useCallback(async () => {
    try {
      setLoading(true);
      const data = await tacticalIntelApi.getPoints();
      setPoints(data || []);
    } catch {
      toast({ 
        title: 'Central de Inteligência Indisponível', 
        description: 'Falha na sincronização de dados táticos.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadPoints();
  }, [loadPoints]);

  const handleApprove = async (id: string) => {
    try {
      await tacticalIntelApi.approvePoint(id);
      toast({ title: 'Dados validados com sucesso', status: 'success' });
      void loadPoints();
    } catch {
       toast({ title: 'Falha na validação', status: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await tacticalIntelApi.deletePoint(id);
      toast({ title: 'Registro arquivado', status: 'warning' });
      void loadPoints();
    } catch {
      toast({ title: 'Erro ao arquivar', status: 'error' });
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
    <Box h="100%" w="100%" p={8} bg="sos.dark" overflowY="auto">
      <VStack spacing={8} align="stretch" maxW="1400px" mx="auto">
        
        {/* Header Section */}
        <Flex justify="space-between" align="center">
          <HStack spacing={4}>
            <Box p={3} bg="rgba(0,122,255,0.12)" borderRadius="2xl" boxShadow="0 0 20px rgba(0, 122, 255, 0.2)">
              <Icon as={ShieldAlert} boxSize={6} color="sos.blue.500" />
            </Box>
            <VStack align="start" spacing={0}>
              <TacticalText variant="heading" fontSize="2xl">Aprovações Táticas</TacticalText>
              <HStack spacing={3} mt={1}>
                <HStack spacing={1.5}>
                  <Box w={2} h={2} borderRadius="full" bg="sos.green.500" className="animate-pulse" />
                  <TacticalText variant="mono" fontSize="10px" color="rgba(255,255,255,0.40)">ADMIN_ACCESS_LEVEL_1</TacticalText>
                </HStack>
                <Divider orientation="vertical" h="10px" borderColor="whiteAlpha.300" />
                <TacticalText variant="mono" fontSize="10px" color="rgba(255,255,255,0.40)">QUEUED_INTELLIGENCE: {points.length}</TacticalText>
              </HStack>
            </VStack>
          </HStack>

          <HStack spacing={3}>
             <Tooltip label="Sincronizar dados">
               <IconButton
                icon={<RefreshCw size={18} />}
                aria-label="Refresh"
                onClick={() => void loadPoints()}
                isLoading={loading}
                variant="ghost"
                borderRadius="xl"
                color="rgba(255,255,255,0.50)"
                _hover={{ color: 'white', bg: 'rgba(255,255,255,0.08)' }}
              />
            </Tooltip>
          </HStack>
        </Flex>

        <Divider borderColor="rgba(255,255,255,0.06)" />

        {/* Data Table Panel */}
        <GlassPanel depth="raised" overflow="hidden" flexDirection="column" p={0}>
          {loading ? (
             <Center p={32} flexDir="column" gap={4}>
               <Spinner color="sos.blue.500" size="xl" thickness="3px" />
               <TacticalText variant="mono" opacity={0.4}>DESCRIPTOGRAFANDO_PACOTES...</TacticalText>
             </Center>
          ) : (
            <Table variant="simple" size="md">
              <Thead bg="rgba(255,255,255,0.03)">
                <Tr>
                  <Th borderBottom="1px solid rgba(255,255,255,0.08)" color="rgba(255,255,255,0.4)" fontSize="10px" letterSpacing="0.2em">CLASSIFICAÇÃO</Th>
                  <Th borderBottom="1px solid rgba(255,255,255,0.08)" color="rgba(255,255,255,0.4)" fontSize="10px" letterSpacing="0.2em">CONTEÚDO_OPERACIONAL</Th>
                  <Th borderBottom="1px solid rgba(255,255,255,0.08)" color="rgba(255,255,255,0.4)" fontSize="10px" letterSpacing="0.2em">COORDENADAS</Th>
                  <Th borderBottom="1px solid rgba(255,255,255,0.08)" color="rgba(255,255,255,0.4)" fontSize="10px" letterSpacing="0.2em">STATUS</Th>
                  <Th borderBottom="1px solid rgba(255,255,255,0.08)" color="rgba(255,255,255,0.4)" fontSize="10px" letterSpacing="0.2em" textAlign="right">AÇÕES_SISTEMICAS</Th>
                </Tr>
              </Thead>
              <Tbody>
                {points.length === 0 && (
                  <Tr>
                    <Td colSpan={5} py={32} textAlign="center">
                      <VStack spacing={4} opacity={0.3}>
                         <ShieldCheck size={48} />
                         <TacticalText variant="mono" fontSize="sm">SISTEMA_LIMPO // NENHUMA_PENDENCIA</TacticalText>
                      </VStack>
                    </Td>
                  </Tr>
                )}
                {points.map((p) => (
                  <Tr key={p.id} _hover={{ bg: 'rgba(255,255,255,0.02)' }} transition="all 0.2s">
                    <Td borderColor="rgba(255,255,255,0.06)">
                      <HStack spacing={3}>
                        <Box p={2} bg="rgba(0,122,255,0.1)" borderRadius="lg">
                          <Icon as={getTypeIcon(p.type)} color="sos.blue.400" size={16} />
                        </Box>
                        <TacticalText variant="heading" fontSize="xs" color="white">{p.type.toUpperCase()}</TacticalText>
                      </HStack>
                    </Td>
                    <Td borderColor="rgba(255,255,255,0.06)">
                      <VStack align="start" spacing={1}>
                        <TacticalText variant="heading" fontSize="sm" color="white">{p.title}</TacticalText>
                        <Text fontSize="xs" color="rgba(255,255,255,0.4)" maxW="400px" noOfLines={1}>{p.description}</Text>
                      </VStack>
                    </Td>
                    <Td borderColor="rgba(255,255,255,0.06)">
                       <TacticalText variant="mono" fontSize="11px" color="sos.blue.300">
                        {p.latitude.toFixed(6)}<br />{p.longitude.toFixed(6)}
                      </TacticalText>
                    </Td>
                    <Td borderColor="rgba(255,255,255,0.06)">
                      <Badge 
                        variant="subtle" 
                        px={2} py={0.5} borderRadius="md"
                        bg={p.isApproved ? 'rgba(52,199,89,0.1)' : 'rgba(255,149,0,0.1)'}
                        color={p.isApproved ? '#34C759' : '#FF9500'}
                        fontSize="9px" fontWeight="800"
                        border="1px solid" borderColor={p.isApproved ? 'rgba(52,199,89,0.2)' : 'rgba(255,149,0,0.2)'}
                      >
                        {p.status?.toUpperCase() || (p.isApproved ? 'APPROVED' : 'PENDING')}
                      </Badge>
                    </Td>
                    <Td borderColor="rgba(255,255,255,0.06)" textAlign="right">
                      <HStack spacing={2} justify="flex-end">
                        {!p.isApproved && (
                          <Tooltip label="Validar Intel">
                            <IconButton
                              size="sm"
                              icon={<Check size={16} />}
                              onClick={() => void handleApprove(p.id!)}
                              colorScheme="green"
                              variant="ghost"
                              _hover={{ bg: 'rgba(52,199,89,0.15)' }}
                              aria-label="Approve"
                            />
                          </Tooltip>
                        )}
                        <Tooltip label="Arquivar Registro">
                          <IconButton
                            size="sm"
                            icon={<Trash2 size={16} />}
                            onClick={() => void handleDelete(p.id!)}
                            colorScheme="red"
                            variant="ghost"
                            _hover={{ bg: 'rgba(255,59,48,0.15)' }}
                            aria-label="Delete"
                          />
                        </Tooltip>
                      </HStack>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </GlassPanel>

      </VStack>
    </Box>
  );
}

// Small helper
const Divider = (props: ComponentProps<typeof Box>) => <Box h="1px" w="full" bg="rgba(255,255,255,0.08)" {...props} />;
