import { Box, Flex, HStack, Badge, Progress, VStack } from '@chakra-ui/react';
import { Zap } from 'lucide-react';
import { NewsFeed } from '../public/NewsFeed';
import { TacticalText } from '../atoms/TacticalText';

interface TacticalFeedSidebarProps {
  news: any[];
  isLoading: boolean;
  onSelect?: (item: any) => void;
}

/**
 * Tactical Feed Sidebar
 * Unified with the Guardian Design System. Highlights live telemetry
 * and situational awareness through a glass-morphed container.
 */
import { useTranslation } from 'react-i18next';
import { TacticalWidget } from './TacticalWidget';

export function TacticalFeedSidebar({ news, isLoading, onSelect }: TacticalFeedSidebarProps) {
  const { t } = useTranslation();

  return (
    <TacticalWidget 
      title={t('nav.monitor')} 
      icon={Zap}
      defaultPosition={{ x: 24, y: 160 }}
      width="400px"
    >
      <VStack align="stretch" spacing={4}>
        <HStack spacing={2}>
          <Badge bg="sos.blue.500" color="white" fontSize="9px" px={2} borderRadius="full">
            {t('nav.status') || 'LIVE_STREAM'}
          </Badge>
          <Badge
            variant="outline"
            color="sos.red.400"
            borderColor="sos.red.500/20"
            fontSize="9px"
            px={2}
            borderRadius="full"
          >
            CRITICAL
          </Badge>
        </HStack>

        <Box maxH="60vh" overflowY="auto" className="custom-scrollbar" pr={2}>
          <NewsFeed news={news} isLoading={isLoading} onSelect={onSelect} />
        </Box>

        <Box pt={4} borderTop="1px solid" borderColor="whiteAlpha.100">
          <Flex justify="space-between" mb={2}>
            <TacticalText variant="caption">System Integrity</TacticalText>
            <TacticalText variant="mono" color="sos.green.400">Stable</TacticalText>
          </Flex>
          <Progress value={92} size="xs" borderRadius="full" bg="whiteAlpha.100" colorScheme="blue" h="4px" />
        </Box>
      </VStack>
    </TacticalWidget>
  );
}
