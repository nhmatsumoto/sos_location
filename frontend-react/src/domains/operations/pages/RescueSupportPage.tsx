import { Plus, Pencil, Trash2, RefreshCw, MapPin, ShieldAlert, Home } from 'lucide-react';
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
  IconButton,
  ButtonGroup
} from '@chakra-ui/react';
import { useRescueSupport } from '../../../hooks/useRescueSupport';
import { GlassPanel } from '../../../components/atoms/GlassPanel';
import { TacticalText } from '../../../components/atoms/TacticalText';
import { TacticalButton } from '../../../components/atoms/TacticalButton';
import { TacticalStat } from '../../../components/molecules/TacticalStat';

/**
 * Rescue Support & Operational Assets
 * Central command for managing field assets, shelters, and risk zones.
 * Refactored with the Guardian Tactical Design System.
 */
export function RescueSupportPage() {
  const {
    supportPoints, riskAreas, loading, mode, setMode,
    supportModalOpen, setSupportModalOpen, riskModalOpen, setRiskModalOpen,
    supportForm, setSupportForm, riskForm, setRiskForm,
    stats, actions
  } = useRescueSupport();

  return (
    <Box p={8} h="calc(100vh - 80px)" overflowY="auto" className="custom-scrollbar">
      {loading && <LoadingOverlay message="Sincronizando Ativos de Campo..." />}

      {/* Header Context */}
      <Flex align="center" justify="space-between" mb={10}>
        <VStack align="flex-start" spacing={1}>
          <HStack spacing={3}>
            <Box p={2.5} bg="sos.blue.500" borderRadius="xl">
              <ShieldAlert size={24} color="white" />
            </Box>
            <TacticalText variant="heading" fontSize="2xl">Ativos e Áreas Críticas</TacticalText>
          </HStack>
          <TacticalText>Gestão de pontos de apoio, abrigos e perímetros de risco em tempo real.</TacticalText>
        </VStack>

        <HStack spacing={3}>
          <TacticalButton leftIcon={<RefreshCw size={16} />} onClick={actions.loadData} isLoading={loading}>
            Atualizar Central
          </TacticalButton>
        </HStack>
      </Flex>

      {/* Operational Telemétria Grid */}
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mb={10}>
        <GlassPanel p={6}>
          <TacticalStat label="Pontos de Apoio" value={stats.support} icon={Home} color="sos.blue.400" />
        </GlassPanel>
        <GlassPanel p={6}>
          <TacticalStat label="Áreas Mapeadas" value={stats.risk} icon={MapPin} color="orange.400" />
        </GlassPanel>
        <GlassPanel p={6}>
          <TacticalStat label="Risco Crítico" value={stats.criticalRisk} icon={ShieldAlert} color="sos.red.400" />
        </GlassPanel>
      </SimpleGrid>

      {/* Mode Selector & Actions */}
      <Flex justify="space-between" align="center" mb={6}>
        <ButtonGroup spacing={4}>
          <TacticalButton 
            variant={mode === 'support' ? 'solid' : 'ghost'} 
            bg={mode === 'support' ? 'sos.blue.500' : 'transparent'}
            onClick={() => setMode('support')}
          >
            PONTOS DE APOIO
          </TacticalButton>
          <TacticalButton 
            variant={mode === 'risk' ? 'solid' : 'ghost'} 
            bg={mode === 'risk' ? 'sos.blue.500' : 'transparent'}
            onClick={() => setMode('risk')}
          >
            ÁREAS DE RISCO
          </TacticalButton>
        </ButtonGroup>

        <TacticalButton 
          glow 
          leftIcon={<Plus size={18} />} 
          bg="sos.blue.500"
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
          {mode === 'support' ? 'NOVO PONTO' : 'NOVA ÁREA'}
        </TacticalButton>
      </Flex>

      {/* Data Visualization Grid */}
      <GlassPanel overflow="hidden">
        <Box overflowX="auto">
          <Table variant="unstyled">
            <Thead bg="whiteAlpha.50" borderBottom="1px solid" borderColor="whiteAlpha.100">
              <Tr>
                <Th py={5}><TacticalText variant="subheading">Identificação</TacticalText></Th>
                <Th py={5}><TacticalText variant="subheading">{mode === 'support' ? 'Tipo' : 'Severidade'}</TacticalText></Th>
                <Th py={5}><TacticalText variant="subheading">{mode === 'support' ? 'Capacidade' : 'Raio (m)'}</TacticalText></Th>
                <Th py={5}><TacticalText variant="subheading">Status</TacticalText></Th>
                <Th py={5} textAlign="right"><TacticalText variant="subheading">Ações</TacticalText></Th>
              </Tr>
            </Thead>
            <Tbody>
              {mode === 'support' ? (
                supportPoints.map((item) => (
                  <Tr key={item.id} borderBottom="1px solid" borderColor="whiteAlpha.50" _hover={{ bg: 'whiteAlpha.50' }}>
                    <Td py={5}><TacticalText variant="heading" fontSize="xs">{item.title}</TacticalText></Td>
                    <Td py={5}><Badge variant="outline" colorScheme="blue" fontSize="9px">{item.metadata?.type || 'Padro'}</Badge></Td>
                    <Td py={5}><TacticalText variant="mono">{item.metadata?.capacity || '-'}</TacticalText></Td>
                    <Td py={5}><Badge bg="sos.green.500/10" color="sos.green.400" fontSize="9px">{item.status?.toUpperCase()}</Badge></Td>
                    <Td py={5} textAlign="right">
                      <HStack spacing={2} justify="flex-end">
                        <IconButton 
                          aria-label="Edit" icon={<Pencil size={14} />} size="sm" variant="ghost" color="sos.blue.400"
                          onClick={() => { setSupportForm({ id: item.id, name: item.title, type: item.metadata?.type || 'Abrigo', lat: String(item.lat), lng: String(item.lng), capacity: String(item.metadata?.capacity || 0), status: item.status }); setSupportModalOpen(true); }}
                        />
                        <IconButton 
                          aria-label="Delete" icon={<Trash2 size={14} />} size="sm" variant="ghost" color="sos.red.400"
                          onClick={() => actions.deleteEntity('support', item.id)}
                        />
                      </HStack>
                    </Td>
                  </Tr>
                ))
              ) : (
                riskAreas.map((item) => (
                  <Tr key={item.id} borderBottom="1px solid" borderColor="whiteAlpha.50" _hover={{ bg: 'whiteAlpha.50' }}>
                    <Td py={5}><TacticalText variant="heading" fontSize="xs">{item.title}</TacticalText></Td>
                    <Td py={5}>
                      <Badge 
                        variant="subtle" 
                        colorScheme={item.severity === 'high' || item.severity === 'critical' ? 'red' : 'orange'} 
                        fontSize="9px"
                      >
                        {item.severity?.toUpperCase()}
                      </Badge>
                    </Td>
                    <Td py={5}><TacticalText variant="mono">{item.radiusMeters}m</TacticalText></Td>
                    <Td py={5}><Badge bg="sos.green.500/10" color="sos.green.400" fontSize="9px">{item.status?.toUpperCase()}</Badge></Td>
                    <Td py={5} textAlign="right">
                      <HStack spacing={2} justify="flex-end">
                        <IconButton 
                          aria-label="Edit" icon={<Pencil size={14} />} size="sm" variant="ghost" color="sos.blue.400"
                          onClick={() => { setRiskForm({ id: item.id, name: item.title, severity: item.severity, lat: String(item.lat), lng: String(item.lng), radiusMeters: String(item.radiusMeters || 350), notes: item.metadata?.notes || '', status: item.status }); setRiskModalOpen(true); }}
                        />
                        <IconButton 
                          aria-label="Delete" icon={<Trash2 size={14} />} size="sm" variant="ghost" color="sos.red.400"
                          onClick={() => actions.deleteEntity('risk', item.id)}
                        />
                      </HStack>
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </Box>
      </GlassPanel>

      {/* Modals for Support and Risk */}
      <Modal title={supportForm.id ? 'EDITAR PONTO DE APOIO' : 'NOVO PONTO DE APOIO'} open={supportModalOpen} onClose={() => setSupportModalOpen(false)}>
        <VStack spacing={6} align="stretch" py={4}>
          <SimpleGrid columns={2} spacing={6}>
            <FormControl>
              <FormLabel><TacticalText variant="subheading">Nome do Ativo</TacticalText></FormLabel>
              <Input value={supportForm.name} onChange={(e) => setSupportForm((p) => ({ ...p, name: e.target.value }))} bg="whiteAlpha.50" borderRadius="xl" />
            </FormControl>
            <FormControl>
              <FormLabel><TacticalText variant="subheading">Tipo de Instalação</TacticalText></FormLabel>
              <Input value={supportForm.type} onChange={(e) => setSupportForm((p) => ({ ...p, type: e.target.value }))} bg="whiteAlpha.50" borderRadius="xl" />
            </FormControl>
          </SimpleGrid>
          <SimpleGrid columns={2} spacing={6}>
            <FormControl>
              <FormLabel><TacticalText variant="subheading">Latitude</TacticalText></FormLabel>
              <Input value={supportForm.lat} onChange={(e) => setSupportForm((p) => ({ ...p, lat: e.target.value }))} bg="whiteAlpha.50" borderRadius="xl" />
            </FormControl>
            <FormControl>
              <FormLabel><TacticalText variant="subheading">Longitude</TacticalText></FormLabel>
              <Input value={supportForm.lng} onChange={(e) => setSupportForm((p) => ({ ...p, lng: e.target.value }))} bg="whiteAlpha.50" borderRadius="xl" />
            </FormControl>
          </SimpleGrid>
          <SimpleGrid columns={2} spacing={6}>
            <FormControl>
              <FormLabel><TacticalText variant="subheading">Capacidade Máxima</TacticalText></FormLabel>
              <Input value={supportForm.capacity} onChange={(e) => setSupportForm((p) => ({ ...p, capacity: e.target.value }))} bg="whiteAlpha.50" borderRadius="xl" />
            </FormControl>
            <FormControl>
              <FormLabel><TacticalText variant="subheading">Status Operacional</TacticalText></FormLabel>
              <Select value={supportForm.status} onChange={(e) => setSupportForm((p) => ({ ...p, status: e.target.value }))} bg="whiteAlpha.50" borderRadius="xl">
                <option value="active">ATIVO</option>
                <option value="inactive">INATIVO</option>
                <option value="maintenance">MANUTENÇÃO</option>
              </Select>
            </FormControl>
          </SimpleGrid>
          <TacticalButton glow h="64px" bg="sos.blue.500" onClick={actions.saveSupport}>SALVAR ATIVO</TacticalButton>
        </VStack>
      </Modal>

      <Modal title={riskForm.id ? 'EDITAR ÁREA DE RISCO' : 'NOVA ÁREA DE RISCO'} open={riskModalOpen} onClose={() => setRiskModalOpen(false)}>
        <VStack spacing={6} align="stretch" py={4}>
          <SimpleGrid columns={2} spacing={6}>
            <FormControl>
              <FormLabel><TacticalText variant="subheading">Identificação da Área</TacticalText></FormLabel>
              <Input value={riskForm.name} onChange={(e) => setRiskForm((p) => ({ ...p, name: e.target.value }))} bg="whiteAlpha.50" borderRadius="xl" />
            </FormControl>
            <FormControl>
              <FormLabel><TacticalText variant="subheading">Severidade de Ameaça</TacticalText></FormLabel>
              <Select value={riskForm.severity} onChange={(e) => setRiskForm((p) => ({ ...p, severity: e.target.value }))} bg="whiteAlpha.50" borderRadius="xl">
                <option value="low">BAIXA</option>
                <option value="medium">MÉDIA</option>
                <option value="high">ALTA</option>
                <option value="critical">CRÍTICA</option>
              </Select>
            </FormControl>
          </SimpleGrid>
          <SimpleGrid columns={2} spacing={6}>
            <FormControl>
              <FormLabel><TacticalText variant="subheading">Raio de Influência (m)</TacticalText></FormLabel>
              <Input value={riskForm.radiusMeters} onChange={(e) => setRiskForm((p) => ({ ...p, radiusMeters: e.target.value }))} bg="whiteAlpha.50" borderRadius="xl" />
            </FormControl>
            <FormControl>
              <FormLabel><TacticalText variant="subheading">Status de Alerta</TacticalText></FormLabel>
              <Select value={riskForm.status} onChange={(e) => setRiskForm((p) => ({ ...p, status: e.target.value }))} bg="whiteAlpha.50" borderRadius="xl">
                <option value="active">ATIVO</option>
                <option value="resolved">RESOLVIDO</option>
              </Select>
            </FormControl>
          </SimpleGrid>
          <FormControl>
            <FormLabel><TacticalText variant="subheading">Notas de Observação</TacticalText></FormLabel>
            <Input value={riskForm.notes} onChange={(e) => setRiskForm((p) => ({ ...p, notes: e.target.value }))} bg="whiteAlpha.50" borderRadius="xl" placeholder="Detalhes técnicos da área..." />
          </FormControl>
          <TacticalButton glow h="64px" bg="sos.blue.500" onClick={actions.saveRisk}>CONFIRMAR MAPEAMENTO</TacticalButton>
        </VStack>
      </Modal>
    </Box>
  );
}
