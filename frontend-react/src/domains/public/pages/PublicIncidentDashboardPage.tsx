import { useCallback, useEffect, useMemo, useState } from 'react';
import { Polygon } from 'react-leaflet';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, 
  VStack, 
  HStack, 
  Text, 
  Icon, 
  Circle, 
  Badge, 
  Button
} from '@chakra-ui/react';
import { 
  Target, 
  CheckCircle, 
  Heart, 
  Wallet,
  Globe,
  Info,
  ArrowLeft
} from 'lucide-react';
import { LoadingOverlay } from '../../../components/ui/LoadingOverlay';
import { modulesApi } from '../../../services/modulesApi';
import { TacticalMap } from '../../../components/features/map/TacticalMap';

interface KpiItemProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  trend?: string;
}

interface PublicSnapshotData {
  searchAreas?: { total?: number; completed?: number };
  supportSummary?: { totalReceivedMoney?: number; totalSpentMoney?: number };
}

interface PublicSnapshotResponse {
  data?: PublicSnapshotData;
}

interface PublicSearchArea {
  id: string | number;
  status?: string;
  geometry_json?: {
    coordinates?: number[][][];
  };
}

const KpiItem: React.FC<KpiItemProps> = ({ label, value, icon, color, trend }) => (
  <Box 
    bg="rgba(15, 23, 42, 0.6)" 
    backdropFilter="blur(20px)" 
    borderRadius="2xl" 
    border="1px solid" 
    borderColor="whiteAlpha.100" 
    p={4}
    boxShadow="xl"
  >
    <HStack spacing={4}>
      <Circle size="40px" bg="whiteAlpha.100">
        <Icon as={icon} size={18} color={color} />
      </Circle>
      <VStack align="flex-start" spacing={0}>
        <Text fontSize="8px" fontWeight="black" color="whiteAlpha.500" textTransform="uppercase" letterSpacing="widest">
          {label}
        </Text>
        <HStack spacing={2}>
          <Text fontSize="lg" fontWeight="black" color="white">{value}</Text>
          {trend && (
            <Badge variant="subtle" colorScheme="green" fontSize="10px" borderRadius="md">
              {trend}
            </Badge>
          )}
        </HStack>
      </VStack>
    </HStack>
  </Box>
);

