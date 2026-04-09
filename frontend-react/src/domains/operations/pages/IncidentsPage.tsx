import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Activity, AlertTriangle, ExternalLink, MapPin, RefreshCw } from 'lucide-react';
import {
  Box,
  Button,
  HStack,
  Input,
  Select,
  SimpleGrid,
  Text,
  VStack,
} from '@chakra-ui/react';
import { modulesApi } from '../../../services/modulesApi';
import { useIncidentStore } from '../../../store/incidentStore';
import { useNotifications } from '../../../context/useNotifications';
import {
  MetricCard,
  PageEmptyState,
  PageHeader,
  PageLoadingState,
  PagePanel,
} from '../../../components/layout/PagePrimitives';
import {
  ShellSectionEyebrow,
  ShellTelemetryBadge,
} from '../../../components/layout/ShellPrimitives';

const STATUS_COLORS: Record<string, string> = {
  active: '#FF3B30',
  'em andamento': '#FF3B30',
  resolved: '#34C759',
  encerrado: '#34C759',
  monitoring: '#FF9500',
  monitorando: '#FF9500',
  pending: '#8E8E93',
  pendente: '#8E8E93',
};

const getStatusColor = (status: string) => STATUS_COLORS[status?.toLowerCase()] || '#8E8E93';

interface IncidentRow {
  id: string | number;
  name?: string;
  title?: string;
  type?: string;
  region?: string;
  status?: string;
}

export function IncidentsPage() {
  const [rows, setRows] = useState<IncidentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const { selectedIncidentId, setSelectedIncidentId } = useIncidentStore();
  const { pushNotice } = useNotifications();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await modulesApi.listIncidents();
      setRows((data ?? []) as IncidentRow[]);
    } catch {
      setRows([]);
      pushNotice({
        type: 'warning',
        title: 'Incidentes indisponíveis',
        message: 'Sem conexão com o servidor.',
      });
    } finally {
      setLoading(false);
    }
  }, [pushNotice]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        const query = search.toLowerCase();
        const matchSearch =
          !query ||
          (row.name || '').toLowerCase().includes(query) ||
          (row.type || '').toLowerCase().includes(query) ||
          (row.region || '').toLowerCase().includes(query);
        const matchStatus = !statusFilter || (row.status || '').toLowerCase() === statusFilter;
        return matchSearch && matchStatus;
      }),
    [rows, search, statusFilter],
  );

  const statuses = useMemo(
    () => [...new Set(rows.map((row) => row.status).filter(Boolean))],
    [rows],
  );

  const activeCount = rows.filter((row) => ['active', 'em andamento'].includes((row.status || '').toLowerCase())).length;
  const monitoringCount = rows.filter((row) => ['monitoring', 'monitorando'].includes((row.status || '').toLowerCase())).length;
  const closedCount = rows.filter((row) => ['resolved', 'encerrado'].includes((row.status || '').toLowerCase())).length;

  return (
    <Box
      h="full"
      overflowY="auto"
      px={{ base: 4, md: 6, xl: 8 }}
      py={{ base: 4, md: 6 }}
      bgGradient="radial(circle at top left, rgba(255,59,48,0.08), transparent 24%), radial(circle at bottom right, rgba(0,122,255,0.08), transparent 22%), linear(to-b, #030712 0%, #07111f 55%, #08121d 100%)"
    >
      <VStack maxW="7xl" mx="auto" spacing={6} align="stretch">
        <PageHeader
          icon={Activity}
          eyebrow="INCIDENT_MATRIX // STATUS_REVIEW // TERRITORY_SIGNAL"
          title="Painel de incidentes com foco em triagem, filtro e navegação operacional"
          description="A lista foi reorganizada para destacar status, tipologia e contexto regional de cada incidente sem depender de tabelas rígidas."
          meta={
            <>
              <ShellTelemetryBadge tone="critical">{activeCount} ativos</ShellTelemetryBadge>
              <ShellTelemetryBadge tone="warning">{monitoringCount} monitorando</ShellTelemetryBadge>
              <ShellTelemetryBadge tone="success">{closedCount} encerrados</ShellTelemetryBadge>
            </>
          }
          actions={
            <Button
              leftIcon={<RefreshCw size={16} />}
              variant="ghost"
              onClick={() => void load()}
              isLoading={loading}
            >
              Atualizar incidentes
            </Button>
          }
        />

        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
          <MetricCard
            label="Incidentes registrados"
            value={rows.length}
            helper="Volume total disponível no catálogo atual"
            icon={Activity}
            tone="info"
          />
          <MetricCard
            label="Seleção visível"
            value={filtered.length}
            helper="Resultado após busca e recorte por status"
            icon={AlertTriangle}
            tone="warning"
          />
          <MetricCard
            label="Contextos regionais"
            value={new Set(rows.map((row) => row.region).filter(Boolean)).size}
            helper="Regiões distintas presentes no feed"
            icon={MapPin}
            tone="default"
          />
        </SimpleGrid>

        <PagePanel
          title="Filtro operacional"
          description="Refine a visualização por nome, risco ou etapa do incidente."
          icon={AlertTriangle}
          tone="info"
        >
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <Box>
              <ShellSectionEyebrow mb={2}>Busca</ShellSectionEyebrow>
              <Input
                placeholder="Nome, tipo ou região"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </Box>
            <Box>
              <ShellSectionEyebrow mb={2}>Status</ShellSectionEyebrow>
              <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="">Todos os status</option>
                {statuses.map((status) => (
                  <option key={status} value={status?.toLowerCase()}>
                    {status}
                  </option>
                ))}
              </Select>
            </Box>
          </SimpleGrid>
        </PagePanel>

        <PagePanel
          title="Lista priorizada de incidentes"
          description="Cada card concentra identificação, contexto espacial e navegação rápida para o detalhe."
          icon={Activity}
          tone="default"
        >
          {loading ? (
            <PageLoadingState
              minH="320px"
              label="Sincronizando incidentes"
              description="O shell está recompondo o catálogo territorial."
            />
          ) : filtered.length === 0 ? (
            <PageEmptyState
              minH="320px"
              title="Nenhum incidente encontrado"
              description={
                search || statusFilter
                  ? 'Ajuste os filtros para reabrir a malha de busca.'
                  : 'Sem incidentes registrados no momento.'
              }
            />
          ) : (
            <VStack align="stretch" spacing={3}>
              {filtered.map((incident) => (
                <IncidentCard
                  key={incident.id}
                  incident={incident}
                  isSelected={selectedIncidentId === Number(incident.id)}
                  onSelect={() => setSelectedIncidentId(Number(incident.id))}
                />
              ))}
            </VStack>
          )}
        </PagePanel>
      </VStack>
    </Box>
  );
}

