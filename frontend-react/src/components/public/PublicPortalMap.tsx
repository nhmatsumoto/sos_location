import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { CircleMarker, Popup, Pane, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import '../../styles/MapLayerStyles.css';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import type { NewsNotification } from '../../services/newsApi';
import type { RiskSummary } from '../../hooks/usePublicMapPage';
import {
  Box, VStack, HStack, Badge, Text, Divider,
  IconButton, Input, InputGroup, InputRightElement,
  Tooltip, SimpleGrid,
} from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { Search, Layers, X, AlertTriangle, TrendingUp } from 'lucide-react';
import { tacticalIntelApi } from '../../services/tacticalIntelApi';
import type { OperationalPoint } from '../../services/tacticalIntelApi';
import { MapContextMenu } from '../features/map/MapContextMenu';
import { HazardMatrixLegend } from '../ui/HazardMatrixLegend';
import { MapArea } from '../ui/MapArea';
import { MapAutoBounds } from '../ui/MapAutoBounds';
import { TacticalMap } from '../features/map/TacticalMap';
import { useMapEvents, useMap } from 'react-leaflet';
import { Marker } from 'react-leaflet';

// Fix Leaflet marker icons
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

// ─── Tile Layers ──────────────────────────────────────────────────────────────
type TileLayerKey = 'dark' | 'satellite' | 'osm';

const TILE_LAYERS: Record<TileLayerKey, { url: string; attribution: string; label: string }> = {
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    label: 'Tático',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
    label: 'Satélite',
  },
  osm: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    label: 'Padrão',
  },
};

// ─── Severity ─────────────────────────────────────────────────────────────────
type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';

function getSeverityLevel(item: NewsNotification): SeverityLevel {
  const s = (item.severity ?? '').toLowerCase();
  if (s === 'extremo' || s === 'critical') return 'critical';
  if (s === 'perigo'  || s === 'high')     return 'high';
  if (s === 'atenção' || s === 'medium')   return 'medium';
  return 'low';
}

const SEVERITY_COLORS: Record<SeverityLevel, string> = {
  critical: '#EF4444',
  high:     '#F97316',
  medium:   '#EAB308',
  low:      '#22C55E',
};

const SEVERITY_LABELS: Record<SeverityLevel, string> = {
  critical: 'Crítico',
  high:     'Alto',
  medium:   'Médio',
  low:      'Baixo',
};

const MARKER_RADIUS: Record<SeverityLevel, number> = {
  critical: 13,
  high:     10,
  medium:   8,
  low:      6,
};

function formatTimestamp(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0) return `${m}m ${s.toString().padStart(2, '0')}s`;
  return `${s}s`;
}

// ─── Animations ──────────────────────────────────────────────────────────────
const pulse = keyframes`
  0%   { box-shadow: 0 0 0 0 rgba(52,199,89,0.7); }
  70%  { box-shadow: 0 0 0 6px rgba(52,199,89,0); }
  100% { box-shadow: 0 0 0 0 rgba(52,199,89,0); }
`;

const criticalPulse = keyframes`
  0%   { box-shadow: 0 0 0 0 rgba(239,68,68,0.6); }
  70%  { box-shadow: 0 0 0 10px rgba(239,68,68,0); }
  100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
`;

// ─── Inner map components ─────────────────────────────────────────────────────

function DynamicTileLayer({ layer }: { layer: TileLayerKey }) {
  const cfg = TILE_LAYERS[layer];
  return <TileLayer key={layer} url={cfg.url} attribution={cfg.attribution} />;
}

function MapEventTracker({ setZoom, onContextMenu }: {
  setZoom: (z: number) => void;
  onContextMenu: (e: L.LeafletMouseEvent) => void;
}) {
  useMapEvents({
    zoomend: (e) => setZoom(e.target.getZoom()),
    contextmenu: (e) => onContextMenu(e),
  });
  return null;
}

function MapSelectedEventFocuser({ event }: { event: NewsNotification | null | undefined }) {
  const map = useMap();
  useEffect(() => {
    if (!event) return;
    const lat = event.latitude || (event as any).lat;
    const lng = event.longitude || (event as any).lng;
    if (lat && lng) {
      try { map.flyTo([lat, lng], 10, { animate: true, duration: 1.5 }); } catch { /* ignore */ }
    }
  }, [event, map]);
  return null;
}