export function PublicIncidentDashboardPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [snapshot, setSnapshot] = useState<PublicSnapshotResponse | null>(null);
  const [areas, setAreas] = useState<PublicSearchArea[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    if (!id || isNaN(Number(id))) {
      if (isInitial) setLoading(false);
      return;
    }
    const incidentId = Number(id);
    try {
      const [snap, searchAreas] = await Promise.all([
        modulesApi.publicSnapshot(incidentId), 
        modulesApi.publicSearchAreas(incidentId)
      ]);
      setSnapshot((snap ?? null) as PublicSnapshotResponse | null);
      setAreas((searchAreas ?? []) as PublicSearchArea[]);
    } catch (err) {
      console.error(err);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [id]);

  useEffect(() => { 
    void load(true); 
    const t = setInterval(() => { void load(); }, 30000); 
    return () => clearInterval(t); 
  }, [load]);

  const stats = useMemo(() => snapshot?.data || {}, [snapshot]);

  return (
    <Box h="100vh" w="100vw" position="relative" overflow="hidden" bg="sos.dark">
      {loading && <LoadingOverlay message="Obtendo Dados Públicos..." />}

      <Box 
        position="absolute" 
        top={6} 
        left={6} 
        right={6} 
        zIndex={50}
      >
        <HStack justify="space-between">
          <HStack 
            bg="rgba(15, 23, 42, 0.7)" 
            backdropFilter="blur(20px)" 
            borderRadius="full" 
            border="1px solid" 
            borderColor="whiteAlpha.100" 
            px={5} 
            h="64px"
            boxShadow="2xl"
          >
            <HStack spacing={4}>
              <Circle size="36px" bg="sos.blue.500">
                <Icon as={Globe} size={18} color="white" />
              </Circle>
              <Box>
                <Text fontSize="10px" fontWeight="black" color="white" textTransform="uppercase" letterSpacing="widest" lineHeight="shorter">
                  Portal de Transparência
                </Text>
                <Text fontSize="9px" color="sos.blue.400" fontFamily="mono" fontWeight="bold">
                  INCIDENTE #{id} // MONITORAMENTO PÚBLICO
                </Text>
              </Box>
            </HStack>
          </HStack>

          <HStack spacing={4}>
            <Badge 
              variant="solid" 
              bg="sos.green.500" 
              color="white" 
              borderRadius="full" 
              px={4} 
              py={2}
              fontSize="10px"
              fontWeight="black"
              letterSpacing="widest"
              boxShadow="0 0 20px rgba(40, 167, 69, 0.4)"
            >
              ● OPERAÇÃO ATIVA
            </Badge>
              <Button 
              leftIcon={<ArrowLeft size={16} />} 
              variant="tactical" 
              borderRadius="full" 
              h="48px" 
              px={6}
              onClick={() => navigate('/transparency')}
            >
              Voltar ao Portal de Transparência
            </Button>
          </HStack>
        </HStack>
      </Box>

      <VStack 
        position="absolute" 
        top="110px" 
        left={6} 
        zIndex={40} 
        spacing={4} 
        w="280px"
      >
        <KpiItem 
          label="Áreas Totais" 
          value={stats.searchAreas?.total ?? 0} 
          icon={Target} 
          color="white" 
        />
        <KpiItem 
          label="Concluídas" 
          value={stats.searchAreas?.completed ?? 0} 
          icon={CheckCircle} 
          color="sos.green.400"
          trend={`${stats.searchAreas?.total ? Math.round((((stats.searchAreas.completed ?? 0) / stats.searchAreas.total) * 100)) : 0}%`}
        />
        <KpiItem 
          label="Doações" 
          value={`R$ ${stats.supportSummary?.totalReceivedMoney ?? 0}`} 
          icon={Heart} 
          color="sos.red.400" 
        />
        <KpiItem 
          label="Investido" 
          value={`R$ ${stats.supportSummary?.totalSpentMoney ?? 0}`} 
          icon={Wallet} 
          color="orange.400" 
        />

        <Box 
          mt={4}
          bg="rgba(15, 23, 42, 0.6)" 
          backdropFilter="blur(20px)" 
          borderRadius="2xl" 
          border="1px solid" 
          borderColor="whiteAlpha.100" 
          p={5}
        >
          <HStack spacing={3} align="flex-start">
            <Icon as={Info} size={16} color="sos.blue.400" mt={1} />
            <VStack align="flex-start" spacing={1}>
              <Text fontSize="9px" fontWeight="black" color="whiteAlpha.500" textTransform="uppercase" letterSpacing="widest">
                Como ajudar
              </Text>
              <Text fontSize="xs" color="whiteAlpha.800" lineHeight="relaxed">
                Acompanhe as campanhas oficiais e canais de doação autorizados. Sua ajuda é fundamental para as equipes de resgate.
              </Text>
            </VStack>
          </HStack>
        </Box>
      </VStack>

      <Box position="absolute" inset={0} zIndex={0}>
        <TacticalMap 
          center={[-21.1215, -42.9427]} 
          zoom={12} 
        >
          {areas.map((r) => {
            const path = (r.geometry_json?.coordinates?.[0] || []).map((c: number[]) => [c[1], c[0]] as [number, number]);
            return (
              <Polygon 
                key={r.id} 
                positions={path} 
                pathOptions={{ 
                  color: r.status === 'Completed' ? '#28A745' : r.status === 'InProgress' ? '#f59e0b' : '#003366', 
                  fillOpacity: 0.3,
                  weight: 2,
                  dashArray: r.status === 'InProgress' ? '5, 10' : undefined
                }} 
              />
            );
          })}
        </TacticalMap>
      </Box>
    </Box>
  );
}
