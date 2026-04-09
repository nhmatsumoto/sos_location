import {
  BarChart3,
  DollarSign,
  Heart,
  History,
  RefreshCw,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import {
  Box,
  Button,
  HStack,
  SimpleGrid,
  Text,
  VStack,
} from '@chakra-ui/react';
import { LoadingOverlay } from '../../../components/ui/LoadingOverlay';
import {
  MetricCard,
  PageEmptyState,
  PageHeader,
  PagePanel,
} from '../../../components/layout/PagePrimitives';
import {
  ShellSectionEyebrow,
  ShellTelemetryBadge,
} from '../../../components/layout/ShellPrimitives';
import { useSupportDashboard } from '../../../hooks/useSupportDashboard';

export function SupportDashboardPage() {
  const {
    campaigns,
    donations,
    expenses,
    loading,
    financialSummary,
    actions,
  } = useSupportDashboard();

  const flowEntries = [
    ...expenses.map((expense) => ({
      id: `expense-${expense.id}`,
      label: expense.description,
      type: expense.category,
      amount: expense.amount,
      sign: 'negative' as const,
      occurredAt: expense.spentAtUtc,
    })),
    ...donations.map((donation) => ({
      id: `donation-${donation.id}`,
      label: `Doação de ${donation.donorName}`,
      type: 'recurso',
      amount: donation.amount,
      sign: 'positive' as const,
      occurredAt: donation.donatedAtUtc,
    })),
  ].sort((left, right) => Date.parse(right.occurredAt) - Date.parse(left.occurredAt));

  return (
    <Box
      position="relative"
      h="full"
      overflowY="auto"
      px={{ base: 4, md: 6, xl: 8 }}
      py={{ base: 4, md: 6 }}
      bgGradient="radial(circle at top left, rgba(255,59,48,0.08), transparent 22%), radial(circle at bottom right, rgba(52,199,89,0.08), transparent 24%), linear(to-b, #030712 0%, #07111f 55%, #08121d 100%)"
    >
      {loading ? <LoadingOverlay message="Auditando ledger humanitário..." variant="contained" /> : null}

      <VStack maxW="7xl" mx="auto" spacing={6} align="stretch">
        <PageHeader
          icon={Heart}
          eyebrow="SUPPORT_LEDGER // HUMANITARIAN_FLOW // TRANSPARENCY"
          title="Painel de apoio e transparência com leitura operacional do fluxo humanitário"
          description="A superfície foi reorganizada para destacar saldo, campanhas, entradas e saídas financeiras sem perder rastreabilidade temporal."
          meta={
            <>
              <ShellTelemetryBadge tone="success">{donations.length} entradas</ShellTelemetryBadge>
              <ShellTelemetryBadge tone="critical">{expenses.length} saídas</ShellTelemetryBadge>
              <ShellTelemetryBadge tone="info">{campaigns.length} campanhas</ShellTelemetryBadge>
            </>
          }
          actions={
            <Button
              leftIcon={<RefreshCw size={16} />}
              variant="ghost"
              onClick={() => void actions.loadData()}
              isLoading={loading}
            >
              Atualizar balanço
            </Button>
          }
        />

        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
          <MetricCard
            label="Total arrecadado"
            value={`R$ ${financialSummary.totalDonations.toLocaleString()}`}
            helper="Entradas consolidadas da operação"
            icon={DollarSign}
            tone="success"
          />
          <MetricCard
            label="Despesas de campo"
            value={`R$ ${financialSummary.totalExpenses.toLocaleString()}`}
            helper="Saídas registradas com vínculo operacional"
            icon={Wallet}
            tone="critical"
          />
          <MetricCard
            label="Saldo disponível"
            value={`R$ ${financialSummary.balance.toLocaleString()}`}
            helper="Capacidade líquida para novas frentes"
            icon={BarChart3}
            tone={financialSummary.balance >= 0 ? 'info' : 'critical'}
          />
        </SimpleGrid>

        <SimpleGrid columns={{ base: 1, xl: 3 }} spacing={6} alignItems="start">
          <PagePanel
            gridColumn={{ xl: 'span 1' }}
            title="Campanhas ativas"
            description="Leitura rápida da tração de arrecadação por campanha."
            icon={TrendingUp}
            tone="info"
          >
            {campaigns.length === 0 ? (
              <PageEmptyState
                minH="280px"
                title="Nenhuma campanha em curso"
                description="A governança ainda não publicou campanhas para o incidente atual."
              />
            ) : (
              <VStack align="stretch" spacing={4}>
                {campaigns.map((campaign) => {
                  const completion = campaign.targetAmount > 0
                    ? Math.min(Math.round((campaign.currentAmount / campaign.targetAmount) * 100), 100)
                    : 0;

                  return (
                    <Box
                      key={campaign.id}
                      p={4}
                      borderRadius="3xl"
                      bg="surface.interactive"
                      border="1px solid"
                      borderColor="border.subtle"
                    >
                      <VStack align="stretch" spacing={3}>
                        <HStack justify="space-between" align="flex-start" spacing={3}>
                          <VStack align="flex-start" spacing={1}>
                            <Text fontSize="md" fontWeight="700" color="white">
                              {campaign.title}
                            </Text>
                            <Text fontSize="sm" color="text.secondary" lineHeight={1.7}>
                              {campaign.description}
                            </Text>
                          </VStack>
                          <ShellTelemetryBadge tone="info">
                            {campaign.status}
                          </ShellTelemetryBadge>
                        </HStack>

                        <Box>
                          <HStack justify="space-between" mb={1.5}>
                            <ShellSectionEyebrow>Execução</ShellSectionEyebrow>
                            <Text fontSize="sm" color="text.secondary">
                              {completion}%
                            </Text>
                          </HStack>
                          <Box h={2} borderRadius="full" bg="rgba(255,255,255,0.06)" overflow="hidden">
                            <Box h="full" borderRadius="full" bg="sos.blue.400" width={`${completion}%`} />
                          </Box>
                        </Box>

                        <HStack justify="space-between" flexWrap="wrap" spacing={3}>
                          <Text fontSize="sm" fontWeight="600" color="white">
                            R$ {campaign.currentAmount.toLocaleString()}
                          </Text>
                          <Text fontSize="sm" color="text.secondary">
                            Meta: R$ {campaign.targetAmount.toLocaleString()}
                          </Text>
                        </HStack>
                      </VStack>
                    </Box>
                  );
                })}
              </VStack>
            )}
          </PagePanel>

          <PagePanel
            gridColumn={{ xl: 'span 2' }}
            title="Fluxo financeiro recente"
            description="Entradas e saídas consolidadas em uma linha única, ordenadas por data."
            icon={History}
            tone="default"
          >
            {flowEntries.length === 0 ? (
              <PageEmptyState
                minH="320px"
                title="Sem movimentação registrada"
                description="Entradas de apoio e despesas operacionais aparecerão aqui assim que forem sincronizadas."
              />
            ) : (
              <VStack align="stretch" spacing={0}>
                <SimpleGrid
                  columns={{ base: 1, md: 4 }}
                  spacing={4}
                  px={4}
                  py={3.5}
                  bg="rgba(255,255,255,0.03)"
                  borderRadius="2xl"
                  border="1px solid"
                  borderColor="border.subtle"
                >
                  <ShellSectionEyebrow>Descrição</ShellSectionEyebrow>
                  <ShellSectionEyebrow>Categoria</ShellSectionEyebrow>
                  <ShellSectionEyebrow>Momento</ShellSectionEyebrow>
                  <ShellSectionEyebrow textAlign={{ md: 'right' }}>Valor</ShellSectionEyebrow>
                </SimpleGrid>

                <VStack
                  align="stretch"
                  spacing={2}
                  mt={3}
                  maxH="560px"
                  overflowY="auto"
                  sx={{
                    '&::-webkit-scrollbar': { width: '8px' },
                    '&::-webkit-scrollbar-thumb': {
                      background: 'rgba(255,255,255,0.12)',
                      borderRadius: '999px',
                    },
                  }}
                >
                  {flowEntries.map((entry) => (
                    <SimpleGrid
                      key={entry.id}
                      columns={{ base: 1, md: 4 }}
                      spacing={4}
                      px={4}
                      py={3.5}
                      borderRadius="2xl"
                      bg="surface.interactive"
                      border="1px solid"
                      borderColor="border.subtle"
                    >
                      <Text fontSize="sm" color="white" fontWeight="600">
                        {entry.label}
                      </Text>
                      <Text fontSize="sm" color="text.secondary" textTransform="uppercase">
                        {entry.type}
                      </Text>
                      <Text fontSize="sm" color="text.secondary">
                        {new Date(entry.occurredAt).toLocaleString('pt-BR')}
                      </Text>
                      <Text
                        fontSize="sm"
                        fontWeight="700"
                        textAlign={{ md: 'right' }}
                        color={entry.sign === 'positive' ? 'sos.green.300' : 'sos.red.300'}
                      >
                        {entry.sign === 'positive' ? '+ ' : '- '}R$ {entry.amount.toLocaleString()}
                      </Text>
                    </SimpleGrid>
                  ))}
                </VStack>
              </VStack>
            )}
          </PagePanel>
        </SimpleGrid>
      </VStack>
    </Box>
  );
}
