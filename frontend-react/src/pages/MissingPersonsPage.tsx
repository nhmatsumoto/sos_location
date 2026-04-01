import { useEffect, useState, useCallback } from 'react';
import {
  Box, VStack, HStack, Icon, Badge,
  Table, Thead, Tbody, Tr, Th, Td, Text,
  Input, Textarea, Center, Spinner, Flex, Grid,
  Modal, ModalOverlay, ModalContent, ModalHeader,
  ModalBody, ModalFooter, ModalCloseButton,
  useDisclosure, SimpleGrid,
} from '@chakra-ui/react';
import { Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import {
  Users, UserPlus, MapPin, RefreshCw, FileDown, Navigation,
} from 'lucide-react';
import { GlassPanel } from '../components/atoms/GlassPanel';
import { TacticalText } from '../components/atoms/TacticalText';
import { TacticalButton } from '../components/atoms/TacticalButton';
import { missingPersonsApi, type MissingPersonApi } from '../services/missingPersonsApi';
import { resolveApiUrl } from '../lib/apiBaseUrl';
import { useNotifications } from '../context/useNotifications';
import { TacticalMap } from '../components/features/map/TacticalMap';

// ─── Leaflet icon para pessoas desaparecidas ─────────────────────────────────
const missingIcon = new L.DivIcon({
  html: `<div style="position:relative;width:28px;height:36px">
    <svg viewBox="0 0 24 32" width="28" height="36" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 20 12 20S24 21 24 12C24 5.373 18.627 0 12 0z" fill="#FF3B30" stroke="rgba(0,0,0,0.3)" stroke-width="1"/>
      <circle cx="12" cy="11" r="4" fill="white"/>
    </svg>
  </div>`,
  className: '',
  iconSize: [28, 36],
  iconAnchor: [14, 36],
  popupAnchor: [0, -38],
});

// ─── Captura clique no mapa ───────────────────────────────────────────────────
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onMapClick(e.latlng.lat, e.latlng.lng) });
  return null;
}

// ─── Formulário inicial ───────────────────────────────────────────────────────
const EMPTY_FORM = {
  personName: '',
  age: '',
  city: 'Ubá',
  lastSeenLocation: '',
  contactPhone: '',
  additionalInfo: '',
  lat: '',
  lng: '',
};