function MapFlyTo({ coords }: { coords: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (coords) map.flyTo(coords, 13, { animate: true, duration: 1.5 });
  }, [coords, map]);
  return null;
}

// ─── Risk Score Bar ───────────────────────────────────────────────────────────
function RiskScoreBar({ score }: { score: number }) {
  const color = score >= 75 ? '#EF4444' : score >= 50 ? '#F97316' : score >= 25 ? '#EAB308' : '#22C55E';
  return (
    <Box mt={2}>
      <HStack justify="space-between" mb={1}>
        <Text fontSize="9px" fontFamily="mono" color="whiteAlpha.500">RISCO ML</Text>
        <Text fontSize="9px" fontFamily="mono" fontWeight="bold" color={color}>{score}/100</Text>
      </HStack>
      <Box h="3px" w="full" bg="whiteAlpha.100" borderRadius="full">
        <Box h="full" w={`${score}%`} bg={color} borderRadius="full" boxShadow={`0 0 6px ${color}88`} />
      </Box>
    </Box>
  );
}

// ─── Stats Panel ──────────────────────────────────────────────────────────────
interface StatsPanelProps {
  news: NewsNotification[];
  riskSummary: RiskSummary | null | undefined;
}

function StatsPanel({ news, riskSummary }: StatsPanelProps) {
  const counts = useMemo(() => {
    const c = { critical: 0, high: 0, medium: 0, low: 0 };
    news.forEach(item => { c[getSeverityLevel(item)]++; });
    return c;
  }, [news]);

  return (
    <Box
      bg="rgba(8,8,15,0.88)"
      backdropFilter="blur(20px)"
      p={4}
      borderRadius="2xl"
      border="1px solid"
      borderColor="rgba(255,255,255,0.1)"
      boxShadow="0 8px 32px rgba(0,0,0,0.5)"
      minW="160px"
    >
      <HStack spacing={2} mb={3}>
        <AlertTriangle size={11} color="rgba(255,255,255,0.5)" />
        <Text fontSize="9px" fontFamily="mono" fontWeight="black" textTransform="uppercase" letterSpacing="0.2em" color="whiteAlpha.600">
          Alertas Ativos
        </Text>
      </HStack>
      <Text fontSize="22px" fontFamily="mono" fontWeight="black" color="white" lineHeight={1} mb={3}>
        {news.length}
      </Text>
      <VStack spacing={2} align="start">
        {(Object.entries(SEVERITY_COLORS) as [SeverityLevel, string][]).map(([level, color]) => (
          <HStack key={level} spacing={2} w="full" justify="space-between">
            <HStack spacing={1.5}>
              <Box h="8px" w="8px" borderRadius="sm" bg={color} flexShrink={0} boxShadow={`0 0 5px ${color}77`} />
              <Text fontSize="9px" color="whiteAlpha.600" textTransform="uppercase" fontWeight="bold">{SEVERITY_LABELS[level]}</Text>
            </HStack>
            <Text fontSize="9px" fontFamily="mono" fontWeight="bold" color={counts[level] > 0 ? color : 'whiteAlpha.300'}>
              {counts[level]}
            </Text>
          </HStack>
        ))}
      </VStack>

      {/* Risk engine summary from Python unit */}
      {riskSummary?.summary && riskSummary.summary.total > 0 && (
        <>
          <Divider borderColor="whiteAlpha.100" my={3} />
          <HStack spacing={2} mb={2}>
            <TrendingUp size={11} color="rgba(255,255,255,0.5)" />
            <Text fontSize="9px" fontFamily="mono" fontWeight="black" textTransform="uppercase" letterSpacing="0.2em" color="whiteAlpha.600">
              Motor de Risco
            </Text>
          </HStack>
          <SimpleGrid columns={2} spacing={1.5}>
            {([
              { label: 'Crítico', count: riskSummary.summary.critical, color: SEVERITY_COLORS.critical },
              { label: 'Alto',    count: riskSummary.summary.high,     color: SEVERITY_COLORS.high },
              { label: 'Médio',   count: riskSummary.summary.medium,   color: SEVERITY_COLORS.medium },
              { label: 'Baixo',   count: riskSummary.summary.low,      color: SEVERITY_COLORS.low },
            ]).map(({ label, count, color }) => (
              <Box key={label} bg="whiteAlpha.50" borderRadius="lg" px={2} py={1.5} textAlign="center">
                <Text fontSize="14px" fontFamily="mono" fontWeight="black" color={count > 0 ? color : 'whiteAlpha.300'}>{count}</Text>
                <Text fontSize="8px" color="whiteAlpha.400" textTransform="uppercase">{label}</Text>
              </Box>
            ))}
          </SimpleGrid>
        </>
      )}
    </Box>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface PublicPortalMapProps {
  news: NewsNotification[];
  selectedEvent?: NewsNotification | null;
  riskSummary?: RiskSummary | null;
  nextRefreshIn?: number;
}

export function PublicPortalMap({ news, selectedEvent, riskSummary, nextRefreshIn }: PublicPortalMapProps) {
  const [zoomLevel, setZoomLevel] = useState(4);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; coords: [number, number] } | null>(null);
  const [opPoints, setOpPoints] = useState<OperationalPoint[]>([]);
  const defaultCenter: [number, number] = [-15.793889, -47.882778];

  const [activeTile, setActiveTile] = useState<TileLayerKey>('dark');
  const [showTilePicker, setShowTilePicker] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [flyToCoords, setFlyToCoords] = useState<[number, number] | null>(null);

  useEffect(() => {
    const loadPoints = async () => {
      try {
        const data = await tacticalIntelApi.getPoints();
        setOpPoints(Array.isArray(data) ? data : []);
      } catch { /* ignore */ }
    };
    void loadPoints();
    const interval = setInterval(loadPoints, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setSearchLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`,
        { headers: { 'Accept-Language': 'pt-BR,pt;q=0.9' } }
      );
      const data = await res.json();
      if (data?.length > 0) {
        setFlyToCoords([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
      }
    } catch { /* ignore */ } finally {
      setSearchLoading(false);
    }
  }, [searchQuery]);

  const safeNews = Array.isArray(news) ? news : [];
  const sortedNews = [...safeNews].sort((a, b) =>
    new Date(a.at ?? 0).getTime() - new Date(b.at ?? 0).getTime()
  );

  const refreshLabel = nextRefreshIn != null
    ? `Próx. atualiz. ${formatCountdown(nextRefreshIn)}`
    : 'LIVE';

  return (
    <Box h="full" w="full" bg="sos.dark" position="relative" zIndex={0}>

      {/* ── Address Search Bar ──────────────────────────────────────────────── */}
      <Box
        position="absolute"
        top={4}
        left="50%"
        transform="translateX(-50%)"
        zIndex={500}
        w={{ base: 'calc(100% - 2rem)', md: '420px' }}
      >
        <InputGroup size="md">
          <Input
            placeholder="Buscar endereço ou cidade..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') void handleSearch(); }}
            bg="rgba(8,8,15,0.88)"
            backdropFilter="blur(20px)"
            border="1px solid"
            borderColor="rgba(255,255,255,0.12)"
            borderRadius="2xl"
            color="white"
            fontSize="sm"
            _placeholder={{ color: 'whiteAlpha.400' }}
            _focus={{ borderColor: 'cyan.400', boxShadow: '0 0 0 1px #00BCD4' }}
            _hover={{ borderColor: 'rgba(255,255,255,0.2)' }}
            pr="2.5rem"
          />
          <InputRightElement>
            {searchQuery ? (
              <IconButton
                aria-label="Limpar"
                icon={<X size={14} />}
                size="xs" variant="ghost" color="whiteAlpha.500"
                _hover={{ color: 'white' }}
                onClick={() => { setSearchQuery(''); setFlyToCoords(null); }}
              />
            ) : (
              <IconButton
                aria-label="Buscar"
                icon={<Search size={14} />}
                size="xs" variant="ghost" color="whiteAlpha.500"
                _hover={{ color: 'white' }}
                isLoading={searchLoading}
                onClick={() => void handleSearch()}
              />
            )}
          </InputRightElement>
        </InputGroup>
      </Box>

      {/* ── Live Refresh Indicator ─────────────────────────────────────────── */}
      <Box
        position="absolute"
        top={4}
        right={{ base: 4, md: '4.5rem' }}
        zIndex={500}
        bg="rgba(8,8,15,0.88)"
        backdropFilter="blur(16px)"
        border="1px solid"
        borderColor="rgba(255,255,255,0.1)"
        borderRadius="2xl"
        px={3}
        py={2}
      >
        <HStack spacing={2}>
          <Box
            h="8px" w="8px" borderRadius="full" bg="#34C759"
            animation={`${pulse} 2s ease-in-out infinite`}
            flexShrink={0}
          />
          <Text fontSize="10px" fontFamily="mono" color="whiteAlpha.600" whiteSpace="nowrap">
            LIVE &nbsp;·&nbsp; {refreshLabel}
          </Text>
        </HStack>
      </Box>

      {/* ── Map ────────────────────────────────────────────────────────────── */}
      <div className={`map-3d-perspective ${zoomLevel > 6 ? 'map-micro-focus' : ''}`}>
        <TacticalMap
          center={defaultCenter}
          zoom={4}
          containerProps={{ className: 'map-3d-content' }}
          tileType={activeTile as any}
        >
          <MapEventTracker
            setZoom={setZoomLevel}
            onContextMenu={e => setContextMenu({ x: e.originalEvent.clientX, y: e.originalEvent.clientY, coords: [e.latlng.lat, e.latlng.lng] })}
          />
          <DynamicTileLayer layer={activeTile} />
          <MapSelectedEventFocuser event={selectedEvent} />
          <MapAutoBounds news={news} />
          <MapFlyTo coords={flyToCoords} />

          {/* Area overlays */}
          <Pane name="areas-pane" style={{ zIndex: 200 }}>
            {sortedNews.map(item => {
              if (!item) return null;
              const lat = item.latitude || (item as any).lat;
              const lng = item.longitude || (item as any).lng;
              if (!lat || !lng) return null;
              return (
                <MapArea key={`area-${item.id}`} id={item.id} latitude={lat} longitude={lng} category={item.category || ''} />
              );
            })}
          </Pane>

          {/* Incident markers */}
          <MarkerClusterGroup chunkedLoading maxClusterRadius={40}>
            {sortedNews.map(item => {
              if (!item) return null;
              const lat = item.latitude || (item as any).lat;
              const lng = item.longitude || (item as any).lng;
              if (!lat || !lng) return null;

              const sevLevel = getSeverityLevel(item);
              const color = SEVERITY_COLORS[sevLevel];
              const radius = MARKER_RADIUS[sevLevel];
              const isCritical = sevLevel === 'critical';

              return (
                <CircleMarker
                  key={item.id}
                  center={[lat, lng]}
                  radius={radius}
                  pathOptions={{
                    color,
                    fillColor: color,
                    fillOpacity: isCritical ? 0.95 : 0.8,
                    weight: isCritical ? 3 : 2,
                  }}
                  className={isCritical ? 'critical-marker' : undefined}
                >
                  <Popup className="guardian-popup" maxWidth={300}>
                    <Box p={3} minW="230px" bg="rgba(8,8,15,0.97)" borderRadius="xl" color="white">
                      {/* Header row */}
                      <HStack spacing={2} mb={2}>
                        <Box
                          h="10px" w="10px" borderRadius="full" bg={color} flexShrink={0}
                          animation={isCritical ? `${criticalPulse} 1.5s ease-in-out infinite` : undefined}
                        />
                        <Badge bg={color} color="white" fontSize="9px" px={2} borderRadius="md">
                          {SEVERITY_LABELS[sevLevel].toUpperCase()}
                        </Badge>
                        {item.category && (
                          <Badge variant="outline" borderColor="whiteAlpha.300" color="whiteAlpha.600" fontSize="9px" px={2} borderRadius="md">
                            {item.category}
                          </Badge>
                        )}
                        {item.status && (
                          <Badge
                            bg={item.status === 'Active' ? 'red.900' : item.status === 'Contained' ? 'orange.900' : 'green.900'}
                            color="white" fontSize="9px" px={2} borderRadius="md"
                          >
                            {item.status === 'Active' ? 'ATIVO' : item.status === 'Contained' ? 'CONTIDO' : 'RESOLVIDO'}
                          </Badge>
                        )}
                      </HStack>

                      {/* Title */}
                      <Text fontWeight="bold" fontSize="xs" mb={1} color="white" lineHeight={1.3}>
                        {item.title}
                      </Text>

                      {/* Description */}
                      {item.description && (
                        <Text fontSize="10px" color="whiteAlpha.700" mb={2} noOfLines={3}>
                          {item.description}
                        </Text>
                      )}

                      {/* Climate info if available */}
                      {item.climateInfo && (item.climateInfo.temperature != null || item.climateInfo.humidity != null) && (
                        <HStack spacing={3} mb={2} px={2} py={1.5} bg="whiteAlpha.50" borderRadius="lg">
                          {item.climateInfo.temperature != null && (
                            <HStack spacing={1}>
                              <Text fontSize="9px" color="whiteAlpha.500">Temp</Text>
                              <Text fontSize="9px" fontFamily="mono" fontWeight="bold" color="orange.300">
                                {item.climateInfo.temperature}°C
                              </Text>
                            </HStack>
                          )}
                          {item.climateInfo.humidity != null && (
                            <HStack spacing={1}>
                              <Text fontSize="9px" color="whiteAlpha.500">Umid</Text>
                              <Text fontSize="9px" fontFamily="mono" fontWeight="bold" color="blue.300">
                                {item.climateInfo.humidity}%
                              </Text>
                            </HStack>
                          )}
                          {item.climateInfo.windSpeed != null && (
                            <HStack spacing={1}>
                              <Text fontSize="9px" color="whiteAlpha.500">Vento</Text>
                              <Text fontSize="9px" fontFamily="mono" fontWeight="bold" color="cyan.300">
                                {item.climateInfo.windSpeed} km/h
                              </Text>
                            </HStack>
                          )}
                        </HStack>
                      )}

                      {/* Risk score bar */}
                      {item.riskScore != null && <RiskScoreBar score={item.riskScore} />}

                      <Divider borderColor="whiteAlpha.100" my={2} />

                      <HStack justify="space-between">
                        <Text fontSize="9px" fontFamily="mono" color="whiteAlpha.500">
                          {formatTimestamp(item.at ?? item.publishedAt)}
                        </Text>
                        {item.source && (
                          <Text fontSize="9px" color="whiteAlpha.400">
                            {item.source}
                          </Text>
                        )}
                      </HStack>

                      {item.affectedPopulation != null && item.affectedPopulation > 0 && (
                        <Text fontSize="9px" fontFamily="mono" color="whiteAlpha.500" mt={1}>
                          ~{item.affectedPopulation.toLocaleString('pt-BR')} afetados
                        </Text>
                      )}
                    </Box>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MarkerClusterGroup>

          {/* Operational points */}
          <Pane name="op-points-pane" style={{ zIndex: 600 }}>
            {opPoints.map((point, index) => (
              <Marker
                key={point.id}
                position={[point.latitude, point.longitude]}
                icon={L.divIcon({
                  className: 'tactical-marker-container',
                  html: `
                    <div class="tactical-pulse ${point.type.toLowerCase()}"></div>
                    <div class="tactical-marker-id">${index + 1}</div>
                  `,
                  iconSize: [32, 32],
                  iconAnchor: [16, 16],
                })}
              >
                <Popup className="guardian-popup">
                  <VStack align="stretch" spacing={2} p={1}>
                    <HStack justify="space-between">
                      <Badge colorScheme="blue" variant="solid" fontSize="10px">{point.type.toUpperCase()}</Badge>
                      <Text fontSize="10px" color="whiteAlpha.500">#{index + 1}</Text>
                    </HStack>
                    <Text fontWeight="black" fontSize="xs">{point.title}</Text>
                    <Text fontSize="10px" color="whiteAlpha.700">{point.description}</Text>
                    <Divider borderColor="whiteAlpha.200" />
                    <Text fontSize="8px" color="whiteAlpha.500" fontFamily="mono">
                      COORD: {point.latitude.toFixed(4)}, {point.longitude.toFixed(4)}
                    </Text>
                  </VStack>
                </Popup>
              </Marker>
            ))}
          </Pane>
        </TacticalMap>
      </div>

      {/* ── Context menu ──────────────────────────────────────────────────── */}
      {contextMenu && (
        <MapContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          lat={contextMenu.coords[0]}
          lng={contextMenu.coords[1]}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* ── Bottom-left: Stats + Severity Legend + Hazard Matrix ────────────── */}
      <Box
        position="absolute"
        bottom={{ base: 4, md: 8 }}
        left={{ base: 4, md: 8 }}
        zIndex={40}
        display={{ base: 'none', md: 'block' }}
      >
        <VStack spacing={3} align="stretch">
          {/* Stats panel */}
          <StatsPanel news={safeNews} riskSummary={riskSummary} />

          {/* Hazard matrix */}
          <HazardMatrixLegend />
        </VStack>
      </Box>

      {/* ── Tile Switcher (bottom-right) ─────────────────────────────────────── */}
      <Box
        position="absolute"
        bottom={{ base: 4, md: 8 }}
        right={{ base: 4, md: 8 }}
        zIndex={500}
      >
        <VStack spacing={2} align="flex-end">
          {showTilePicker && (
            <Box
              bg="rgba(8,8,15,0.92)"
              backdropFilter="blur(20px)"
              border="1px solid"
              borderColor="rgba(255,255,255,0.12)"
              borderRadius="2xl"
              overflow="hidden"
              boxShadow="2xl"
            >
              {(Object.entries(TILE_LAYERS) as [TileLayerKey, typeof TILE_LAYERS[TileLayerKey]][]).map(([key, cfg]) => (
                <Box
                  key={key}
                  px={4} py={2}
                  cursor="pointer"
                  bg={activeTile === key ? 'rgba(0,122,255,0.2)' : 'transparent'}
                  _hover={{ bg: 'whiteAlpha.100' }}
                  borderBottom="1px solid"
                  borderColor="whiteAlpha.50"
                  _last={{ border: 'none' }}
                  onClick={() => { setActiveTile(key); setShowTilePicker(false); }}
                >
                  <HStack spacing={2}>
                    {activeTile === key && <Box h="6px" w="6px" borderRadius="full" bg="cyan.400" />}
                    <Text
                      fontSize="11px" fontFamily="mono"
                      fontWeight={activeTile === key ? 'bold' : 'normal'}
                      color={activeTile === key ? 'cyan.300' : 'whiteAlpha.700'}
                    >
                      {cfg.label}
                    </Text>
                  </HStack>
                </Box>
              ))}
            </Box>
          )}
          <Tooltip label="Trocar camada de mapa" placement="left">
            <IconButton
              aria-label="Trocar camada"
              icon={<Layers size={18} />}
              onClick={() => setShowTilePicker(v => !v)}
              bg={showTilePicker ? 'rgba(0,122,255,0.3)' : 'rgba(8,8,15,0.88)'}
              backdropFilter="blur(20px)"
              border="1px solid"
              borderColor={showTilePicker ? 'cyan.500' : 'rgba(255,255,255,0.12)'}
              color={showTilePicker ? 'cyan.300' : 'whiteAlpha.700'}
              _hover={{ bg: 'rgba(0,122,255,0.2)', color: 'white', borderColor: 'cyan.400' }}
              borderRadius="2xl"
              h="48px" w="48px"
              boxShadow="0 8px 16px rgba(0,0,0,0.4)"
            />
          </Tooltip>
        </VStack>
      </Box>

      {/* CSS for critical marker animation */}
      <style>{`
        .critical-marker path {
          animation: critical-ring 1.4s ease-in-out infinite;
        }
        @keyframes critical-ring {
          0%   { stroke-opacity: 1; stroke-width: 3; }
          50%  { stroke-opacity: 0.6; stroke-width: 5; }
          100% { stroke-opacity: 1; stroke-width: 3; }
        }
      `}</style>
    </Box>
  );
}
