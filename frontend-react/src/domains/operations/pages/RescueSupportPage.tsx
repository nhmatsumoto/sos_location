import { Home, MapPin, Pencil, Plus, RefreshCw, ShieldAlert, Trash2 } from 'lucide-react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  HStack,
  IconButton,
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
import { Modal } from '../../../components/ui/Modal';
import { LoadingOverlay } from '../../../components/ui/LoadingOverlay';
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
import { useRescueSupport } from '../../../hooks/useRescueSupport';

const riskTone = {
  low: 'info',
  medium: 'warning',
  high: 'critical',
  critical: 'critical',
} as const;

export function RescueSupportPage() {
  const {
    supportPoints,
    riskAreas,
    loading,
    mode,
    setMode,
    supportModalOpen,
    setSupportModalOpen,
    riskModalOpen,
    setRiskModalOpen,
    supportForm,
    setSupportForm,
    riskForm,
    setRiskForm,
    stats,
    actions,
  } = useRescueSupport();

  const visibleCount = mode === 'support' ? supportPoints.length : riskAreas.length;

  return (
    <Box
      position="relative"
      h="full"
      overflowY="auto"
      px={{ base: 4, md: 6, xl: 8 }}
      py={{ base: 4, md: 6 }}
      bgGradient="radial(circle at top left, rgba(0,122,255,0.10), transparent 22%), radial(circle at bottom right, rgba(255,59,48,0.08), transparent 22%), linear(to-b, #030712 0%, #07111f 55%, #08121d 100%)"
    >
      {loading ? <LoadingOverlay message="Sincronizando ativos de campo..." variant="contained" /> : null}

      <VStack maxW="7xl" mx="auto" spacing={6} align="stretch">
        <PageHeader
          icon={ShieldAlert}
          eyebrow="FIELD_ASSETS // SUPPORT_POINTS // RISK_PERIMETERS"
          title="Ativos de campo e áreas críticas em uma mesma estação de controle"
          description="A tela foi reorganizada para separar telemetria, modo operacional e edição de ativos sem depender do layout legado."
          meta={
            <>
              <ShellTelemetryBadge tone="info">{stats.support} apoios</ShellTelemetryBadge>
              <ShellTelemetryBadge tone="warning">{stats.risk} áreas</ShellTelemetryBadge>
              <ShellTelemetryBadge tone="critical">{stats.criticalRisk} risco alto</ShellTelemetryBadge>
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
                Atualizar central
              </Button>
              <Button
                leftIcon={<Plus size={16} />}
                variant="tactical"
                onClick={() => {
                  if (mode === 'support') {
                    setSupportForm(actions.defaultSupport);
                    setSupportModalOpen(true);
                  } else {
                    setRiskForm(actions.defaultRisk);
                    setRiskModalOpen(true);
                  }
                }}
              >
                {mode === 'support' ? 'Novo ponto' : 'Nova área'}
              </Button>
            </>
          }
        />

        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
          <MetricCard
            label="Pontos de apoio"
            value={stats.support}
            helper="Abrigos, bases e instalações de suporte"
            icon={Home}
            tone="info"
          />
          <MetricCard
            label="Áreas mapeadas"
            value={stats.risk}
            helper="Perímetros operacionais cadastrados"
            icon={MapPin}
            tone="warning"
          />
          <MetricCard
            label="Risco crítico"
            value={stats.criticalRisk}
            helper="Áreas com severidade alta ou crítica"
            icon={ShieldAlert}
            tone="critical"
          />
        </SimpleGrid>

        <PagePanel
          title="Modo operacional"
          description="Alterne entre ativos de apoio e áreas de risco mantendo o mesmo shell de gestão."
          icon={mode === 'support' ? Home : ShieldAlert}
          tone="info"
        >
          <HStack spacing={3} flexWrap="wrap">
            <Button
              variant={mode === 'support' ? 'tactical' : 'outline'}
              onClick={() => setMode('support')}
            >
              Pontos de apoio
            </Button>
            <Button
              variant={mode === 'risk' ? 'tactical' : 'outline'}
              onClick={() => setMode('risk')}
            >
              Áreas de risco
            </Button>
            <ShellTelemetryBadge tone="default">{visibleCount} itens visíveis</ShellTelemetryBadge>
          </HStack>
        </PagePanel>

        <PagePanel
          title={mode === 'support' ? 'Rede de apoio operacional' : 'Perímetros de risco'}
          description={
            mode === 'support'
              ? 'Edite status, capacidade e tipologia dos pontos que sustentam a operação.'
              : 'Revise severidade, raio e estado dos perímetros que exigem monitoramento.'
          }
          icon={mode === 'support' ? Home : ShieldAlert}
          tone="default"
        >
          {visibleCount === 0 ? (
            <PageEmptyState
              minH="320px"
              title={mode === 'support' ? 'Nenhum ponto de apoio cadastrado' : 'Nenhuma área de risco cadastrada'}
              description={
                mode === 'support'
                  ? 'Abra um novo ponto para iniciar a malha de suporte.'
                  : 'Cadastre uma nova área para iniciar o mapeamento de risco.'
              }
              action={
                <Button
                  variant="tactical"
                  onClick={() => {
                    if (mode === 'support') {
                      setSupportForm(actions.defaultSupport);
                      setSupportModalOpen(true);
                    } else {
                      setRiskForm(actions.defaultRisk);
                      setRiskModalOpen(true);
                    }
                  }}
                >
                  {mode === 'support' ? 'Criar ponto de apoio' : 'Criar área de risco'}
                </Button>
              }
            />
          ) : (
            <Box overflowX="auto">
              <Table variant="simple" size="md">
                <Thead>
                  <Tr>
                    <Th>Identificação</Th>
                    <Th>{mode === 'support' ? 'Tipo' : 'Severidade'}</Th>
                    <Th>{mode === 'support' ? 'Capacidade' : 'Raio'}</Th>
                    <Th>Status</Th>
                    <Th textAlign="right">Ações</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {mode === 'support'
                    ? supportPoints.map((item) => (
                        <Tr key={item.id}>
                          <Td>
                            <VStack align="flex-start" spacing={0.5}>
                              <Text fontSize="sm" fontWeight="700" color="white">
                                {item.title}
                              </Text>
                              <Text fontSize="xs" color="text.secondary">
                                {item.lat.toFixed(4)}, {item.lng.toFixed(4)}
                              </Text>
                            </VStack>
                          </Td>
                          <Td>
                            <ShellTelemetryBadge tone="info">
                              {item.metadata?.type || 'Abrigo'}
                            </ShellTelemetryBadge>
                          </Td>
                          <Td>
                            <Text fontSize="sm" color="white">
                              {item.metadata?.capacity ?? '-'}
                            </Text>
                          </Td>
                          <Td>
                            <ShellTelemetryBadge tone={item.status === 'active' ? 'success' : 'default'}>
                              {item.status}
                            </ShellTelemetryBadge>
                          </Td>
                          <Td textAlign="right">
                            <HStack spacing={2} justify="flex-end">
                              <IconButton
                                aria-label="Editar ponto de apoio"
                                icon={<Pencil size={14} />}
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSupportForm({
                                    id: item.id,
                                    name: item.title,
                                    type: item.metadata?.type || 'Abrigo',
                                    lat: String(item.lat),
                                    lng: String(item.lng),
                                    capacity: String(item.metadata?.capacity || 0),
                                    status: item.status,
                                  });
                                  setSupportModalOpen(true);
                                }}
                              />
                              <IconButton
                                aria-label="Excluir ponto de apoio"
                                icon={<Trash2 size={14} />}
                                size="sm"
                                variant="ghost"
                                colorScheme="red"
                                onClick={() => void actions.deleteEntity('support', item.id)}
                              />
                            </HStack>
                          </Td>
                        </Tr>
                      ))
                    : riskAreas.map((item) => (
                        <Tr key={item.id}>
                          <Td>
                            <VStack align="flex-start" spacing={0.5}>
                              <Text fontSize="sm" fontWeight="700" color="white">
                                {item.title}
                              </Text>
                              <Text fontSize="xs" color="text.secondary">
                                {item.lat.toFixed(4)}, {item.lng.toFixed(4)}
                              </Text>
                            </VStack>
                          </Td>
                          <Td>
                            <ShellTelemetryBadge tone={riskTone[item.severity as keyof typeof riskTone] ?? 'default'}>
                              {item.severity}
                            </ShellTelemetryBadge>
                          </Td>
                          <Td>
                            <Text fontSize="sm" color="white">
                              {item.radiusMeters ?? '-'} m
                            </Text>
                          </Td>
                          <Td>
                            <ShellTelemetryBadge tone={item.status === 'active' ? 'critical' : 'success'}>
                              {item.status}
                            </ShellTelemetryBadge>
                          </Td>
                          <Td textAlign="right">
                            <HStack spacing={2} justify="flex-end">
                              <IconButton
                                aria-label="Editar área de risco"
                                icon={<Pencil size={14} />}
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setRiskForm({
                                    id: item.id,
                                    name: item.title,
                                    severity: item.severity,
                                    lat: String(item.lat),
                                    lng: String(item.lng),
                                    radiusMeters: String(item.radiusMeters || 350),
                                    notes: item.metadata?.notes || '',
                                    status: item.status,
                                  });
                                  setRiskModalOpen(true);
                                }}
                              />
                              <IconButton
                                aria-label="Excluir área de risco"
                                icon={<Trash2 size={14} />}
                                size="sm"
                                variant="ghost"
                                colorScheme="red"
                                onClick={() => void actions.deleteEntity('risk', item.id)}
                              />
                            </HStack>
                          </Td>
                        </Tr>
                      ))}
                </Tbody>
              </Table>
            </Box>
          )}
        </PagePanel>
      </VStack>

      <Modal
        title={supportForm.id ? 'Editar ponto de apoio' : 'Novo ponto de apoio'}
        open={supportModalOpen}
        onClose={() => setSupportModalOpen(false)}
      >
        <VStack spacing={5} align="stretch" p={6}>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <FormControl>
              <FormLabel>Nome do ativo</FormLabel>
              <Input
                value={supportForm.name}
                onChange={(event) => setSupportForm((previous) => ({ ...previous, name: event.target.value }))}
              />
            </FormControl>
            <FormControl>
              <FormLabel>Tipo de instalação</FormLabel>
              <Input
                value={supportForm.type}
                onChange={(event) => setSupportForm((previous) => ({ ...previous, type: event.target.value }))}
              />
            </FormControl>
          </SimpleGrid>

          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <FormControl>
              <FormLabel>Latitude</FormLabel>
              <Input
                value={supportForm.lat}
                onChange={(event) => setSupportForm((previous) => ({ ...previous, lat: event.target.value }))}
              />
            </FormControl>
            <FormControl>
              <FormLabel>Longitude</FormLabel>
              <Input
                value={supportForm.lng}
                onChange={(event) => setSupportForm((previous) => ({ ...previous, lng: event.target.value }))}
              />
            </FormControl>
          </SimpleGrid>

          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <FormControl>
              <FormLabel>Capacidade máxima</FormLabel>
              <Input
                value={supportForm.capacity}
                onChange={(event) => setSupportForm((previous) => ({ ...previous, capacity: event.target.value }))}
              />
            </FormControl>
            <FormControl>
              <FormLabel>Status operacional</FormLabel>
              <Select
                value={supportForm.status}
                onChange={(event) => setSupportForm((previous) => ({ ...previous, status: event.target.value }))}
              >
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
                <option value="maintenance">Manutenção</option>
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
            <ShellSectionEyebrow mb={1.5}>Diretriz</ShellSectionEyebrow>
            <Text fontSize="sm" color="text.secondary">
              Registre nome, coordenada e capacidade mínima antes de ativar um novo ponto na malha.
            </Text>
          </Box>

          <Button variant="tactical" onClick={() => void actions.saveSupport()}>
            Salvar ativo
          </Button>
        </VStack>
      </Modal>

      <Modal
        title={riskForm.id ? 'Editar área de risco' : 'Nova área de risco'}
        open={riskModalOpen}
        onClose={() => setRiskModalOpen(false)}
      >
        <VStack spacing={5} align="stretch" p={6}>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <FormControl>
              <FormLabel>Identificação da área</FormLabel>
              <Input
                value={riskForm.name}
                onChange={(event) => setRiskForm((previous) => ({ ...previous, name: event.target.value }))}
              />
            </FormControl>
            <FormControl>
              <FormLabel>Severidade</FormLabel>
              <Select
                value={riskForm.severity}
                onChange={(event) => setRiskForm((previous) => ({ ...previous, severity: event.target.value }))}
              >
                <option value="low">Baixa</option>
                <option value="medium">Média</option>
                <option value="high">Alta</option>
                <option value="critical">Crítica</option>
              </Select>
            </FormControl>
          </SimpleGrid>

          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <FormControl>
              <FormLabel>Latitude</FormLabel>
              <Input
                value={riskForm.lat}
                onChange={(event) => setRiskForm((previous) => ({ ...previous, lat: event.target.value }))}
              />
            </FormControl>
            <FormControl>
              <FormLabel>Longitude</FormLabel>
              <Input
                value={riskForm.lng}
                onChange={(event) => setRiskForm((previous) => ({ ...previous, lng: event.target.value }))}
              />
            </FormControl>
          </SimpleGrid>

          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <FormControl>
              <FormLabel>Raio de influência (m)</FormLabel>
              <Input
                value={riskForm.radiusMeters}
                onChange={(event) => setRiskForm((previous) => ({ ...previous, radiusMeters: event.target.value }))}
              />
            </FormControl>
            <FormControl>
              <FormLabel>Status</FormLabel>
              <Select
                value={riskForm.status}
                onChange={(event) => setRiskForm((previous) => ({ ...previous, status: event.target.value }))}
              >
                <option value="active">Ativo</option>
                <option value="resolved">Resolvido</option>
              </Select>
            </FormControl>
          </SimpleGrid>

          <FormControl>
            <FormLabel>Notas de observação</FormLabel>
            <Input
              value={riskForm.notes}
              onChange={(event) => setRiskForm((previous) => ({ ...previous, notes: event.target.value }))}
              placeholder="Detalhes técnicos e contexto do perímetro"
            />
          </FormControl>

          <Box
            p={4}
            borderRadius="2xl"
            bg="surface.interactive"
            border="1px solid"
            borderColor="border.subtle"
          >
            <ShellSectionEyebrow mb={1.5}>Diretriz</ShellSectionEyebrow>
            <Text fontSize="sm" color="text.secondary">
              Grave severidade, raio e coordenadas mínimas antes de acionar alertas ou isolamento operacional.
            </Text>
          </Box>

          <Button variant="tactical" onClick={() => void actions.saveRisk()}>
            Confirmar mapeamento
          </Button>
        </VStack>
      </Modal>
    </Box>
  );
}
