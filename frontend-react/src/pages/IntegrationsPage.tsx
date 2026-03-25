import { useState, useEffect, useCallback } from 'react';
import {
  Box, Flex, VStack, HStack, Grid, GridItem,
  Spinner, Input, Badge, Switch, Text,
} from '@chakra-ui/react';
import {
  Cloud, AlertTriangle, FileText, Satellite, Database,
  Thermometer, Droplets, Wind, Zap, MapPin, Search,
} from 'lucide-react';
import { GlassPanel } from '../components/atoms/GlassPanel';
import { TacticalText } from '../components/atoms/TacticalText';
import { TacticalButton } from '../components/atoms/TacticalButton';
import {
  integrationsApi,
  type AlertDto,
  type IbgeMunicipioDto,
  type LandsatCollectionDto,
  type SatelliteLayerDto,
  type TransferRecordDto,
  type WeatherForecastDto,
  type WeatherCurrent,
  type WeatherDay,
} from '../services/integrationsApi';
import { useNotifications } from '../context/NotificationsContext';

type Tab = 'weather' | 'alerts' | 'transparency' | 'satellite' | 'catalogs';

// ─── WMO weather code to label ────────────────────────────────────────────────
function weatherLabel(code: number): string {
  if (code === 0) return 'Céu limpo';
  if (code <= 3) return 'Parcialmente nublado';
  if (code <= 9) return 'Névoa';
  if (code <= 19) return 'Precipitação leve';
  if (code <= 29) return 'Tempestade';
  if (code <= 39) return 'Neblina';
  if (code <= 49) return 'Névoa densa';
  if (code <= 59) return 'Garoa';
  if (code <= 69) return 'Chuva';
  if (code <= 79) return 'Neve';
  if (code <= 84) return 'Aguaceiro';
  if (code <= 94) return 'Temporal';
  return 'Condição severa';
}

// ─── Severity helpers ─────────────────────────────────────────────────────────
function severityColor(sev: string): string {
  switch (sev.toLowerCase()) {
    case 'critical': return 'rgba(255,59,48,0.85)';
    case 'high':     return 'rgba(255,149,0,0.85)';
    case 'medium':   return 'rgba(255,214,10,0.85)';
    default:         return 'rgba(52,199,89,0.85)';
  }
}

function severityBg(sev: string): string {
  switch (sev.toLowerCase()) {
    case 'critical': return 'rgba(255,59,48,0.12)';
    case 'high':     return 'rgba(255,149,0,0.12)';
    case 'medium':   return 'rgba(255,214,10,0.12)';
    default:         return 'rgba(52,199,89,0.12)';
  }
}

// ─── Tab config ───────────────────────────────────────────────────────────────
const TABS: { id: Tab; label: string; icon: React.FC<any> }[] = [
  { id: 'weather',      label: 'Clima',          icon: Cloud },
  { id: 'alerts',       label: 'Alertas',        icon: AlertTriangle },
  { id: 'transparency', label: 'Transparência',  icon: FileText },
  { id: 'satellite',    label: 'Satélite',       icon: Satellite },
  { id: 'catalogs',     label: 'Catálogos',      icon: Database },
];

