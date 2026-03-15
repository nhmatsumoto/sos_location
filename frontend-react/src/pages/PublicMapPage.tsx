import { MapPin, Plus, Minus, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PublicPortalMap } from '../components/public/PublicPortalMap';
import { GamificationHud } from '../components/gamification/GamificationHud';
import { LogoFull } from '../components/brand/Logo';
import { 
  Box, 
  Flex, 
  HStack, 
  VStack, 
  IconButton, 
  Portal,
  Tooltip
} from '@chakra-ui/react';

// Atomic & Hooks
import { TacticalFeedSidebar } from '../components/ui/TacticalFeedSidebar';
import { PublicFilterBar } from '../components/ui/PublicFilterBar';
import { usePublicMapPage } from '../hooks/usePublicMapPage';
import { GlassPanel } from '../components/atoms/GlassPanel';
import { TacticalText } from '../components/atoms/TacticalText';

/**
 * Public Map Terminal
 * Redesigned for maximum visual impact and structural clarity.
 * Uses the concept of "Guardian Terminal" for the citizen interface.
 */
export function PublicMapPage() {
  const navigate = useNavigate();
  const { news, isLoading, filters } = usePublicMapPage();

  return (
    <Box h="100vh" w="full" bg="sos.dark" color="white" overflow="hidden" position="relative">
      
      {/* Premium Floating Header */}
      <Portal>
        <Box 
          position="fixed" 
          top={6} 
          left="50%" 
          transform="translateX(-50%)" 
          zIndex={100} 
          w="calc(100% - 3rem)" 
          maxW="1400px"
        >
          <GlassPanel px={8} h="80px" borderRadius="3xl" display="flex" alignItems="center" justifyContent="space-between" boxShadow="2xl">
            {/* Brand Section */}
            <Box>
              <LogoFull />
              <HStack spacing={1.5} mt={1}>
                <Box h="6px" w="6px" borderRadius="full" bg="sos.green.500" boxShadow="0 0 8px rgba(0, 255, 102, 0.4)" className="animate-pulse" />
                <TacticalText variant="mono" color="whiteAlpha.500">
                  Guardian Network Active // V2.0
                </TacticalText>
              </HStack>
            </Box>

            {/* Central Filter Bar */}
            <PublicFilterBar 
              countryFilter={filters.countryFilter}
              setCountryFilter={filters.setCountryFilter}
              locationFilter={filters.locationFilter}
              setLocationFilter={filters.setLocationFilter}
            />

            {/* Side Tools */}
            <HStack spacing={6}>
              <GamificationHud 
                xp={3420} 
                level={42} 
                rank="Sentinel III" 
                nextLevelXp={5000}
                display={{ base: 'none', xl: 'flex' }}
                bg="transparent"
                border="none"
                boxShadow="none"
                p={0}
              />
              <Tooltip label="Efetuar Acesso Profissional">
                <IconButton
                  aria-label="Login"
                  icon={<LogIn size={20} />}
                  variant="tactical"
                  onClick={() => navigate('/login')}
                  h="50px"
                  w="50px"
                  borderRadius="2xl"
                  _hover={{ transform: 'scale(1.05)' }}
                />
              </Tooltip>
            </HStack>
          </GlassPanel>
        </Box>
      </Portal>

      <Flex as="main" h="full" w="full">
        {/* News Feed - Left Side */}
        <TacticalFeedSidebar news={news} isLoading={isLoading} />

        {/* Global GIS Visualizer */}
        <Box flex={1} position="relative">
          <PublicPortalMap news={news} />
          
          {/* HUD Map Controls */}
          <VStack position="absolute" bottom={10} right={10} zIndex={50} spacing={3}>
             <IconButton 
              aria-label="Minha Localização" 
              icon={<MapPin size={20} />} 
              variant="tactical"
              h="50px"
              w="50px"
              borderRadius="2xl"
             />
             <VStack spacing={0} bg="rgba(15, 23, 42, 0.6)" backdropFilter="blur(24px)" borderRadius="2xl" border="1px solid" borderColor="whiteAlpha.100" boxShadow="xl">
               <IconButton 
                aria-label="Aumentar Zoom" 
                icon={<Plus size={20} />} 
                variant="ghost"
                h="50px"
                w="50px"
                borderRadius="0"
                borderTopRadius="2xl"
                color="whiteAlpha.600"
                _hover={{ color: 'white', bg: 'whiteAlpha.100' }}
               />
               <Box w="60%" h="1px" bg="whiteAlpha.100" />
               <IconButton 
                aria-label="Diminuir Zoom" 
                icon={<Minus size={20} />} 
                variant="ghost"
                h="50px"
                w="50px"
                borderRadius="0"
                borderBottomRadius="2xl"
                color="whiteAlpha.600"
                _hover={{ color: 'white', bg: 'whiteAlpha.100' }}
               />
             </VStack>
          </VStack>
        </Box>
      </Flex>
    </Box>
  );
}