export function MissingPersonsPage() {
  const [rows, setRows] = useState<MissingPersonApi[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { pushNotice } = useNotifications();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await missingPersonsApi.list());
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleMapClick = (lat: number, lng: number) => {
    setForm((p) => ({ ...p, lat: lat.toFixed(6), lng: lng.toFixed(6) }));
  };

  const save = async () => {
    if (!form.personName || !form.lastSeenLocation) {
      pushNotice({ type: 'warning', title: 'Campos obrigatórios', message: 'Preencha ao menos o nome e a localização.' });
      return;
    }
    setSaving(true);
    try {
      await missingPersonsApi.create({
        personName: form.personName,
        age: form.age ? Number(form.age) : undefined,
        city: form.city,
        lastSeenLocation: form.lastSeenLocation,
        contactPhone: form.contactPhone,
        additionalInfo: form.additionalInfo,
        contactName: 'Central SOS Guardian',
        lat: form.lat ? Number(form.lat) : undefined,
        lng: form.lng ? Number(form.lng) : undefined,
      });
      setForm(EMPTY_FORM);
      onClose();
      pushNotice({ type: 'success', title: 'Registro Concluído', message: 'Adicionado à base de dados operacional.' });
      await load();
    } catch {
      pushNotice({ type: 'error', title: 'Falha ao salvar', message: 'Verifique a conexão com o servidor.' });
    } finally {
      setSaving(false);
    }
  };

  // Registros com coordenadas para exibir no mapa
  const geoRows = rows.filter((r) => r.lat != null && r.lng != null);

  // Centro do mapa: média das coords ou default Ubá
  const mapCenter: [number, number] =
    geoRows.length > 0
      ? [
          geoRows.reduce((s, r) => s + r.lat!, 0) / geoRows.length,
          geoRows.reduce((s, r) => s + r.lng!, 0) / geoRows.length,
        ]
      : [-20.91, -42.98];

  return (
    <Box h="100%" w="100%" bg="sos.dark" p={6} overflowY="auto">
      <VStack spacing={5} align="stretch" maxW="1600px" mx="auto">

        {/* HEADER */}
        <Flex justify="space-between" align="center" flexWrap="wrap" gap={3}>
          <VStack align="start" spacing={0}>
            <TacticalText variant="caption" color="sos.blue.400" letterSpacing="0.2em">
              CENTRAL_DE_INTELIGÊNCIA_HUMANITÁRIA
            </TacticalText>
            <HStack>
              <Users size={20} color="white" />
              <TacticalText variant="heading" fontSize="2xl">Pessoas Desaparecidas</TacticalText>
              <Badge bg="sos.red.500" color="white" px={2} borderRadius="full">
                {rows.length} OPERATIVOS_PENDENTES
              </Badge>
            </HStack>
          </VStack>

          <HStack spacing={3}>
            <TacticalButton
              as="a"
              href={resolveApiUrl('/api/missing-people.csv')}
              target="_blank"
            >
              <FileDown size={14} style={{ marginRight: 8 }} />
              EXPORTAR_CSV
            </TacticalButton>
            <TacticalButton onClick={() => void load()} isLoading={loading}>
              <RefreshCw size={14} style={{ marginRight: 8 }} />
              ATUALIZAR_BASE
            </TacticalButton>
            <TacticalButton onClick={onOpen} glow>
              <UserPlus size={14} style={{ marginRight: 8 }} />
              NOVO_REGISTRO_TÁTICO
            </TacticalButton>
          </HStack>
        </Flex>

        {/* MAIN CONTENT — mapa grande + tabela menor */}
        <Grid
          templateColumns={{ base: '1fr', xl: '3fr 2fr' }}
          gap={5}
          h={{ base: 'auto', xl: 'calc(100vh - 180px)' }}
        >
          {/* MAP */}
          <GlassPanel p={0} overflow="hidden" minH={{ base: '400px', xl: 'auto' }}>
            <TacticalMap center={mapCenter} zoom={geoRows.length > 0 ? 11 : 13}>
              {geoRows.map((r) => (
                <Marker
                  key={r.id}
                  position={[r.lat!, r.lng!]}
                  icon={missingIcon}
                >
                  <Popup>
                    <Box bg="rgba(8,8,15,0.95)" p={3} borderRadius="md" minW="180px">
                      <Text fontWeight="bold" color="white" fontSize="sm">{r.personName}</Text>
                      {r.age && (
                        <Text color="rgba(255,255,255,0.5)" fontSize="xs">Idade: {r.age}</Text>
                      )}
                      <Text color="rgba(255,255,255,0.7)" fontSize="xs" mt={1}>
                        {r.lastSeenLocation}, {r.city}
                      </Text>
                      {r.contactPhone && (
                        <Text color="rgba(0,122,255,0.9)" fontSize="xs" mt={1} fontFamily="mono">
                          {r.contactPhone}
                        </Text>
                      )}
                    </Box>
                  </Popup>
                </Marker>
              ))}
            </TacticalMap>
          </GlassPanel>

          {/* DATABASE TABLE */}
          <GlassPanel p={0} flexDirection="column" overflow="hidden">
            <Box p={4} borderBottom="1px solid" borderColor="whiteAlpha.100">
              <Flex justify="space-between" align="center">
                <TacticalText variant="subheading">BASE_DE_DADOS_ATUALIZADA</TacticalText>
                <Badge bg="rgba(0,122,255,0.15)" color="sos.blue.400" px={2} py={1} borderRadius="md" fontSize="10px">
                  {rows.length} REG.
                </Badge>
              </Flex>
            </Box>

            <Box flex={1} overflowY="auto">
              {loading && rows.length === 0 ? (
                <Center h="full" flexDirection="column" py={12}>
                  <Spinner color="sos.blue.500" size="xl" mb={4} />
                  <TacticalText variant="mono">SINCRONIZANDO_DADOS...</TacticalText>
                </Center>
              ) : rows.length === 0 ? (
                <Center h="full" flexDirection="column" p={8} textAlign="center">
                  <Users size={48} color="rgba(255,255,255,0.1)" />
                  <TacticalText variant="heading" mt={4}>NENHUM_REGISTRO_ATIVO</TacticalText>
                  <TacticalText variant="caption" mt={2} opacity={0.5}>
                    Aguardando entrada de dados do campo de operações.
                  </TacticalText>
                </Center>
              ) : (
                <Table variant="unstyled" size="sm">
                  <Thead position="sticky" top={0} bg="rgba(10,10,20,0.95)" zIndex={10} backdropFilter="blur(5px)">
                    <Tr borderBottom="1px solid" borderColor="whiteAlpha.100">
                      <Th py={3}><TacticalText variant="caption">NOME</TacticalText></Th>
                      <Th py={3}><TacticalText variant="caption">LOCALIZAÇÃO</TacticalText></Th>
                      <Th py={3}><TacticalText variant="caption">CONTATO</TacticalText></Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {rows.map((row) => (
                      <Tr
                        key={row.id}
                        borderBottom="1px solid"
                        borderColor="whiteAlpha.50"
                        _hover={{ bg: 'whiteAlpha.50' }}
                        transition="all 0.15s"
                      >
                        <Td py={3}>
                          <VStack align="start" spacing={0}>
                            <Text fontWeight="bold" fontSize="xs" color="white">{row.personName}</Text>
                            <TacticalText variant="caption">
                              {row.age ? `${row.age} anos` : 'IDADE N/D'}
                            </TacticalText>
                          </VStack>
                        </Td>
                        <Td py={3}>
                          <HStack spacing={1} align="flex-start">
                            <Icon as={MapPin} color={row.lat ? 'sos.blue.400' : 'whiteAlpha.300'} boxSize={3} mt="2px" />
                            <Text fontSize="xs" color="whiteAlpha.700" noOfLines={2}>
                              {row.lastSeenLocation}, {row.city}
                            </Text>
                          </HStack>
                        </Td>
                        <Td py={3}>
                          <TacticalText variant="mono" fontSize="10px" color="sos.blue.400">
                            {row.contactPhone || '—'}
                          </TacticalText>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              )}
            </Box>
          </GlassPanel>
        </Grid>
      </VStack>

      {/* ─── MODAL DE REGISTRO ───────────────────────────────────────────────── */}
      <Modal isOpen={isOpen} onClose={onClose} size="4xl" scrollBehavior="inside">
        <ModalOverlay bg="rgba(0,0,0,0.7)" backdropFilter="blur(8px)" />
        <ModalContent
          bg="rgba(14,14,22,0.97)"
          border="1px solid rgba(255,255,255,0.09)"
          borderRadius="2xl"
          boxShadow="0 24px 64px rgba(0,0,0,0.6)"
          mx={4}
        >
          <ModalHeader borderBottom="1px solid rgba(255,255,255,0.07)" pb={4}>
            <HStack>
              <Box p={2} bg="rgba(0,122,255,0.12)" borderRadius="lg" border="1px solid rgba(0,122,255,0.2)">
                <UserPlus size={16} color="rgba(0,122,255,0.9)" />
              </Box>
              <VStack align="flex-start" spacing={0}>
                <TacticalText variant="heading" fontSize="sm">NOVO_REGISTRO_TÁTICO</TacticalText>
                <TacticalText variant="caption">Sistema Guardian · Base humanitária</TacticalText>
              </VStack>
            </HStack>
          </ModalHeader>
          <ModalCloseButton color="whiteAlpha.600" top={4} right={4} />

          <ModalBody py={5}>
            <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} gap={5}>
              {/* Campos do formulário */}
              <VStack spacing={4} align="stretch">
                <Box>
                  <TacticalText variant="caption" mb={1}>NOME_COMPLETO *</TacticalText>
                  <Input
                    value={form.personName}
                    placeholder="Ex: João da Silva"
                    bg="whiteAlpha.50"
                    border="1px solid"
                    borderColor="whiteAlpha.100"
                    _focus={{ borderColor: 'sos.blue.500', bg: 'whiteAlpha.100' }}
                    color="white"
                    _placeholder={{ color: 'whiteAlpha.300' }}
                    onChange={(e) => setForm((p) => ({ ...p, personName: e.target.value }))}
                  />
                </Box>

                <SimpleGrid columns={2} spacing={3}>
                  <Box>
                    <TacticalText variant="caption" mb={1}>IDADE_APROX</TacticalText>
                    <Input
                      value={form.age}
                      placeholder="Ex: 45"
                      type="number"
                      bg="whiteAlpha.50"
                      border="1px solid"
                      borderColor="whiteAlpha.100"
                      _focus={{ borderColor: 'sos.blue.500' }}
                      color="white"
                      _placeholder={{ color: 'whiteAlpha.300' }}
                      onChange={(e) => setForm((p) => ({ ...p, age: e.target.value }))}
                    />
                  </Box>
                  <Box>
                    <TacticalText variant="caption" mb={1}>CIDADE_DISTRITO</TacticalText>
                    <Input
                      value={form.city}
                      placeholder="Ex: Ubá"
                      bg="whiteAlpha.50"
                      border="1px solid"
                      borderColor="whiteAlpha.100"
                      _focus={{ borderColor: 'sos.blue.500' }}
                      color="white"
                      _placeholder={{ color: 'whiteAlpha.300' }}
                      onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                    />
                  </Box>
                </SimpleGrid>

                <Box>
                  <TacticalText variant="caption" mb={1}>ÚLTIMA_LOCALIZAÇÃO_CONHECIDA *</TacticalText>
                  <Input
                    value={form.lastSeenLocation}
                    placeholder="Ex: Rua Direita, 123"
                    bg="whiteAlpha.50"
                    border="1px solid"
                    borderColor="whiteAlpha.100"
                    _focus={{ borderColor: 'sos.blue.500' }}
                    color="white"
                    _placeholder={{ color: 'whiteAlpha.300' }}
                    onChange={(e) => setForm((p) => ({ ...p, lastSeenLocation: e.target.value }))}
                  />
                </Box>

                <Box>
                  <TacticalText variant="caption" mb={1}>CONTATO_DE_EMERGÊNCIA</TacticalText>
                  <Input
                    value={form.contactPhone}
                    placeholder="Ex: (32) 99999-9999"
                    bg="whiteAlpha.50"
                    border="1px solid"
                    borderColor="whiteAlpha.100"
                    _focus={{ borderColor: 'sos.blue.500' }}
                    color="white"
                    _placeholder={{ color: 'whiteAlpha.300' }}
                    onChange={(e) => setForm((p) => ({ ...p, contactPhone: e.target.value }))}
                  />
                </Box>

                <Box>
                  <TacticalText variant="caption" mb={1}>INFORMAÇÕES_ADICIONAIS (VESTIMENTA, SINAIS)</TacticalText>
                  <Textarea
                    value={form.additionalInfo}
                    placeholder="Descreva detalhes físicos, vestimentas, sinais particulares..."
                    bg="whiteAlpha.50"
                    border="1px solid"
                    borderColor="whiteAlpha.100"
                    _focus={{ borderColor: 'sos.blue.500' }}
                    color="white"
                    _placeholder={{ color: 'whiteAlpha.300' }}
                    rows={3}
                    onChange={(e) => setForm((p) => ({ ...p, additionalInfo: e.target.value }))}
                  />
                </Box>

                {/* Coordenadas */}
                <Box>
                  <HStack mb={1}>
                    <TacticalText variant="caption">COORDENADAS_GPS</TacticalText>
                    {form.lat && form.lng && (
                      <Badge bg="rgba(52,199,89,0.15)" color="green.300" fontSize="9px" px={2}>
                        DEFINIDO
                      </Badge>
                    )}
                  </HStack>
                  <SimpleGrid columns={2} spacing={2}>
                    <Input
                      value={form.lat}
                      placeholder="Latitude"
                      bg="whiteAlpha.50"
                      border="1px solid"
                      borderColor="whiteAlpha.100"
                      _focus={{ borderColor: 'sos.blue.500' }}
                      color="rgba(0,122,255,0.9)"
                      fontFamily="mono"
                      fontSize="sm"
                      _placeholder={{ color: 'whiteAlpha.300' }}
                      onChange={(e) => setForm((p) => ({ ...p, lat: e.target.value }))}
                    />
                    <Input
                      value={form.lng}
                      placeholder="Longitude"
                      bg="whiteAlpha.50"
                      border="1px solid"
                      borderColor="whiteAlpha.100"
                      _focus={{ borderColor: 'sos.blue.500' }}
                      color="rgba(0,122,255,0.9)"
                      fontFamily="mono"
                      fontSize="sm"
                      _placeholder={{ color: 'whiteAlpha.300' }}
                      onChange={(e) => setForm((p) => ({ ...p, lng: e.target.value }))}
                    />
                  </SimpleGrid>
                </Box>
              </VStack>

              {/* Mini-mapa para clicar e definir coordenadas */}
              <VStack spacing={2} align="stretch">
                <HStack>
                  <Navigation size={12} color="rgba(0,122,255,0.8)" />
                  <TacticalText variant="caption">CLIQUE_NO_MAPA_PARA_DEFINIR_LOCALIZAÇÃO</TacticalText>
                </HStack>
                <Box h="340px" borderRadius="xl" overflow="hidden" border="1px solid rgba(255,255,255,0.09)">
                  <TacticalMap
                    center={
                      form.lat && form.lng
                        ? [Number(form.lat), Number(form.lng)]
                        : [-20.91, -42.98]
                    }
                    zoom={13}
                    showLabel={false}
                  >
                    <MapClickHandler onMapClick={handleMapClick} />
                    {form.lat && form.lng && (
                      <Marker
                        position={[Number(form.lat), Number(form.lng)]}
                        icon={missingIcon}
                      />
                    )}
                  </TacticalMap>
                </Box>
                {form.lat && form.lng ? (
                  <TacticalText variant="mono" textAlign="center">
                    {Number(form.lat).toFixed(5)}, {Number(form.lng).toFixed(5)}
                  </TacticalText>
                ) : (
                  <TacticalText variant="caption" textAlign="center" color="whiteAlpha.400">
                    Nenhuma coordenada selecionada
                  </TacticalText>
                )}
              </VStack>
            </Grid>
          </ModalBody>

          <ModalFooter borderTop="1px solid rgba(255,255,255,0.07)" gap={3}>
            <TacticalButton onClick={onClose} style={{ background: 'transparent' }}>
              CANCELAR
            </TacticalButton>
            <TacticalButton onClick={() => void save()} isLoading={saving} glow>
              REGISTRAR_NO_SISTEMA_GUARDIAN
            </TacticalButton>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