function IncidentCard({
  incident,
  isSelected,
  onSelect,
}: {
  incident: IncidentRow;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const statusColor = getStatusColor(incident.status ?? '');

  return (
    <Box
      p={4}
      borderRadius="3xl"
      bg={isSelected ? 'rgba(0,122,255,0.10)' : 'surface.interactive'}
      border="1px solid"
      borderColor={isSelected ? 'rgba(0,122,255,0.28)' : 'border.subtle'}
      transition="all 0.2s"
      cursor="pointer"
      _hover={{
        bg: 'surface.interactiveHover',
        borderColor: isSelected ? 'rgba(0,122,255,0.40)' : 'border.strong',
        transform: 'translateY(-2px)',
      }}
      onClick={onSelect}
    >
      <VStack align="stretch" spacing={3}>
        <HStack justify="space-between" align="flex-start" spacing={3}>
          <VStack align="flex-start" spacing={1.5}>
            <Text fontSize="md" fontWeight="700" color="white" lineHeight={1.3}>
              {incident.name || incident.title || `Incidente #${incident.id}`}
            </Text>
            <HStack spacing={2} flexWrap="wrap">
              {incident.type ? (
                <ShellTelemetryBadge tone="info">{incident.type}</ShellTelemetryBadge>
              ) : null}
              {incident.region ? (
                <HStack spacing={1.5}>
                  <MapPin size={12} color="rgba(255,255,255,0.40)" />
                  <Text fontSize="xs" color="text.secondary">
                    {incident.region}
                  </Text>
                </HStack>
              ) : null}
            </HStack>
          </VStack>

          <HStack spacing={2}>
            <Box w={2.5} h={2.5} borderRadius="full" bg={statusColor} boxShadow={`0 0 8px ${statusColor}`} />
            <Text fontSize="10px" fontWeight="700" color={statusColor} textTransform="uppercase">
              {incident.status}
            </Text>
          </HStack>
        </HStack>

        <HStack justify="space-between" flexWrap="wrap" spacing={3}>
          <Text fontSize="sm" color="text.secondary">
            Selecione para manter o incidente ativo no contexto operacional e abrir o detalhe completo.
          </Text>
          <Button
            as={RouterLink}
            to={`/incidents/${incident.id}`}
            variant="outline"
            size="sm"
            leftIcon={<ExternalLink size={14} />}
            onClick={(event) => event.stopPropagation()}
          >
            Detalhes
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
}
