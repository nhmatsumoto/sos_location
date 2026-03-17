import { useEffect, useState } from 'react';
import { 
  Box, 
  VStack, 
  HStack, 
  SimpleGrid, 
  Icon, 
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Text,
  Input,
  Textarea,
  Center,
  Spinner,
  Flex
} from '@chakra-ui/react';
import { 
  Users, 
  UserPlus, 
  MapPin, 
  RefreshCw,
  Filter,
  FileDown
} from 'lucide-react';
import { GlassPanel } from '../components/atoms/GlassPanel';
import { TacticalText } from '../components/atoms/TacticalText';
import { TacticalButton } from '../components/atoms/TacticalButton';
import { missingPersonsApi, type MissingPersonApi } from '../services/missingPersonsApi';
import { resolveApiUrl } from '../lib/apiBaseUrl';
import { useNotifications } from '../context/NotificationsContext';
import { MapContainer, TileLayer } from 'react-leaflet';
import L from 'leaflet';

// Fix for default leaflet icons
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

export function MissingPersonsPage() {
  const [rows, setRows] = useState<MissingPersonApi[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ 
    personName: '', 
    age: '', 
    city: 'Ubá', 
    lastSeenLocation: '', 
    contactPhone: '', 
    additionalInfo: '' 
  });
  const { pushNotice } = useNotifications();

  const load = async () => {
    setLoading(true);
    try {
      const data = await missingPersonsApi.list();
      setRows(data);
    } catch (err) {
      console.error('Error loading missing persons:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    if (!form.personName || !form.lastSeenLocation) {
        pushNotice({ type: 'warning', title: 'Campos obrigatórios', message: 'Preencha ao menos o nome e a localização.' });
        return;
    }
    
    setLoading(true);
    try {
      await missingPersonsApi.create({
        personName: form.personName,
        age: form.age ? Number(form.age) : undefined,
        city: form.city,
        lastSeenLocation: form.lastSeenLocation,
        contactPhone: form.contactPhone,
        additionalInfo: form.additionalInfo,
        contactName: 'Central SOS Guardian',
      });
      setForm({ personName: '', age: '', city: 'Ubá', lastSeenLocation: '', contactPhone: '', additionalInfo: '' });
      pushNotice({ type: 'success', title: 'Registro Concluído', message: 'O registro foi adicionado à base de dados operacional.' });
      await load();
    } catch {
      pushNotice({ type: 'error', title: 'Falha ao salvar', message: 'Verifique a conexão com o servidor.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box h="100%" w="100%" bg="sos.dark" p={6}>
      <VStack spacing={6} align="stretch" h="full">
        {/* HEADER */}
        <Flex justify="space-between" align="center">
          <VStack align="start" spacing={0}>
             <TacticalText variant="caption" color="sos.blue.400" letterSpacing="0.2em">CENTRAL_DE_INTELIGÊNCIA_HUMANITÁRIA</TacticalText>
             <HStack>
               <Users size={20} color="white" />
               <TacticalText variant="heading" fontSize="2xl">Pessoas Desaparecidas</TacticalText>
               <Badge bg="sos.red.500" color="white" px={2} borderRadius="full">
                  {rows.length} OPERATIVOS_PENDENTES
               </Badge>
             </HStack>
          </VStack>
          
          <HStack spacing={3}>
             <TacticalButton variant="outline" leftIcon={<FileDown size={14} />} 
               as="a" href={resolveApiUrl('/api/missing-people.csv')} target="_blank">
               EXPORTAR_CSV
             </TacticalButton>
             <TacticalButton leftIcon={<RefreshCw size={14} />} onClick={load} loading={loading}>
                 ATUALIZAR_BASE
             </TacticalButton>
          </HStack>
        </Flex>

        <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={6} flex={1} overflow="hidden">
           {/* LEFT COLUMN: REGISTRATION & MAP */}
           <VStack spacing={6} align="stretch" overflowY="auto" pb={4} pr={2} className="custom-scrollbar">
              {/* REGISTRATION FORM */}
              <GlassPanel p={6} depth="raised" flexDirection="column">
                 <HStack mb={4}>
                    <Icon as={UserPlus} color="sos.blue.400" />
                    <TacticalText variant="subheading">NOVO REGISTRO_TÁTICO</TacticalText>
                 </HStack>
                 
                 <SimpleGrid columns={2} spacing={4}>
                    <Box gridColumn="span 2">
                       <TacticalText variant="caption" mb={2}>NOME_ COMPLETO</TacticalText>
                       <Input value={form.personName} placeholder="Ex: João da Silva" 
                          bg="whiteAlpha.50" borderColor="whiteAlpha.100" _focus={{ borderColor: 'sos.blue.500' }}
                          onChange={(e) => setForm(p => ({...p, personName: e.target.value}))} />
                    </Box>
                    <Box>
                       <TacticalText variant="caption" mb={2}>IDADE_APROX</TacticalText>
                       <Input value={form.age} placeholder="Ex: 45" 
                          bg="whiteAlpha.50" borderColor="whiteAlpha.100"
                          onChange={(e) => setForm(p => ({...p, age: e.target.value}))} />
                    </Box>
                    <Box>
                       <TacticalText variant="caption" mb={2}>CIDADE_DISTRITO</TacticalText>
                       <Input value={form.city} placeholder="Ex: Ubá" 
                          bg="whiteAlpha.50" borderColor="whiteAlpha.100"
                          onChange={(e) => setForm(p => ({...p, city: e.target.value}))} />
                    </Box>
                    <Box gridColumn="span 2">
                       <TacticalText variant="caption" mb={2}>ÚLTIMA_LOCALIZAÇÃO_CONHECIDA</TacticalText>
                       <Input value={form.lastSeenLocation} placeholder="Ex: Rua Direita, 123" 
                          bg="whiteAlpha.50" borderColor="whiteAlpha.100"
                          onChange={(e) => setForm(p => ({...p, lastSeenLocation: e.target.value}))} />
                    </Box>
                    <Box gridColumn="span 2">
                       <TacticalText variant="caption" mb={2}>CONTATO_DE_EMERGÊNCIA</TacticalText>
                       <Input value={form.contactPhone} placeholder="Ex: (32) 99999-9999" 
                          bg="whiteAlpha.50" borderColor="whiteAlpha.100"
                          onChange={(e) => setForm(p => ({...p, contactPhone: e.target.value}))} />
                    </Box>
                    <Box gridColumn="span 2">
                       <TacticalText variant="caption" mb={2}>INFORMAÇÕES_ADICIONAIS (VESTIMENTA, SINAIS)</TacticalText>
                       <Textarea value={form.additionalInfo} placeholder="Descreva detalhes..." 
                          bg="whiteAlpha.50" borderColor="whiteAlpha.100" rows={3}
                          onChange={(e) => setForm(p => ({...p, additionalInfo: e.target.value}))} />
                    </Box>
                 </SimpleGrid>
                 
                 <TacticalButton mt={6} w="full" bg="sos.blue.500" h="56px" glow
                    onClick={save} loading={loading}>
                    REGISTRAR NO SISTEMA_GUARDIAN
                 </TacticalButton>
              </GlassPanel>

              {/* MINI PREVIEW MAP */}
              <GlassPanel p={0} flex={1} minH="300px" overflow="hidden" position="relative">
                 <Box position="absolute" top={4} left={4} zIndex={1000} bg="rgba(8,8,15,0.85)" px={3} py={1} borderRadius="full" border="1px solid" borderColor="whiteAlpha.200">
                    <TacticalText variant="mono" fontSize="10px">ZONAS_DE_ÚLTIMO_CONTATO</TacticalText>
                 </Box>
                 <MapContainer 
                   center={[-20.91, -42.98]} 
                   zoom={13} 
                   style={{ height: '300px', width: '100%', filter: 'grayscale(0.8) invert(0.9) hue-rotate(180deg) brightness(0.6)' }}
                 >
                   <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                   {/* Here we would add markers for missing persons if they had lat/lon */}
                 </MapContainer>
              </GlassPanel>
           </VStack>

           {/* RIGHT COLUMN: DATA GRID */}
           <GlassPanel p={0} flexDirection="column" overflow="hidden">
              <Box p={4} bg="whiteAlpha.50" borderBottom="1px solid" borderColor="whiteAlpha.100">
                 <Flex justify="space-between" align="center">
                    <TacticalText variant="subheading">BASE_DE_DADOS_ATUALIZADA</TacticalText>
                    <HStack spacing={2} px={3} py={1} bg="sos.blue.500" borderRadius="md">
                       <Icon as={Filter} size={12} color="white" />
                       <TacticalText variant="mono" fontSize="10px" color="white">FILTRAR_REGISTROS</TacticalText>
                    </HStack>
                 </Flex>
              </Box>
              
              <Box flex={1} overflowY="auto" className="custom-scrollbar">
                 {loading && rows.length === 0 ? (
                    <Center h="full" flexDirection="column">
                       <Spinner color="sos.blue.500" size="xl" mb={4} />
                       <TacticalText variant="mono">SINCRONIZANDO_DADOS...</TacticalText>
                    </Center>
                 ) : rows.length === 0 ? (
                    <Center h="full" flexDirection="column" p={8} textAlign="center">
                       <Users size={48} color="rgba(255,255,255,0.1)" />
                       <TacticalText variant="heading" mt={4}>NENHUM_REGISTRO_ATIVO</TacticalText>
                       <TacticalText variant="caption" mt={2} opacity={0.5}>Aguardando entrada de dados do campo de operações.</TacticalText>
                    </Center>
                 ) : (
                    <Table variant="unstyled" size="sm">
                       <Thead position="sticky" top={0} bg="rgba(10,10,20,0.95)" zIndex={10} backdropFilter="blur(5px)">
                          <Tr borderBottom="1px solid" borderColor="whiteAlpha.100">
                             <Th py={4} color="whiteAlpha.400"><TacticalText variant="caption">NOME/REF</TacticalText></Th>
                             <Th py={4} color="whiteAlpha.400"><TacticalText variant="caption">STATUS</TacticalText></Th>
                             <Th py={4} color="whiteAlpha.400"><TacticalText variant="caption">LOCALIZAÇÃO</TacticalText></Th>
                             <Th py={4} color="whiteAlpha.400" isNumeric><TacticalText variant="caption">CONTATO</TacticalText></Th>
                          </Tr>
                       </Thead>
                       <Tbody>
                          {rows.map((row, idx) => (
                             <Tr key={idx} borderBottom="1px solid" borderColor="whiteAlpha.50" _hover={{ bg: 'whiteAlpha.50' }} transition="all 0.2s">
                                <Td py={4}>
                                   <VStack align="start" spacing={0}>
                                      <Text fontWeight="bold" fontSize="sm" color="white">{row.personName}</Text>
                                      <TacticalText variant="mono" fontSize="10px" color="whiteAlpha.400">AGE: {row.age || 'UNKNOWN'}</TacticalText>
                                   </VStack>
                                </Td>
                                <Td py={4}>
                                   <Badge variant="subtle" colorScheme="red" bg="rgba(255,59,48,0.15)" color="red.300" fontSize="10px">
                                      SEARCHING
                                   </Badge>
                                </Td>
                                <Td py={4}>
                                   <HStack>
                                      <Icon as={MapPin} size={12} color="sos.blue.400" />
                                      <Text fontSize="xs" color="whiteAlpha.700">{row.lastSeenLocation}, {row.city}</Text>
                                   </HStack>
                                </Td>
                                <Td py={4} isNumeric>
                                   <TacticalText variant="mono" fontSize="xs" color="sos.blue.400">{row.contactPhone}</TacticalText>
                                </Td>
                             </Tr>
                          ))}
                       </Tbody>
                    </Table>
                 )}
              </Box>
           </GlassPanel>
        </SimpleGrid>
      </VStack>
    </Box>
  );
}

