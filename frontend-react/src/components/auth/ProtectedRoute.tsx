import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, VStack, Text, Button } from '@chakra-ui/react';
import { ShieldAlert } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { canAccess, getCapabilitiesForRoles, type Capability } from '../../lib/accessControl';
import { normalizeRedirectPath, PUBLIC_TRANSPARENCY_ROUTE } from '../../lib/appRouteManifest';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: string;
  requiredRoles?: string[];
  requiredCapabilities?: Capability[];
}

/**
 * A wrapper component for routes that requires authentication.
 * It also supports optional role-based authorization.
 */
export function ProtectedRoute({
  children,
  requiredRole,
  requiredRoles,
  requiredCapabilities,
}: ProtectedRouteProps) {
  const location = useLocation();
  const authenticated = useAuthStore((state) => state.authenticated);
  const roles = useAuthStore((state) => state.roles);
  const user = useAuthStore((state) => state.user);
  const effectiveRoles = requiredRoles ?? (requiredRole ? [requiredRole] : undefined);

  if (!authenticated) {
    // Save the current location to redirect back after successful login
    localStorage.setItem('sos_login_redirect', normalizeRedirectPath(location.pathname) ?? location.pathname);
    return <Navigate to="/login" replace />;
  }

  const allowed = canAccess({
    authenticated,
    roles,
    requirement: {
      requiredRoles: effectiveRoles,
      requiredCapabilities,
    },
  });

  if (!allowed) {
    const capabilities = getCapabilitiesForRoles(roles);

    // User is authenticated but lacks required role — show access denied
    // DO NOT redirect to /map — that creates a redirect loop with the
    // "PAINEL DE COMANDO" button which navigates back to /app/overview
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
          </Text>
          {!!effectiveRoles?.length && (
            <Text color="whiteAlpha.500" fontSize="sm">
              Roles necessárias: <Text as="span" color="yellow.400" fontFamily="mono">{effectiveRoles.join(', ')}</Text>
            </Text>
          )}
          {!!requiredCapabilities?.length && (
            <Text color="whiteAlpha.500" fontSize="sm">
              Capabilities necessárias: <Text as="span" color="yellow.400" fontFamily="mono">{requiredCapabilities.join(', ')}</Text>
            </Text>
          )}
          <Text color="whiteAlpha.500" fontSize="sm">
            Roles atuais: <Text as="span" color="cyan.400" fontFamily="mono">{roles.join(', ') || 'nenhuma'}</Text>
          </Text>
          <Text color="whiteAlpha.500" fontSize="sm">
            Capabilities atuais: <Text as="span" color="cyan.400" fontFamily="mono">{capabilities.join(', ') || 'nenhuma'}</Text>
          </Text>
          <Button
            as="a"
            href={PUBLIC_TRANSPARENCY_ROUTE}
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
