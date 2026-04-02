import { useEffect, useState, useCallback } from 'react';
import {
  CheckCircle, XCircle, AlertCircle, RefreshCw, Save, Eye, EyeOff,
  Wifi, WifiOff, ChevronRight, Settings, Activity, Database,
} from 'lucide-react';
import {
  Box, Flex, VStack, HStack, Text, Badge, IconButton,
  Input, Spinner, Divider,
} from '@chakra-ui/react';
import { GlassPanel } from '../../../components/atoms/GlassPanel';
import { TacticalText } from '../../../components/atoms/TacticalText';
import { TacticalButton } from '../../../components/atoms/TacticalButton';
import {
  integrationConfigApi,
  type IntegrationConfig,
  type IntegrationConfigUpdateDto,
} from '../../../services/integrationConfigApi';

// ── Category labels ──────────────────────────────────────────────────────────
const CATEGORY_LABELS: Record<string, string> = {
  weather:    'Meteorologia',
  geodata:    'Geodados',
  government: 'Governo',
  satellite:  'Satélite',
  elevation:  'Elevação',
  analysis:   'Análise',
  alerts:     'Alertas',
};

const CATEGORY_ORDER = ['weather', 'alerts', 'geodata', 'satellite', 'elevation', 'analysis', 'government'];

// ── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: IntegrationConfig['status'] }) {
  if (status === 'configured') return (
    <Badge
      display="flex" alignItems="center" gap="4px"
      bg="rgba(52,199,89,0.12)" color="#34C759"
      border="1px solid rgba(52,199,89,0.25)"
      borderRadius="full" px={2} py={0.5} fontSize="9px" fontWeight="black" letterSpacing="widest"
    >
      <CheckCircle size={8} /> ATIVO
    </Badge>
  );
  if (status === 'error') return (
    <Badge
      display="flex" alignItems="center" gap="4px"
      bg="rgba(255,59,48,0.12)" color="#FF3B30"
      border="1px solid rgba(255,59,48,0.25)"
      borderRadius="full" px={2} py={0.5} fontSize="9px" fontWeight="black" letterSpacing="widest"
    >
      <XCircle size={8} /> ERRO
    </Badge>
  );
  return (
    <Badge
      display="flex" alignItems="center" gap="4px"
      bg="rgba(255,149,0,0.12)" color="#FF9500"
      border="1px solid rgba(255,149,0,0.25)"
      borderRadius="full" px={2} py={0.5} fontSize="9px" fontWeight="black" letterSpacing="widest"
    >
      <AlertCircle size={8} /> PENDENTE
    </Badge>
  );
}

// ── Status dot ────────────────────────────────────────────────────────────────
function StatusDot({ status, enabled }: { status: IntegrationConfig['status']; enabled: boolean }) {
  if (!enabled) return <Box w="7px" h="7px" borderRadius="full" bg="rgba(255,255,255,0.15)" flexShrink={0} />;
  if (status === 'configured') return <Box w="7px" h="7px" borderRadius="full" bg="#34C759" boxShadow="0 0 6px #34C759" flexShrink={0} />;
  if (status === 'error')      return <Box w="7px" h="7px" borderRadius="full" bg="#FF3B30" boxShadow="0 0 6px #FF3B30" flexShrink={0} />;
  return <Box w="7px" h="7px" borderRadius="full" bg="#FF9500" flexShrink={0} />;
}

// ── Detail panel ─────────────────────────────────────────────────────────────
interface DetailPanelProps {
  cfg:      IntegrationConfig;
  onUpdate: (updated: IntegrationConfig) => void;
}

