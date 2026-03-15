import { Heart, DollarSign, Wallet, RefreshCw, BarChart3, TrendingUp, History } from 'lucide-react';
import { LoadingOverlay } from '../components/ui/LoadingOverlay';
import { 
  Box, 
  Flex, 
  HStack, 
  VStack, 
  SimpleGrid, 
  Badge,
  Icon,
  Divider
} from '@chakra-ui/react';
import { useSupportDashboard } from '../hooks/useSupportDashboard';
import { GlassPanel } from '../components/atoms/GlassPanel';
import { TacticalText } from '../components/atoms/TacticalText';
import { TacticalButton } from '../components/atoms/TacticalButton';
import { TacticalStat } from '../components/molecules/TacticalStat';

/**
 * Support & Transparency Dashboard
 * Unified Ledger for humanitarian aid, financial tracking, and accountability.
 * Refactored with the Guardian Tactical Design System.
 */
export function SupportDashboardPage() {
  const { 
    campaigns, 
    donations, 
    expenses, 
    loading, 
    financialSummary, 
    actions 
  } = useSupportDashboard();

  return (
    <Box p={8} h="calc(100vh - 80px)" overflowY="auto" className="custom-scrollbar">
      {loading && <LoadingOverlay message="Auditando Ledger de Transparência..." />}

      {/* Header Shell */}
      <Flex align="center" justify="space-between" mb={10}>
        <VStack align="flex-start" spacing={1}>
          <HStack spacing={3}>
            <Box p={2.5} bg="sos.red.500" borderRadius="xl">
              <Heart size={24} color="white" />
            </Box>
            <TacticalText variant="heading" fontSize="2xl">Apoio e Transparência</TacticalText>
          </HStack>
          <TacticalText>Monitoramento de fluxo financeiro e prestação de contas humanitária.</TacticalText>
        </VStack>

        <TacticalButton leftIcon={<RefreshCw size={16} />} onClick={actions.loadData} isLoading={loading}>
          Atualizar Balanço
        </TacticalButton>
      </Flex>

      {/* Financial Telemetry Grid */}
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mb={10}>
        <GlassPanel p={6} borderLeft="4px solid" borderColor="sos.green.500">
          <TacticalStat 
            label="Total Arrecadado" 
            value={`R$ ${financialSummary.totalDonations.toLocaleString()}`} 
            icon={DollarSign} 
            color="sos.green.400" 
          />
        </GlassPanel>
        <GlassPanel p={6} borderLeft="4px solid" borderColor="sos.red.500">
          <TacticalStat 
            label="Despesas de Campo" 
            value={`R$ ${financialSummary.totalExpenses.toLocaleString()}`} 
            icon={Wallet} 
            color="sos.red.400" 
          />
        </GlassPanel>
        <GlassPanel p={6} borderLeft="4px solid" borderColor="sos.blue.500">
          <TacticalStat 
            label="Saldo Operacional" 
            value={`R$ ${financialSummary.balance.toLocaleString()}`} 
            icon={BarChart3} 
            color="sos.blue.400" 
          />
        </GlassPanel>
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={8}>
        
        {/* Active Campaigns - Left */}
        <VStack align="stretch" spacing={6}>
          <HStack spacing={3} px={2}>
            <Icon as={TrendingUp} color="sos.blue.400" />
            <TacticalText variant="subheading">Campanhas Táticas Ativas</TacticalText>
          </HStack>
          
          <VStack spacing={4} align="stretch">
            {campaigns.length === 0 ? (
              <GlassPanel p={10} textAlign="center" borderStyle="dashed">
                <TacticalText opacity={0.3}>NENHUMA CAMPANHA EM CURSO</TacticalText>
              </GlassPanel>
            ) : (
              campaigns.map(c => (
                <GlassPanel key={c.id} p={5}>
                  <Flex justify="space-between" align="center" mb={4}>
                    <TacticalText variant="heading" fontSize="sm">{c.title}</TacticalText>
                    <Badge variant="subtle" bg="sos.blue.500/10" color="sos.blue.400" fontSize="9px">
                      {c.status?.toUpperCase()}
                    </Badge>
                  </Flex>
                  
                  <Box w="full" bg="whiteAlpha.100" borderRadius="full" h="6px" mb={3} overflow="hidden">
                    <Box 
                      h="full" 
                      bg="sos.blue.400" 
                      boxShadow="0 0 10px rgba(6, 182, 212, 0.4)"
                      w={`${Math.min((c.currentAmount / c.targetAmount) * 100, 100)}%`} 
                    />
                  </Box>
                  
                  <Flex justify="space-between">
                    <TacticalText variant="mono" fontSize="10px">R$ {c.currentAmount.toLocaleString()}</TacticalText>
                    <TacticalText variant="caption">Alvo: R$ {c.targetAmount.toLocaleString()}</TacticalText>
                  </Flex>
                </GlassPanel>
              ))
            )}
          </VStack>
        </VStack>

        {/* Financial Flow History - Right */}
        <VStack align="stretch" spacing={6}>
          <HStack spacing={3} px={2}>
            <Icon as={History} color="sos.blue.400" />
            <TacticalText variant="subheading">Extrato de Movimentação</TacticalText>
          </HStack>

          <GlassPanel overflow="hidden">
            <VStack align="stretch" spacing={0} divider={<Divider borderColor="whiteAlpha.50" />}>
              <Box bg="whiteAlpha.50" p={4}>
                <SimpleGrid columns={3} spacing={4}>
                  <TacticalText variant="caption">DESCRIÇÃO</TacticalText>
                  <TacticalText variant="caption" textAlign="center">PROTOCOLO</TacticalText>
                  <TacticalText variant="caption" textAlign="right">VALOR</TacticalText>
                </SimpleGrid>
              </Box>

              <Box maxH="400px" overflowY="auto" className="custom-scrollbar">
                {expenses.map(e => (
                  <Box key={e.id} p={4} _hover={{ bg: 'whiteAlpha.20' }} transition="all 0.2s">
                    <SimpleGrid columns={3} spacing={4} alignItems="center">
                      <TacticalText fontSize="xs">{e.description}</TacticalText>
                      <TacticalText fontSize="10px" color="whiteAlpha.400" textAlign="center" textTransform="uppercase">
                        {e.category}
                      </TacticalText>
                      <TacticalText variant="mono" fontSize="xs" color="sos.red.400" textAlign="right">
                        - R$ {e.amount.toLocaleString()}
                      </TacticalText>
                    </SimpleGrid>
                  </Box>
                ))}
                {donations.map(d => (
                  <Box key={d.id} p={4} _hover={{ bg: 'whiteAlpha.20' }} transition="all 0.2s">
                    <SimpleGrid columns={3} spacing={4} alignItems="center">
                      <TacticalText fontSize="xs">Doação: {d.donorName}</TacticalText>
                      <TacticalText fontSize="10px" color="whiteAlpha.400" textAlign="center" textTransform="uppercase">
                        RECURSO
                      </TacticalText>
                      <TacticalText variant="mono" fontSize="xs" color="sos.green.400" textAlign="right">
                        + R$ {d.amount.toLocaleString()}
                      </TacticalText>
                    </SimpleGrid>
                  </Box>
                ))}
              </Box>
            </VStack>
          </GlassPanel>
        </VStack>
      </SimpleGrid>
    </Box>
  );
}
