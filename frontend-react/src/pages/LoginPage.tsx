import { 
  Box, 
  Container, 
  VStack, 
  Circle,
  Link as ChakraLink,
  Divider,
  HStack
} from '@chakra-ui/react';
import { LogIn, ArrowLeft, UserPlus } from 'lucide-react';
import { Logo } from '../components/brand/Logo';
import { useLoginPage } from '../hooks/useLoginPage';
import { TacticalButton } from '../components/atoms/TacticalButton';
import { TacticalText } from '../components/atoms/TacticalText';
import { GlassPanel } from '../components/atoms/GlassPanel';

/**
 * Tactical Login Terminal
 * The gateway to the Guardian Operating System.
 * Redesigned with Atomic Design and premium glassmorphism.
 */
export function LoginPage() {
  const { handleLogin, handleRegister, goHome } = useLoginPage();

  return (
    <Box 
      minH="100vh" 
      bg="sos.dark" 
      color="white" 
      display="flex" 
      flexDirection="column" 
      alignItems="center" 
      justifyContent="center" 
      p={6} 
      position="relative" 
      overflow="hidden"
      className="bg-mesh animate-mesh-flow"
    >
      {/* Decorative Scanline */}
      <Box 
        position="absolute" 
        top={0} 
        left={0} 
        right={0} 
        h="1px" 
        bg="sos.blue.500"
        opacity={0.1}
        className="animate-scanline" 
        zIndex={1}
      />

      <Container maxW="md" position="relative" zIndex={10}>
        <TacticalButton 
          variant="ghost" 
          leftIcon={<ArrowLeft size={16} />}
          mb={8}
          onClick={goHome}
          borderColor="transparent"
          _hover={{ bg: 'whiteAlpha.100', borderColor: 'whiteAlpha.200' }}
        >
          Voltar ao Início
        </TacticalButton>

        <GlassPanel 
          p={{ base: 8, md: 10 }} 
          borderRadius="3xl" 
          intensity="high"
        >
          <VStack spacing={10} align="center">
            
            {/* Header Branding */}
            <VStack spacing={4} align="center">
              <Circle 
                size="80px" 
                bg="sos.blue.500/10" 
                border="1px solid" 
                borderColor="sos.blue.500/30"
                className="animate-glow"
              >
                <Logo w="44px" h="44px" />
              </Circle>
              
              <VStack spacing={1}>
                <TacticalText variant="heading" fontSize="xl" letterSpacing="tight">
                  Portal de Acesso
                </TacticalText>
                <TacticalText textAlign="center">
                  Autenticação segura via Keycloak SSO para operadores e equipes de apoio.
                </TacticalText>

                {/* Secure Context Warning */}
                {!window.isSecureContext && window.location.hostname === '0.0.0.0' && (
                  <Box p={3} bg="red.900/40" border="1px solid" borderColor="red.500/50" borderRadius="xl" mt={4}>
                    <TacticalText fontSize="xs" color="red.200" textAlign="center">
                      ⚠ <strong>CONTEÚDO NÃO SEGURO:</strong> O navegador bloqueia a autenticação em 0.0.0.0. 
                      Utilize <strong>localhost:8088</strong> ou <strong>127.0.0.1:8088</strong> para prosseguir.
                    </TacticalText>
                  </Box>
                )}
              </VStack>
            </VStack>

            {/* Actions */}
            <VStack w="full" spacing={5}>
              <TacticalButton
                glow
                w="full"
                h="64px"
                bg="sos.blue.500"
                color="white"
                fontSize="sm"
                onClick={handleLogin}
                _hover={{ bg: 'sos.blue.400', transform: 'scale(1.02)' }}
              >
                <LogIn size={20} style={{ marginRight: '12px' }} />
                Entrar no Sistema
              </TacticalButton>

              <HStack w="full" px={4}>
                <Divider borderColor="whiteAlpha.100" />
                <TacticalText opacity={0.3} px={2}>OU</TacticalText>
                <Divider borderColor="whiteAlpha.100" />
              </HStack>

              <TacticalButton
                w="full"
                h="64px"
                variant="ghost"
                borderColor="whiteAlpha.200"
                onClick={handleRegister}
                _hover={{ bg: 'whiteAlpha.100', borderColor: 'whiteAlpha.400' }}
              >
                <UserPlus size={20} style={{ marginRight: '12px' }} />
                Criar Nova Conta
              </TacticalButton>
            </VStack>

            {/* Terminal Info */}
            <Box textAlign="center" pt={4}>
              <TacticalText variant="mono" opacity={0.4} letterSpacing="0.3em">
                Acesso Restrito • Monitoramento Ativo
              </TacticalText>
            </Box>
          </VStack>
        </GlassPanel>
        
        <Box mt={10} textAlign="center">
          <TacticalText variant="caption">
            Problemas com o acesso?{' '}
            <ChakraLink href="#" color="sos.blue.400">Contate o suporte tático</ChakraLink>
          </TacticalText>
        </Box>
      </Container>
    </Box>
  );
}
