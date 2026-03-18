import { useEffect, useState, useMemo } from 'react';
import { 
  Box, 
  VStack, 
  HStack, 
  SimpleGrid, 
  Icon, 
  Badge,
  Text,
  Input,
  Select,
  Progress,
  Flex,
  Stat,
  StatLabel,
  StatNumber,
  Table,
  Tbody,
  Td,
  Tr,
  useToken,
  IconButton,
  Center
} from '@chakra-ui/react';
import { 
  Map as MapIcon, 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  Plus,
  Target,
  Layers,
  Compass
} from 'lucide-react';
import { GlassPanel } from '../components/atoms/GlassPanel';
import { TacticalText } from '../components/atoms/TacticalText';
import { TacticalButton } from '../components/atoms/TacticalButton';
import { searchedAreasApi, type SearchedAreaApi } from '../services/searchedAreasApi';
import { useNotifications } from '../context/NotificationsContext';
import { Circle, Popup } from 'react-leaflet';
import { TacticalMap } from '../components/features/map/TacticalMap';
import 'leaflet/dist/leaflet.css';

export function SearchedAreasPage() {
  const [rows, setRows] = useState<SearchedAreaApi[]>([]);
  const [form, setForm] = useState({ 
    areaName: 'Setor A', 
    team: 'Equipe 01', 
    lat: '-20.9125', 
    lng: '-42.9827', 
    result: 'Sem vítimas' 
  });
  const [loading, setLoading] = useState(false);
  const { pushNotice } = useNotifications();

  const [blue400, red400] = useToken('colors', ['sos.blue.400', 'sos.red.400']);

  const load = async () => {
    try {
      const data = await searchedAreasApi.list();
      setRows(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    setLoading(true);
    try {
      await searchedAreasApi.create({
        areaName: form.areaName,
        team: form.team,
        lat: Number(form.lat),
        lng: Number(form.lng),
        notes: form.result,
      });
      pushNotice({ type: 'success', title: 'Área Registrada', message: 'Setor de busca atualizado no mapa operacional.' });
      await load();
    } catch {
      pushNotice({ type: 'error', title: 'Falha ao registrar', message: 'Erro de comunicação com o servidor tático.' });
    } finally {
      setLoading(false);
    }
  };

  const coverage = useMemo(() => Math.min(100, (Array.isArray(rows) ? rows.length : 0) * 8.5), [rows]);

  return (
    <Box h="100%" w="100%" bg="sos.dark" p={6} overflow="hidden">
      <VStack spacing={6} align="stretch" h="full">
        {/* HEADER */}
        <Flex justify="space-between" align="center">
          <VStack align="start" spacing={0}>
             <TacticalText variant="caption" color="sos.blue.400" letterSpacing="0.2em">MONITORAMENTO_DE_VARREDURA_GEOESPACIAL</TacticalText>
             <HStack>
               <MapIcon size={20} color="white" />
               <TacticalText variant="heading" fontSize="2xl">Zonas de Busca e Resgate</TacticalText>
             </HStack>
          </VStack>
          
          <HStack spacing={4}>
             <Box textAlign="right">
                <TacticalText variant="mono" fontSize="xs" color="whiteAlpha.600">COBERTURA_TOTAL</TacticalText>
                <HStack>
                   <Progress value={coverage} size="xs" w="100px" borderRadius="full" colorScheme="blue" bg="whiteAlpha.100" />
                   <TacticalText variant="heading" fontSize="lg" color="sos.blue.400">{coverage.toFixed(1)}%</TacticalText>
                </HStack>
             </Box>
             <TacticalButton variant="outline" leftIcon={<Plus size={14} />} onClick={() => {}}>
                IMPORTAR_GRID
             </TacticalButton>
          </HStack>
        </Flex>

        <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={6} flex={1} overflow="hidden">
           {/* FORM PANEL */}
           <VStack spacing={6} align="stretch">
              <GlassPanel p={6} depth="raised" flexDirection="column">
                 <HStack mb={4}>
                    <Icon as={Target} color="sos.amber.400" />
                    <TacticalText variant="subheading">REGISTRAR_VARREDURA</TacticalText>
                 </HStack>
                 
                 <VStack spacing={4} align="stretch">
                    <Box>
                       <TacticalText variant="caption" mb={2}>IDENTIFICAÇÃO_DO_SETOR</TacticalText>
                       <Input value={form.areaName} placeholder="Ex: Setor A-12" 
                          bg="whiteAlpha.50" borderColor="whiteAlpha.100"
                          onChange={(e) => setForm(p => ({...p, areaName: e.target.value}))} />
                    </Box>
                    <Box>
                       <TacticalText variant="caption" mb={2}>EQUIPE_OPERACIONAL</TacticalText>
                       <Input value={form.team} placeholder="Ex: Equipe Bravo" 
                          bg="whiteAlpha.50" borderColor="whiteAlpha.100"
                          onChange={(e) => setForm(p => ({...p, team: e.target.value}))} />
                    </Box>
                    <SimpleGrid columns={2} spacing={3}>
                       <Box>
                          <TacticalText variant="caption" mb={2}>LATITUDE</TacticalText>
                          <Input value={form.lat} 
                             bg="whiteAlpha.50" borderColor="whiteAlpha.100"
                             onChange={(e) => setForm(p => ({...p, lat: e.target.value}))} />
                       </Box>
                       <Box>
                          <TacticalText variant="caption" mb={2}>LONGITUDE</TacticalText>
                          <Input value={form.lng} 
                             bg="whiteAlpha.50" borderColor="whiteAlpha.100"
                             onChange={(e) => setForm(p => ({...p, lng: e.target.value}))} />
                       </Box>
                    </SimpleGrid>
                    <Box>
                       <TacticalText variant="caption" mb={2}>RESULTADO_DA_VARREDURA</TacticalText>
                       <Select value={form.result} 
                          bg="whiteAlpha.50" borderColor="whiteAlpha.100" sx={{ '> option': { bg: 'sos.dark' } }}
                          onChange={(e) => setForm(p => ({...p, result: e.target.value}))}>
                          <option>Sem vítimas</option>
                          <option>Vítima encontrada</option>
                          <option>Necessita nova varredura</option>
                       </Select>
                    </Box>
                    
                    <TacticalButton mt={2} w="full" bg="sos.blue.500" glow loading={loading} onClick={save}>
                       CONFIRMAR_REGISTRO_DE_ÁREA
                    </TacticalButton>
                 </VStack>
              </GlassPanel>

              {/* STATS CARDS */}
              <SimpleGrid columns={1} spacing={4}>
                 <GlassPanel p={4}>
                    <HStack spacing={4}>
                       <Center w={10} h={10} bg="rgba(0,122,255,0.1)" borderRadius="lg">
                          <Icon as={Users} color="sos.blue.400" />
                       </Center>
                       <Stat>
                          <StatLabel><TacticalText variant="caption">EQUIPES_ATIVAS</TacticalText></StatLabel>
                          <StatNumber><TacticalText variant="heading" fontSize="xl">{new Set((Array.isArray(rows) ? rows : []).map(r => r.team)).size}</TacticalText></StatNumber>
                       </Stat>
                    </HStack>
                 </GlassPanel>
                 <GlassPanel p={4}>
                    <HStack spacing={4}>
                       <Center w={10} h={10} bg="rgba(255,69,58,0.1)" borderRadius="lg">
                          <Icon as={AlertTriangle} color="sos.red.400" />
                       </Center>
                       <Stat>
                          <StatLabel><TacticalText variant="caption">ÁREAS_CRÍTICAS</TacticalText></StatLabel>
                          <StatNumber><TacticalText variant="heading" fontSize="xl">{(Array.isArray(rows) ? rows : []).filter(r => r.notes?.includes('Vítima')).length}</TacticalText></StatNumber>
                       </Stat>
                    </HStack>
                 </GlassPanel>
              </SimpleGrid>
           </VStack>

           {/* MAP & LIST PANEL */}
           <VStack spacing={6} align="stretch" gridColumn={{ lg: 'span 2' }}>
              <GlassPanel p={0} flex={1} overflow="hidden" position="relative" bg="#08080F">
                 <Box position="absolute" top={4} right={4} zIndex={1000} bg="rgba(8,8,15,0.85)" p={1} borderRadius="lg" border="1px solid" borderColor="whiteAlpha.200">
                    <VStack spacing={1}>
                       <IconButton aria-label="Zoom In" icon={<Plus size={14} />} size="xs" variant="ghost" />
                       <IconButton aria-label="Layers" icon={<Layers size={14} />} size="xs" variant="ghost" />
                       <IconButton aria-label="Center" icon={<Compass size={14} />} size="xs" variant="ghost" />
                    </VStack>
                 </Box>
                 
                 <Box position="absolute" bottom={4} left={4} zIndex={1000} bg="rgba(8,8,15,0.85)" px={3} py={1} borderRadius="full" border="1px solid" borderColor="whiteAlpha.200">
                    <HStack spacing={3}>
                       <HStack spacing={1}>
                          <Box w={2} h={2} borderRadius="full" bg="sos.green.500" />
                          <TacticalText variant="mono" fontSize="10px">VARREDURA_OK</TacticalText>
                       </HStack>
                       <HStack spacing={1}>
                          <Box w={2} h={2} borderRadius="full" bg="sos.red.500" />
                          <TacticalText variant="mono" fontSize="10px">VÍTIMAS_ID</TacticalText>
                       </HStack>
                    </HStack>
                 </Box>

                 <TacticalMap 
                    center={[-20.91, -42.98]} 
                    zoom={15} 
                    containerProps={{ flex: 1 }}
                 >
                    {Array.isArray(rows) && rows.map((area, i) => (
                       <Circle 
                          key={`area-${area.id || i}`}
                          center={[area.lat, area.lng]}
                          radius={150}
                          pathOptions={{ 
                             fillColor: area.notes?.includes('Vítima') ? red400 : blue400,
                             color: area.notes?.includes('Vítima') ? red400 : blue400,
                             fillOpacity: 0.3,
                             weight: 2,
                             dashArray: area.notes?.includes('nova') ? '5, 5' : ''
                          }}
                       >
                          <Popup>
                             <VStack align="start" spacing={1} p={1}>
                                <TacticalText variant="subheading" fontSize="xs">{area.areaName}</TacticalText>
                                <TacticalText variant="caption" fontSize="10px">EQUIPE: {area.team}</TacticalText>
                                <Badge size="sm" colorScheme={area.notes?.includes('Vítima') ? 'red' : 'blue'}>{area.notes}</Badge>
                             </VStack>
                          </Popup>
                       </Circle>
                    ))}
                 </TacticalMap>
              </GlassPanel>

              <GlassPanel p={0} h="200px" overflow="hidden">
                 <Box p={3} borderBottom="1px solid" borderColor="whiteAlpha.100" bg="whiteAlpha.50">
                    <TacticalText variant="caption">LOG_DE_OPERAÇÕES_RECENTES</TacticalText>
                 </Box>
                 <Box flex={1} overflowY="auto" className="custom-scrollbar">
                    <Table variant="unstyled" size="sm">
                       <Tbody>
                          {Array.isArray(rows) && rows.slice().reverse().map((row, idx) => (
                             <Tr key={row.id || idx} borderBottom="1px solid" borderColor="whiteAlpha.50">
                                <Td py={3}>
                                   <HStack>
                                      <Icon as={CheckCircle2} size={14} color="sos.green.400" />
                                      <Text fontSize="xs" fontWeight="bold" color="white">{row.areaName}</Text>
                                   </HStack>
                                </Td>
                                <Td py={3}><TacticalText variant="mono" fontSize="xs">{row.team}</TacticalText></Td>
                                <Td py={3}>
                                   <Badge variant="outline" fontSize="9px" colorScheme={row.notes?.includes('Vítima') ? 'red' : 'blue'}>
                                      {row.notes?.toUpperCase() || 'N/A'}
                                   </Badge>
                                </Td>
                                <Td py={3} isNumeric><TacticalText variant="mono" fontSize="10px" opacity={0.4}>11:03 AM</TacticalText></Td>
                             </Tr>
                          ))}
                       </Tbody>
                    </Table>
                 </Box>
              </GlassPanel>
           </VStack>
        </SimpleGrid>
      </VStack>
    </Box>
  );
}
