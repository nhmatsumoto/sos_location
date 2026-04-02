import React from 'react';
import { 
  Box, 
  VStack, 
  HStack, 
  Text, 
  Icon, 
  SimpleGrid, 
  Progress
} from '@chakra-ui/react';
import { 
  ShieldAlert, 
  Flame, 
  Droplets, 
  Activity, 
  Crosshair 
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TacticalWidget } from './TacticalWidget';
import { TacticalText } from '../atoms/TacticalText';
import type { NewsNotification } from '../../services/newsApi';

interface TacticalInfographicProps {
  news: NewsNotification[];
}

export function TacticalInfographic({ news }: TacticalInfographicProps) {
  const { t } = useTranslation();
  const stats = React.useMemo(() => {
    const total = news.length;
    const wars = news.filter((n: NewsNotification) => (n.category || '').toLowerCase().match(/war|conflict|guerra/)).length;
    const weather = news.filter((n: NewsNotification) => (n.category || '').toLowerCase().match(/weather|heat|clima|calor/)).length;
    const disasters = news.filter((n: NewsNotification) => (n.category || '').toLowerCase().match(/flood|earthquake|tsunami|enchente|terremoto/)).length;
    const critical = news.filter((n: NewsNotification) => (n.riskScore || 0) > 80).length;

    return { total, wars, weather, disasters, critical };
  }, [news]);

  return (
    <TacticalWidget 
      title={t('intel.title')} 
      icon={ShieldAlert}
      defaultPosition={{ x: window.innerWidth - 300, y: 80 }}
      width="280px"
    >
      <VStack align="stretch" spacing={4}>
        <SimpleGrid columns={2} spacing={3}>
          <StatBox 
            label={t('intel.war')} 
            value={stats.wars} 
            icon={Crosshair} 
            color="#FF0000" 
          />
          <StatBox 
            label={t('intel.disasters')} 
            value={stats.disasters} 
            icon={Flame} 
            color="orange.400" 
          />
          <StatBox 
            label={t('intel.weather')} 
            value={stats.weather} 
            icon={Droplets} 
            color="sos.blue.400" 
          />
          <StatBox 
            label={t('intel.critical')} 
            value={stats.critical} 
            icon={Activity} 
            color="sos.red.400" 
          />
        </SimpleGrid>

        <VStack align="stretch" spacing={2} pt={2}>
          <HStack justify="space-between">
            <Text fontSize="10px" color="whiteAlpha.400" fontWeight="bold">{t('intel.surveillance')}</Text>
            <Text fontSize="10px" color="sos.blue.400" fontWeight="black">{((stats.critical / (stats.total || 1)) * 100).toFixed(1)}%</Text>
          </HStack>
          <Progress 
            value={(stats.critical / (stats.total || 1)) * 100} 
            size="xs" 
            colorScheme="red" 
            bg="whiteAlpha.100" 
            borderRadius="full" 
          />
        </VStack>

        <Box position="relative" h="40px" overflow="hidden" opacity={0.5}>
          <Box 
            position="absolute" 
            inset={0} 
            className="scanline" 
            pointerEvents="none"
          />
          <TacticalText variant="mono" fontSize="8px" lineHeight="1.2">
             {stats.total}_ACTIVE_NODES_INDEXED <br/>
             {new Date().toISOString()}_SYNC_OK <br/>
             ENCRYPTION_LAYER_6_STATUS_ACTIVE
          </TacticalText>
        </Box>
      </VStack>
    </TacticalWidget>
  );
}

interface StatBoxProps {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
}

function StatBox({ label, value, icon, color }: StatBoxProps) {
  return (
    <VStack 
      align="start" 
      p={2} 
      bg="whiteAlpha.50" 
      borderRadius="xl" 
      border="1px solid" 
      borderColor="whiteAlpha.100"
      spacing={1}
    >
      <Icon as={icon} color={color} boxSize="12px" />
      <Text fontSize="14px" fontWeight="black" color="white">{value}</Text>
      <Text fontSize="7px" color="whiteAlpha.400" letterSpacing="0.1em" fontWeight="bold">{label}</Text>
    </VStack>
  );
}
