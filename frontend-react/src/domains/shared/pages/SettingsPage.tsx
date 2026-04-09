import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Circle,
  Container,
  Divider,
  FormControl,
  FormLabel,
  HStack,
  Heading,
  Icon,
  SimpleGrid,
  Switch,
  Text,
  VStack,
  useToast,
} from '@chakra-ui/react';
import {
  BellRing,
  Database,
  Key,
  LogOut,
  RefreshCw,
  Save,
  Satellite,
  Settings,
  ShieldCheck,
  ShieldEllipsis,
  UserRound,
  Volume2,
} from 'lucide-react';
import { getCapabilitiesForRoles } from '../../../lib/accessControl';
import { getSessionToken } from '../../../lib/authSession';
import { doLogout, getActiveSessionToken, keycloak, refreshSessionToken } from '../../../lib/keycloak';
import { useAuthStore } from '../../../store/authStore';

interface SettingsPreferences {
  autoRefresh: boolean;
  criticalNotifications: boolean;
  precisionMode: boolean;
  tacticalAudio: boolean;
}

interface PersistedSettingsState {
  preferences: SettingsPreferences;
  updatedAt: string | null;
}

const SETTINGS_STORAGE_KEY = 'sos-location-settings';

const DEFAULT_PREFERENCES: SettingsPreferences = {
  autoRefresh: true,
  criticalNotifications: true,
  precisionMode: false,
  tacticalAudio: false,
};

const loadPersistedSettings = (): PersistedSettingsState => {
  if (typeof window === 'undefined') {
    return { preferences: DEFAULT_PREFERENCES, updatedAt: null };
  }

  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      return { preferences: DEFAULT_PREFERENCES, updatedAt: null };
    }

    const parsed = JSON.parse(raw) as Partial<PersistedSettingsState>;
    return {
      preferences: {
        ...DEFAULT_PREFERENCES,
        ...(parsed.preferences ?? {}),
      },
      updatedAt: parsed.updatedAt ?? null,
    };
  } catch {
    return { preferences: DEFAULT_PREFERENCES, updatedAt: null };
  }
};

