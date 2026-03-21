import { useState, useEffect } from 'react';
import { MapPin, Plus, Minus, LogIn, LayoutDashboard, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PublicPortalMap } from '../components/public/PublicPortalMap';
import { GamificationHud } from '../components/features/gamification/GamificationHud';
import { LogoFull } from '../components/brand/Logo';
import {
  Box,
  Flex,
  HStack,
  VStack,
  IconButton,
  Portal,
  useBreakpointValue,
  Text,
} from '@chakra-ui/react';
import { useAuthStore } from '../store/authStore';

import { TacticalFeedSidebar } from '../components/ui/TacticalFeedSidebar';
import { PublicFilterBar } from '../components/ui/PublicFilterBar';
import { usePublicMapPage } from '../hooks/usePublicMapPage';
import { GlassPanel } from '../components/atoms/GlassPanel';
import { TacticalText } from '../components/atoms/TacticalText';
import { TacticalButton } from '../components/atoms/TacticalButton';
import { TacticalLoader } from '../components/ui/TacticalLoader';

const SEV_COLORS = {
  critical: '#EF4444',
  high:     '#F97316',
  medium:   '#EAB308',
  low:      '#22C55E',
};

function StatChip({ count, label, color }: { count: number; label: string; color: string }) {
  return (
    <HStack spacing={1.5}>
      <Box h="7px" w="7px" borderRadius="full" bg={color} flexShrink={0} boxShadow={`0 0 6px ${color}88`} />
      <Text fontSize="10px" fontFamily="mono" fontWeight="bold" color={color}>{count}</Text>
      <Text fontSize="10px" fontFamily="mono" color="whiteAlpha.500">{label}</Text>
    </HStack>
  );
}

