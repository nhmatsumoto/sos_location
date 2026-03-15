import { Package, Plus, RefreshCw, Send, AlertTriangle, Truck, CheckCircle, PackageSearch } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { LoadingOverlay } from '../components/ui/LoadingOverlay';
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
  Icon
} from '@chakra-ui/react';
import { useLogisticsDashboard } from '../hooks/useLogisticsDashboard';
import { GlassPanel } from '../components/atoms/GlassPanel';
import { TacticalText } from '../components/atoms/TacticalText';
import { TacticalButton } from '../components/atoms/TacticalButton';
import { TacticalStat } from '../components/molecules/TacticalStat';

/**
 * Logistics & Supply Chain Command
 * Refactored with the Guardian Tactical Design System.
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
    <Box p={8} h="calc(100vh - 80px)" overflowY="auto" className="custom-scrollbar">
      {loading && <LoadingOverlay message="Sincronizando Malha Logística..." />}

      {/* Header Shell */}
      <Flex align="center" justify="space-between" mb={10}>
        <VStack align="flex-start" spacing={1}>
          <HStack spacing={3}>
            <Box p={2.5} bg="sos.blue.500" borderRadius="xl">
              <Package size={24} color="white" />
            </Box>
            <TacticalText variant="heading" fontSize="2xl">Gesto de Suprimentos</TacticalText>
          </HStack>
          <TacticalText>Coordenação de ajuda humanitária e telemétria de carga em tempo real.</TacticalText>
        </VStack>

        <HStack spacing={3}>
          <TacticalButton leftIcon={<RefreshCw size={16} />} onClick={actions.loadData} isLoading={loading}>
            Atualizar Feed
          </TacticalButton>
          <TacticalButton glow leftIcon={<Plus size={18} />} onClick={actions.handleCreateDraft} bg="sos.blue.500">
            Novo Registro
          </TacticalButton>
        </HStack>
      </Flex>

      {/* KPI Overview Grid */}
      <SimpleGrid columns={{ base: 1, md: 4 }} spacing={6} mb={10}>
        <GlassPanel p={6}>
          <TacticalStat label="Cargas Ativas" value={stats.total} icon={PackageSearch} color="sos.blue.400" />
        </GlassPanel>
        <GlassPanel p={6}>
          <TacticalStat label="Em Trânsito" value={stats.inTransit} icon={Truck} color="orange.400" />
        </GlassPanel>
        <GlassPanel p={6}>
          <TacticalStat label="Entregues" value={stats.delivered} icon={CheckCircle} color="sos.green.400" />
        </GlassPanel>
        <GlassPanel p={6}>
          <TacticalStat label="Impacto Crítico" value={stats.critical} icon={AlertTriangle} color="sos.red.400" />
        </GlassPanel>
      </SimpleGrid>

      {/* Data Visualizer - Shipment Table */}
      <GlassPanel overflow="hidden">
        <Box overflowX="auto">
          <Table variant="unstyled">
            <Thead bg="whiteAlpha.50" borderBottom="1px solid" borderColor="whiteAlpha.100">
              <Tr>
                <Th py={5}><TacticalText variant="subheading">Item / Recurso</TacticalText></Th>
                <Th py={5}><TacticalText variant="subheading">Volume</TacticalText></Th>
                <Th py={5}><TacticalText variant="subheading">Fluxo [Origem {' > '} Destino]</TacticalText></Th>
                <Th py={5}><TacticalText variant="subheading">Status Operacional</TacticalText></Th>
                <Th py={5}><TacticalText variant="subheading">Prioridade</TacticalText></Th>
              </Tr>
            </Thead>
            <Tbody>
              {supplies.length === 0 ? (
                <Tr>
                  <Td colSpan={5} py={20} textAlign="center">
                    <TacticalText opacity={0.3}>NENHUMA CARGA DETECTADA NA REDE</TacticalText>
                  </Td>
                </Tr>
              ) : (
                supplies.map((s) => (
                  <Tr 
                    key={s.id} 
                    borderBottom="1px solid" 
                    borderColor="whiteAlpha.50" 
                    _hover={{ bg: 'whiteAlpha.50' }} 
                    transition="all 0.2s"
                  >
                    <Td py={5}><TacticalText variant="heading" fontSize="xs">{s.item}</TacticalText></Td>
                    <Td py={5}><TacticalText variant="mono">{s.quantity} {s.unit}</TacticalText></Td>
                    <Td py={5}>
                      <HStack spacing={3}>
                        <TacticalText color="whiteAlpha.800">{s.origin}</TacticalText>
                        <Icon as={Send} size={10} color="whiteAlpha.300" />
                        <TacticalText color="whiteAlpha.800">{s.destination}</TacticalText>
                      </HStack>
                    </Td>
                    <Td py={5}>
                      <Badge 
                        variant="subtle" 
                        px={3} 
                        py={1} 
                        borderRadius="full" 
                        fontSize="9px"
                        bg={s.status === 'delivered' ? 'sos.green.500/10' : s.status === 'in_transit' ? 'orange.500/10' : 'whiteAlpha.100'}
                        color={s.status === 'delivered' ? 'sos.green.400' : s.status === 'in_transit' ? 'orange.400' : 'whiteAlpha.600'}
                      >
                        {s.status?.toUpperCase()}
                      </Badge>
                    </Td>
                    <Td py={5}>
                      <HStack spacing={2}>
                        {s.priority === 'high' && <Icon as={AlertTriangle} size={14} color="sos.red.400" />}
                        <TacticalText 
                          variant="mono" 
                          color={s.priority === 'high' || s.priority === 'critical' ? 'sos.red.400' : 'whiteAlpha.600'}
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

      {/* Shipment Modal */}
      <Modal title="REGISTRAR MOVIMENTAÇÃO DE CARGA" open={modalOpen} onClose={() => setModalOpen(false)}>
        <VStack spacing={6} align="stretch" py={4}>
          <SimpleGrid columns={2} spacing={6}>
            <FormControl>
              <FormLabel><TacticalText variant="subheading">Item / Recurso</TacticalText></FormLabel>
              <Input 
                value={form.item} 
                onChange={(e) => setForm(p => ({ ...p, item: e.target.value }))}
                bg="whiteAlpha.50"
                borderColor="whiteAlpha.100"
                placeholder="Ex: Água Potável"
                borderRadius="xl"
                h="50px"
              />
            </FormControl>
            <FormControl>
              <FormLabel><TacticalText variant="subheading">Volume / Unidade</TacticalText></FormLabel>
              <HStack>
                <Input 
                  type="number"
                  value={form.quantity} 
                  onChange={(e) => setForm(p => ({ ...p, quantity: Number(e.target.value) }))}
                  bg="whiteAlpha.50"
                  borderColor="whiteAlpha.100"
                  borderRadius="xl"
                  h="50px"
                />
                <Select 
                  value={form.unit}
                  onChange={(e) => setForm(p => ({ ...p, unit: e.target.value }))}
                  bg="whiteAlpha.50"
                  borderColor="whiteAlpha.100"
                  borderRadius="xl"
                  h="50px"
                  w="120px"
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
              <FormLabel><TacticalText variant="subheading">Origem</TacticalText></FormLabel>
              <Input 
                value={form.origin} 
                onChange={(e) => setForm(p => ({ ...p, origin: e.target.value }))}
                bg="whiteAlpha.50"
                borderColor="whiteAlpha.100"
                placeholder="Ponto de Partida"
                borderRadius="xl"
                h="50px"
              />
            </FormControl>
            <FormControl>
              <FormLabel><TacticalText variant="subheading">Destino</TacticalText></FormLabel>
              <Input 
                value={form.destination} 
                onChange={(e) => setForm(p => ({ ...p, destination: e.target.value }))}
                bg="whiteAlpha.50"
                borderColor="whiteAlpha.100"
                placeholder="Ponto de Entrega"
                borderRadius="xl"
                h="50px"
              />
            </FormControl>
          </SimpleGrid>

          <SimpleGrid columns={2} spacing={6}>
            <FormControl>
              <FormLabel><TacticalText variant="subheading">Status Inicial</TacticalText></FormLabel>
              <Select 
                value={form.status}
                onChange={(e) => setForm(p => ({ ...p, status: e.target.value }))}
                bg="whiteAlpha.50"
                borderColor="whiteAlpha.100"
                borderRadius="xl"
                h="50px"
              >
                <option value="pending">Pendente</option>
                <option value="in_transit">Em Trânsito</option>
                <option value="delivered">Entregue</option>
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel><TacticalText variant="subheading">Prioridade de Fluxo</TacticalText></FormLabel>
              <Select 
                value={form.priority}
                onChange={(e) => setForm(p => ({ ...p, priority: e.target.value }))}
                bg="whiteAlpha.50"
                borderColor="whiteAlpha.100"
                borderRadius="xl"
                h="50px"
              >
                <option value="low">Baixa</option>
                <option value="medium">Média</option>
                <option value="high">Alta</option>
                <option value="critical">Crítica</option>
              </Select>
            </FormControl>
          </SimpleGrid>

          <TacticalButton glow h="64px" bg="sos.blue.500" onClick={actions.submitShipment}>
            DESPACHAR RECURSO
          </TacticalButton>
        </VStack>
      </Modal>
    </Box>
  );
}
