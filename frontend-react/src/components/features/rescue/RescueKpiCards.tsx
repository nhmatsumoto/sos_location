import { Activity, AlertTriangle, CheckCircle2, ClipboardList } from 'lucide-react';
import { Box, SimpleGrid, Text, VStack } from '@chakra-ui/react';
import { MetricCard } from '../../layout/PagePrimitives';
import { ShellSectionEyebrow } from '../../layout/ShellPrimitives';

interface RescueKpiCardsProps {
  total: number;
  open: number;
  active: number;
  done: number;
}

const cards = [
  {
    key: 'total',
    label: 'Missões registradas',
    subtitle: 'Volume total no quadro',
    icon: ClipboardList,
    valueKey: 'total',
    tone: 'info',
    accentColor: 'sos.cyan.300',
    progressColor: 'sos.cyan.400',
  },
  {
    key: 'open',
    label: 'Aguardando despacho',
    subtitle: 'Fila inicial',
    icon: AlertTriangle,
    valueKey: 'open',
    tone: 'critical',
    accentColor: 'sos.red.300',
    progressColor: 'sos.red.400',
  },
  {
    key: 'active',
    label: 'Em campo',
    subtitle: 'Resposta ativa',
    icon: Activity,
    valueKey: 'active',
    tone: 'warning',
    accentColor: 'sos.amber.300',
    progressColor: 'sos.amber.400',
  },
  {
    key: 'done',
    label: 'Encerradas',
    subtitle: 'Ciclo fechado',
    icon: CheckCircle2,
    valueKey: 'done',
    tone: 'success',
    accentColor: 'sos.green.300',
    progressColor: 'sos.green.400',
  },
] as const;

export function RescueKpiCards({ total, open, active, done }: RescueKpiCardsProps) {
  const values = { total, open, active, done };

  return (
    <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacing={4}>
      {cards.map((card) => {
        const value = values[card.valueKey];
        const share = total > 0 ? Math.round((value / total) * 100) : card.key === 'total' ? 100 : 0;

        return (
          <MetricCard
            key={card.key}
            label={card.label}
            value={value}
            helper={card.subtitle}
            icon={card.icon}
            tone={card.tone}
            accentColor={card.accentColor}
          >
            <VStack align="stretch" spacing={3}>
              <VStack align="flex-start" spacing={1}>
                <Text fontFamily="mono" fontSize="3xl" fontWeight="700" color="white" lineHeight={1}>
                  {value}
                </Text>
                <Text fontSize="sm" color="text.secondary">
                  {card.subtitle}
                </Text>
              </VStack>
              <Box>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                  <ShellSectionEyebrow>Participação</ShellSectionEyebrow>
                  <Text fontSize="11px" color="text.secondary">
                    {share}%
                  </Text>
                </Box>
                <Box h={1.5} borderRadius="full" bg="rgba(255,255,255,0.06)" overflow="hidden">
                  <Box
                    h="full"
                    borderRadius="full"
                    bg={card.progressColor}
                    width={`${Math.max(share, card.key === 'total' ? 100 : value > 0 ? 10 : 0)}%`}
                  />
                </Box>
              </Box>
            </VStack>
          </MetricCard>
        );
      })}
    </SimpleGrid>
  );
}