export function PublicMapPage() {
  const navigate = useNavigate();
  const { authenticated } = useAuthStore();
  const { news, isLoading, filters, setSelectedEvent, selectedEvent, riskSummary, nextRefreshIn } = usePublicMapPage();
  const [showLoader, setShowLoader] = useState(true);

  const isMobile = useBreakpointValue({ base: true, lg: false });

  useEffect(() => {
    const timer = setTimeout(() => setShowLoader(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (showLoader) return <TacticalLoader />;

  const summary = riskSummary?.summary;
  const totalAlerts = news.length;

  return (
    <Box h="100vh" w="full" bg="#08080F" color="white" overflow="hidden" position="relative">

      {/* ── Floating Tactical Header HUD ─────────────────────────── */}
      <Portal>
        <Box
          position="fixed"
          top={{ base: 2, md: 6 }}
          left="50%"
          transform="translateX(-50%)"
          zIndex={100}
          w="calc(100% - 2rem)"
          maxW="1500px"
        >
          <GlassPanel
            px={{ base: 4, md: 8 }}
            h={{ base: 'auto', md: '80px' }}
            py={{ base: 3, md: 0 }}
            borderRadius="3xl"
            depth="float"
            display="flex"
            flexDirection={{ base: 'column', md: 'row' }}
            alignItems="center"
            justifyContent="space-between"
            gap={4}
            border="1px solid"
            borderColor="rgba(255,255,255,0.08)"
          >
            {/* Brand */}
            <HStack spacing={4} w={{ base: 'full', md: 'auto' }} justify="space-between">
              <VStack align="start" spacing={0}>
                <LogoFull />
                <HStack spacing={1.5} mt={0.5}>
                  <Box h="5px" w="5px" borderRadius="full" bg="#34C759" boxShadow="0 0 10px #34C759" className="animate-pulse" />
                  <TacticalText variant="mono" fontSize="9px" color="rgba(255,255,255,0.4)">
                    GUARDIAN_NET_V3 // STABLE
                  </TacticalText>
                </HStack>
              </VStack>

              {/* Live stats strip — desktop inline, hidden on mobile */}
              {!isMobile && summary && (
                <HStack
                  spacing={4}
                  px={4}
                  py={2}
                  bg="rgba(255,255,255,0.04)"
                  borderRadius="xl"
                  border="1px solid"
                  borderColor="rgba(255,255,255,0.07)"
                >
                  <HStack spacing={1}>
                    <Activity size={11} color="rgba(255,255,255,0.4)" />
                    <Text fontSize="10px" fontFamily="mono" color="whiteAlpha.500">{totalAlerts} alertas</Text>
                  </HStack>
                  <Box h="14px" w="1px" bg="whiteAlpha.100" />
                  <StatChip count={summary.critical} label="CRÍTICO" color={SEV_COLORS.critical} />
                  <StatChip count={summary.high}     label="ALTO"    color={SEV_COLORS.high} />
                  <StatChip count={summary.medium}   label="MÉDIO"   color={SEV_COLORS.medium} />
                  <StatChip count={summary.low}      label="BAIXO"   color={SEV_COLORS.low} />
                </HStack>
              )}

              {/* Mobile auth button */}
              {isMobile && (
                <IconButton
                  aria-label="Login"
                  icon={authenticated ? <LayoutDashboard size={20} /> : <LogIn size={20} />}
                  variant="tactical"
                  onClick={() => navigate(authenticated ? '/app/sos' : '/login')}
                  borderRadius="2xl"
                />
              )}
            </HStack>

            {/* Filter bar — desktop only */}
            {!isMobile && (
              <PublicFilterBar
                countryFilter={filters.countryFilter}
                setCountryFilter={filters.setCountryFilter}
                locationFilter={filters.locationFilter}
                setLocationFilter={filters.setLocationFilter}
                timeWindow={filters.timeWindow}
                setTimeWindow={filters.setTimeWindow}
              />
            )}

            {/* Side tools */}
            {!isMobile && (
              <HStack spacing={6}>
                <GamificationHud
                  display={{ base: 'none', xl: 'flex' }}
                  bg="transparent"
                  border="none"
                  boxShadow="none"
                  p={0}
                />
                <TacticalButton
                  variant="tactical"
                  leftIcon={authenticated ? <LayoutDashboard size={18} /> : <LogIn size={18} />}
                  onClick={() => {
                    if (authenticated) {
                      navigate('/app/sos');
                    } else {
                      localStorage.setItem('sos_login_redirect', '/app/sos');
                      navigate('/login');
                    }
                  }}
                  h="48px"
                  px={6}
                  borderRadius="2xl"
                  _hover={{ transform: 'translateY(-1px)', boxShadow: '0 4px 20px rgba(0,122,255,0.3)' }}
                >
                  {authenticated ? 'CENTRAL DE COMANDO' : 'ACESSO RESTRITO'}
                </TacticalButton>
              </HStack>
            )}
          </GlassPanel>
        </Box>
      </Portal>

      <Flex as="main" h="full" w="full" pt={{ base: '80px', md: 0 }}>
        {/* News Feed Sidebar — desktop only */}
        {!isMobile && (
          <TacticalFeedSidebar news={news} isLoading={isLoading} onSelect={setSelectedEvent} />
        )}

        {/* Map */}
        <Box flex={1} position="relative" bg="#050508">
          <PublicPortalMap
            news={news}
            selectedEvent={selectedEvent}
            riskSummary={riskSummary}
            nextRefreshIn={nextRefreshIn}
          />

          {/* HUD Map Controls */}
          <VStack position="absolute" bottom={8} right={8} zIndex={50} spacing={3}>
            <IconButton
              aria-label="Minha Localização"
              icon={<MapPin size={20} />}
              variant="tactical"
              bg="rgba(15,23,42,0.8)"
              h="48px" w="48px"
              borderRadius="2xl"
              boxShadow="0 8px 16px rgba(0,0,0,0.4)"
              _hover={{ bg: 'sos.blue.500', transform: 'scale(1.05)' }}
            />
            <VStack
              spacing={0}
              bg="rgba(15,23,42,0.8)"
              backdropFilter="blur(24px)"
              borderRadius="2xl"
              border="1px solid"
              borderColor="rgba(255,255,255,0.1)"
              boxShadow="2xl"
            >
              <IconButton
                aria-label="Aumentar Zoom"
                icon={<Plus size={20} />}
                variant="ghost"
                h="48px" w="48px"
                borderRadius="0"
                borderTopRadius="2xl"
                color="whiteAlpha.700"
                _hover={{ color: 'white', bg: 'rgba(255,255,255,0.06)' }}
              />
              <Box w="60%" h="1px" bg="rgba(255,255,255,0.06)" />
              <IconButton
                aria-label="Diminuir Zoom"
                icon={<Minus size={20} />}
                variant="ghost"
                h="48px" w="48px"
                borderRadius="0"
                borderBottomRadius="2xl"
                color="whiteAlpha.700"
                _hover={{ color: 'white', bg: 'rgba(255,255,255,0.06)' }}
              />
            </VStack>
          </VStack>

          {/* Mobile Filter Overlay */}
          {isMobile && (
            <Box position="absolute" top={4} left={4} right={4} zIndex={40}>
              <PublicFilterBar
                countryFilter={filters.countryFilter}
                setCountryFilter={filters.setCountryFilter}
                locationFilter={filters.locationFilter}
                setLocationFilter={filters.setLocationFilter}
                timeWindow={filters.timeWindow}
                setTimeWindow={filters.setTimeWindow}
              />
            </Box>
          )}
        </Box>
      </Flex>
    </Box>
  );
}
