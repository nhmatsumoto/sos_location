import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { modulesApi } from '../services/modulesApi';
import { useIncidentStore } from '../store/incidentStore';
import { useNotifications } from '../context/useNotifications';
import {
  Box, VStack, HStack, Text, Badge, Spinner, Center,
  Input, Select, Flex, IconButton
} from '@chakra-ui/react';
import { Activity, AlertTriangle, MapPin, RefreshCw, ExternalLink } from 'lucide-react';
import { GlassPanel } from '../components/atoms/GlassPanel';
import { TacticalText } from '../components/atoms/TacticalText';

const STATUS_COLORS: Record<string, string> = {
  active:      '#FF3B30',
  'em andamento': '#FF3B30',
  resolved:    '#34C759',
  encerrado:   '#34C759',
  monitoring:  '#FF9500',
  monitorando: '#FF9500',
  pending:     '#8E8E93',
  pendente:    '#8E8E93',
};

const getStatusColor = (status: string) =>
  STATUS_COLORS[status?.toLowerCase()] || '#8E8E93';

function IncidentCard({ incident, isSelected, onSelect }: { incident: any; isSelected: boolean; onSelect: () => void }) {
  const statusColor = getStatusColor(incident.status);
  return (
    <GlassPanel
      depth="raised"
      tint={isSelected ? 'blue' : 'none'}
      p={4}
      borderRadius="xl"
      cursor="pointer"
      border="1px solid"
      borderColor={isSelected ? 'rgba(0,122,255,0.35)' : 'rgba(255,255,255,0.08)'}
      transition="all 0.2s cubic-bezier(0.4,0,0.2,1)"
      _hover={{
        borderColor: isSelected ? 'rgba(0,122,255,0.50)' : 'rgba(255,255,255,0.16)',
        transform: 'translateY(-2px)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
      }}
      onClick={onSelect}
      direction="column"
      gap={3}
    >
      <Flex justify="space-between" align="flex-start">
        <VStack align="flex-start" spacing={1} flex={1}>
          <TacticalText variant="heading" fontSize="sm" color="white" lineHeight={1.3}>
            {incident.name || incident.title || `Incidente #${incident.id}`}
          </TacticalText>
          <HStack spacing={2}>
            {incident.type && (
              <Badge
                px={2}
                py={0.5}
                bg="rgba(0,122,255,0.10)"
                color="rgba(0,122,255,0.90)"
                border="1px solid rgba(0,122,255,0.20)"
                borderRadius="md"
                fontSize="10px"
              >
                {incident.type}
              </Badge>
            )}
            {incident.region && (
              <HStack spacing={1}>
                <MapPin size={11} color="rgba(255,255,255,0.40)" />
                <Text fontSize="xs" color="rgba(255,255,255,0.40)">{incident.region}</Text>
              </HStack>
            )}
          </HStack>
        </VStack>

        <HStack spacing={2}>
          <Box
            w={2}
            h={2}
            borderRadius="full"
            bg={statusColor}
            boxShadow={`0 0 6px ${statusColor}`}
            className={incident.status === 'active' || incident.status === 'em andamento' ? 'animate-pulse' : undefined}
          />
          <Text fontSize="10px" fontWeight="700" color={statusColor} textTransform="uppercase">
            {incident.status}
          </Text>
        </HStack>
      </Flex>

      <HStack spacing={3} justify="flex-end">
        <Link
          to={`/incidents/${incident.id}`}
          onClick={e => e.stopPropagation()}
          style={{ textDecoration: 'none' }}
        >
          <HStack
            spacing={1}
            px={3}
            py={1.5}
            borderRadius="lg"
            border="1px solid rgba(255,255,255,0.12)"
            _hover={{ bg: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.25)' }}
            transition="all 0.18s"
          >
            <Text fontSize="xs" color="rgba(255,255,255,0.60)" fontWeight="600">Detalhes</Text>
            <ExternalLink size={12} color="rgba(255,255,255,0.40)" />
          </HStack>
        </Link>
      </HStack>
    </GlassPanel>
  );
}

export function IncidentsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const { selectedIncidentId, setSelectedIncidentId } = useIncidentStore();
  const { pushNotice } = useNotifications();

  const load = async () => {
    setLoading(true);
    try {
      const data = await modulesApi.listIncidents();
      setRows(data || []);
    } catch {
      setRows([]);
      pushNotice({ type: 'warning', title: 'Incidentes indisponíveis', message: 'Sem conexão com o servidor.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      const matchSearch = !search
        || (r.name || '').toLowerCase().includes(search.toLowerCase())
        || (r.type || '').toLowerCase().includes(search.toLowerCase())
        || (r.region || '').toLowerCase().includes(search.toLowerCase());
      const matchStatus = !statusFilter || (r.status || '').toLowerCase() === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [rows, search, statusFilter]);

  const statuses = useMemo(() => [...new Set(rows.map(r => r.status).filter(Boolean))], [rows]);

  return (
    <Box minH="100vh" bg="sos.dark" p={6}>
      <VStack spacing={6} align="stretch">

        {/* Header */}
        <Flex justify="space-between" align="center">
          <VStack align="flex-start" spacing={0}>
            <HStack spacing={3}>
              <Box p={2} bg="rgba(255,59,48,0.12)" borderRadius="xl">
                <Activity size={20} color="#FF3B30" />
              </Box>
              <Box>
                <TacticalText variant="heading" fontSize="xl" color="white">
                  Incidentes Ativos
                </TacticalText>
                <Text fontSize="xs" color="rgba(255,255,255,0.40)" mt={0.5}>
                  {rows.length} incidentes registrados
                </Text>
              </Box>
            </HStack>
          </VStack>

          <IconButton
            icon={<RefreshCw size={16} />}
            aria-label="Atualizar"
            onClick={() => void load()}
            isLoading={loading}
            variant="ghost"
            borderRadius="xl"
            color="rgba(255,255,255,0.50)"
            _hover={{ color: 'white', bg: 'rgba(255,255,255,0.08)' }}
          />
        </Flex>

        {/* Filters */}
        <GlassPanel depth="base" p={4} gap={3} flexDir={{ base: 'column', md: 'row' }}>
          <Input
            placeholder="Buscar por nome, tipo ou região..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            flex={1}
          />
          <Select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            w={{ base: 'full', md: '200px' }}
          >
            <option value="">Todos os status</option>
            {statuses.map(s => (
              <option key={s} value={s?.toLowerCase()}>{s}</option>
            ))}
          </Select>
        </GlassPanel>

        {/* Content */}
        {loading ? (
          <Center h="300px">
            <VStack spacing={4}>
              <Spinner size="xl" color="sos.blue.500" thickness="3px" speed="0.8s" emptyColor="rgba(255,255,255,0.06)" />
              <TacticalText variant="mono" color="rgba(255,255,255,0.40)">
                Carregando incidentes...
              </TacticalText>
            </VStack>
          </Center>
        ) : filtered.length === 0 ? (
          <Center h="300px">
            <VStack spacing={4} opacity={0.4}>
              <AlertTriangle size={48} color="rgba(255,255,255,0.30)" />
              <TacticalText variant="heading">Nenhum incidente encontrado</TacticalText>
              <Text fontSize="sm" color="rgba(255,255,255,0.40)">
                {search || statusFilter ? 'Ajuste os filtros para ver mais resultados.' : 'Sem incidentes registrados no momento.'}
              </Text>
            </VStack>
          </Center>
        ) : (
          <VStack spacing={3} align="stretch">
            {filtered.map(incident => (
              <IncidentCard
                key={incident.id}
                incident={incident}
                isSelected={selectedIncidentId === incident.id}
                onSelect={() => setSelectedIncidentId(incident.id)}
              />
            ))}
          </VStack>
        )}
      </VStack>
    </Box>
  );
}