const formatDateTime = (value: Date | string | null) => {
  if (!value) return 'N/A';

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';

  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const maskToken = (token: string | null) => {
  if (!token) return 'NO_ACTIVE_TOKEN';
  if (token.length <= 32) return token;
  return `${token.slice(0, 20)}...${token.slice(-16)}`;
};

export function SettingsPage() {
  const toast = useToast();
  const user = useAuthStore((state) => state.user);
  const authenticated = useAuthStore((state) => state.authenticated);
  const roles = useAuthStore((state) => state.roles);
  const tokenFromStore = useAuthStore((state) => state.token);
  const [settingsState, setSettingsState] = useState<PersistedSettingsState>(() => loadPersistedSettings());
  const [sessionToken, setSessionToken] = useState<string | null>(() => getActiveSessionToken() ?? tokenFromStore ?? getSessionToken());
  const [sessionStatus, setSessionStatus] = useState('SESSION_ACTIVE // KEYCLOAK');
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const capabilities = useMemo(() => getCapabilitiesForRoles(roles), [roles]);
  const sessionExpiresAt = keycloak.tokenParsed?.exp ? new Date(keycloak.tokenParsed.exp * 1000) : null;
  const keycloakRealm = import.meta.env.VITE_KEYCLOAK_REALM || 'sos-location';
  const keycloakClient = import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'sos-location-frontend';
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;

  useEffect(() => {
    setSessionToken(getActiveSessionToken() ?? tokenFromStore ?? getSessionToken());
  }, [tokenFromStore, roles]);

  const handlePreferenceChange = (key: keyof SettingsPreferences, value: boolean) => {
    setSettingsState((current) => ({
      ...current,
      preferences: {
        ...current.preferences,
        [key]: value,
      },
    }));
  };

  const handleSavePreferences = () => {
    setSaving(true);

    try {
      const nextState: PersistedSettingsState = {
        preferences: settingsState.preferences,
        updatedAt: new Date().toISOString(),
      };

      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(nextState));
      setSettingsState(nextState);
      setSessionStatus('PREFERENCES_PERSISTED // LOCAL_PROFILE_UPDATED');
      toast({
        title: 'Preferências salvas',
        description: 'As configurações locais foram persistidas neste navegador.',
        status: 'success',
        duration: 2500,
        isClosable: true,
      });
    } catch {
      setSessionStatus('PREFERENCES_SAVE_FAILED // STORAGE_UNAVAILABLE');
      toast({
        title: 'Falha ao salvar preferências',
        description: 'Não foi possível persistir as configurações locais.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRefreshSession = async () => {
    setRefreshing(true);

    const refreshed = await refreshSessionToken(120);
    const nextToken = getActiveSessionToken() ?? tokenFromStore ?? getSessionToken();
    setSessionToken(nextToken);

    if (!keycloak.authenticated) {
      setSessionStatus('SESSION_EXPIRED // REAUTH_REQUIRED');
      setRefreshing(false);
      return;
    }

    setSessionStatus(refreshed ? 'TOKEN_REFRESHED // SESSION_EXTENDED' : 'SESSION_VALID // TOKEN_STILL_FRESH');
    toast({
      title: refreshed ? 'Token renovado' : 'Sessão válida',
      description: refreshed ? 'A sessão foi estendida com sucesso.' : 'O token atual ainda estava dentro da validade.',
      status: 'success',
      duration: 2500,
      isClosable: true,
    });

    setRefreshing(false);
  };

  const services = [
    {
      name: 'Identity / Keycloak',
      status: authenticated ? 'Connected' : 'Offline',
      detail: `${keycloakRealm} / ${keycloakClient}`,
      icon: ShieldCheck,
      color: authenticated ? 'sos.green.500' : 'orange.400',
    },
    {
      name: 'GIS Data Engine',
      status: settingsState.preferences.precisionMode ? 'High Precision' : 'Operational',
      detail: settingsState.preferences.precisionMode ? 'precision_mode=enabled' : 'precision_mode=standard',
      icon: Satellite,
      color: settingsState.preferences.precisionMode ? 'sos.blue.400' : 'sos.green.500',
    },
    {
      name: 'Notifications Bus',
      status: settingsState.preferences.criticalNotifications ? 'Priority Alerts' : 'Muted',
      detail: settingsState.preferences.criticalNotifications ? 'critical_alerts=enabled' : 'critical_alerts=disabled',
      icon: BellRing,
      color: settingsState.preferences.criticalNotifications ? 'sos.green.500' : 'orange.400',
    },
    {
      name: 'Primary API',
      status: 'Operational',
      detail: apiBaseUrl,
      icon: Database,
      color: 'sos.green.500',
    },
  ];

  return (
    <Box minH="100vh" bg="sos.dark" py={8}>
      <Container maxW="container.xl">
        <VStack align="stretch" spacing={8}>
          <HStack justify="space-between" align="flex-start" gap={4}>
            <VStack align="flex-start" spacing={1}>
              <HStack>
                <Icon as={Settings} color="sos.blue.500" />
                <Heading size="md" color="white" textTransform="uppercase" letterSpacing="widest">
                  Centro de <Text as="span" color="sos.blue.400">Configurações</Text>
                </Heading>
              </HStack>
              <Text fontSize="xs" color="whiteAlpha.500" fontFamily="mono">
                SESSION_CONTROL // ACCESS_PROFILE // LOCAL_PREFERENCES
              </Text>
            </VStack>
            <HStack spacing={3}>
              <Button variant="ghost" leftIcon={<RefreshCw size={16} />} isLoading={refreshing} onClick={() => void handleRefreshSession()}>
                Atualizar Sessão
              </Button>
              <Button variant="tactical" leftIcon={<Save size={16} />} isLoading={saving} onClick={handleSavePreferences}>
                Salvar Preferências
              </Button>
            </HStack>
          </HStack>

          <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={8}>
            <Box bg="rgba(15, 23, 42, 0.4)" borderRadius="3xl" border="1px solid" borderColor="whiteAlpha.100" p={6}>
              <VStack align="stretch" spacing={6}>
                <Heading size="xs" color="white" textTransform="uppercase" letterSpacing="widest">
                  Preferências Locais
                </Heading>
                <VStack align="stretch" spacing={4}>
                  <FormControl display="flex" alignItems="center" justifyContent="space-between">
                    <FormLabel mb="0" fontSize="sm" color="whiteAlpha.800">Atualização Automática</FormLabel>
                    <Switch colorScheme="blue" isChecked={settingsState.preferences.autoRefresh} onChange={(event) => handlePreferenceChange('autoRefresh', event.target.checked)} />
                  </FormControl>
                  <Divider borderColor="whiteAlpha.100" />
                  <FormControl display="flex" alignItems="center" justifyContent="space-between">
                    <FormLabel mb="0" fontSize="sm" color="whiteAlpha.800">Notificações Críticas</FormLabel>
                    <Switch colorScheme="red" isChecked={settingsState.preferences.criticalNotifications} onChange={(event) => handlePreferenceChange('criticalNotifications', event.target.checked)} />
                  </FormControl>
                  <Divider borderColor="whiteAlpha.100" />
                  <FormControl display="flex" alignItems="center" justifyContent="space-between">
                    <FormLabel mb="0" fontSize="sm" color="whiteAlpha.800">Modo de Alta Precisão</FormLabel>
                    <Switch colorScheme="teal" isChecked={settingsState.preferences.precisionMode} onChange={(event) => handlePreferenceChange('precisionMode', event.target.checked)} />
                  </FormControl>
                  <Divider borderColor="whiteAlpha.100" />
                  <FormControl display="flex" alignItems="center" justifyContent="space-between">
                    <FormLabel mb="0" fontSize="sm" color="whiteAlpha.800">Áudio Tático</FormLabel>
                    <Switch colorScheme="purple" isChecked={settingsState.preferences.tacticalAudio} onChange={(event) => handlePreferenceChange('tacticalAudio', event.target.checked)} />
                  </FormControl>
                </VStack>

                <Box pt={2}>
                  <HStack justify="space-between" mb={2}>
                    <Text fontSize="10px" color="whiteAlpha.400">Última persistência</Text>
                    <Icon as={Volume2} boxSize={4} color="sos.blue.400" />
                  </HStack>
                  <Badge bg="sos.blue.900" color="sos.blue.100" borderRadius="md" py={1} px={2} fontSize="9px" fontFamily="mono">
                    {formatDateTime(settingsState.updatedAt)}
                  </Badge>
                </Box>
              </VStack>
            </Box>

            <Box bg="rgba(15, 23, 42, 0.4)" borderRadius="3xl" border="1px solid" borderColor="whiteAlpha.100" p={6}>
              <VStack align="stretch" spacing={5}>
                <Heading size="xs" color="white" textTransform="uppercase" letterSpacing="widest">
                  Sessão e Acesso
                </Heading>

                <HStack spacing={4} align="center">
                  <Circle size="44px" bg="whiteAlpha.50">
                    <Icon as={UserRound} boxSize={5} color="sos.blue.400" />
                  </Circle>
                  <VStack align="flex-start" spacing={0}>
                    <Text fontSize="sm" fontWeight="bold" color="white">{user?.name || user?.preferredUsername || 'Operador'}</Text>
                    <Text fontSize="xs" color="whiteAlpha.500">{user?.email || 'sem email federado'}</Text>
                  </VStack>
                </HStack>

                <SimpleGrid columns={2} spacing={3}>
                  <Box p={3} bg="whiteAlpha.50" borderRadius="xl">
                    <Text fontSize="10px" color="whiteAlpha.400" mb={1}>STATUS</Text>
                    <Badge colorScheme={authenticated ? 'green' : 'red'}>{authenticated ? 'Authenticated' : 'Offline'}</Badge>
                  </Box>
                  <Box p={3} bg="whiteAlpha.50" borderRadius="xl">
                    <Text fontSize="10px" color="whiteAlpha.400" mb={1}>EXPIRA EM</Text>
                    <Text fontSize="xs" color="white" fontFamily="mono">{formatDateTime(sessionExpiresAt)}</Text>
                  </Box>
                </SimpleGrid>

                <Box>
                  <Text fontSize="10px" color="whiteAlpha.400" mb={2}>ROLES</Text>
                  <HStack spacing={2} flexWrap="wrap">
                    {roles.length > 0 ? roles.map((role) => (
                      <Badge key={role} colorScheme="cyan" variant="subtle">{role}</Badge>
                    )) : <Badge variant="subtle">none</Badge>}
                  </HStack>
                </Box>

                <Box>
                  <Text fontSize="10px" color="whiteAlpha.400" mb={2}>CAPABILITIES</Text>
                  <HStack spacing={2} flexWrap="wrap">
                    {capabilities.length > 0 ? capabilities.map((capability) => (
                      <Badge key={capability} colorScheme="purple" variant="subtle">{capability}</Badge>
                    )) : <Badge variant="subtle">none</Badge>}
                  </HStack>
                </Box>

                <Box p={3} bg="whiteAlpha.50" borderRadius="xl">
                  <HStack justify="space-between" mb={2}>
                    <Text fontSize="10px" fontWeight="bold" color="whiteAlpha.400">ACCESS_TOKEN</Text>
                    <Icon as={Key} boxSize={4} color="sos.blue.400" />
                  </HStack>
                  <Text fontSize="10px" color="sos.blue.100" fontFamily="mono" wordBreak="break-all">
                    {maskToken(sessionToken)}
                  </Text>
                </Box>

                <Box p={3} bg="sos.blue.900" borderRadius="xl">
                  <Text fontSize="10px" fontWeight="black" color="sos.blue.100">SESSION_TRACE</Text>
                  <Text fontSize="11px" color="white" fontFamily="mono">{sessionStatus}</Text>
                </Box>

                <Button leftIcon={<LogOut size={16} />} colorScheme="red" variant="outline" onClick={doLogout}>
                  Encerrar Sessão
                </Button>
              </VStack>
            </Box>

            <Box bg="rgba(15, 23, 42, 0.4)" borderRadius="3xl" border="1px solid" borderColor="whiteAlpha.100" p={6}>
              <VStack align="stretch" spacing={6}>
                <Heading size="xs" color="white" textTransform="uppercase" letterSpacing="widest">
                  Telemetria da Plataforma
                </Heading>
                <VStack align="stretch" spacing={4}>
                  {services.map((service) => (
                    <HStack key={service.name} justify="space-between" p={3} bg="whiteAlpha.50" borderRadius="2xl" border="1px solid" borderColor="whiteAlpha.100">
                      <HStack spacing={3}>
                        <Circle size="32px" bg="whiteAlpha.50">
                          <Icon as={service.icon} boxSize={4} color={service.color} />
                        </Circle>
                        <VStack align="flex-start" spacing={0}>
                          <Text fontSize="xs" fontWeight="bold" color="white">{service.name}</Text>
                          <Text fontSize="9px" color="whiteAlpha.500" fontFamily="mono">{service.detail}</Text>
                        </VStack>
                      </HStack>
                      <Badge variant="subtle" colorScheme={service.status === 'Operational' || service.status === 'Connected' || service.status === 'Priority Alerts' ? 'green' : 'orange'} fontSize="9px">
                        {service.status}
                      </Badge>
                    </HStack>
                  ))}
                </VStack>

                <SimpleGrid columns={2} spacing={3}>
                  <Box p={4} bg="sos.blue.900" borderRadius="2xl">
                    <Text fontSize="10px" fontWeight="black" color="sos.blue.100">REALM</Text>
                    <Text fontSize="13px" fontWeight="black" color="white" fontFamily="mono">{keycloakRealm}</Text>
                  </Box>
                  <Box p={4} bg="rgba(255,255,255,0.05)" borderRadius="2xl">
                    <Text fontSize="10px" fontWeight="black" color="whiteAlpha.500">CLIENT</Text>
                    <Text fontSize="13px" fontWeight="black" color="white" fontFamily="mono">{keycloakClient}</Text>
                  </Box>
                </SimpleGrid>

                <Box p={4} bg="rgba(255,255,255,0.05)" borderRadius="2xl">
                  <HStack spacing={2} mb={2}>
                    <Icon as={ShieldEllipsis} boxSize={4} color="sos.blue.400" />
                    <Text fontSize="10px" fontWeight="black" color="whiteAlpha.500">API TARGET</Text>
                  </HStack>
                  <Text fontSize="11px" color="white" fontFamily="mono" wordBreak="break-all">
                    {apiBaseUrl}
                  </Text>
                </Box>
              </VStack>
            </Box>
          </SimpleGrid>
        </VStack>
      </Container>
    </Box>
  );
}
