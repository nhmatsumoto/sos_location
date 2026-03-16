import { Trophy, Shield } from 'lucide-react';
import { Box, Flex, Progress, Circle, VStack, HStack, Icon, type BoxProps } from '@chakra-ui/react';

interface GamificationHudProps extends BoxProps {
  xp: number;
  level: number;
  rank: string;
  nextLevelXp: number;
}

import { GlassPanel } from '../atoms/GlassPanel';
import { TacticalText } from '../atoms/TacticalText';

export function GamificationHud({ xp, level, rank, nextLevelXp, ...props }: GamificationHudProps) {
  const progress = (xp / nextLevelXp) * 100;

  return (
    <GlassPanel
      p={5}
      intensity="medium"
      variant="tactical"
      {...props}
    >
      <HStack spacing={5} w="full">
        <Box position="relative">
          <Circle
            size="48px"
            bg="sos.blue.500"
            color="white"
            border="2px solid"
            borderColor="whiteAlpha.300"
            boxShadow={`0 0 15px rgba(33, 126, 255, 0.4)`}
          >
            <TacticalText variant="heading" fontSize="lg">{level}</TacticalText>
          </Circle>
          <Circle
            position="absolute"
            bottom="-1"
            right="-1"
            bg="sos.red.500"
            size="20px"
            boxShadow="lg"
            border="2px solid"
            borderColor="sos.dark"
          >
            <Shield size={10} color="white" />
          </Circle>
        </Box>

        <VStack flex={1} align="stretch" spacing={2}>
          <Flex justify="space-between" align="flex-end">
            <VStack align="start" spacing={0}>
              <TacticalText variant="heading" fontSize="xs" color="white">
                {rank}
              </TacticalText>
              <TacticalText variant="caption" fontSize="8px">
                Sentinel Class IV
              </TacticalText>
            </VStack>
            <TacticalText variant="mono" fontSize="9px" color="sos.blue.400">
              {xp} / {nextLevelXp} XP
            </TacticalText>
          </Flex>

          <Box position="relative" pt={1}>
            <Progress
              value={progress}
              size="xs"
              borderRadius="full"
              bg="whiteAlpha.100"
              colorScheme="blue"
              h="3px"
            />
          </Box>
        </VStack>

        <Box pl={4} borderLeft="1px solid" borderColor="whiteAlpha.100" display={{ base: 'none', lg: 'block' }}>
          <VStack spacing={0} align="center">
            <Icon as={Trophy} boxSize="14px" color="sos.blue.300" />
            <TacticalText variant="caption" fontSize="8px" mt={1}>BADGES</TacticalText>
            <TacticalText variant="mono" fontSize="xs" color="white">12</TacticalText>
          </VStack>
        </Box>
      </HStack>
    </GlassPanel>
  );
}
