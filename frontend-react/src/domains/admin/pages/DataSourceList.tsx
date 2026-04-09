import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  FormControl,
  FormLabel,
  HStack,
  IconButton,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  SimpleGrid,
  Switch,
  Text,
  Textarea,
  Tooltip,
  VStack,
  useToast,
} from '@chakra-ui/react';
import {
  CloudRain,
  Cog,
  Globe,
  Newspaper,
  Plus,
  Power,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import {
  MetricCard,
  PageEmptyState,
  PageErrorState,
  PageHeader,
  PageLoadingState,
  PagePanel,
} from '../../../components/layout/PagePrimitives';
import { ShellSectionEyebrow, ShellTelemetryBadge } from '../../../components/layout/ShellPrimitives';
import { apiClient } from '../../../services/apiClient';

interface DataSource {
  id: string;
  name: string;
  type: 'News' | 'Weather' | 'People' | 'Risk';
  providerType: 'JsonApi' | 'RSS' | 'Scraper' | 'Inmet' | 'Cemaden';
  baseUrl: string;
  frequencyMinutes: number;
  isActive: boolean;
  metadataJson?: string;
  lastCrawlAt?: string;
  lastErrorMessage?: string;
}

const DATA_SOURCE_TYPES: DataSource['type'][] = ['News', 'Weather', 'People', 'Risk'];
const PROVIDER_TYPES: DataSource['providerType'][] = ['JsonApi', 'RSS', 'Scraper', 'Inmet', 'Cemaden'];

const isDataSourceType = (value: string): value is DataSource['type'] =>
  DATA_SOURCE_TYPES.includes(value as DataSource['type']);

const isProviderType = (value: string): value is DataSource['providerType'] =>
  PROVIDER_TYPES.includes(value as DataSource['providerType']);

const createDraftSource = (): Partial<DataSource> => ({
  name: '',
  type: 'News',
  providerType: 'JsonApi',
  baseUrl: '',
  frequencyMinutes: 30,
  isActive: true,
  metadataJson: '',
});

export function DataSourceList() {
  const toast = useToast();
  const [sources, setSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [newSource, setNewSource] = useState<Partial<DataSource>>(createDraftSource());

  const metrics = useMemo(() => ({
    total: sources.length,
    active: sources.filter((source) => source.isActive).length,
    failing: sources.filter((source) => Boolean(source.lastErrorMessage)).length,
  }), [sources]);

  const fetchSources = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const response = await apiClient.get<DataSource[]>('/v1/data-sources');
      setSources(response.data);
    } catch (err) {
      console.error('Failed to fetch data sources', err);
      setErrorMessage('Não foi possível sincronizar as fontes configuradas.');
      toast({
        title: 'Falha ao carregar fontes',
        description: 'O painel não conseguiu sincronizar a lista atual de crawlers.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
      setSyncingId(null);
    }
  }, [toast]);

  useEffect(() => {
    void fetchSources();
  }, [fetchSources]);

  const handleCreate = async () => {
    if (!newSource.name?.trim() || !newSource.baseUrl?.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Informe nome e URL base antes de salvar a nova fonte.',
        status: 'warning',
        duration: 2500,
        isClosable: true,
      });
      return;
    }

    try {
      setCreating(true);
      await apiClient.post('/v1/data-sources', newSource);
      setIsModalOpen(false);
      setNewSource(createDraftSource());
      toast({
        title: 'Fonte cadastrada',
        description: 'A nova integração foi adicionada ao hub.',
        status: 'success',
        duration: 2500,
        isClosable: true,
      });
      await fetchSources();
    } catch (err) {
      console.error('Failed to create data source', err);
      toast({
        title: 'Falha ao cadastrar',
        description: 'A fonte não pôde ser persistida com os dados atuais.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (source: DataSource) => {
    try {
      setSyncingId(source.id);
      await apiClient.put(`/v1/data-sources/${source.id}`, { ...source, isActive: !source.isActive });
      await fetchSources();
    } catch (err) {
      console.error('Failed to toggle source', err);
      toast({
        title: 'Falha ao atualizar estado',
        description: `A fonte ${source.name} não pôde ser atualizada.`,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      setSyncingId(null);
    }
  };

  return (
    <Box px={{ base: 4, md: 6, xl: 8 }} py={{ base: 4, md: 6 }}>
      <VStack align="stretch" spacing={6} maxW="7xl" mx="auto">
        <PageHeader
          icon={Cog}
          eyebrow="INGESTION_CONFIG // CRAWLER_ORCHESTRATION // SOURCE_GOVERNANCE"
          title="Fontes de Dados e Crawlers"
          description="Gerencie integrações externas usadas para coleta de informação, chuva, notícias e sinais de risco."
          meta={
            <>
              <ShellTelemetryBadge tone={metrics.failing > 0 ? 'warning' : 'success'}>
                {metrics.failing} com falha
              </ShellTelemetryBadge>
              <ShellTelemetryBadge tone="info">
                {metrics.active} ativas
              </ShellTelemetryBadge>
            </>
          }
          actions={
            <>
              <Button leftIcon={<RefreshCw size={16} />} variant="ghost" onClick={() => void fetchSources()} isLoading={loading}>
                Recarregar
              </Button>
              <Button leftIcon={<Plus size={16} />} variant="tactical" onClick={() => setIsModalOpen(true)}>
                Nova Fonte
              </Button>
            </>
          }
        />

        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
          <MetricCard
            label="Integrações catalogadas"
            value={metrics.total}
            helper="Fontes registradas nesta estação"
            icon={Globe}
            tone="info"
          />
          <MetricCard
            label="Pipelines ativos"
            value={metrics.active}
            helper="Coletores habilitados para execução"
            icon={Power}
            tone={metrics.active > 0 ? 'success' : 'warning'}
          />
          <MetricCard
            label="Incidentes na coleta"
            value={metrics.failing}
            helper="Fontes com erro recente registrado"
            icon={ShieldAlert}
            tone={metrics.failing > 0 ? 'warning' : 'success'}
          />
        </SimpleGrid>

        <PagePanel
          title="Catálogo de integrações"
          description="Cada fonte descreve um provedor externo, frequência de leitura e o estado operacional mais recente."
          icon={Globe}
          tone="info"
          actions={<ShellTelemetryBadge tone="info">{sources.length} itens</ShellTelemetryBadge>}
        >
          {loading ? (
            <PageLoadingState
              label="Sincronizando com o hub de dados"
              description="A estação está recompondo o catálogo de provedores e crawlers."
            />
          ) : errorMessage ? (
            <PageErrorState
              description={errorMessage}
              action={
                <Button variant="tactical" onClick={() => void fetchSources()}>
                  Tentar novamente
                </Button>
              }
            />
          ) : sources.length === 0 ? (
            <PageEmptyState
              title="Nenhuma fonte cadastrada"
              description="Cadastre uma integração para iniciar ingestão de dados externos."
              icon={Globe}
              action={
                <Button variant="tactical" leftIcon={<Plus size={16} />} onClick={() => setIsModalOpen(true)}>
                  Configurar primeira fonte
                </Button>
              }
            />
          ) : (
            <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={4}>
              {sources.map((source) => (
                <PagePanel
                  key={source.id}
                  title={source.name}
                  description={`${source.providerType} // ${source.type}`}
                  icon={resolveTypeIcon(source.type)}
                  tone={source.lastErrorMessage ? 'warning' : source.isActive ? 'success' : 'default'}
                  actions={
                    <Tooltip label={source.isActive ? 'Desativar pipeline' : 'Ativar pipeline'}>
                      <IconButton
                        icon={<Power size={16} />}
                        aria-label={`Alternar ${source.name}`}
                        onClick={() => void handleToggle(source)}
                        isLoading={syncingId === source.id}
                        variant="ghost"
                        colorScheme={source.isActive ? 'green' : 'gray'}
                      />
                    </Tooltip>
                  }
                >
                  <VStack align="stretch" spacing={4}>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                      <DataPoint
                        label="Endpoint"
                        value={source.baseUrl}
                      />
                      <DataPoint
                        label="Frequência"
                        value={`a cada ${source.frequencyMinutes} min`}
                      />
                    </SimpleGrid>

                    <HStack justify="space-between" flexWrap="wrap" spacing={2}>
                      <HStack spacing={2}>
                        <ShellTelemetryBadge tone={source.isActive ? 'success' : 'default'}>
                          {source.isActive ? 'Ativa' : 'Inativa'}
                        </ShellTelemetryBadge>
                        <Badge variant="subtle" bg="rgba(255,255,255,0.06)" color="text.secondary">
                          {source.providerType}
                        </Badge>
                      </HStack>
                      {source.lastCrawlAt ? (
                        <Text fontSize="11px" color="text.secondary">
                          Última indexação: {new Date(source.lastCrawlAt).toLocaleString()}
                        </Text>
                      ) : null}
                    </HStack>

                    {source.metadataJson ? (
                      <Box p={3} bg="surface.interactive" borderRadius="xl" border="1px solid" borderColor="border.subtle">
                        <ShellSectionEyebrow mb={2}>Metadados</ShellSectionEyebrow>
                        <Text fontSize="11px" color="text.secondary" fontFamily="mono" noOfLines={4}>
                          {source.metadataJson}
                        </Text>
                      </Box>
                    ) : null}

                    {source.lastErrorMessage ? (
                      <Box p={3} bg="rgba(255,149,0,0.12)" borderRadius="xl" border="1px solid" borderColor="rgba(255,149,0,0.20)">
                        <ShellSectionEyebrow mb={1}>Última falha</ShellSectionEyebrow>
                        <Text fontSize="xs" color="sos.amber.100">
                          {source.lastErrorMessage}
                        </Text>
                      </Box>
                    ) : null}
                  </VStack>
                </PagePanel>
              ))}
            </SimpleGrid>
          )}
        </PagePanel>
      </VStack>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Configurar nova fonte</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="stretch" spacing={4}>
              <FormControl isRequired>
                <FormLabel>Nome</FormLabel>
                <Input
                  value={newSource.name}
                  onChange={(event) => setNewSource({ ...newSource, name: event.target.value })}
                  placeholder="Ex: INMET Avisos Ativos"
                />
              </FormControl>

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <FormControl>
                  <FormLabel>Tipo</FormLabel>
                  <Select
                    value={newSource.type}
                    onChange={(event) => {
                      const nextType = event.target.value;
                      if (isDataSourceType(nextType)) {
                        setNewSource({ ...newSource, type: nextType });
                      }
                    }}
                  >
                    {DATA_SOURCE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel>Provedor</FormLabel>
                  <Select
                    value={newSource.providerType}
                    onChange={(event) => {
                      const nextProviderType = event.target.value;
                      if (isProviderType(nextProviderType)) {
                        setNewSource({ ...newSource, providerType: nextProviderType });
                      }
                    }}
                  >
                    {PROVIDER_TYPES.map((providerType) => (
                      <option key={providerType} value={providerType}>
                        {providerType}
                      </option>
                    ))}
                  </Select>
                </FormControl>
              </SimpleGrid>

              <FormControl isRequired>
                <FormLabel>Base URL</FormLabel>
                <Input
                  value={newSource.baseUrl}
                  onChange={(event) => setNewSource({ ...newSource, baseUrl: event.target.value })}
                  placeholder="https://api.exemplo.com/v1/data"
                />
              </FormControl>

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <FormControl>
                  <FormLabel>Frequência (min)</FormLabel>
                  <Input
                    type="number"
                    min={1}
                    value={newSource.frequencyMinutes ?? 30}
                    onChange={(event) => setNewSource({
                      ...newSource,
                      frequencyMinutes: Number(event.target.value) || 30,
                    })}
                  />
                </FormControl>

                <FormControl display="flex" alignItems="center" justifyContent="space-between" pt={{ base: 0, md: 8 }}>
                  <VStack align="flex-start" spacing={0.5}>
                    <FormLabel htmlFor="data-source-active" mb="0">
                      Fonte ativa
                    </FormLabel>
                    <Text fontSize="xs" color="text.secondary">
                      Habilita execução imediata após o cadastro.
                    </Text>
                  </VStack>
                  <Switch
                    id="data-source-active"
                    isChecked={Boolean(newSource.isActive)}
                    onChange={(event) => setNewSource({ ...newSource, isActive: event.target.checked })}
                  />
                </FormControl>
              </SimpleGrid>

              <FormControl>
                <FormLabel>Metadados operacionais</FormLabel>
                <Textarea
                  minH="120px"
                  value={newSource.metadataJson ?? ''}
                  onChange={(event) => setNewSource({ ...newSource, metadataJson: event.target.value })}
                  placeholder='{"region":"br-sp","priority":"high"}'
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <HStack spacing={3}>
              <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button variant="tactical" onClick={() => void handleCreate()} isLoading={creating}>
                Salvar fonte
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

function DataPoint({ label, value }: { label: string; value: string }) {
  return (
    <Box p={3} bg="surface.interactive" borderRadius="xl" border="1px solid" borderColor="border.subtle">
      <ShellSectionEyebrow mb={1}>{label}</ShellSectionEyebrow>
      <Text fontSize="xs" color="white" wordBreak="break-all">
        {value}
      </Text>
    </Box>
  );
}

function resolveTypeIcon(type: DataSource['type']) {
  switch (type) {
    case 'News':
      return Newspaper;
    case 'Weather':
      return CloudRain;
    case 'Risk':
      return ShieldAlert;
    default:
      return Globe;
  }
}