function DetailPanel({ cfg, onUpdate }: DetailPanelProps) {
  const [customEndpoint, setCustomEndpoint] = useState(cfg.customEndpoint ?? '');
  const [apiKey,         setApiKey]         = useState(cfg.apiKey ?? '');
  const [enabled,        setEnabled]        = useState(cfg.enabled);
  const [showKey,        setShowKey]        = useState(false);
  const [saving,         setSaving]         = useState(false);
  const [testing,        setTesting]        = useState(false);
  const [saveMsg,        setSaveMsg]        = useState<string | null>(null);
  const [testMsg,        setTestMsg]        = useState<{ ok: boolean; text: string } | null>(null);
  const [dirty,          setDirty]          = useState(false);

  useEffect(() => {
    setCustomEndpoint(cfg.customEndpoint ?? '');
    setApiKey(cfg.apiKey ?? '');
    setEnabled(cfg.enabled);
    setDirty(false);
    setSaveMsg(null);
    setTestMsg(null);
  }, [cfg.id, cfg.customEndpoint, cfg.apiKey, cfg.enabled]);

  const markDirty = () => { setDirty(true); setSaveMsg(null); };

  const handleSave = async () => {
    setSaving(true); setSaveMsg(null);
    try {
      const dto: IntegrationConfigUpdateDto = {
        customEndpoint: customEndpoint.trim() || undefined,
        apiKey:         apiKey.trim()         || undefined,
        enabled,
      };
      const updated = await integrationConfigApi.update(cfg.id, dto);
      onUpdate(updated);
      setDirty(false);
      setSaveMsg('Configuração salva com sucesso.');
    } catch {
      setSaveMsg('Falha ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true); setTestMsg(null);
    try {
      const result = await integrationConfigApi.test(cfg.id);
      onUpdate({ ...cfg, lastTestOk: result.ok, lastTestedAt: result.testedAt, status: result.ok ? 'configured' : 'error' });
      setTestMsg({
        ok:   result.ok,
        text: result.ok
          ? `Conexão OK · HTTP ${result.statusCode ?? '—'}`
          : `Falha · ${result.error ?? `HTTP ${result.statusCode}`}`,
      });
    } catch { setTestMsg({ ok: false, text: 'Erro ao testar conexão.' }); }
    finally { setTesting(false); }
  };

  const effectiveEndpoint = customEndpoint.trim() || cfg.defaultEndpoint;

  return (
    <VStack align="stretch" spacing={5} h="100%" overflowY="auto" p={6}>

      {/* Header */}
      <Flex justify="space-between" align="flex-start">
        <VStack align="flex-start" spacing={1} flex={1}>
          <TacticalText variant="heading" fontSize="sm">{cfg.name}</TacticalText>
          <Text fontSize="xs" color="whiteAlpha.500" lineHeight={1.5}>{cfg.description}</Text>
        </VStack>
        <StatusBadge status={cfg.status} />
      </Flex>

      <Divider borderColor="whiteAlpha.100" />

      {/* Enable toggle */}
      <GlassPanel depth="base" p={4} borderRadius="xl" direction="row" align="center" justify="space-between">
        <VStack align="flex-start" spacing={0.5}>
          <Text fontSize="xs" fontWeight="bold" color="white">Integração ativa</Text>
          <Text fontSize="10px" color="whiteAlpha.400">Desativar remove esta fonte do pipeline de dados.</Text>
        </VStack>
        <Box
          as="button"
          onClick={() => { setEnabled(v => !v); markDirty(); }}
          w="44px" h="24px" borderRadius="full" position="relative"
          bg={enabled ? 'rgba(0,122,255,0.8)' : 'rgba(255,255,255,0.12)'}
          border="1px solid"
          borderColor={enabled ? 'rgba(0,122,255,0.6)' : 'whiteAlpha.200'}
          transition="all 0.25s"
          flexShrink={0}
        >
          <Box
            position="absolute" top="3px"
            left={enabled ? '22px' : '3px'}
            w="16px" h="16px" borderRadius="full" bg="white"
            boxShadow="0 1px 4px rgba(0,0,0,0.4)"
            transition="left 0.25s"
          />
        </Box>
      </GlassPanel>

      {/* Endpoint */}
      <VStack align="stretch" spacing={1.5}>
        <HStack spacing={2}>
          <Text fontSize="xs" fontWeight="bold" color="whiteAlpha.800">Endpoint personalizado</Text>
          <Text fontSize="10px" color="whiteAlpha.400">(vazio = padrão)</Text>
        </HStack>
        <Input
          type="url"
          value={customEndpoint}
          onChange={e => { setCustomEndpoint(e.target.value); markDirty(); }}
          placeholder={cfg.defaultEndpoint}
          size="sm"
          bg="rgba(255,255,255,0.04)"
          border="1px solid"
          borderColor="whiteAlpha.150"
          borderRadius="lg"
          color="white"
          fontSize="xs"
          fontFamily="mono"
          _placeholder={{ color: 'whiteAlpha.250', fontSize: '11px' }}
          _focus={{ borderColor: 'rgba(0,122,255,0.5)', boxShadow: '0 0 0 1px rgba(0,122,255,0.25)' }}
          _hover={{ borderColor: 'whiteAlpha.300' }}
        />
        <Text fontSize="10px" color="whiteAlpha.300" fontFamily="mono" noOfLines={1}>
          Ativo: {effectiveEndpoint}
        </Text>
      </VStack>

      {/* API Key */}
      {cfg.authRequired && (
        <VStack align="stretch" spacing={1.5}>
          <HStack spacing={2}>
            <Text fontSize="xs" fontWeight="bold" color="whiteAlpha.800">API Key / Token</Text>
            <Badge bg="rgba(255,149,0,0.12)" color="#FF9500" border="1px solid rgba(255,149,0,0.25)" borderRadius="md" px={1.5} fontSize="9px">
              obrigatório
            </Badge>
          </HStack>
          <Box position="relative">
            <Input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={e => { setApiKey(e.target.value); markDirty(); }}
              placeholder="Insira o token de acesso..."
              size="sm"
              bg="rgba(255,255,255,0.04)"
              border="1px solid"
              borderColor="whiteAlpha.150"
              borderRadius="lg"
              color="white"
              fontSize="xs"
              pr="36px"
              _placeholder={{ color: 'whiteAlpha.250' }}
              _focus={{ borderColor: 'rgba(0,122,255,0.5)', boxShadow: '0 0 0 1px rgba(0,122,255,0.25)' }}
              _hover={{ borderColor: 'whiteAlpha.300' }}
            />
            <IconButton
              aria-label="Mostrar/ocultar chave"
              icon={showKey ? <EyeOff size={13} /> : <Eye size={13} />}
              size="xs"
              variant="ghost"
              color="whiteAlpha.500"
              _hover={{ color: 'white' }}
              position="absolute" right={1} top="50%" transform="translateY(-50%)" zIndex={1}
              onClick={() => setShowKey(v => !v)}
            />
          </Box>
        </VStack>
      )}

      {/* Actions */}
      <HStack spacing={3}>
        <TacticalButton
          onClick={handleSave}
          isDisabled={saving || !dirty}
          height="36px"
          px={4}
          fontSize="10px"
          gap={1.5}
          bg="rgba(0,122,255,0.18)"
          borderColor="rgba(0,122,255,0.35)"
          color="white"
          _hover={{ bg: 'rgba(0,122,255,0.28)', borderColor: 'rgba(0,122,255,0.55)' }}
          _disabled={{ opacity: 0.35, cursor: 'not-allowed' }}
        >
          {saving ? <Spinner size="xs" /> : <Save size={12} />}
          {saving ? 'Salvando…' : 'Salvar'}
        </TacticalButton>

        <TacticalButton
          onClick={handleTest}
          isDisabled={testing}
          height="36px"
          px={4}
          fontSize="10px"
          gap={1.5}
          _disabled={{ opacity: 0.35, cursor: 'not-allowed' }}
        >
          {testing ? <Spinner size="xs" /> : <Wifi size={12} />}
          {testing ? 'Testando…' : 'Testar Conexão'}
        </TacticalButton>
      </HStack>

      {/* Feedback */}
      {saveMsg && (
        <Text fontSize="11px" color="rgba(0,122,255,0.9)">{saveMsg}</Text>
      )}
      {testMsg && (
        <GlassPanel
          depth="base"
          tint={testMsg.ok ? 'green' : 'red'}
          p={3} borderRadius="xl" direction="row" align="center" gap={2}
          borderColor={testMsg.ok ? 'rgba(52,199,89,0.25)' : 'rgba(255,59,48,0.25)'}
        >
          {testMsg.ok
            ? <Wifi size={13} color="#34C759" />
            : <WifiOff size={13} color="#FF3B30" />
          }
          <Text fontSize="xs" color={testMsg.ok ? '#34C759' : '#FF3B30'}>{testMsg.text}</Text>
        </GlassPanel>
      )}

      {/* Last test */}
      {cfg.lastTestedAt && (
        <Text fontSize="10px" color="whiteAlpha.300">
          Último teste: {new Date(cfg.lastTestedAt).toLocaleString('pt-BR')} ·{' '}
          <Box as="span" color={cfg.lastTestOk ? '#34C759' : '#FF3B30'}>
            {cfg.lastTestOk ? 'sucesso' : 'falha'}
          </Box>
        </Text>
      )}

      <Divider borderColor="whiteAlpha.100" />

      {/* Detail rows */}
      <GlassPanel depth="base" p={4} borderRadius="xl" direction="column" gap={3}>
        <TacticalText variant="subheading" fontSize="9px">Detalhes</TacticalText>
        <InfoRow label="Categoria"      value={CATEGORY_LABELS[cfg.category] ?? cfg.category} />
        <InfoRow label="Autenticação"   value={cfg.authRequired ? 'Necessária' : 'Não necessária'} />
        <InfoRow label="Endpoint padrão" value={cfg.defaultEndpoint} mono />
      </GlassPanel>
    </VStack>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <Flex justify="space-between" align="flex-start" gap={3}>
      <Text fontSize="11px" color="whiteAlpha.400" flexShrink={0}>{label}</Text>
      <Text
        fontSize={mono ? '10px' : '11px'}
        fontFamily={mono ? 'mono' : undefined}
        color="whiteAlpha.700"
        textAlign="right"
        wordBreak="break-all"
      >
        {value}
      </Text>
    </Flex>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function DataHubPage() {
  const [configs,  setConfigs]  = useState<IntegrationConfig[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState<IntegrationConfig | null>(null);
  const [error,    setError]    = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await integrationConfigApi.getAll();
      setConfigs(data);
      setSelected(prev => (data.length > 0 && prev === null ? data[0] : prev));
    } catch {
      setError('Falha ao carregar integrações. Verifique se o backend está disponível.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleUpdate = (updated: IntegrationConfig) => {
    setConfigs(prev => prev.map(c => c.id === updated.id ? updated : c));
    setSelected(updated);
  };

  const grouped = CATEGORY_ORDER.reduce<Record<string, IntegrationConfig[]>>((acc, cat) => {
    const items = configs.filter(c => c.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {});

  const configuredCount = configs.filter(c => c.status === 'configured' && c.enabled).length;
  const errorCount      = configs.filter(c => c.status === 'error').length;

  return (
    <Box h="100%" w="100%" bg="sos.dark" overflowY="auto" p={{ base: 4, md: 6 }}>
      <VStack spacing={6} align="stretch" maxW="1400px" mx="auto" h="100%">

        {/* ── Page header ─────────────────────────────────────────────── */}
        <Flex justify="space-between" align="center" flexWrap="wrap" gap={4}>
          <HStack spacing={4}>
            <Box p={3} bg="rgba(0,122,255,0.10)" borderRadius="2xl" boxShadow="0 0 20px rgba(0,122,255,0.15)">
              <Database size={20} color="rgba(0,122,255,0.9)" />
            </Box>
            <VStack align="flex-start" spacing={0.5}>
              <TacticalText variant="heading" fontSize="lg">Data Hub</TacticalText>
              <TacticalText variant="subheading" fontSize="10px">
                Gerenciamento de integrações e fontes de dados
              </TacticalText>
            </VStack>
          </HStack>

          {/* Stats strip */}
          {!loading && !error && (
            <HStack spacing={4}>
              <GlassPanel depth="base" px={3} py={2} borderRadius="xl" direction="row" align="center" gap={2}>
                <Activity size={12} color="#34C759" />
                <Text fontSize="11px" fontFamily="mono" color="whiteAlpha.700">
                  <Box as="span" fontWeight="bold" color="#34C759">{configuredCount}</Box> ativos
                </Text>
              </GlassPanel>
              {errorCount > 0 && (
                <GlassPanel depth="base" tint="red" px={3} py={2} borderRadius="xl" direction="row" align="center" gap={2}>
                  <XCircle size={12} color="#FF3B30" />
                  <Text fontSize="11px" fontFamily="mono" color="#FF3B30" fontWeight="bold">
                    {errorCount} erro{errorCount > 1 ? 's' : ''}
                  </Text>
                </GlassPanel>
              )}
            </HStack>
          )}
        </Flex>

        {/* ── Content: sidebar + detail ────────────────────────────────── */}
        <Flex flex={1} gap={4} align="stretch" minH={0} flexDirection={{ base: 'column', lg: 'row' }}>

          {/* Sidebar */}
          <GlassPanel
            depth="raised"
            w={{ base: '100%', lg: '260px' }}
            minW={{ lg: '260px' }}
            direction="column"
            borderRadius="2xl"
            overflow="hidden"
            flexShrink={0}
          >
            {/* Sidebar header */}
            <Flex
              px={4} py={3}
              align="center" justify="space-between"
              borderBottom="1px solid" borderColor="whiteAlpha.100"
            >
              <HStack spacing={2}>
                <Settings size={13} color="rgba(0,122,255,0.8)" />
                <TacticalText variant="subheading" fontSize="10px">Integrações</TacticalText>
              </HStack>
              <IconButton
                aria-label="Recarregar"
                icon={<RefreshCw size={13} />}
                size="xs"
                variant="ghost"
                color="whiteAlpha.400"
                _hover={{ color: 'white' }}
                isLoading={loading}
                onClick={load}
              />
            </Flex>

            {/* List */}
            <VStack align="stretch" spacing={0} flex={1} overflowY="auto" py={2}>
              {loading && (
                <Flex justify="center" align="center" py={10}>
                  <Spinner size="sm" color="whiteAlpha.300" />
                </Flex>
              )}

              {error && (
                <Text px={4} py={4} fontSize="11px" color="rgba(255,59,48,0.8)">{error}</Text>
              )}

              {!loading && !error && Object.entries(grouped).map(([cat, items]) => (
                <Box key={cat} mb={3}>
                  <Text
                    px={4} py={1}
                    fontSize="9px" fontWeight="black" letterSpacing="widest"
                    textTransform="uppercase" color="whiteAlpha.300"
                  >
                    {CATEGORY_LABELS[cat] ?? cat}
                  </Text>
                  {items.map(cfg => (
                    <Flex
                      key={cfg.id}
                      as="button"
                      w="100%"
                      px={4} py={2.5}
                      align="center" gap={2.5}
                      textAlign="left"
                      cursor="pointer"
                      transition="background 0.15s"
                      bg={selected?.id === cfg.id ? 'rgba(0,122,255,0.10)' : 'transparent'}
                      borderLeft="2px solid"
                      borderColor={selected?.id === cfg.id ? 'rgba(0,122,255,0.6)' : 'transparent'}
                      _hover={{ bg: selected?.id === cfg.id ? 'rgba(0,122,255,0.12)' : 'rgba(255,255,255,0.04)' }}
                      onClick={() => setSelected(cfg)}
                    >
                      <StatusDot status={cfg.status} enabled={cfg.enabled} />
                      <Text flex={1} fontSize="xs" color={selected?.id === cfg.id ? 'white' : 'whiteAlpha.700'} noOfLines={1}>
                        {cfg.name}
                      </Text>
                      {selected?.id === cfg.id && <ChevronRight size={11} color="rgba(255,255,255,0.3)" />}
                    </Flex>
                  ))}
                </Box>
              ))}
            </VStack>
          </GlassPanel>

          {/* Detail panel */}
          <GlassPanel depth="raised" flex={1} direction="column" borderRadius="2xl" overflow="hidden" minH="400px">
            {selected ? (
              <DetailPanel key={selected.id} cfg={selected} onUpdate={handleUpdate} />
            ) : (
              <Flex flex={1} direction="column" align="center" justify="center" gap={3} p={8}>
                <Box p={4} bg="rgba(255,255,255,0.04)" borderRadius="2xl">
                  <Settings size={28} color="rgba(255,255,255,0.15)" />
                </Box>
                <TacticalText variant="subheading" textAlign="center">
                  Selecione uma integração para configurar
                </TacticalText>
              </Flex>
            )}
          </GlassPanel>

        </Flex>
      </VStack>
    </Box>
  );
}
