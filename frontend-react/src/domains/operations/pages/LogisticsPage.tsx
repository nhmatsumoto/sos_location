import {
  AlertTriangle,
  Boxes,
  CheckCircle,
  Package,
  PackageSearch,
  Plus,
  RefreshCw,
  Send,
  Truck,
} from 'lucide-react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  HStack,
  Input,
  Select,
  SimpleGrid,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
} from '@chakra-ui/react';
import { LoadingOverlay } from '../../../components/ui/LoadingOverlay';
import { Modal } from '../../../components/ui/Modal';
import {
  MetricCard,
  PageEmptyState,
  PageHeader,
  PagePanel,
} from '../../../components/layout/PagePrimitives';
import {
  ShellSectionEyebrow,
  ShellTelemetryBadge,
} from '../../../components/layout/ShellPrimitives';
import { useLogisticsDashboard } from '../../../hooks/useLogisticsDashboard';

const statusTone = {
  pending: 'default',
  in_transit: 'warning',
  delivered: 'success',
} as const;

const priorityTone = {
  low: 'info',
  medium: 'warning',
  high: 'critical',
  critical: 'critical',
} as const;

export function LogisticsPage() {
  const {
    supplies,
    loading,
    modalOpen,
    setModalOpen,
    form,
    setForm,
    stats,
    actions,
  } = useLogisticsDashboard();

  return (
    <Box
      position="relative"
      h="full"
      overflowY="auto"
      px={{ base: 4, md: 6, xl: 8 }}
      py={{ base: 4, md: 6 }}
      bgGradient="radial(circle at top left, rgba(0,122,255,0.08), transparent 22%), radial(circle at bottom right, rgba(255,149,0,0.08), transparent 24%), linear(to-b, #030712 0%, #07111f 55%, #08121d 100%)"
    >
      {loading ? <LoadingOverlay message="Sincronizando malha logística..." variant="contained" /> : null}

      <VStack maxW="7xl" mx="auto" spacing={6} align="stretch">
        <PageHeader
          icon={Boxes}
          eyebrow="LOGISTICS_GRID // SUPPLY_CHAIN // FIELD_DISTRIBUTION"
          title="Rede de suprimentos com leitura de fluxo, prioridade e rastreabilidade de cargas"
          description="A tela foi redesenhada para separar métricas, fila logística e composição de novos deslocamentos sem painéis excessivamente densos."
          meta={
            <>
              <ShellTelemetryBadge tone="info">{stats.total} cargas</ShellTelemetryBadge>
              <ShellTelemetryBadge tone="warning">{stats.inTransit} em trânsito</ShellTelemetryBadge>
              <ShellTelemetryBadge tone="critical">{stats.critical} críticas</ShellTelemetryBadge>
            </>
          }
          actions={
            <>
              <Button
                leftIcon={<RefreshCw size={16} />}
                variant="ghost"
                onClick={() => void actions.loadData()}
                isLoading={loading}
              >
                Atualizar feed
              </Button>
              <Button
                leftIcon={<Plus size={16} />}
                variant="tactical"
                onClick={actions.handleCreateDraft}
              >
                Novo registro
              </Button>
            </>
          }
        />

        <SimpleGrid columns={{ base: 1, sm: 2, xl: 4 }} spacing={4}>
          <MetricCard
            label="Cargas ativas"
            value={stats.total}
            helper="Registros sincronizados na malha"
            icon={PackageSearch}
            tone="info"
          />
          <MetricCard
            label="Em trânsito"
            value={stats.inTransit}
            helper="Deslocamentos ainda sem confirmação final"
            icon={Truck}
            tone="warning"
          />
          <MetricCard
            label="Entregues"
            value={stats.delivered}
            helper="Movimentações concluídas com êxito"
            icon={CheckCircle}
            tone="success"
          />
          <MetricCard
            label="Pressão crítica"
            value={stats.critical}
            helper="Cargas com prioridade alta ou crítica"
            icon={AlertTriangle}
            tone="critical"
          />
        </SimpleGrid>

        <PagePanel
          title="Fila de suprimentos"
          description="Visualize origem, destino, status e prioridade de cada carga sem perder o contexto operacional."
          icon={Package}
          tone="default"
        >
          {supplies.length === 0 && !loading ? (
            <PageEmptyState
              minH="320px"
              title="Nenhum suprimento registrado"
              description="A malha ainda não recebeu movimentações para o turno atual."
              action={
                <Button variant="tactical" onClick={actions.handleCreateDraft}>
                  Registrar primeira carga
                </Button>
              }
            />
          ) : (
            <Box overflowX="auto">
              <Table variant="simple" size="md">
                <Thead>
                  <Tr>
                    <Th>Item</Th>
                    <Th>Volume</Th>
                    <Th>Fluxo</Th>
                    <Th>Status</Th>
                    <Th>Prioridade</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {supplies.map((supply) => (
                    <Tr key={supply.id} _hover={{ bg: 'rgba(255,255,255,0.02)' }}>
                      <Td>
                        <HStack spacing={3}>
                          <Box
                            p={2}
                            borderRadius="xl"
                            bg="rgba(0,122,255,0.10)"
                            border="1px solid"
                            borderColor="rgba(0,122,255,0.18)"
                          >
                            <Package size={14} color="#0A84FF" />
                          </Box>
                          <VStack align="flex-start" spacing={0.5}>
                            <Text fontSize="sm" fontWeight="600" color="white">
                              {supply.item}
                            </Text>
                            <Text fontSize="xs" color="text.secondary">
                              Registro #{supply.id}
                            </Text>
                          </VStack>
                        </HStack>
                      </Td>
                      <Td>
                        <Text fontSize="sm" fontWeight="600" color="white">
                          {supply.quantity}{' '}
                          <Text as="span" color="text.secondary">
                            {supply.unit || 'un'}
                          </Text>
                        </Text>
                      </Td>
                      <Td>
                        <HStack spacing={2} flexWrap="wrap">
                          <ShellTelemetryBadge tone="info">{supply.origin}</ShellTelemetryBadge>
                          <Send size={12} color="rgba(255,255,255,0.30)" />
                          <ShellTelemetryBadge tone="success">{supply.destination}</ShellTelemetryBadge>
                        </HStack>
                      </Td>
                      <Td>
                        <ShellTelemetryBadge tone={statusTone[supply.status as keyof typeof statusTone] ?? 'default'}>
                          {supply.status.replace('_', ' ')}
                        </ShellTelemetryBadge>
                      </Td>
                      <Td>
                        <ShellTelemetryBadge tone={priorityTone[supply.priority as keyof typeof priorityTone] ?? 'default'}>
                          {supply.priority}
                        </ShellTelemetryBadge>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          )}
        </PagePanel>
      </VStack>

      <Modal title="Registrar movimentação de carga" open={modalOpen} onClose={() => setModalOpen(false)}>
        <VStack spacing={5} align="stretch" p={6}>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <FormControl>
              <FormLabel>Item</FormLabel>
              <Input
                value={form.item ?? ''}
                onChange={(event) => setForm((previous) => ({ ...previous, item: event.target.value }))}
                placeholder="Ex.: Água potável"
              />
            </FormControl>

            <FormControl>
              <FormLabel>Quantidade</FormLabel>
              <HStack align="stretch">
                <Input
                  type="number"
                  value={form.quantity ?? 0}
                  onChange={(event) =>
                    setForm((previous) => ({ ...previous, quantity: Number(event.target.value) }))
                  }
                />
                <Select
                  w="110px"
                  value={form.unit ?? 'un'}
                  onChange={(event) => setForm((previous) => ({ ...previous, unit: event.target.value }))}
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

          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <FormControl>
              <FormLabel>Origem</FormLabel>
              <Input
                value={form.origin ?? ''}
                onChange={(event) => setForm((previous) => ({ ...previous, origin: event.target.value }))}
                placeholder="Ponto de partida"
              />
            </FormControl>

            <FormControl>
              <FormLabel>Destino</FormLabel>
              <Input
                value={form.destination ?? ''}
                onChange={(event) => setForm((previous) => ({ ...previous, destination: event.target.value }))}
                placeholder="Ponto de entrega"
              />
            </FormControl>
          </SimpleGrid>

          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <FormControl>
              <FormLabel>Status inicial</FormLabel>
              <Select
                value={form.status ?? 'pending'}
                onChange={(event) => setForm((previous) => ({ ...previous, status: event.target.value }))}
              >
                <option value="pending">Pendente</option>
                <option value="in_transit">Em trânsito</option>
                <option value="delivered">Entregue</option>
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel>Prioridade logística</FormLabel>
              <Select
                value={form.priority ?? 'medium'}
                onChange={(event) => setForm((previous) => ({ ...previous, priority: event.target.value }))}
              >
                <option value="low">Baixa</option>
                <option value="medium">Média</option>
                <option value="high">Alta</option>
                <option value="critical">Crítica</option>
              </Select>
            </FormControl>
          </SimpleGrid>

          <Box
            p={4}
            borderRadius="2xl"
            bg="surface.interactive"
            border="1px solid"
            borderColor="border.subtle"
          >
            <ShellSectionEyebrow mb={1.5}>Diretriz de despacho</ShellSectionEyebrow>
            <Text fontSize="sm" color="text.secondary">
              Registre item, volume e rota mínima antes de liberar qualquer carga para trânsito.
            </Text>
          </Box>

          <Button variant="tactical" onClick={() => void actions.submitShipment()}>
            Sinalizar movimentação de carga
          </Button>
        </VStack>
      </Modal>
    </Box>
  );
}
