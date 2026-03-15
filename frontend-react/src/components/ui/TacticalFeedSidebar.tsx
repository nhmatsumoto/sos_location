import { Box, Flex, HStack, Badge, Progress, Icon } from '@chakra-ui/react';
import { Zap } from 'lucide-react';
import { NewsFeed } from '../public/NewsFeed';
import { GlassPanel } from '../atoms/GlassPanel';
import { TacticalText } from '../atoms/TacticalText';

interface TacticalFeedSidebarProps {
  news: any[];
  isLoading: boolean;
}

/**
 * Tactical Feed Sidebar
 * Unified with the Guardian Design System. Highlights live telemetry
 * and situational awareness through a glass-morphed container.
 */
export function TacticalFeedSidebar({ news, isLoading }: TacticalFeedSidebarProps) {
  return (
    <GlassPanel
      position="absolute"
      left={6}
      top="120px"
      bottom={6}
      w="400px"
      zIndex={50}
      display={{ base: 'none', lg: 'flex' }}
      flexDirection="column"
      overflow="hidden"
      className="animate-panel"
    >
      <Box p={8} pb={4} borderBottom="1px solid" borderColor="whiteAlpha.100" bg="whiteAlpha.50">
        <Flex justify="space-between" align="center" mb={6}>
          <Box>
            <TacticalText variant="subheading" color="sos.blue.400">Live Intelligence</TacticalText>
            <TacticalText variant="heading" fontSize="xl">Situation Feed</TacticalText>
          </Box>
          <Box
            p={3}
            borderRadius="2xl"
            bg="whiteAlpha.100"
            color="sos.blue.400"
            border="1px solid"
            borderColor="whiteAlpha.100"
          >
            <Icon as={Zap} size={20} fill="currentColor" />
          </Box>
        </Flex>

        <HStack spacing={2}>
          <Badge bg="sos.blue.500" color="white" fontSize="9px" px={2} borderRadius="full">
            LIVE_STREAM
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
      </Box>

      <Box flex={1} overflowY="auto" px={6} py={6} className="custom-scrollbar">
        <NewsFeed news={news} isLoading={isLoading} />
      </Box>

      <Box p={8} bg="whiteAlpha.20" borderTop="1px solid" borderColor="whiteAlpha.100">
        <Flex justify="space-between" mb={2}>
          <TacticalText variant="caption">System Integrity</TacticalText>
          <TacticalText variant="mono" color="sos.green.400">Stable</TacticalText>
        </Flex>
        <Progress value={92} size="xs" borderRadius="full" bg="whiteAlpha.100" colorScheme="blue" h="4px" />
        <TacticalText
          mt={4}
          textAlign="center"
          opacity={0.3}
          letterSpacing="0.4em"
        >
          GUARDIAN PUBLIC PORTAL // V3.0
        </TacticalText>
      </Box>
    </GlassPanel>
  );
}
