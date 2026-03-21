import { useState, useEffect, useRef, useCallback } from 'react';
import { CircleMarker, Popup, Pane, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import '../../styles/MapLayerStyles.css';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import type { NewsNotification } from '../../services/newsApi';
import {
  Box, VStack, HStack, Badge, Text, Divider,
  IconButton, Input, InputGroup, InputRightElement,
  Tooltip,
} from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { Search, Layers, X } from 'lucide-react';
import { tacticalIntelApi } from '../../services/tacticalIntelApi';
import type { OperationalPoint } from '../../services/tacticalIntelApi';
import { MapContextMenu } from '../features/map/MapContextMenu';
import { IntelPopupContent } from '../ui/IntelPopupContent';
import { HazardMatrixLegend } from '../ui/HazardMatrixLegend';
import { MapArea } from '../ui/MapArea';
import { MapAutoBounds } from '../ui/MapAutoBounds';
import { TacticalMap } from '../features/map/TacticalMap';
import { useMapEvents, useMap } from 'react-leaflet';
import { Marker } from 'react-leaflet';

// Fix Leaflet marker icons in React
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// ─── Tile Layers ─────────────────────────────────────────────────────────────
type TileLayerKey = 'dark' | 'satellite' | 'osm';

const TILE_LAYERS: Record<TileLayerKey, { url: string; attribution: string; label: string }> = {
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    label: 'Tático',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    label: 'Satélite',
  },
  osm: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    label: 'Padrão',
  },
};

// ─── Severity Helpers ─────────────────────────────────────────────────────────
type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';

function getSeverityLevel(item: NewsNotification): SeverityLevel {
  const s = (item.severity ?? '').toLowerCase();
  if (s === 'extremo' || s === 'critical') return 'critical';
  if (s === 'perigo' || s === 'high') return 'high';
  if (s === 'atenção' || s === 'medium') return 'medium';
  return 'low';
}

const SEVERITY_COLORS: Record<SeverityLevel, string> = {
  critical: '#EF4444',
  high: '#F97316',
  medium: '#EAB308',
  low: '#22C55E',
};

const SEVERITY_LABELS: Record<SeverityLevel, string> = {
  critical: 'Crítico',
  high: 'Alto',
  medium: 'Médio',
  low: 'Baixo',
};