// ══════════════════════════════════════════════════════════════════════════════
// Tab: WEATHER
// ══════════════════════════════════════════════════════════════════════════════
function WeatherTab() {
  const [lat, setLat] = useState('-23.5505');
  const [lon, setLon] = useState('-46.6333');
  const [data, setData] = useState<WeatherForecastDto | null>(null);
  const [loading, setLoading] = useState(false);
  const { pushNotice } = useNotifications();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await integrationsApi.getWeatherForecast(Number(lat), Number(lon), 5);
      setData(res);
    } catch {
      pushNotice({ type: 'error', title: 'Clima', message: 'Falha ao carregar previsão.' });
    } finally {
      setLoading(false);
    }
  }, [lat, lon, pushNotice]);

  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const cur: WeatherCurrent | undefined = data?.current;
  const daily: WeatherDay[] = data?.daily ?? [];

  return (
    <VStack spacing={4} align="stretch">
      {/* Controls */}
      <GlassPanel depth="base" p={4} direction="column" gap={3}>
        <TacticalText variant="subheading">Localização</TacticalText>
        <Flex gap={3} flexWrap="wrap">
          <Input
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            placeholder="Latitude"
            size="sm"
            w="140px"
            bg="rgba(255,255,255,0.05)"
            border="1px solid rgba(255,255,255,0.12)"
            color="white"
            _placeholder={{ color: 'whiteAlpha.400' }}
            borderRadius="lg"
          />
          <Input
            value={lon}
            onChange={(e) => setLon(e.target.value)}
            placeholder="Longitude"
            size="sm"
            w="140px"
            bg="rgba(255,255,255,0.05)"
            border="1px solid rgba(255,255,255,0.12)"
            color="white"
            _placeholder={{ color: 'whiteAlpha.400' }}
            borderRadius="lg"
          />
          <TacticalButton size="sm" onClick={() => void load()} isLoading={loading}>
            Consultar
          </TacticalButton>
        </Flex>
        {data && (
          <TacticalText variant="caption">
            Fonte: {data.source} · Fuso: {data.timezone ?? 'UTC'} · ({data.lat}, {data.lon})
          </TacticalText>
        )}
      </GlassPanel>

      {loading && (
        <Flex justify="center" py={8}><Spinner color="blue.400" /></Flex>
      )}

      {/* Current conditions */}
      {!loading && cur && (
        <GlassPanel depth="raised" tint="blue" p={4} direction="column" gap={4}>
          <TacticalText variant="subheading">Condições Atuais</TacticalText>
          <Grid templateColumns="repeat(auto-fill, minmax(160px, 1fr))" gap={3}>
            {[
              { icon: Thermometer, label: 'Temperatura',  value: `${cur.temperature.toFixed(1)} °C`,  color: 'rgba(255,149,0,0.8)' },
              { icon: Droplets,    label: 'Umidade',       value: `${cur.humidity} %`,                color: 'rgba(0,122,255,0.8)' },
              { icon: Wind,        label: 'Vento',         value: `${cur.windSpeed.toFixed(1)} km/h`, color: 'rgba(52,199,89,0.8)' },
              { icon: Zap,         label: 'Precipitação', value: `${cur.precipitation.toFixed(1)} mm`, color: 'rgba(100,210,255,0.8)' },
            ].map(({ icon: Icon, label, value, color }) => (
              <GlassPanel key={label} depth="base" p={3} direction="column" gap={1} borderRadius="xl">
                <Icon size={16} color={color} />
                <TacticalText variant="caption">{label}</TacticalText>
                <Text color="white" fontSize="md" fontWeight="bold">{value}</Text>
              </GlassPanel>
            ))}
          </Grid>
          <TacticalText variant="mono">{weatherLabel(cur.weatherCode)}</TacticalText>
        </GlassPanel>
      )}

      {/* Daily forecast */}
      {!loading && daily.length > 0 && (
        <GlassPanel depth="raised" p={4} direction="column" gap={3}>
          <TacticalText variant="subheading">Previsão Diária</TacticalText>
          <Grid templateColumns="repeat(auto-fill, minmax(140px, 1fr))" gap={3}>
            {daily.map((d) => (
              <GlassPanel key={d.date} depth="base" p={3} direction="column" gap={1} borderRadius="xl">
                <TacticalText variant="mono">{d.date}</TacticalText>
                <Flex gap={1} align="center">
                  <Text color="rgba(255,149,0,0.9)" fontSize="sm" fontWeight="bold">{d.maxTemp.toFixed(1)}°</Text>
                  <Text color="whiteAlpha.500" fontSize="xs">/</Text>
                  <Text color="rgba(100,210,255,0.9)" fontSize="sm">{d.minTemp.toFixed(1)}°</Text>
                </Flex>
                <TacticalText variant="caption">Precip: {d.precipitationSum.toFixed(1)} mm</TacticalText>
                <TacticalText variant="caption">{weatherLabel(d.weatherCode)}</TacticalText>
              </GlassPanel>
            ))}
          </Grid>
        </GlassPanel>
      )}

      {!loading && data?.error && (
        <GlassPanel depth="base" tint="red" p={4} direction="column" gap={1}>
          <TacticalText variant="subheading" color="red.300">Serviço indisponível</TacticalText>
          <TacticalText variant="caption">{data.error}</TacticalText>
        </GlassPanel>
      )}
    </VStack>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab: ALERTS
// ══════════════════════════════════════════════════════════════════════════════
function AlertsTab() {
  const [items, setItems] = useState<AlertDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');
  const { pushNotice } = useNotifications();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await integrationsApi.getAlerts();
      setItems(data.items ?? []);
    } catch {
      pushNotice({ type: 'error', title: 'Alertas', message: 'Falha ao carregar alertas.' });
    } finally {
      setLoading(false);
    }
  }, [pushNotice]);

  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = items.filter((a) =>
    filter === '' ||
    a.event.toLowerCase().includes(filter.toLowerCase()) ||
    (a.area ?? []).join(' ').toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <VStack spacing={4} align="stretch">
      <GlassPanel depth="base" p={4} direction="row" align="center" gap={3}>
        <Box flex={1} position="relative">
          <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" pointerEvents="none">
            <Search size={14} color="rgba(255,255,255,0.4)" />
          </Box>
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filtrar alertas..."
            size="sm"
            pl={8}
            bg="rgba(255,255,255,0.05)"
            border="1px solid rgba(255,255,255,0.12)"
            color="white"
            _placeholder={{ color: 'whiteAlpha.400' }}
            borderRadius="lg"
          />
        </Box>
        <TacticalButton size="sm" onClick={() => void load()} isLoading={loading}>
          Atualizar
        </TacticalButton>
        <TacticalText variant="caption">{items.length} alertas ativos</TacticalText>
      </GlassPanel>

      {loading && <Flex justify="center" py={8}><Spinner color="orange.400" /></Flex>}

      {!loading && filtered.length === 0 && (
        <GlassPanel depth="base" p={6} justify="center" align="center" direction="column" gap={2}>
          <AlertTriangle size={32} color="rgba(255,255,255,0.2)" />
          <TacticalText variant="caption">Nenhum alerta de risco alto/crítico encontrado</TacticalText>
        </GlassPanel>
      )}

      {!loading && filtered.map((alert) => (
        <GlassPanel key={alert.id} depth="raised" p={4} direction="column" gap={2}
          borderLeft="3px solid"
          borderLeftColor={severityColor(alert.severity)}
          bg={severityBg(alert.severity)}
        >
          <Flex justify="space-between" align="flex-start">
            <VStack align="flex-start" spacing={0} flex={1}>
              <TacticalText variant="heading" fontSize="xs">{alert.event}</TacticalText>
              <TacticalText variant="caption">{(alert.area ?? []).join(' · ')}</TacticalText>
            </VStack>
            <Badge
              px={2} py={1} borderRadius="md" fontSize="10px" fontWeight="bold"
              textTransform="uppercase" letterSpacing="0.1em"
              bg={severityColor(alert.severity)} color="white"
            >
              {alert.severity}
            </Badge>
          </Flex>
          <Flex gap={4} flexWrap="wrap">
            <TacticalText variant="caption">Fonte: {alert.source}</TacticalText>
            {alert.score !== undefined && (
              <TacticalText variant="caption">Score: {alert.score}/100</TacticalText>
            )}
            {alert.alertCount !== undefined && (
              <TacticalText variant="caption">Alertas: {alert.alertCount}</TacticalText>
            )}
            {alert.effective && (
              <TacticalText variant="caption">Atualizado: {new Date(alert.effective).toLocaleDateString('pt-BR')}</TacticalText>
            )}
          </Flex>
        </GlassPanel>
      ))}
    </VStack>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab: TRANSPARENCY
// ══════════════════════════════════════════════════════════════════════════════
function TransparencyTab() {
  const [start, setStart] = useState('2025-01-01');
  const [end, setEnd] = useState('2025-01-31');
  const [transfers, setTransfers] = useState<TransferRecordDto[]>([]);
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const { pushNotice } = useNotifications();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rows, totals] = await Promise.all([
        integrationsApi.getTransparencyTransfers(start, end),
        integrationsApi.getTransparencySummary(start, end),
      ]);
      setTransfers(rows.items ?? []);
      setSummary(totals.summary ?? null);
    } catch {
      pushNotice({ type: 'error', title: 'Transparência', message: 'Falha ao carregar transferências.' });
    } finally {
      setLoading(false);
    }
  }, [start, end, pushNotice]);

  const fmt = (v: unknown) =>
    typeof v === 'number'
      ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      : String(v ?? '—');

  return (
    <VStack spacing={4} align="stretch">
      <GlassPanel depth="base" p={4} direction="column" gap={3}>
        <TacticalText variant="subheading">Período</TacticalText>
        <Flex gap={3} flexWrap="wrap">
          <Input
            value={start}
            onChange={(e) => setStart(e.target.value)}
            placeholder="AAAA-MM-DD"
            size="sm"
            w="160px"
            bg="rgba(255,255,255,0.05)"
            border="1px solid rgba(255,255,255,0.12)"
            color="white"
            _placeholder={{ color: 'whiteAlpha.400' }}
            borderRadius="lg"
          />
          <Input
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            placeholder="AAAA-MM-DD"
            size="sm"
            w="160px"
            bg="rgba(255,255,255,0.05)"
            border="1px solid rgba(255,255,255,0.12)"
            color="white"
            _placeholder={{ color: 'whiteAlpha.400' }}
            borderRadius="lg"
          />
          <TacticalButton size="sm" onClick={() => void load()} isLoading={loading}>
            Consultar
          </TacticalButton>
        </Flex>
      </GlassPanel>

      {loading && <Flex justify="center" py={8}><Spinner color="green.400" /></Flex>}

      {!loading && summary && (
        <GlassPanel depth="raised" tint="green" p={4} direction="column" gap={3}>
          <TacticalText variant="subheading">Resumo</TacticalText>
          <Grid templateColumns="repeat(auto-fill, minmax(200px, 1fr))" gap={3}>
            {Object.entries(summary).map(([key, val]) => (
              <GlassPanel key={key} depth="base" p={3} direction="column" gap={1} borderRadius="xl">
                <TacticalText variant="caption">{key}</TacticalText>
                <Text color="white" fontSize="sm" fontWeight="bold">{fmt(val)}</Text>
              </GlassPanel>
            ))}
          </Grid>
        </GlassPanel>
      )}

      {!loading && transfers.length > 0 && (
        <GlassPanel depth="raised" p={4} direction="column" gap={3} overflow="hidden">
          <TacticalText variant="subheading">Transferências ({transfers.length})</TacticalText>
          <Box overflowX="auto">
            <Box as="table" w="100%" style={{ borderCollapse: 'collapse' }}>
              <Box as="thead">
                <Box as="tr">
                  {['Data', 'Beneficiário', 'Programa', 'Origem', 'Valor'].map((h) => (
                    <Box
                      as="th" key={h} px={3} py={2} textAlign="left"
                      fontSize="10px" fontWeight="bold" letterSpacing="0.1em"
                      textTransform="uppercase" color="whiteAlpha.500"
                      borderBottom="1px solid rgba(255,255,255,0.08)"
                    >
                      {h}
                    </Box>
                  ))}
                </Box>
              </Box>
              <Box as="tbody">
                {transfers.slice(0, 50).map((r, i) => (
                  <Box
                    as="tr" key={r.id ?? i}
                    _hover={{ bg: 'rgba(255,255,255,0.04)' }}
                    borderBottom="1px solid rgba(255,255,255,0.04)"
                  >
                    <Box as="td" px={3} py={2} fontSize="xs" color="whiteAlpha.700">{r.date ?? '—'}</Box>
                    <Box as="td" px={3} py={2} fontSize="xs" color="white" maxW="200px" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">{r.beneficiary ?? '—'}</Box>
                    <Box as="td" px={3} py={2} fontSize="xs" color="whiteAlpha.700">{r.program ?? '—'}</Box>
                    <Box as="td" px={3} py={2} fontSize="xs" color="whiteAlpha.700">{r.origin ?? '—'}</Box>
                    <Box as="td" px={3} py={2} fontSize="xs" color="rgba(52,199,89,0.9)" fontFamily="mono">
                      {r.amount != null ? r.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        </GlassPanel>
      )}

      {!loading && transfers.length === 0 && summary === null && (
        <GlassPanel depth="base" p={6} justify="center" align="center" direction="column" gap={2}>
          <FileText size={32} color="rgba(255,255,255,0.2)" />
          <TacticalText variant="caption">Consulte um período para ver as transferências</TacticalText>
        </GlassPanel>
      )}
    </VStack>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab: SATELLITE
// ══════════════════════════════════════════════════════════════════════════════
function SatelliteTab() {
  const [layers, setLayers] = useState<SatelliteLayerDto[]>([]);
  const [active, setActive] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const { pushNotice } = useNotifications();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await integrationsApi.getSatelliteLayers();
      setLayers(data.items ?? []);
    } catch {
      pushNotice({ type: 'error', title: 'Satélite', message: 'Falha ao carregar camadas.' });
    } finally {
      setLoading(false);
    }
  }, [pushNotice]);

  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const typeColor: Record<string, string> = {
    xyz:  'rgba(0,122,255,0.7)',
    wms:  'rgba(52,199,89,0.7)',
    wmts: 'rgba(255,149,0,0.7)',
  };

  return (
    <VStack spacing={4} align="stretch">
      <GlassPanel depth="base" p={4} direction="row" align="center" justify="space-between">
        <TacticalText variant="subheading">Camadas Satelitais ({layers.length})</TacticalText>
        <TacticalButton size="sm" onClick={() => void load()} isLoading={loading}>
          Recarregar
        </TacticalButton>
      </GlassPanel>

      {loading && <Flex justify="center" py={8}><Spinner color="blue.400" /></Flex>}

      {!loading && layers.length === 0 && (
        <GlassPanel depth="base" p={6} justify="center" align="center" direction="column" gap={2}>
          <Satellite size={32} color="rgba(255,255,255,0.2)" />
          <TacticalText variant="caption">Nenhuma camada disponível</TacticalText>
        </GlassPanel>
      )}

      {!loading && layers.map((layer) => (
        <GlassPanel key={layer.id} depth="raised" p={4} direction="row" align="center" gap={4}>
          <Box flex={1}>
            <Flex align="center" gap={2} mb={1}>
              <TacticalText variant="heading" fontSize="xs">{layer.title}</TacticalText>
              <Badge
                px={2} fontSize="9px" fontWeight="bold" borderRadius="md"
                textTransform="uppercase" letterSpacing="0.08em"
                bg={typeColor[layer.type] ?? 'rgba(255,255,255,0.1)'} color="white"
              >
                {layer.type}
              </Badge>
            </Flex>
            <TacticalText variant="caption">{layer.attribution}</TacticalText>
            {layer.timeSupport && (
              <TacticalText variant="caption">Suporte temporal: {layer.timeSupport}</TacticalText>
            )}
          </Box>
          <Flex direction="column" align="center" gap={1}>
            <Switch
              isChecked={Boolean(active[layer.id])}
              onChange={(e) => setActive((prev) => ({ ...prev, [layer.id]: e.target.checked }))}
              colorScheme="blue"
              size="sm"
            />
            <TacticalText variant="caption">{active[layer.id] ? 'Ativo' : 'Inativo'}</TacticalText>
          </Flex>
        </GlassPanel>
      ))}
    </VStack>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab: CATALOGS
// ══════════════════════════════════════════════════════════════════════════════
function CatalogsTab() {
  const [ibgeUf, setIbgeUf] = useState('MG');
  const [ibgeNome, setIbgeNome] = useState('');
  const [municipios, setMunicipios] = useState<IbgeMunicipioDto[]>([]);
  const [landsat, setLandsat] = useState<LandsatCollectionDto[]>([]);
  const [loading, setLoading] = useState(false);
  const { pushNotice } = useNotifications();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ibge, ls] = await Promise.all([
        integrationsApi.getIbgeMunicipios(ibgeUf, ibgeNome || undefined),
        integrationsApi.getLandsatCatalog(),
      ]);
      setMunicipios(ibge.items ?? []);
      setLandsat(ls.collections ?? []);
    } catch {
      pushNotice({ type: 'error', title: 'Catálogos', message: 'Falha ao carregar catálogos.' });
    } finally {
      setLoading(false);
    }
  }, [ibgeUf, ibgeNome, pushNotice]);

  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <VStack spacing={4} align="stretch">
      <GlassPanel depth="base" p={4} direction="column" gap={3}>
        <TacticalText variant="subheading">Filtro IBGE</TacticalText>
        <Flex gap={3} flexWrap="wrap">
          <Input
            value={ibgeUf}
            onChange={(e) => setIbgeUf(e.target.value.toUpperCase())}
            placeholder="UF (ex: MG)"
            size="sm"
            w="120px"
            bg="rgba(255,255,255,0.05)"
            border="1px solid rgba(255,255,255,0.12)"
            color="white"
            _placeholder={{ color: 'whiteAlpha.400' }}
            borderRadius="lg"
            maxLength={2}
          />
          <Input
            value={ibgeNome}
            onChange={(e) => setIbgeNome(e.target.value)}
            placeholder="Nome do município"
            size="sm"
            w="220px"
            bg="rgba(255,255,255,0.05)"
            border="1px solid rgba(255,255,255,0.12)"
            color="white"
            _placeholder={{ color: 'whiteAlpha.400' }}
            borderRadius="lg"
          />
          <TacticalButton size="sm" onClick={() => void load()} isLoading={loading}>
            Buscar
          </TacticalButton>
        </Flex>
      </GlassPanel>

      {loading && <Flex justify="center" py={8}><Spinner color="blue.400" /></Flex>}

      <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} gap={4}>
        {/* IBGE municipios */}
        <GlassPanel depth="raised" p={4} direction="column" gap={3}>
          <TacticalText variant="subheading">Municípios IBGE ({municipios.length})</TacticalText>
          {municipios.length === 0 && !loading && (
            <TacticalText variant="caption">Nenhum município encontrado</TacticalText>
          )}
          <VStack spacing={1} align="stretch" maxH="360px" overflowY="auto">
            {municipios.map((m) => (
              <Flex
                key={m.id}
                px={3} py={2}
                bg="rgba(255,255,255,0.03)"
                borderRadius="lg"
                align="center"
                gap={2}
                _hover={{ bg: 'rgba(255,255,255,0.06)' }}
              >
                <MapPin size={12} color="rgba(0,122,255,0.7)" />
                <Text color="white" fontSize="xs" flex={1}>{m.name}</Text>
                {m.uf && <TacticalText variant="caption">{m.uf}</TacticalText>}
                <TacticalText variant="mono">{m.id}</TacticalText>
              </Flex>
            ))}
          </VStack>
        </GlassPanel>

        {/* Landsat collections */}
        <VStack spacing={4} align="stretch">
          <GlassPanel depth="raised" p={4} direction="column" gap={3}>
            <TacticalText variant="subheading">Coleções Landsat ({landsat.length})</TacticalText>
            {landsat.length === 0 && !loading && (
              <TacticalText variant="caption">Nenhuma coleção disponível</TacticalText>
            )}
            <VStack spacing={2} align="stretch">
              {landsat.map((col) => (
                <GlassPanel key={col.id} depth="base" p={3} direction="column" gap={1} borderRadius="xl">
                  <TacticalText variant="heading" fontSize="xs">{col.title}</TacticalText>
                  <TacticalText variant="caption">{col.provider}</TacticalText>
                  {col.description && (
                    <Text color="whiteAlpha.600" fontSize="xs" noOfLines={2}>{col.description}</Text>
                  )}
                </GlassPanel>
              ))}
            </VStack>
          </GlassPanel>

          {/* Geofabrik Brazil Catalog */}
          <GlassPanel depth="raised" p={4} direction="column" gap={3} border="1px solid rgba(0,122,255,0.2)">
            <HStack justify="space-between">
              <VStack align="flex-start" spacing={0}>
                <TacticalText variant="heading" fontSize="xs">Geofabrik: Brasil</TacticalText>
                <TacticalText variant="caption">Dados OSM de Alta Precisão</TacticalText>
              </VStack>
              <Badge colorScheme="blue" variant="subtle" fontSize="9px">OSM.PBF</Badge>
            </HStack>
            
            <VStack spacing={2} align="stretch">
              {[
                { name: 'Brasil (Nacional)',   slug: 'brazil',      desc: 'Mapa completo do território nacional' },
                { name: 'Região Sudeste',     slug: 'southeast',   desc: 'SP, RJ, MG, ES (Alta Densidade)' },
                { name: 'Região Sul',         slug: 'south',       desc: 'PR, SC, RS' },
                { name: 'Região Nordeste',    slug: 'northeast',   desc: 'Estados do NE' },
                { name: 'Região Centro-Oeste', slug: 'center-west', desc: 'MT, MS, GO, DF' },
                { name: 'Região Norte',       slug: 'north',       desc: 'AM, PA, etc.' },
              ].map((reg) => (
                <GlassPanel key={reg.slug} depth="base" p={3} direction="row" align="center" gap={3} borderRadius="xl" _hover={{ bg: 'rgba(0,122,255,0.08)' }}>
                  <Box flex={1}>
                    <TacticalText variant="mono" fontSize="10px" color="blue.300">{reg.name}</TacticalText>
                    <Text color="whiteAlpha.600" fontSize="10px">{reg.desc}</Text>
                  </Box>
                  <TacticalButton size="xs" variant="ghost" onClick={() => window.open(`https://download.geofabrik.de/south-america/brazil/${reg.slug}-latest.osm.pbf`, '_blank')}>
                    PBF
                  </TacticalButton>
                </GlassPanel>
              ))}
            </VStack>
            <TacticalText variant="caption" color="whiteAlpha.400" fontSize="9px">
              Integração via Geofabrik Server · Atualização Diária
            </TacticalText>
          </GlassPanel>
        </VStack>
      </Grid>
    </VStack>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Page
