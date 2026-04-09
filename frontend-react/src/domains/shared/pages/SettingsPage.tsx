import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Circle,
  Divider,
  FormControl,
  FormLabel,
  HStack,
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
import { PageHeader, PagePanel, MetricCard } from '../../../components/layout/PagePrimitives';
import { ShellLiveIndicator, ShellSectionEyebrow, ShellTelemetryBadge } from '../../../components/layout/ShellPrimitives';
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
      color: authenticated ? 'sos.green.500' : 'sos.red.400',
      tone: authenticated ? 'success' : 'critical',
    },
    {
      name: 'GIS Data Engine',
      status: settingsState.preferences.precisionMode ? 'High Precision' : 'Operational',
      detail: settingsState.preferences.precisionMode ? 'precision_mode=enabled' : 'precision_mode=standard',
      icon: Satellite,
      color: settingsState.preferences.precisionMode ? 'sos.blue.400' : 'sos.green.500',
      tone: settingsState.preferences.precisionMode ? 'info' : 'success',
    },
    {
      name: 'Notifications Bus',
      status: settingsState.preferences.criticalNotifications ? 'Priority Alerts' : 'Muted',
      detail: settingsState.preferences.criticalNotifications ? 'critical_alerts=enabled' : 'critical_alerts=disabled',
      icon: BellRing,
      color: settingsState.preferences.criticalNotifications ? 'sos.green.500' : 'sos.amber.400',
      tone: settingsState.preferences.criticalNotifications ? 'success' : 'warning',
    },
    {
      name: 'Primary API',
      status: 'Operational',
      detail: apiBaseUrl,
      icon: Database,
      color: 'sos.green.500',
      tone: 'success',
    },
  ] as const;

  const onlineServices = services.filter((service) =>
    ['Connected', 'Operational', 'Priority Alerts', 'High Precision'].includes(service.status),
  ).length;

  return (
    <Box px={{ base: 4, md: 6, xl: 8 }} py={{ base: 4, md: 6 }}>
      <VStack align="stretch" spacing={6} maxW="7xl" mx="auto">
        <PageHeader
          icon={Settings}
          eyebrow="SESSION_CONTROL // ACCESS_PROFILE // LOCAL_PREFERENCES"
          title="Centro de Configurações"
          description="Persistência local, sessão federada e telemetria da plataforma em uma única estação de controle."
          meta={
            <>
              <ShellTelemetryBadge tone={authenticated ? 'success' : 'critical'}>
                {authenticated ? 'Sessão conectada' : 'Sessão offline'}
              </ShellTelemetryBadge>
              <ShellTelemetryBadge tone="info">{keycloakRealm}</ShellTelemetryBadge>
              <ShellLiveIndicator label={sessionStatus} />
            </>
          }
          actions={
            <>
              <Button
                variant="ghost"
                leftIcon={<RefreshCw size={16} />}
                isLoading={refreshing}
                onClick={() => void handleRefreshSession()}
              >
                Atualizar Sessão
              </Button>
              <Button
                variant="tactical"
                leftIcon={<Save size={16} />}
                isLoading={saving}
                onClick={handleSavePreferences}
              >
                Salvar Preferências
              </Button>
            </>
          }
        />

        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
          <MetricCard
            label="Sessão"
            value={authenticated ? 'ATIVA' : 'OFFLINE'}
            helper={`Expira em ${formatDateTime(sessionExpiresAt)}`}
            icon={ShieldCheck}
            tone={authenticated ? 'success' : 'critical'}
            isLive={authenticated}
          />
          <MetricCard
            label="Capacidades derivadas"
            value={capabilities.length}
            helper={roles.length > 0 ? roles.join(', ') : 'nenhuma role federada'}
            icon={Key}
            tone="info"
          />
          <MetricCard
            label="Serviços monitorados"
            value={`${onlineServices}/${services.length}`}
            helper="Status agregado da estação local"
            icon={Database}
            tone={onlineServices === services.length ? 'success' : 'warning'}
          />
        </SimpleGrid>

        <SimpleGrid columns={{ base: 1, xl: 3 }} spacing={6}>
          <PagePanel
            title="Preferências Locais"
            description="Controles persistidos neste navegador para atualização, precisão e alertas."
            icon={Settings}
            tone="info"
          >
            <VStack align="stretch" spacing={4}>
              <PreferenceSwitchRow
                id="settings-auto-refresh"
                label="Atualização Automática"
                description="Mantém painéis e telemetria sincronizados sem intervenção manual."
                checked={settingsState.preferences.autoRefresh}
                onChange={(value) => handlePreferenceChange('autoRefresh', value)}
              />
              <Divider />
              <PreferenceSwitchRow
                id="settings-critical-notifications"
                label="Notificações Críticas"
                description="Prioriza alarmes de severidade alta na estação atual."
                checked={settingsState.preferences.criticalNotifications}
                onChange={(value) => handlePreferenceChange('criticalNotifications', value)}
              />
              <Divider />
              <PreferenceSwitchRow
                id="settings-precision-mode"
                label="Modo de Alta Precisão"
                description="Usa recortes GIS mais ricos para análise local."
                checked={settingsState.preferences.precisionMode}
                onChange={(value) => handlePreferenceChange('precisionMode', value)}
              />
              <Divider />
              <PreferenceSwitchRow
                id="settings-tactical-audio"
                label="Áudio Tático"
                description="Habilita feedback sonoro para eventos e ações críticas."
                checked={settingsState.preferences.tacticalAudio}
                onChange={(value) => handlePreferenceChange('tacticalAudio', value)}
              />

              <Box pt={2}>
                <HStack justify="space-between" mb={2}>
                  <ShellSectionEyebrow>Última persistência</ShellSectionEyebrow>
                  <Icon as={Volume2} boxSize={4} color="sos.blue.300" />
                </HStack>
                <ShellTelemetryBadge tone="info">{formatDateTime(settingsState.updatedAt)}</ShellTelemetryBadge>
              </Box>
            </VStack>
          </PagePanel>

          <PagePanel
            title="Sessão e Acesso"
            description="Estado federado do operador, privilégios derivados e token ativo."
            icon={UserRound}
            tone="success"
          >
            <VStack align="stretch" spacing={5}>
              <HStack spacing={4} align="center">
                <Circle size="48px" bg="rgba(255,255,255,0.06)" border="1px solid" borderColor="border.subtle">
                  <Icon as={UserRound} boxSize={5} color="sos.blue.300" />
                </Circle>
                <VStack align="flex-start" spacing={0.5}>
                  <Text fontSize="sm" fontWeight="700" color="white">
                    {user?.name || user?.preferredUsername || 'Operador'}
                  </Text>
                  <Text fontSize="xs" color="text.secondary">
                    {user?.email || 'sem email federado'}
                  </Text>
                </VStack>
              </HStack>

              <SimpleGrid columns={2} spacing={3}>
                <Box p={3} bg="surface.interactive" borderRadius="xl" border="1px solid" borderColor="border.subtle">
                  <ShellSectionEyebrow mb={1}>Status</ShellSectionEyebrow>
                  <ShellTelemetryBadge tone={authenticated ? 'success' : 'critical'}>
                    {authenticated ? 'Authenticated' : 'Offline'}
                  </ShellTelemetryBadge>
                </Box>
                <Box p={3} bg="surface.interactive" borderRadius="xl" border="1px solid" borderColor="border.subtle">
                  <ShellSectionEyebrow mb={1}>Expira em</ShellSectionEyebrow>
                  <Text fontSize="xs" color="white" fontFamily="mono">
                    {formatDateTime(sessionExpiresAt)}
                  </Text>
                </Box>
              </SimpleGrid>

              <Box>
                <ShellSectionEyebrow mb={2}>Roles</ShellSectionEyebrow>
                <HStack spacing={2} flexWrap="wrap">
                  {roles.length > 0 ? roles.map((role) => (
                    <Badge key={role} variant="subtle" bg="rgba(0,122,255,0.12)" color="sos.blue.200">
                      {role}
                    </Badge>
                  )) : (
                    <Badge variant="subtle">none</Badge>
                  )}
                </HStack>
              </Box>

              <Box>
                <ShellSectionEyebrow mb={2}>Capabilities</ShellSectionEyebrow>
                <HStack spacing={2} flexWrap="wrap">
                  {capabilities.length > 0 ? capabilities.map((capability) => (
                    <Badge key={capability} variant="subtle" bg="rgba(255,149,0,0.12)" color="sos.amber.200">
                      {capability}
                    </Badge>
                  )) : (
                    <Badge variant="subtle">none</Badge>
                  )}
                </HStack>
              </Box>

              <Box p={3} bg="surface.interactive" borderRadius="xl" border="1px solid" borderColor="border.subtle">
                <HStack justify="space-between" mb={2}>
                  <ShellSectionEyebrow>Access Token</ShellSectionEyebrow>
                  <Icon as={Key} boxSize={4} color="sos.blue.300" />
                </HStack>
                <Text fontSize="10px" color="sos.blue.100" fontFamily="mono" wordBreak="break-all">
                  {maskToken(sessionToken)}
                </Text>
              </Box>

              <Box p={3} bg="rgba(0,122,255,0.12)" borderRadius="xl" border="1px solid" borderColor="rgba(0,122,255,0.20)">
                <ShellSectionEyebrow mb={1}>Session Trace</ShellSectionEyebrow>
                <Text fontSize="11px" color="white" fontFamily="mono">
                  {sessionStatus}
                </Text>
              </Box>

              <Button leftIcon={<LogOut size={16} />} variant="outline" colorScheme="red" onClick={doLogout}>
                Encerrar Sessão
              </Button>
            </VStack>
          </PagePanel>

          <PagePanel
            title="Telemetria da Plataforma"
            description="Leitura consolidada dos serviços críticos usados pela estação atual."
            icon={ShieldEllipsis}
            tone="warning"
          >
            <VStack align="stretch" spacing={4}>
              {services.map((service) => (
                <HStack
                  key={service.name}
                  justify="space-between"
                  p={3}
                  bg="surface.interactive"
                  borderRadius="2xl"
                  border="1px solid"
                  borderColor="border.subtle"
                  align="flex-start"
                >
                  <HStack spacing={3} align="flex-start">
                    <Circle size="34px" bg="rgba(255,255,255,0.05)" border="1px solid" borderColor="border.subtle">
                      <Icon as={service.icon} boxSize={4} color={service.color} />
                    </Circle>
                    <VStack align="flex-start" spacing={0.5}>
                      <Text fontSize="xs" fontWeight="700" color="white">
                        {service.name}
                      </Text>
                      <Text fontSize="10px" color="text.secondary" fontFamily="mono">
                        {service.detail}
                      </Text>
                    </VStack>
                  </HStack>
                  <ShellTelemetryBadge tone={service.tone}>{service.status}</ShellTelemetryBadge>
                </HStack>
              ))}

              <SimpleGrid columns={2} spacing={3}>
                <Box p={4} bg="rgba(0,122,255,0.12)" borderRadius="2xl" border="1px solid" borderColor="rgba(0,122,255,0.20)">
                  <ShellSectionEyebrow mb={1}>Realm</ShellSectionEyebrow>
                  <Text fontSize="13px" fontWeight="700" color="white" fontFamily="mono">
                    {keycloakRealm}
                  </Text>
                </Box>
                <Box p={4} bg="surface.interactive" borderRadius="2xl" border="1px solid" borderColor="border.subtle">
                  <ShellSectionEyebrow mb={1}>Client</ShellSectionEyebrow>
                  <Text fontSize="13px" fontWeight="700" color="white" fontFamily="mono">
                    {keycloakClient}
                  </Text>
                </Box>
              </SimpleGrid>

              <Box p={4} bg="surface.interactive" borderRadius="2xl" border="1px solid" borderColor="border.subtle">
                <HStack spacing={2} mb={2}>
                  <Icon as={Database} boxSize={4} color="sos.blue.300" />
                  <ShellSectionEyebrow>API Target</ShellSectionEyebrow>
                </HStack>
                <Text fontSize="11px" color="white" fontFamily="mono" wordBreak="break-all">
                  {apiBaseUrl}
                </Text>
              </Box>
            </VStack>
          </PagePanel>
        </SimpleGrid>
      </VStack>
    </Box>
  );
}

interface PreferenceSwitchRowProps {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}

function PreferenceSwitchRow({
  id,
  label,
  description,
  checked,
  onChange,
}: PreferenceSwitchRowProps) {
  return (
    <FormControl display="flex" alignItems="center" justifyContent="space-between" gap={4}>
      <VStack align="flex-start" spacing={0.5}>
        <FormLabel htmlFor={id} mb="0" fontSize="sm" color="white" fontWeight="600">
          {label}
        </FormLabel>
        <Text fontSize="xs" color="text.secondary">
          {description}
        </Text>
      </VStack>
      <Switch
        id={id}
        isChecked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </FormControl>
  );
}