function formatTimestamp(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

// ─── Pulsing animation for Live indicator ────────────────────────────────────
const pulse = keyframes`
  0%   { box-shadow: 0 0 0 0 rgba(52,199,89,0.7); }
  70%  { box-shadow: 0 0 0 6px rgba(52,199,89,0); }
  100% { box-shadow: 0 0 0 0 rgba(52,199,89,0); }
`;

// ─── Inner map components (must be inside MapContainer) ───────────────────────

function DynamicTileLayer({ layer }: { layer: TileLayerKey }) {
  const cfg = TILE_LAYERS[layer];
  return <TileLayer key={layer} url={cfg.url} attribution={cfg.attribution} />;
}

function MapEventTracker({ setZoom, onContextMenu }: {
  setZoom: (z: number) => void;
  onContextMenu: (e: L.LeafletMouseEvent) => void;
}) {
  useMapEvents({
    zoomend: (e) => { setZoom(e.target.getZoom()); },
    contextmenu: (e) => { onContextMenu(e); },
  });
  return null;
}

function MapSelectedEventFocuser({ event }: { event: NewsNotification | null | undefined }) {
  const map = useMap();
  useEffect(() => {
    let mounted = true;
    if (event) {
      const lat = event.latitude || (event as any).lat;
      const lng = event.longitude || (event as any).lng;
      if (lat && lng && mounted) {
        try { map.flyTo([lat, lng], 10, { animate: true, duration: 1.5 }); } catch (_) { /* ignore */ }
      }
    }
    return () => { mounted = false; };
  }, [event, map]);
  return null;
}

function MapFlyTo({ coords }: { coords: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (coords) {
      map.flyTo(coords, 13, { animate: true, duration: 1.5 });
    }
  }, [coords, map]);
  return null;
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface PublicPortalMapProps {
  news: NewsNotification[];
  selectedEvent?: NewsNotification | null;
}

export function PublicPortalMap({ news, selectedEvent }: PublicPortalMapProps) {
  const [zoomLevel, setZoomLevel] = useState(4);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; coords: [number, number] } | null>(null);
  const [opPoints, setOpPoints] = useState<OperationalPoint[]>([]);
  const defaultCenter: [number, number] = [-15.793889, -47.882778];

  // Tile layer switcher
  const [activeTile, setActiveTile] = useState<TileLayerKey>('dark');
  const [showTilePicker, setShowTilePicker] = useState(false);

  // Address search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [flyToCoords, setFlyToCoords] = useState<[number, number] | null>(null);

  // Live refresh indicator
  const [secondsSinceRefresh, setSecondsSinceRefresh] = useState(0);
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Reset counter whenever news prop updates
    setSecondsSinceRefresh(0);
  }, [news]);

  useEffect(() => {
    refreshIntervalRef.current = setInterval(() => {
      setSecondsSinceRefresh(s => s + 1);
    }, 1000);
    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    const loadPoints = async () => {
      try {
        const data = await tacticalIntelApi.getPoints();
        setOpPoints(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('Failed to load operational points', e);
      }
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
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        setFlyToCoords([parseFloat(lat), parseFloat(lon)]);
      }
    } catch (err) {
      console.error('Nominatim search error', err);
    } finally {
      setSearchLoading(false);
    }
  }, [searchQuery]);

  const safeNews = Array.isArray(news) ? news : [];
  const sortedNews = [...safeNews].sort((a, b) =>
    new Date(a.at ?? 0).getTime() - new Date(b.at ?? 0).getTime()
  );

  const liveLabel = secondsSinceRefresh < 60
    ? `Atualizado há ${secondsSinceRefresh} seg`
    : `Atualizado há ${Math.floor(secondsSinceRefresh / 60)} min`;

  return (
    <Box h="full" w="full" bg="sos.dark" position="relative" zIndex={0}>
      {/* ── Address Search Bar (top, below header) ──────────────────────── */}
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
            bg="rgba(8,8,15,0.85)"
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
                aria-label="Limpar busca"
                icon={<X size={14} />}
                size="xs"
                variant="ghost"
                color="whiteAlpha.500"
                _hover={{ color: 'white' }}
                onClick={() => { setSearchQuery(''); setFlyToCoords(null); }}
              />
            ) : (
              <IconButton
                aria-label="Buscar"
                icon={<Search size={14} />}
                size="xs"
                variant="ghost"
                color="whiteAlpha.500"
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
        bg="rgba(8,8,15,0.8)"
        backdropFilter="blur(16px)"
        border="1px solid"
        borderColor="rgba(255,255,255,0.1)"
        borderRadius="2xl"
        px={3}
        py={2}
      >
        <HStack spacing={2}>
          <Box
            h="8px"
            w="8px"
            borderRadius="full"
            bg="#34C759"
            animation={`${pulse} 2s ease-in-out infinite`}
            flexShrink={0}
          />
          <Text fontSize="10px" fontFamily="mono" color="whiteAlpha.600" whiteSpace="nowrap">
            LIVE &nbsp;·&nbsp; {liveLabel}
          </Text>
        </HStack>
      </Box>

      <div className={`map-3d-perspective ${zoomLevel > 6 ? 'map-micro-focus' : ''}`}>
        <TacticalMap
          center={defaultCenter}
          zoom={4}
          containerProps={{ className: 'map-3d-content' }}
          // Disable built-in tile (we render our own DynamicTileLayer inside)
          tileType={activeTile as any}
        >
          <MapEventTracker
            setZoom={setZoomLevel}
            onContextMenu={e => setContextMenu({ x: e.originalEvent.clientX, y: e.originalEvent.clientY, coords: [e.latlng.lat, e.latlng.lng] })}
          />

          {/* Override tile layer dynamically */}
          <DynamicTileLayer layer={activeTile} />

          <MapSelectedEventFocuser event={selectedEvent} />
          <MapAutoBounds news={news} />
          <MapFlyTo coords={flyToCoords} />

          <Pane name="areas-pane" style={{ zIndex: 200 }}>
            {sortedNews.map((item) => {
              if (!item) return null;
              const lat = item.latitude || (item as any).lat;
              const lng = item.longitude || (item as any).lng;
              if (!lat || !lng) return null;
              return (
                <MapArea
                  key={`area-${item.id}`}
                  id={item.id}
                  latitude={lat}
                  longitude={lng}
                  category={item.category || ''}
                />
              );
            })}
          </Pane>

          {/* ── Incident markers — colored CircleMarkers by severity ──────── */}
          <MarkerClusterGroup chunkedLoading maxClusterRadius={40}>
            {sortedNews.map((item) => {
              if (!item) return null;
              const lat = item.latitude || (item as any).lat;
              const lng = item.longitude || (item as any).lng;
              if (!lat || !lng) return null;

              const sevLevel = getSeverityLevel(item);
              const color = SEVERITY_COLORS[sevLevel];

              return (
                <CircleMarker
                  key={item.id}
                  center={[lat, lng]}
                  radius={8}
                  pathOptions={{
                    color: color,
                    fillColor: color,
                    fillOpacity: 0.85,
                    weight: 2,
                  }}
                >
                  <Popup className="guardian-popup" maxWidth={300}>
                    <Box p={2} minW="220px" bg="rgba(8,8,15,0.95)" borderRadius="xl" color="white">
                      <HStack spacing={2} mb={2}>
                        <Box h="10px" w="10px" borderRadius="full" bg={color} flexShrink={0} />
                        <Badge
                          bg={color}
                          color="white"
                          fontSize="9px"
                          px={2}
                          borderRadius="md"
                        >
                          {SEVERITY_LABELS[sevLevel].toUpperCase()}
                        </Badge>
                        {item.category && (
                          <Badge variant="outline" borderColor="whiteAlpha.300" color="whiteAlpha.600" fontSize="9px" px={2} borderRadius="md">
                            {item.category}
                          </Badge>
                        )}
                      </HStack>
                      <Text fontWeight="bold" fontSize="xs" mb={1} color="white">
                        {item.title}
                      </Text>
                      {item.description && (
                        <Text fontSize="10px" color="whiteAlpha.700" mb={2} noOfLines={3}>
                          {item.description}
                        </Text>
                      )}
                      <Divider borderColor="whiteAlpha.100" mb={2} />
                      <Text fontSize="9px" fontFamily="mono" color="whiteAlpha.500">
                        {formatTimestamp(item.at ?? item.publishedAt)}
                      </Text>
                      {item.source && (
                        <Text fontSize="9px" color="whiteAlpha.400" mt={0.5}>
                          Fonte: {item.source}
                        </Text>
                      )}
                    </Box>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MarkerClusterGroup>

          {/* ── Operational points ────────────────────────────────────────── */}
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

      {/* ── Severity Legend (bottom-left) ──────────────────────────────────── */}
      <Box
        position="absolute"
        bottom={{ base: 4, md: 8 }}
        left={{ base: 4, md: 8 }}
        zIndex={40}
        display={{ base: 'none', md: 'block' }}
      >
        <VStack spacing={3} align="stretch">
          {/* Severity legend */}
          <Box
            bg="rgba(8,8,15,0.85)"
            backdropFilter="blur(20px)"
            p={4}
            borderRadius="2xl"
            border="1px solid"
            borderColor="rgba(255,255,255,0.1)"
            boxShadow="2xl"
          >
            <Text fontSize="9px" fontFamily="mono" fontWeight="black" textTransform="uppercase" letterSpacing="0.2em" color="whiteAlpha.700" mb={3}>
              Severidade
            </Text>
            <VStack spacing={2} align="start">
              {(Object.entries(SEVERITY_COLORS) as [SeverityLevel, string][]).map(([level, color]) => (
                <HStack key={level} spacing={2}>
                  <Box h="10px" w="10px" borderRadius="sm" bg={color} flexShrink={0} boxShadow={`0 0 6px ${color}88`} />
                  <Text fontSize="9px" color="whiteAlpha.600" textTransform="uppercase" fontWeight="bold">
                    {SEVERITY_LABELS[level]}
                  </Text>
                </HStack>
              ))}
            </VStack>
          </Box>

          {/* Hazard matrix */}
          <HazardMatrixLegend />
        </VStack>
      </Box>

      {/* ── Tile Layer Switcher (bottom-right) ─────────────────────────────── */}
      <Box
        position="absolute"
        bottom={{ base: 4, md: 8 }}
        right={{ base: 4, md: 8 }}
        zIndex={500}
      >
        <VStack spacing={2} align="flex-end">
          {showTilePicker && (
            <Box
              bg="rgba(8,8,15,0.9)"
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
                  px={4}
                  py={2}
                  cursor="pointer"
                  bg={activeTile === key ? 'rgba(0,122,255,0.2)' : 'transparent'}
                  _hover={{ bg: 'whiteAlpha.100' }}
                  borderBottom="1px solid"
                  borderColor="whiteAlpha.50"
                  _last={{ border: 'none' }}
                  onClick={() => { setActiveTile(key); setShowTilePicker(false); }}
                >
                  <HStack spacing={2}>
                    {activeTile === key && (
                      <Box h="6px" w="6px" borderRadius="full" bg="cyan.400" flexShrink={0} />
                    )}
                    <Text
                      fontSize="11px"
                      fontFamily="mono"
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
              bg={showTilePicker ? 'rgba(0,122,255,0.3)' : 'rgba(8,8,15,0.85)'}
              backdropFilter="blur(20px)"
              border="1px solid"
              borderColor={showTilePicker ? 'cyan.500' : 'rgba(255,255,255,0.12)'}
              color={showTilePicker ? 'cyan.300' : 'whiteAlpha.700'}
              _hover={{ bg: 'rgba(0,122,255,0.2)', color: 'white', borderColor: 'cyan.400' }}
              borderRadius="2xl"
              h="48px"
              w="48px"
              boxShadow="0 8px 16px rgba(0,0,0,0.4)"
            />
          </Tooltip>
        </VStack>
      </Box>
    </Box>
  );
}
