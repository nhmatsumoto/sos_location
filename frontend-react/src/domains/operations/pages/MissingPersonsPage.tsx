import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  FormControl,
  FormLabel,
  Grid,
  HStack,
  Icon,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  SimpleGrid,
  Table,
  Tbody,
  Td,
  Text,
  Textarea,
  Th,
  Thead,
  Tr,
  useDisclosure,
  VStack,
} from '@chakra-ui/react';
import { Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import {
  FileDown,
  MapPin,
  Navigation,
  RefreshCw,
  UserPlus,
  Users,
} from 'lucide-react';
import { missingPersonsApi, type MissingPersonApi } from '../../../services/missingPersonsApi';
import { resolveApiUrl } from '../../../lib/apiBaseUrl';
import { useNotifications } from '../../../context/useNotifications';
import { TacticalMap } from '../../../components/features/map/TacticalMap';
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

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (event) => onMapClick(event.latlng.lat, event.latlng.lng),
  });
  return null;
}

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
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const geoRows = useMemo(
    () => rows.filter((row) => row.lat != null && row.lng != null),
    [rows],
  );
  const withContactCount = rows.filter((row) => Boolean(row.contactPhone)).length;
  const distinctCities = new Set(rows.map((row) => row.city).filter(Boolean)).size;

  const mapCenter: [number, number] = geoRows.length > 0
    ? [
        geoRows.reduce((sum, row) => sum + (row.lat ?? 0), 0) / geoRows.length,
        geoRows.reduce((sum, row) => sum + (row.lng ?? 0), 0) / geoRows.length,
      ]
    : [-20.91, -42.98];

  const handleMapClick = (lat: number, lng: number) => {
    setForm((previous) => ({ ...previous, lat: lat.toFixed(6), lng: lng.toFixed(6) }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    onClose();
  };

  const save = async () => {
    if (!form.personName || !form.lastSeenLocation) {
      pushNotice({
        type: 'warning',
        title: 'Campos obrigatórios',
        message: 'Preencha ao menos o nome e a localização.',
      });
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
      pushNotice({
        type: 'success',
        title: 'Registro concluído',
        message: 'Adicionado à base de dados operacional.',
      });
      resetForm();
      await load();
    } catch {
      pushNotice({
        type: 'error',
        title: 'Falha ao salvar',
        message: 'Verifique a conexão com o servidor.',
      });
    } finally {
      setSaving(false);
    }
  };

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
          icon={Users}
          eyebrow="MISSING_PERSONS // HUMANITARIAN_INTEL // LOCATION_TRACKING"
          title="Painel de pessoas desaparecidas com mapa, base de dados e registro tático"
          description="A superfície foi reorganizada para leitura operacional rápida: volume, distribuição geográfica, contatos e formulário de cadastro em um único fluxo."
          meta={
            <>
              <ShellTelemetryBadge tone="critical">{rows.length} registros</ShellTelemetryBadge>
              <ShellTelemetryBadge tone="info">{geoRows.length} geolocalizados</ShellTelemetryBadge>
              <ShellTelemetryBadge tone="warning">{withContactCount} com contato</ShellTelemetryBadge>
            </>
          }
          actions={
            <>
              <Button
                as="a"
                href={resolveApiUrl('/api/missing-people.csv')}
                target="_blank"
                leftIcon={<FileDown size={16} />}
                variant="outline"
              >
                Exportar CSV
              </Button>
              <Button
                leftIcon={<RefreshCw size={16} />}
                variant="ghost"
                onClick={() => void load()}
                isLoading={loading}
              >
                Atualizar base
              </Button>
              <Button leftIcon={<UserPlus size={16} />} variant="tactical" onClick={onOpen}>
                Novo registro
              </Button>
            </>
          }
        />

        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
          <MetricCard
            label="Registros ativos"
            value={rows.length}
            helper="Pessoas atualmente monitoradas"
            icon={Users}
            tone="critical"
          />
          <MetricCard
            label="Com coordenada"
            value={geoRows.length}
            helper="Registros já posicionados no território"
            icon={MapPin}
            tone="info"
          />
          <MetricCard
            label="Cidades citadas"
            value={distinctCities}
            helper="Abrangência geográfica dos registros"
            icon={Navigation}
            tone="default"
          />
        </SimpleGrid>

        <Grid templateColumns={{ base: '1fr', xl: '1.5fr 1fr' }} gap={6}>
          <PagePanel
            title="Mapa operacional de localizações"
            description="Os marcadores mostram registros com coordenadas confirmadas; o mapa do cadastro permite definir nova posição por clique."
            icon={MapPin}
            tone="info"
            p={0}
          >
            <Box h={{ base: '420px', xl: '760px' }}>
              <TacticalMap center={mapCenter} zoom={geoRows.length > 0 ? 11 : 13} showLabel={false}>
                {geoRows.map((row) => (
                  <Marker key={row.id} position={[row.lat!, row.lng!]} icon={missingIcon}>
                    <Popup>
                      <VStack align="stretch" spacing={1.5} p={1}>
                        <Text fontSize="sm" fontWeight="700" color="gray.900">
                          {row.personName}
                        </Text>
                        {row.age ? (
                          <Text fontSize="xs" color="gray.600">
                            {row.age} anos
                          </Text>
                        ) : null}
                        <Text fontSize="xs" color="gray.600">
                          {row.lastSeenLocation}, {row.city}
                        </Text>
                        {row.contactPhone ? (
                          <Text fontSize="xs" color="gray.500">
                            {row.contactPhone}
                          </Text>
                        ) : null}
                      </VStack>
                    </Popup>
                  </Marker>
                ))}
              </TacticalMap>
            </Box>
          </PagePanel>

          <PagePanel
            title="Base de dados atualizada"
            description="Lista consolidada de registros com localização, contato e idade aproximada."
            icon={Users}
            tone="default"
            actions={<ShellTelemetryBadge tone="default">{rows.length} registros</ShellTelemetryBadge>}
          >
            {loading && rows.length === 0 ? (
              <PageLoadingState
                minH="420px"
                label="Sincronizando dados humanitários"
                description="A base está sendo recomposta com os registros mais recentes."
              />
            ) : rows.length === 0 ? (
              <PageEmptyState
                minH="420px"
                title="Nenhum registro ativo"
                description="Aguardando entrada de dados do campo de operações."
              />
            ) : (
              <Box overflowX="auto">
                <Table variant="simple" size="sm">
                  <Thead>
                    <Tr>
                      <Th>Nome</Th>
                      <Th>Localização</Th>
                      <Th>Contato</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {rows.map((row) => (
                      <Tr key={row.id}>
                        <Td>
                          <VStack align="flex-start" spacing={0.5}>
                            <Text fontSize="sm" fontWeight="700" color="white">
                              {row.personName}
                            </Text>
                            <Text fontSize="xs" color="text.secondary">
                              {row.age ? `${row.age} anos` : 'Idade n/d'}
                            </Text>
                          </VStack>
                        </Td>
                        <Td>
                          <VStack align="flex-start" spacing={1}>
                            <Text fontSize="sm" color="white">
                              {row.lastSeenLocation}
                            </Text>
                            <HStack spacing={2}>
                              <Badge variant="subtle" colorScheme={row.lat ? 'blue' : 'gray'}>
                                {row.city}
                              </Badge>
                              {row.lat && row.lng ? (
                                <ShellTelemetryBadge tone="info">Coordenado</ShellTelemetryBadge>
                              ) : null}
                            </HStack>
                          </VStack>
                        </Td>
                        <Td>
                          <Text fontSize="sm" color={row.contactPhone ? 'sos.blue.300' : 'text.secondary'}>
                            {row.contactPhone || '—'}
                          </Text>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            )}
          </PagePanel>
        </Grid>
      </VStack>

      <Modal isOpen={isOpen} onClose={resetForm} size="5xl" scrollBehavior="inside">
        <ModalOverlay bg="rgba(0,0,0,0.75)" />
        <ModalContent bg="surface.base" border="1px solid" borderColor="border.default">
          <ModalHeader borderBottom="1px solid" borderColor="border.subtle">
            <HStack spacing={3}>
              <Box
                p={2}
                borderRadius="xl"
                bg="rgba(0,122,255,0.12)"
                border="1px solid"
                borderColor="rgba(0,122,255,0.20)"
              >
                <UserPlus size={16} color="#0A84FF" />
              </Box>
              <VStack align="flex-start" spacing={0}>
                <Text fontSize="sm" fontWeight="700" color="white">
                  Novo registro tático
                </Text>
                <Text fontSize="xs" color="text.secondary">
                  Base humanitária e inteligência de localização
                </Text>
              </VStack>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />

          <ModalBody py={5}>
            <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} gap={5}>
              <VStack spacing={4} align="stretch">
                <FormControl>
                  <FormLabel>Nome completo</FormLabel>
                  <Input
                    value={form.personName}
                    placeholder="Ex.: João da Silva"
                    onChange={(event) => setForm((previous) => ({ ...previous, personName: event.target.value }))}
                  />
                </FormControl>

                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                  <FormControl>
                    <FormLabel>Idade aproximada</FormLabel>
                    <Input
                      type="number"
                      value={form.age}
                      placeholder="Ex.: 45"
                      onChange={(event) => setForm((previous) => ({ ...previous, age: event.target.value }))}
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Cidade ou distrito</FormLabel>
                    <Input
                      value={form.city}
                      onChange={(event) => setForm((previous) => ({ ...previous, city: event.target.value }))}
                    />
                  </FormControl>
                </SimpleGrid>

                <FormControl>
                  <FormLabel>Última localização conhecida</FormLabel>
                  <Input
                    value={form.lastSeenLocation}
                    placeholder="Ex.: Rua Direita, 123"
                    onChange={(event) =>
                      setForm((previous) => ({ ...previous, lastSeenLocation: event.target.value }))
                    }
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Contato de emergência</FormLabel>
                  <Input
                    value={form.contactPhone}
                    placeholder="Ex.: (32) 99999-9999"
                    onChange={(event) =>
                      setForm((previous) => ({ ...previous, contactPhone: event.target.value }))
                    }
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Informações adicionais</FormLabel>
                  <Textarea
                    rows={4}
                    resize="vertical"
                    value={form.additionalInfo}
                    placeholder="Vestimenta, sinais particulares e condições observadas."
                    onChange={(event) =>
                      setForm((previous) => ({ ...previous, additionalInfo: event.target.value }))
                    }
                  />
                </FormControl>

                <Box
                  p={4}
                  borderRadius="2xl"
                  bg="surface.interactive"
                  border="1px solid"
                  borderColor="border.subtle"
                >
                  <HStack mb={2} spacing={2}>
                    <Icon as={Navigation} boxSize={4} color="sos.blue.300" />
                    <ShellSectionEyebrow>Coordenadas GPS</ShellSectionEyebrow>
                    {form.lat && form.lng ? (
                      <ShellTelemetryBadge tone="success">Definido</ShellTelemetryBadge>
                    ) : null}
                  </HStack>
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                    <Input
                      value={form.lat}
                      placeholder="Latitude"
                      fontFamily="mono"
                      onChange={(event) => setForm((previous) => ({ ...previous, lat: event.target.value }))}
                    />
                    <Input
                      value={form.lng}
                      placeholder="Longitude"
                      fontFamily="mono"
                      onChange={(event) => setForm((previous) => ({ ...previous, lng: event.target.value }))}
                    />
                  </SimpleGrid>
                </Box>
              </VStack>

              <VStack spacing={3} align="stretch">
                <HStack spacing={2}>
                  <Navigation size={14} color="#0A84FF" />
                  <ShellSectionEyebrow>Clique no mapa para definir localização</ShellSectionEyebrow>
                </HStack>
                <Box h="360px" borderRadius="2xl" overflow="hidden" border="1px solid" borderColor="border.subtle">
                  <TacticalMap
                    center={form.lat && form.lng ? [Number(form.lat), Number(form.lng)] : [-20.91, -42.98]}
                    zoom={13}
                    showLabel={false}
                  >
                    <MapClickHandler onMapClick={handleMapClick} />
                    {form.lat && form.lng ? (
                      <Marker position={[Number(form.lat), Number(form.lng)]} icon={missingIcon} />
                    ) : null}
                  </TacticalMap>
                </Box>
                <Text fontSize="sm" textAlign="center" color={form.lat && form.lng ? 'sos.blue.300' : 'text.secondary'}>
                  {form.lat && form.lng
                    ? `${Number(form.lat).toFixed(5)}, ${Number(form.lng).toFixed(5)}`
                    : 'Nenhuma coordenada selecionada'}
                </Text>
              </VStack>
            </Grid>
          </ModalBody>

          <ModalFooter borderTop="1px solid" borderColor="border.subtle" gap={3}>
            <Button variant="outline" onClick={resetForm}>
              Cancelar
            </Button>
            <Button variant="tactical" onClick={() => void save()} isLoading={saving}>
              Registrar no sistema
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
