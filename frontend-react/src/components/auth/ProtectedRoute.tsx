import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Box, VStack, Text, Button } from '@chakra-ui/react';
import { ShieldAlert } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: string;
}

/**
 * A wrapper component for routes that requires authentication.
 * It also supports optional role-based authorization.
 */
export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const location = useLocation();
  const authenticated = useAuthStore((state) => state.authenticated);
  const roles = useAuthStore((state) => state.roles);
  const user = useAuthStore((state) => state.user);

  if (!authenticated) {
    // Save the current location to redirect back after successful login
    localStorage.setItem('sos_login_redirect', location.pathname);
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && !roles.includes(requiredRole)) {
    // User is authenticated but lacks required role — show access denied
    // DO NOT redirect to /map — that creates a redirect loop with the
    // "PAINEL DE COMANDO" button which navigates back to /app/sos
    return (
      <Box
        h="100vh"
        w="full"
        bg="gray.900"
        display="flex"
        alignItems="center"
        justifyContent="center"
        color="white"
      >
        <VStack spacing={6} textAlign="center" p={8}>
          <Box color="red.400">
            <ShieldAlert size={64} />
          </Box>
          <Text fontSize="2xl" fontWeight="bold" color="red.400">
            Acesso Restrito
          </Text>
          <Text color="whiteAlpha.700" fontSize="md" maxW="400px">
            {user?.name ? `${user.name}, ` : ''}Você não possui a permissão necessária para acessar esta área.
            {requiredRole && (
              <Text as="span" display="block" mt={2} color="whiteAlpha.500" fontSize="sm">
                Role necessária: <Text as="span" color="yellow.400" fontFamily="mono">{requiredRole}</Text>
                {". Roles atuais: "}
                <Text as="span" color="cyan.400" fontFamily="mono">{roles.join(', ') || 'nenhuma'}</Text>
              </Text>
            )}
          </Text>
          <Button
            as="a"
            href="/transparency"
            colorScheme="blue"
            variant="outline"
            size="md"
          >
            Voltar ao Portal de Transparência
          </Button>
        </VStack>
      </Box>
    );
  }

  return <>{children}</>;
}
