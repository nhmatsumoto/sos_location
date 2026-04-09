import { memo, useEffect, useMemo, useState } from 'react';
import { Activity, Clock3, DatabaseZap, Radar } from 'lucide-react';
import { Box, Icon, SimpleGrid, Text, VStack } from '@chakra-ui/react';
import { useLocation } from 'react-router-dom';
import {
  APP_ROUTE_GROUP_LABELS,
  findAppRouteByPath,
} from '../../lib/appRouteManifest';
import { ShellLiveIndicator, ShellSectionEyebrow, ShellSurface } from './ShellPrimitives';
import { useTranslation } from 'react-i18next';

interface StripItem {
  id: string;
  icon: typeof Activity;
  label: string;
  value: string;
  helper: string;
}

export const StatusStrip = memo(function StatusStrip() {
  const location = useLocation();
  const { t } = useTranslation();
  const [timestamp, setTimestamp] = useState(() =>
    new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTimestamp(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    }, 30000);

    return () => window.clearInterval(timer);
  }, []);

  const currentRoute = findAppRouteByPath(location.pathname);

  const items = useMemo<StripItem[]>(() => {
    const currentGroupLabel = currentRoute
      ? APP_ROUTE_GROUP_LABELS[currentRoute.group]
      : 'Operações';
    const currentRouteLabel = currentRoute
      ? t(currentRoute.labelKey)
      : 'Quadro situacional';

    return [
      {
        id: 'link',
        icon: Activity,
        label: 'Canal operacional',
        value: 'Online',
        helper: 'Sincronização ativa do centro de comando',
      },
      {
        id: 'context',
        icon: Radar,
        label: 'Contexto ativo',
        value: currentGroupLabel,
        helper: currentRouteLabel,
      },
      {
        id: 'sync',
        icon: Clock3,
        label: 'Última atualização',
        value: timestamp,
        helper: 'telemetria local consolidada',
      },
      {
        id: 'sources',
        icon: DatabaseZap,
        label: 'Fontes territoriais',
        value: 'OSM • DEM • Meteo',
        helper: 'observação territorial e ingestão externa',
      },
    ];
  }, [currentRoute, t, timestamp]);

  return (
    <ShellSurface variant="subtle" px={3} py={2.5}>
      <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacing={2}>
        {items.map((item) => (
          <Box
            key={item.id}
            px={3}
            py={2.5}
            borderRadius="lg"
            bg="surface.interactive"
            border="1px solid"
            borderColor="border.subtle"
          >
            <VStack align="stretch" spacing={1.5}>
              <Box display="flex" alignItems="center" justifyContent="space-between" gap={3}>
                <Box display="flex" alignItems="center" gap={2}>
                  <Icon as={item.icon} boxSize={3.5} color="sos.blue.300" />
                  <ShellSectionEyebrow>{item.label}</ShellSectionEyebrow>
                </Box>
                {item.id === 'link' ? <ShellLiveIndicator label="Ativo" /> : null}
              </Box>
              <Text color="text.primary" fontSize="sm" fontWeight="700">
                {item.value}
              </Text>
              <Text color="text.secondary" fontSize="xs">
                {item.helper}
              </Text>
            </VStack>
          </Box>
        ))}
      </SimpleGrid>
    </ShellSurface>
  );
});
