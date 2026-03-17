import { useState, useEffect } from 'react';
import { MapPin, Plus, Minus, LogIn, LayoutDashboard } from 'lucide-react';
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
  useBreakpointValue
} from '@chakra-ui/react';
import { useAuthStore } from '../store/authStore';

// Atomic & Hooks
import { TacticalFeedSidebar } from '../components/ui/TacticalFeedSidebar';
import { PublicFilterBar } from '../components/ui/PublicFilterBar';
import { usePublicMapPage } from '../hooks/usePublicMapPage';
import { GlassPanel } from '../components/atoms/GlassPanel';
import { TacticalText } from '../components/atoms/TacticalText';
import { TacticalButton } from '../components/atoms/TacticalButton';
import { TacticalLoader } from '../components/ui/TacticalLoader';

/**
 * Public Map Terminal — Guardian v3
 * Redesigned for maximum visual impact and structural clarity.
 * Uses the concept of "Guardian Terminal" for the citizen interface.
 */
export function PublicMapPage() {
  const navigate = useNavigate();
  const { authenticated } = useAuthStore();
  const { news, isLoading, filters, setSelectedEvent, selectedEvent } = usePublicMapPage();
  const [showLoader, setShowLoader] = useState(true);
  
  const isMobile = useBreakpointValue({ base: true, lg: false });

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLoader(false);
    }, 2000); 
    return () => clearTimeout(timer);
  }, []);

  if (showLoader) return <TacticalLoader />;

  return (
    <Box h="100vh" w="full" bg="#08080F" color="white" overflow="hidden" position="relative">
      
      {/* Floating Tactical Header HUD */}
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
            h={{ base: "auto", md: "80px" }} 
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
            {/* Brand Section */}
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
              
              {/* Mobile Auth Button */}
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

            {/* Central Filter Bar */}
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

            {/* Side Tools & Action */}
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
                  _hover={{ transform: 'translateY(-1px)', boxShadow: '0 4px 20px rgba(0, 122, 255, 0.3)' }}
                >
                  {authenticated ? 'CENTRAL DE COMANDO' : 'ACESSO RESTRITO'}
                </TacticalButton>
              </HStack>
            )}
          </GlassPanel>
        </Box>
      </Portal>

      <Flex as="main" h="full" w="full" pt={{ base: "80px", md: 0 }}>
        {/* News Feed - Left Side (Hidden on mobile for now or collapsed) */}
        {!isMobile && (
          <TacticalFeedSidebar news={news} isLoading={isLoading} onSelect={setSelectedEvent} />
        )}

        {/* Global GIS Visualizer */}
        <Box flex={1} position="relative" bg="#050508">
          <PublicPortalMap news={news} selectedEvent={selectedEvent} />
          
          {/* HUD Map Controls */}
          <VStack position="absolute" bottom={8} right={8} zIndex={50} spacing={3}>
             <IconButton 
              aria-label="Minha Localização" 
              icon={<MapPin size={20} />} 
              variant="tactical"
              bg="rgba(15, 23, 42, 0.8)"
              h="48px" w="48px"
              borderRadius="2xl"
              boxShadow="0 8px 16px rgba(0,0,0,0.4)"
              _hover={{ bg: 'sos.blue.500', transform: 'scale(1.05)' }}
             />
             <VStack spacing={0} bg="rgba(15, 23, 42, 0.8)" backdropFilter="blur(24px)" borderRadius="2xl" border="1px solid" borderColor="rgba(255,255,255,0.1)" boxShadow="2xl">
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

          {/* Mobile Search/Filter Overlay */}
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
