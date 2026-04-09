import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  HStack,
  Icon,
  IconButton,
  SimpleGrid,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tooltip,
  Tr,
  VStack,
  useToast,
} from '@chakra-ui/react';
import {
  AlertCircle,
  Check,
  MapPin,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import {
  MetricCard,
  PageEmptyState,
  PageErrorState,
  PageHeader,
  PageLoadingState,
  PagePanel,
} from '../../../components/layout/PagePrimitives';
import { ShellLiveIndicator, ShellTelemetryBadge } from '../../../components/layout/ShellPrimitives';
import { tacticalIntelApi } from '../../../services/tacticalIntelApi';
import type { OperationalPoint } from '../../../services/tacticalIntelApi';

export default function TacticalAdminPage() {
  const [points, setPoints] = useState<OperationalPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const toast = useToast();

  const loadPoints = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const data = await tacticalIntelApi.getPoints();
      setPoints(data || []);
    } catch {
      setErrorMessage('Falha na sincronização com a central de inteligência.');
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

  const metrics = useMemo(() => {
    const approved = points.filter((point) => point.isApproved).length;
    const pending = points.length - approved;
    const classifications = new Set(points.map((point) => point.type)).size;

    return {
      approved,
      pending,
      classifications,
    };
  }, [points]);

  return (
    <Box px={{ base: 4, md: 6, xl: 8 }} py={{ base: 4, md: 6 }}>
      <VStack spacing={6} align="stretch" maxW="7xl" mx="auto">
        <PageHeader
          icon={ShieldAlert}
          eyebrow="ADMIN_ACCESS_LEVEL_1 // TACTICAL_INTELLIGENCE_VALIDATION"
          title="Aprovações Táticas"
          description="Valide entradas operacionais de campo antes de propagá-las para os módulos de resposta e visualização."
          meta={
            <>
              <ShellLiveIndicator label="Fila em observação contínua" />
              <ShellTelemetryBadge tone={metrics.pending > 0 ? 'warning' : 'success'}>
                {metrics.pending} pendências
              </ShellTelemetryBadge>
            </>
          }
          actions={
            <Tooltip label="Sincronizar dados">
              <IconButton
                icon={<RefreshCw size={18} />}
                aria-label="Sincronizar dados"
                onClick={() => void loadPoints()}
                isLoading={loading}
                variant="ghost"
              />
            </Tooltip>
          }
        />

        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
          <MetricCard
            label="Fila de despacho"
            value={metrics.pending}
            helper="Intel aguardando aprovação operacional"
            icon={AlertCircle}
            tone={metrics.pending > 0 ? 'warning' : 'success'}
          />
          <MetricCard
            label="Registros aprovados"
            value={metrics.approved}
            helper="Itens liberados para o restante da plataforma"
            icon={ShieldCheck}
            tone="success"
          />
          <MetricCard
            label="Classificações ativas"
            value={metrics.classifications}
            helper="Tipos distintos na fila atual"
            icon={MapPin}
            tone="info"
          />
        </SimpleGrid>

        <PagePanel
          title="Fila de validação"
          description="Revisão de registros originados no operacional, com coordenadas e situação de aprovação."
          icon={ShieldAlert}
          tone="warning"
          actions={<ShellTelemetryBadge tone="info">{points.length} registros</ShellTelemetryBadge>}
        >
          {loading ? (
            <PageLoadingState
              label="Descriptografando pacotes"
              description="A estação está recompondo a fila de inteligência pendente."
            />
          ) : errorMessage ? (
            <PageErrorState
              description={errorMessage}
              action={
                <Button variant="tactical" onClick={() => void loadPoints()}>
                  Tentar novamente
                </Button>
              }
            />
          ) : points.length === 0 ? (
            <PageEmptyState
              title="Sistema limpo"
              description="Nenhuma pendência aguarda validação nesta estação."
              icon={ShieldCheck}
              tone="success"
            />
          ) : (
            <TableContainer>
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>Classificação</Th>
                    <Th>Conteúdo operacional</Th>
                    <Th>Coordenadas</Th>
                    <Th>Status</Th>
                    <Th textAlign="right">Ações sistêmicas</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {points.map((point) => (
                    <Tr key={point.id}>
                      <Td>
                        <HStack spacing={3} align="flex-start">
                          <Box
                            p={2}
                            bg="rgba(0,122,255,0.10)"
                            borderRadius="lg"
                            border="1px solid"
                            borderColor="rgba(0,122,255,0.18)"
                          >
                            <Icon as={resolveTypeIcon(point.type)} boxSize={4} color="sos.blue.300" />
                          </Box>
                          <VStack align="flex-start" spacing={0.5}>
                            <Text fontSize="xs" fontWeight="700" color="white">
                              {point.type.toUpperCase()}
                            </Text>
                            <Text fontSize="xs" color="text.secondary">
                              {point.status?.toUpperCase() || (point.isApproved ? 'APPROVED' : 'PENDING')}
                            </Text>
                          </VStack>
                        </HStack>
                      </Td>
                      <Td>
                        <VStack align="flex-start" spacing={1}>
                          <Text fontSize="sm" fontWeight="700" color="white">
                            {point.title}
                          </Text>
                          <Text fontSize="xs" color="text.secondary" noOfLines={2} maxW="sm">
                            {point.description}
                          </Text>
                        </VStack>
                      </Td>
                      <Td>
                        <Text fontSize="11px" color="sos.blue.200" fontFamily="mono">
                          {point.latitude.toFixed(6)}
                          <br />
                          {point.longitude.toFixed(6)}
                        </Text>
                      </Td>
                      <Td>
                        <StatusBadge point={point} />
                      </Td>
                      <Td textAlign="right">
                        <HStack spacing={1} justify="flex-end">
                          {!point.isApproved ? (
                            <Tooltip label="Validar intel">
                              <IconButton
                                size="sm"
                                icon={<Check size={16} />}
                                aria-label="Aprovar registro"
                                onClick={() => point.id && void handleApprove(point.id)}
                                variant="ghost"
                                colorScheme="green"
                              />
                            </Tooltip>
                          ) : null}
                          <Tooltip label="Arquivar registro">
                            <IconButton
                              size="sm"
                              icon={<Trash2 size={16} />}
                              aria-label="Arquivar registro"
                              onClick={() => point.id && void handleDelete(point.id)}
                              variant="ghost"
                              colorScheme="red"
                            />
                          </Tooltip>
                        </HStack>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
          )}
        </PagePanel>
      </VStack>
    </Box>
  );
}

function resolveTypeIcon(type: string) {
  switch (type) {
    case 'Alert':
      return AlertCircle;
    case 'Support':
      return ShieldCheck;
    case 'Mark':
      return MapPin;
    default:
      return MapPin;
  }
}

function StatusBadge({ point }: { point: OperationalPoint }) {
  const tone = point.isApproved ? 'success' : 'warning';
  const label = point.status?.toUpperCase() || (point.isApproved ? 'APPROVED' : 'PENDING');

  return (
    <ShellTelemetryBadge tone={tone}>
      {label}
    </ShellTelemetryBadge>
  );
}
