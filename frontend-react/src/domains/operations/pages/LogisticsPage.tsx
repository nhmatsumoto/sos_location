import { Package, Plus, RefreshCw, Send, AlertTriangle, Truck, CheckCircle, PackageSearch, Boxes } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { LoadingOverlay } from '../../../components/ui/LoadingOverlay';
import { 
  Box, 
  Flex, 
  HStack, 
  VStack, 
  SimpleGrid, 
  Table, 
  Thead, 
  Tbody, 
  Tr, 
  Th, 
  Td, 
  FormControl, 
  FormLabel, 
  Input, 
  Select,
  Badge,
  Icon,
  Divider
} from '@chakra-ui/react';
import { useLogisticsDashboard } from '../../../hooks/useLogisticsDashboard';
import { GlassPanel } from '../../../components/atoms/GlassPanel';
import { TacticalText } from '../../../components/atoms/TacticalText';
import { TacticalButton } from '../../../components/atoms/TacticalButton';

/**
 * Logistics & Supply Chain Command — Guardian v3
 * Manages Humanitarian Aid movements and inventory telemetry.
 */
export function LogisticsPage() {
  const { 
    supplies, 
    loading, 
    modalOpen, 
    setModalOpen, 
    form, 
    setForm, 
    stats, 
    actions 
  } = useLogisticsDashboard();

  return (
    <Box p={8} h="100%" w="100%" overflowY="auto" bg="sos.dark" className="custom-scrollbar">
      {loading && <LoadingOverlay message="Sincronizando Malha Logística..." />}

      <VStack spacing={8} align="stretch" maxW="1500px" mx="auto">
        
        {/* Header Section */}
        <Flex align="center" justify="space-between" direction={{ base: 'column', md: 'row' }} gap={6}>
          <HStack spacing={4}>
            <Box p={3} bg="rgba(0, 122, 255, 0.12)" borderRadius="2xl" boxShadow="0 0 24px rgba(0, 122, 255, 0.2)">
              <Icon as={Boxes} boxSize={6} color="#007AFF" />
            </Box>
            <VStack align="start" spacing={0}>
              <TacticalText variant="heading" fontSize="2xl">Rede de Suprimentos</TacticalText>
              <HStack spacing={2} mt={1}>
                <HStack spacing={1.5}>
                  <Box w={2} h={2} borderRadius="full" bg="#34C759" className="animate-pulse" />
                  <TacticalText variant="mono" fontSize="10px" color="rgba(255,255,255,0.4)">LOGISTICS_SYSTEM: ONLINE</TacticalText>
                </HStack>
                <Divider orientation="vertical" h="10px" borderColor="whiteAlpha.300" />
                <TacticalText variant="mono" fontSize="10px" color="rgba(255,255,255,0.4)">OPERATIONAL_UNITS: {supplies.length}</TacticalText>
              </HStack>
            </VStack>
          </HStack>

          <HStack spacing={3}>
            <TacticalButton leftIcon={<RefreshCw size={16} />} onClick={() => void actions.loadData()} isLoading={loading} variant="ghost">
              ATUALIZAR_FEED
            </TacticalButton>
            <TacticalButton glow leftIcon={<Plus size={18} />} onClick={actions.handleCreateDraft} bg="#007AFF">
              NOVO_REGISTRO
            </TacticalButton>
          </HStack>
        </Flex>

        {/* KPI Grid */}
        <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} spacing={6}>
          <GlassPanel p={6} depth="raised" flexDirection="column" gap={1}>
            <HStack justify="space-between" mb={2}>
              <Icon as={PackageSearch} color="#007AFF" boxSize={5} />
              <Badge variant="subtle" colorScheme="blue" borderRadius="full" fontSize="9px">TOTAIS</Badge>
            </HStack>
            <TacticalText variant="heading" fontSize="3xl" color="white">{stats.total}</TacticalText>
            <TacticalText variant="caption" fontSize="xs">CARGAS_ATIVAS_DETECTADAS</TacticalText>
          </GlassPanel>

          <GlassPanel p={6} depth="raised" flexDirection="column" gap={1}>
            <HStack justify="space-between" mb={2}>
              <Icon as={Truck} color="#FF9500" boxSize={5} />
              <Badge variant="subtle" colorScheme="orange" borderRadius="full" fontSize="9px">TRANSITO</Badge>
            </HStack>
            <TacticalText variant="heading" fontSize="3xl" color="white">{stats.inTransit}</TacticalText>
            <TacticalText variant="caption" fontSize="xs">MOVIMENTAÇÕES_OPERACIONAIS</TacticalText>
          </GlassPanel>

          <GlassPanel p={6} depth="raised" flexDirection="column" gap={1}>
            <HStack justify="space-between" mb={2}>
              <Icon as={CheckCircle} color="#34C759" boxSize={5} />
              <Badge variant="subtle" colorScheme="green" borderRadius="full" fontSize="9px">CHECK</Badge>
            </HStack>
            <TacticalText variant="heading" fontSize="3xl" color="white">{stats.delivered}</TacticalText>
            <TacticalText variant="caption" fontSize="xs">ENTREGAS_CONCLUÍDAS_HOJE</TacticalText>
          </GlassPanel>

          <GlassPanel p={6} depth="raised" flexDirection="column" gap={1}>
            <HStack justify="space-between" mb={2}>
              <Icon as={AlertTriangle} color="#FF3B30" boxSize={5} />
              <Badge variant="subtle" colorScheme="red" borderRadius="full" fontSize="9px">CRITICAL</Badge>
            </HStack>
            <TacticalText variant="heading" fontSize="3xl" color="white">{stats.critical}</TacticalText>
            <TacticalText variant="caption" fontSize="xs">ALERTAS_DE_URGÊNCIA</TacticalText>
          </GlassPanel>
        </SimpleGrid>

        {/* Shipment Table Panel */}
        <GlassPanel depth="base" flexDirection="column" p={0} overflow="hidden">
          <Box overflowX="auto">
            <Table variant="simple" size="md">
              <Thead bg="rgba(255,255,255,0.03)">
                <Tr>
                  <Th borderBottom="1px solid rgba(255,255,255,0.08)" color="rgba(255,255,255,0.4)" fontSize="10px" letterSpacing="0.2em">ITEM_RECURSO</Th>
                  <Th borderBottom="1px solid rgba(255,255,255,0.08)" color="rgba(255,255,255,0.4)" fontSize="10px" letterSpacing="0.2em">VOLUME_QUANT</Th>
                  <Th borderBottom="1px solid rgba(255,255,255,0.08)" color="rgba(255,255,255,0.4)" fontSize="10px" letterSpacing="0.2em">FLUXO_LOGISTICO</Th>
                  <Th borderBottom="1px solid rgba(255,255,255,0.08)" color="rgba(255,255,255,0.4)" fontSize="10px" letterSpacing="0.2em">STATUS_OP</Th>
                  <Th borderBottom="1px solid rgba(255,255,255,0.08)" color="rgba(255,255,255,0.4)" fontSize="10px" letterSpacing="0.2em">PRIORIDADE</Th>
                </Tr>
              </Thead>
              <Tbody>
                {supplies.length === 0 ? (
                  <Tr>
                    <Td colSpan={5} py={32} textAlign="center">
                      <VStack spacing={4} opacity={0.3}>
                         <Package size={48} />
                         <TacticalText variant="mono" fontSize="sm">SISTEMA_VAZIO // AGUARDANDO_DADOS</TacticalText>
                      </VStack>
                    </Td>
                  </Tr>
                ) : (
                  supplies.map((s) => (
                    <Tr 
                      key={s.id} 
                      _hover={{ bg: 'rgba(255,255,255,0.02)' }} 
                      transition="all 0.2s"
                    >
                      <Td py={5} borderColor="rgba(255,255,255,0.06)">
                        <HStack spacing={3}>
                           <Icon as={Package} size={14} color="#007AFF" />
                           <TacticalText variant="heading" fontSize="xs" color="white">{s.item}</TacticalText>
                        </HStack>
                      </Td>
                      <Td py={5} borderColor="rgba(255,255,255,0.06)">
                        <TacticalText variant="mono" color="white" fontSize="xs">{s.quantity} <Box as="span" color="rgba(255,255,255,0.3)">{s.unit || 'un'}</Box></TacticalText>
                      </Td>
                      <Td py={5} borderColor="rgba(255,255,255,0.06)">
                        <HStack spacing={2}>
                          <Badge bg="rgba(0,122,255,0.1)" color="#007AFF" fontSize="10px" borderRadius="md" px={2}>{s.origin}</Badge>
                          <Icon as={Send} size={10} color="rgba(255,255,255,0.2)" />
                          <Badge bg="rgba(52,199,89,0.1)" color="#34C759" fontSize="10px" borderRadius="md" px={2}>{s.destination}</Badge>
                        </HStack>
                      </Td>
                      <Td py={5} borderColor="rgba(255,255,255,0.06)">
                        <Badge 
                          variant="subtle" 
                          px={2} py={0.5} borderRadius="md"
                          bg={s.status === 'delivered' ? 'rgba(52,199,89,0.1)' : s.status === 'in_transit' ? 'rgba(255,149,0,0.1)' : 'rgba(255,255,255,0.05)'}
                          color={s.status === 'delivered' ? '#34C759' : s.status === 'in_transit' ? '#FF9500' : 'rgba(255,255,255,0.4)'}
                          fontSize="9px" fontWeight="800"
                          border="1px solid" borderColor={s.status === 'delivered' ? 'rgba(52,199,89,0.2)' : s.status === 'in_transit' ? 'rgba(255,149,0,0.2)' : 'transparent'}
                        >
                          {s.status?.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </Td>
                      <Td py={5} borderColor="rgba(255,255,255,0.06)">
                        <HStack spacing={2}>
                          <Box 
                            w={1.5} h={1.5} borderRadius="full" 
                            bg={s.priority === 'high' || s.priority === 'critical' ? '#FF3B30' : '#34C759'} 
                            boxShadow={s.priority === 'high' ? '0 0 10px #FF3B30' : 'none'}
                          />
                          <TacticalText 
                            variant="mono" fontSize="9px" fontWeight="900"
                            color={s.priority === 'high' || s.priority === 'critical' ? '#FF3B30' : 'rgba(255,255,255,0.4)'}
                          >
                            {s.priority?.toUpperCase()}
                          </TacticalText>
                        </HStack>
                      </Td>
                    </Tr>
                  ))
                )}
              </Tbody>
            </Table>
          </Box>
        </GlassPanel>
      </VStack>

      {/* Shipment Modal — Integrated v3 */}
      <Modal title="REGISTRAR MOVIMENTAÇÃO DE CARGA" open={modalOpen} onClose={() => setModalOpen(false)}>
        <VStack spacing={6} align="stretch" py={6}>
          <SimpleGrid columns={2} spacing={6}>
            <FormControl>
              <FormLabel><TacticalText variant="caption" fontSize="10px">ITEM_NOME</TacticalText></FormLabel>
              <Input 
                value={form.item} 
                onChange={(e) => setForm(p => ({ ...p, item: e.target.value }))}
                bg="rgba(255,255,255,0.05)"
                borderColor="rgba(255,255,255,0.1)"
                _hover={{ borderColor: 'rgba(255,255,255,0.2)' }}
                _focus={{ borderColor: '#007AFF', bg: 'rgba(255,255,255,0.08)' }}
                placeholder="Ex: Água Potável"
                borderRadius="xl"
                h="52px"
              />
            </FormControl>
            <FormControl>
              <FormLabel><TacticalText variant="caption" fontSize="10px">QUANTIDADE_VOL</TacticalText></FormLabel>
              <HStack>
                <Input 
                  type="number"
                  value={form.quantity} 
                  onChange={(e) => setForm(p => ({ ...p, quantity: Number(e.target.value) }))}
                  bg="rgba(255,255,255,0.05)"
                  borderColor="rgba(255,255,255,0.1)"
                  borderRadius="xl"
                  h="52px"
                />
                <Select 
                  value={form.unit}
                  onChange={(e) => setForm(p => ({ ...p, unit: e.target.value }))}
                  bg="#1A1A24"
                  borderColor="rgba(255,255,255,0.1)"
                  borderRadius="xl"
                  h="52px"
                  w="100px"
                  sx={{ option: { background: "#1A1A24" } }}
                >
                  <option value="un">un</option>
                  <option value="kg">kg</option>
                  <option value="L">L</option>
                  <option value="caixas">caixas</option>
                  <option value="ton">ton</option>
                </Select>
              </HStack>
            </FormControl>
          </SimpleGrid>

          <SimpleGrid columns={2} spacing={6}>
            <FormControl>
              <FormLabel><TacticalText variant="caption" fontSize="10px">ZONA_ORIGEM</TacticalText></FormLabel>
              <Input 
                value={form.origin} 
                onChange={(e) => setForm(p => ({ ...p, origin: e.target.value }))}
                bg="rgba(255,255,255,0.05)"
                borderColor="rgba(255,255,255,0.1)"
                placeholder="Ponto de Partida"
                borderRadius="xl"
                h="52px"
              />
            </FormControl>
            <FormControl>
              <FormLabel><TacticalText variant="caption" fontSize="10px">ZONA_DESTINO</TacticalText></FormLabel>
              <Input 
                value={form.destination} 
                onChange={(e) => setForm(p => ({ ...p, destination: e.target.value }))}
                bg="rgba(255,255,255,0.05)"
                borderColor="rgba(255,255,255,0.1)"
                placeholder="Ponto de Entrega"
                borderRadius="xl"
                h="52px"
              />
            </FormControl>
          </SimpleGrid>

          <SimpleGrid columns={2} spacing={6}>
            <FormControl>
              <FormLabel><TacticalText variant="caption" fontSize="10px">STATUS_INICIAL</TacticalText></FormLabel>
              <Select 
                value={form.status}
                onChange={(e) => setForm(p => ({ ...p, status: e.target.value }))}
                bg="#1A1A24"
                borderColor="rgba(255,255,255,0.1)"
                borderRadius="xl"
                h="52px"
              >
                <option value="pending">Pendente</option>
                <option value="in_transit">Em Trânsito</option>
                <option value="delivered">Entregue</option>
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel><TacticalText variant="caption" fontSize="10px">PRIORIDADE_LOGISTICA</TacticalText></FormLabel>
              <Select 
                value={form.priority}
                onChange={(e) => setForm(p => ({ ...p, priority: e.target.value }))}
                bg="#1A1A24"
                borderColor="rgba(255,255,255,0.1)"
                borderRadius="xl"
                h="52px"
              >
                <option value="low">Baixa</option>
                <option value="medium">Média</option>
                <option value="high">Alta</option>
                <option value="critical">Crítica</option>
              </Select>
            </FormControl>
          </SimpleGrid>

          <TacticalButton glow h="64px" bg="#007AFF" onClick={() => void actions.submitShipment()}>
            SINALIZAR MOVIMENTAÇÃO DE CARGA
          </TacticalButton>
        </VStack>
      </Modal>
    </Box>
  );
}
