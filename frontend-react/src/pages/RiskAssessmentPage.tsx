import { useEffect, useState } from 'react';
import { ShieldAlert, RefreshCw, Map as MapIcon, Users, Building2, Zap, LayoutGrid, Info } from 'lucide-react';
import { 
  Box, Flex, VStack, HStack, SimpleGrid, Icon, Spinner, 
  Progress, Badge, Tooltip, Divider, useToast, IconButton 
} from '@chakra-ui/react';
import { riskApi, type RiskAssessment } from '../services/riskApi';
import { GlassPanel } from '../components/atoms/GlassPanel';
import { TacticalText } from '../components/atoms/TacticalText';
import { TacticalButton } from '../components/atoms/TacticalButton';
import { LoadingOverlay } from '../components/ui/LoadingOverlay';

/**
 * Risk Assessment Matrix — Guardian v3
 * High-fidelity predictive modeling interface.
 */
export function RiskAssessmentPage() {
  const [loading, setLoading] = useState(false);
  const [assessment, setAssessment] = useState<RiskAssessment | null>(null);
  const [coords] = useState({ lat: -21.1149, lon: -42.9342 }); 
  const toast = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const data = await riskApi.getAssessment(coords.lat, coords.lon);
      setAssessment(data);
    } catch {
      toast({
        title: 'FALHA_NA_MATRIZ',
        description: 'Não foi possível processar os modelos de risco.',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleSync = async () => {
    setLoading(true);
    try {
      await riskApi.pipelineSync();
      toast({ title: 'PIPELINE_SYNC', status: 'success' });
      await load();
    } catch {
      toast({ title: 'SYNC_ERROR', status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (sev: string) => {
    switch(sev) {
      case 'high': case 'critical': return '#FF3B30';
      case 'medium': return '#FF9500';
      default: return '#34C759';
    }
  };

  return (
    <Box h="100%" w="100%" p={8} bg="sos.dark" overflowY="auto">
      {loading && <LoadingOverlay message="DESCRIPTOGRAFANDO_MODELOS_GEOGRAFICOS..." />}

      <VStack spacing={8} align="stretch" maxW="1500px" mx="auto">
        
        {/* Header HUD */}
        <Flex justify="space-between" align="center">
          <HStack spacing={4}>
            <Box p={3} bg="rgba(255, 149, 0, 0.12)" borderRadius="2xl" boxShadow="0 0 24px rgba(255, 149, 0, 0.2)">
              <Icon as={ShieldAlert} boxSize={6} color="#FF9500" />
            </Box>
            <VStack align="start" spacing={0}>
              <TacticalText variant="heading" fontSize="2xl">Matriz de Risco</TacticalText>
              <HStack spacing={2} mt={1}>
                <HStack spacing={1.5}>
                  <Box w={2} h={2} borderRadius="full" bg="#34C759" className="animate-pulse" />
                  <TacticalText variant="mono" fontSize="10px" color="rgba(255,255,255,0.4)">ENGINE_ACTIVE: V3.2.0</TacticalText>
                </HStack>
                <Divider orientation="vertical" h="10px" borderColor="whiteAlpha.300" />
                <TacticalText variant="mono" fontSize="10px" color="rgba(255,255,255,0.4)">GEO_COORDS: {coords.lat}, {coords.lon}</TacticalText>
              </HStack>
            </VStack>
          </HStack>

          <HStack spacing={3}>
             <TacticalButton leftIcon={<RefreshCw size={16} />} onClick={() => void load()} variant="ghost">
               RECALCULAR
             </TacticalButton>
             <TacticalButton glow leftIcon={<Zap size={16} />} onClick={() => void handleSync()} bg="#007AFF">
               SINC_PIPELINE
             </TacticalButton>
          </HStack>
        </Flex>

        {assessment ? (
          <>
            {/* Analytics HUD Cards */}
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
              <GlassPanel p={6} depth="raised">
                <HStack spacing={5}>
                  <Box p={4} bg="rgba(0, 122, 255, 0.1)" borderRadius="2xl">
                    <Icon as={Users} boxSize={6} color="#007AFF" />
                  </Box>
                  <VStack align="start" spacing={0}>
                    <TacticalText variant="caption" fontSize="xs">POPULAÇÃO_EXPOSTA</TacticalText>
                    <TacticalText variant="heading" fontSize="3xl" color="white">
                      {assessment.analytics?.affectedPopulation?.toLocaleString() ?? "N/A"}
                    </TacticalText>
                    <TacticalText variant="caption" fontSize="9px" opacity={0.3}>DENSIDADE_DEMOGRAFICA_ESTIMADA</TacticalText>
                  </VStack>
                </HStack>
              </GlassPanel>

              <GlassPanel p={6} depth="raised">
                <HStack spacing={5}>
                  <Box p={4} bg="rgba(255, 149, 0, 0.1)" borderRadius="2xl">
                    <Icon as={Building2} boxSize={6} color="#FF9500" />
                  </Box>
                  <VStack align="start" spacing={0}>
                    <TacticalText variant="caption" fontSize="xs">INFRAESTRUTURA_CRÍTICA</TacticalText>
                    <TacticalText variant="heading" fontSize="3xl" color="white">
                      {assessment.analytics?.criticalInfrastructureCount ?? "0"}
                    </TacticalText>
                    <TacticalText variant="caption" fontSize="9px" opacity={0.3}>ASSETS_DETECTADOS_NO_RAIO</TacticalText>
                  </VStack>
                </HStack>
              </GlassPanel>

              <GlassPanel p={6} depth="raised">
                <HStack spacing={5}>
                  <Box p={4} bg="rgba(255, 59, 48, 0.1)" borderRadius="2xl">
                    <Icon as={MapIcon} boxSize={6} color="#FF3B30" />
                  </Box>
                  <VStack align="start" spacing={0}>
                    <TacticalText variant="caption" fontSize="xs">MODELO_PREDITIVO</TacticalText>
                    <TacticalText variant="heading" fontSize="xl" noOfLines={1} color="white">
                      {assessment.model?.name ?? "SENTINEL_CORE"}
                    </TacticalText>
                    <TacticalText variant="caption" fontSize="9px" opacity={0.3}>MATRIZ_VERSÃO: {assessment.model?.version ?? "V0"}</TacticalText>
                  </VStack>
                </HStack>
              </GlassPanel>
            </SimpleGrid>

            {/* Detailed Data View */}
            <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={8}>
              <GlassPanel depth="base" flexDirection="column" gap={0}>
                 <Box p={5} borderBottom="1px solid" borderColor="rgba(255,255,255,0.08)">
                   <HStack justify="space-between">
                     <HStack spacing={3}>
                       <Icon as={LayoutGrid} size={14} color="#007AFF" />
                       <TacticalText variant="heading" fontSize="sm">MAPA_DE_CALOR_OPERACIONAL</TacticalText>
                     </HStack>
                     <Tooltip label="Dados brutos processados pelo backend">
                        <IconButton icon={<Info size={14} />} aria-label="info" variant="ghost" size="xs" />
                     </Tooltip>
                   </HStack>
                 </Box>

                 <VStack p={5} spacing={3} align="stretch" maxH="500px" overflowY="auto" className="custom-scrollbar">
                    {(assessment.riskMap || []).map((point, idx) => (
                      <Box 
                        key={idx} 
                        p={4} bg="rgba(255,255,255,0.02)" 
                        borderRadius="xl" 
                        border="1px solid" borderColor="rgba(255,255,255,0.06)"
                        _hover={{ bg: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)' }}
                      >
                         <Flex justify="space-between" align="center">
                            <VStack align="start" spacing={0}>
                               <TacticalText variant="mono" fontSize="11px" color="rgba(255,255,255,0.4)">
                                 {point.lat.toFixed(4)}, {point.lon.toFixed(4)}
                               </TacticalText>
                               <HStack spacing={2} mt={1}>
                                 <Box w={1.5} h={1.5} borderRadius="full" bg={getSeverityColor(point.severity)} />
                                 <TacticalText variant="heading" fontSize="xs" letterSpacing="0.1em" color="white">
                                   IMPACTO_{point.severity.toUpperCase()}
                                 </TacticalText>
                               </HStack>
                            </VStack>
                            <VStack align="right" spacing={1}>
                               <TacticalText variant="mono" fontSize="lg" color="white" fontWeight="900">
                                 {(point.riskScore * 100).toFixed(0)}%
                               </TacticalText>
                               <Progress 
                                 value={point.riskScore * 100} 
                                 size="xs" w="100px" borderRadius="full" 
                                 colorScheme={point.severity === 'high' ? 'red' : 'orange'}
                                 bg="rgba(255,255,255,0.05)"
                               />
                            </VStack>
                         </Flex>
                      </Box>
                    ))}
                 </VStack>
              </GlassPanel>

              {/* Status Summary */}
              <GlassPanel depth="raised" justify="center" align="center" textAlign="center" p={12} flexDirection="column">
                  <Box p={8} bg="rgba(0,122,255,0.06)" borderRadius="full" boxShadow="inset 0 0 40px rgba(0,122,255,0.1)">
                    <Icon as={ShieldAlert} boxSize={16} color="rgba(255,255,255,0.1)" />
                  </Box>
                  <VStack mt={8} spacing={4}>
                    <TacticalText variant="heading" fontSize="xl" color="white">Análise de Impacto Concluída</TacticalText>
                    <TacticalText fontSize="sm" color="rgba(255,255,255,0.4)" maxW="320px">
                      A matriz de risco foi gerada com base nos parâmetros geográficos e probabilísticos atuais.
                    </TacticalText>
                    <Badge variant="outline" colorScheme="blue" borderRadius="full" px={4} py={1} fontSize="10px">
                      SYSTEM_READY // 0_LEAKS
                    </Badge>
                  </VStack>
              </GlassPanel>
            </SimpleGrid>
          </>
        ) : (
          <Center p={32}>
            <VStack spacing={4}>
               <Spinner color="#007AFF" thickness="3px" size="xl" />
               <TacticalText variant="mono" opacity={0.3}>AGUARDANDO_RESPOSTA_SERVIDOR...</TacticalText>
            </VStack>
          </Center>
        )}
      </VStack>
    </Box>
  );
}

const Center = ({ children, ...props }: any) => <Flex justify="center" align="center" {...props}>{children}</Flex>;
