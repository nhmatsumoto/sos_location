import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Container, 
  Heading, 
  Text, 
  VStack, 
  HStack, 
  Icon, 
  Button, 
  Grid, 
  GridItem,
  Circle
} from '@chakra-ui/react';
import { 
  Shield, 
  ChevronRight, 
  Activity, 
  Globe, 
  Compass,
  Heart
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Logo } from '../components/brand/Logo';

export function OnboardingPage() {
  const { i18n } = useTranslation();
  const navigate = useNavigate();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const handlePublicEntry = () => {
    localStorage.setItem('sos_onboarding_visited', 'true');
    navigate('/transparency');
  };

  const handleLoginEntry = () => {
    localStorage.setItem('sos_onboarding_visited', 'true');
    navigate('/login');
  };

  return (
    <Box 
      minH="100vh" 
      bg="sos.dark" 
      color="white" 
      position="relative" 
      overflow="hidden"
      display="flex"
      flexDirection="column"
    >
      {/* Background Ambience */}
      <Box 
        position="absolute" 
        top="-10%" 
        right="-5%" 
        w="50%" 
        h="50%" 
        bg="blue.900"
        opacity={0.1}
        filter="blur(120px)" 
        borderRadius="full" 
        zIndex={0}
      />
      <Box 
        position="absolute" 
        bottom="-10%" 
        left="-5%" 
        w="40%" 
        h="40%" 
        bg="cyan.900"
        opacity={0.1}
        filter="blur(100px)" 
        borderRadius="full" 
        zIndex={0}
      />

      {/* Top Navbar / Language Selection */}
      <Container maxW="container.xl" pt={8} position="relative" zIndex={20}>
        <HStack justify="space-between" align="center">
          <HStack spacing={4}>
            <Logo w="32px" h="32px" color="cyan.400" />
            <Text fontWeight="900" letterSpacing="0.2em" fontSize="sm">
              SOS <span style={{ color: '#FF3B30' }}>LOCATION</span>
            </Text>
          </HStack>
          
          <HStack spacing={2}>
            {['pt', 'en', 'ja'].map((lng) => (
              <Button
                key={lng}
                size="xs"
                variant={i18n.language.startsWith(lng) ? 'solid' : 'ghost'}
                colorScheme={i18n.language.startsWith(lng) ? 'blue' : 'gray'}
                onClick={() => changeLanguage(lng)}
                fontWeight="900"
                textTransform="uppercase"
                borderRadius="md"
              >
                {lng}
              </Button>
            ))}
          </HStack>
        </HStack>
      </Container>

      {/* Main Content */}
      <Container maxW="container.lg" flex={1} display="flex" flexDirection="column" justifyContent="center" py={12} position="relative" zIndex={10}>
        <VStack spacing={16} align="center">
          
          <VStack spacing={6} align="center" textAlign="center" maxW="3xl">
            <VStack spacing={3}>
              <Text 
                textTransform="uppercase" 
                letterSpacing="0.5em" 
                fontSize="xs" 
                color="cyan.400" 
                fontWeight="black"
              >
                // guardian beacon protocol
              </Text>
              <Heading 
                size="3xl" 
                fontWeight="black" 
                lineHeight="0.9" 
                letterSpacing="tighter"
              >
                Tecnologia tática para <br />
                <span style={{ color: 'transparent', WebkitTextStroke: '1px rgba(255,255,255,0.8)' }}>proteger o futuro</span>
              </Heading>
            </VStack>
            
            <Text 
              fontSize={{ base: 'md', md: 'xl' }} 
              color="whiteAlpha.600" 
              fontWeight="medium" 
              lineHeight="relaxed"
            >
              Transformando incerteza em inteligência situacional. <br />
              Nascido com um propósito: salvar vidas através do conhecimento técnico.
            </Text>
          </VStack>

          <Grid 
            templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} 
            gap={6} 
            w="full" 
            maxW="900px"
          >
            {/* Public Observer Path */}
            <GridItem>
              <Box 
                as="button"
                onClick={handlePublicEntry}
                w="full"
                h="full"
                p={10}
                textAlign="left"
                borderRadius="3xl"
                bg="whiteAlpha.50"
                border="1px solid"
                borderColor="whiteAlpha.100"
                
                position="relative"
                overflow="hidden"
                transition="all 0.4s cubic-bezier(0.23, 1, 0.32, 1)"
                _hover={{ 
                  borderColor: 'blue.500', 
                  bg: 'whiteAlpha.100',
                  transform: 'translateY(-4px)',
                  boxShadow: '0 20px 40px -20px rgba(59, 130, 246, 0.3)'
                }}
                className="group"
              >
                <VStack align="flex-start" spacing={6}>
                  <Circle size="60px" bg="blue.500" opacity={0.1} transition="transform 0.4s" _groupHover={{ transform: 'scale(1.1) rotate(5deg)', opacity: 0.2 }}>
                    <Icon as={Compass} boxSize={30} color="blue.400" />
                  </Circle>
                  
                  <Box>
                    <Heading size="md" mb={2}>Portal de Transparência</Heading>
                    <Text fontSize="sm" color="whiteAlpha.700" lineHeight="relaxed">
                      Visualize o mapa de incidentes, áreas de risco e hotspots em tempo real. Acesso aberto para a comunidade.
                    </Text>
                  </Box>

                  <HStack color="blue.400" fontWeight="black" fontSize="xs" textTransform="uppercase" letterSpacing="widest" spacing={2}>
                    Explorar Agora <Icon as={ChevronRight} boxSize={3} />
                  </HStack>
                </VStack>
              </Box>
            </GridItem>

            {/* Operational Path */}
            <GridItem>
              <Box 
                as="button"
                onClick={handleLoginEntry}
                w="full"
                h="full"
                p={10}
                textAlign="left"
                borderRadius="3xl"
                bg="whiteAlpha.50"
                border="1px solid"
                borderColor="whiteAlpha.100"
                
                position="relative"
                overflow="hidden"
                transition="all 0.4s cubic-bezier(0.23, 1, 0.32, 1)"
                _hover={{ 
                  borderColor: 'cyan.500', 
                  bg: 'whiteAlpha.100',
                  transform: 'translateY(-4px)',
                  boxShadow: '0 20px 40px -20px rgba(6, 182, 212, 0.3)'
                }}
                className="group"
              >
                <VStack align="flex-start" spacing={6}>
                  <Circle size="60px" bg="cyan.500" opacity={0.1} transition="transform 0.4s" _groupHover={{ transform: 'scale(1.1) rotate(-5deg)', opacity: 0.2 }}>
                    <Icon as={Shield} boxSize={30} color="cyan.400" />
                  </Circle>
                  
                  <Box>
                    <Heading size="md" mb={2}>Painel Operacional</Heading>
                    <Text fontSize="sm" color="whiteAlpha.700" lineHeight="relaxed">
                      War Room tática para Defesa Civil, Equipes de Resgate e Voluntários. Requer autenticação de segurança.
                    </Text>
                  </Box>

                  <HStack color="cyan.400" fontWeight="black" fontSize="xs" textTransform="uppercase" letterSpacing="widest" spacing={2}>
                    Acessar Comando <Icon as={ChevronRight} boxSize={3} />
                  </HStack>
                </VStack>
                
                {/* Tactical Indicator */}
                <Box position="absolute" top={4} right={4}>
                  <Icon as={Activity} boxSize={4} color="cyan.500" opacity={0.2} />
                </Box>
              </Box>
            </GridItem>
          </Grid>
        </VStack>
      </Container>

      {/* Footer */}
      <Box py={8} borderTop="1px solid" borderColor="whiteAlpha.50" position="relative" zIndex={10}>
        <Container maxW="container.xl">
          <HStack justify="space-between" wrap="wrap" spacing={4}>
            <Text fontSize="10px" color="whiteAlpha.400" fontFamily="mono" textTransform="uppercase" letterSpacing="widest">
              © 2026 SOS Location • City-Scale Intelligence • v2.0.0
            </Text>
            
            <HStack spacing={6}>
              <HStack spacing={2}>
                <Icon as={Globe} boxSize={3} color="whiteAlpha.400" />
                <Text fontSize="10px" color="whiteAlpha.400">DISTRIBUÍDO</Text>
              </HStack>
              <HStack spacing={2}>
                <Icon as={Heart} boxSize={3} color="red.500" opacity={0.3} />
                <Text fontSize="10px" color="whiteAlpha.400">HUMANITÁRIO</Text>
              </HStack>
            </HStack>
          </HStack>
        </Container>
      </Box>
    </Box>
  );
}