// ══════════════════════════════════════════════════════════════════════════════
export function IntegrationsPage() {
  const [tab, setTab] = useState<Tab>('weather');

  return (
    <Box h="100%" w="100%" bg="sos.dark" overflowY="auto" p={{ base: 4, md: 6 }}>
      <VStack spacing={5} align="stretch" maxW="1500px" mx="auto">
        {/* Header */}
        <Flex justify="space-between" align="center" flexWrap="wrap" gap={3}>
          <HStack spacing={4}>
            <Box
              p={3}
              bg="rgba(0,122,255,0.10)"
              borderRadius="2xl"
              border="1px solid rgba(0,122,255,0.20)"
            >
              <Zap size={20} color="rgba(0,122,255,0.9)" />
            </Box>
            <VStack align="flex-start" spacing={0}>
              <TacticalText variant="heading" fontSize="lg">Integrações</TacticalText>
              <TacticalText variant="subheading">
                Dados externos · Clima · Alertas · Transparência · Satélite · Catálogos
              </TacticalText>
            </VStack>
          </HStack>
        </Flex>

        {/* Tab bar */}
        <GlassPanel depth="base" p={1} direction="row" gap={1} flexWrap="wrap">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <Flex
                key={id}
                as="button"
                onClick={() => setTab(id)}
                align="center"
                gap={2}
                px={4}
                py={2}
                borderRadius="xl"
                transition="all 0.15s"
                bg={active ? 'rgba(0,122,255,0.18)' : 'transparent'}
                border="1px solid"
                borderColor={active ? 'rgba(0,122,255,0.35)' : 'transparent'}
                _hover={{ bg: active ? 'rgba(0,122,255,0.22)' : 'rgba(255,255,255,0.05)' }}
                cursor="pointer"
              >
                <Icon size={14} color={active ? 'rgba(0,122,255,0.9)' : 'rgba(255,255,255,0.45)'} />
                <TacticalText
                  variant="subheading"
                  color={active ? 'rgba(0,122,255,0.9)' : 'whiteAlpha.500'}
                  letterSpacing="0.08em"
                >
                  {label}
                </TacticalText>
              </Flex>
            );
          })}
        </GlassPanel>

        {/* Tab content */}
        <Box>
          {tab === 'weather'      && <WeatherTab />}
          {tab === 'alerts'       && <AlertsTab />}
          {tab === 'transparency' && <TransparencyTab />}
          {tab === 'satellite'    && <SatelliteTab />}
          {tab === 'catalogs'     && <CatalogsTab />}
        </Box>
      </VStack>
    </Box>
  );
}
