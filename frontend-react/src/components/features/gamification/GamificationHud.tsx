import { Trophy, Shield } from 'lucide-react';
import { Box, Flex, Progress, Circle, VStack, HStack, Icon, type BoxProps } from '@chakra-ui/react';
import { useAuthStore } from '../../../store/authStore';
import { GlassPanel } from '../../atoms/GlassPanel';
import { TacticalText } from '../../atoms/TacticalText';

interface GamificationHudProps extends BoxProps {
  xp?: number;
  level?: number;
  rank?: string;
  nextLevelXp?: number;
}

/**
 * Gamification HUD — Guardian Clarity v3
 * Displays user progress, level and rank stats. 
 * Integrated with authStore for real-time progression.
 */
export function GamificationHud({ 
  xp: propXp, 
  level: propLevel, 
  rank: propRank, 
  nextLevelXp: propNextLevelXp, 
  ...props 
}: GamificationHudProps) {
  const { user } = useAuthStore();
  
  // Use props if provided, otherwise fallback to store
  const xp = propXp ?? user?.xp ?? 0;
  const level = propLevel ?? user?.level ?? 1;
  const rank = propRank ?? user?.rank ?? 'Recruta';
  const nextLevelXp = propNextLevelXp ?? (level * 1000);
  
  const progress = (xp / nextLevelXp) * 100;

  return (
    <GlassPanel
      p={4}
      depth="raised"
      {...props}
    >
      <HStack spacing={4} w="full">
        <Box position="relative">
          <Circle
            size="42px"
            bg="sos.blue.500"
            color="white"
            border="1.5px solid"
            borderColor="rgba(255,255,255,0.2)"
            boxShadow="0 0 16px rgba(0, 122, 255, 0.4)"
          >
            <TacticalText variant="heading" fontSize="md">{level}</TacticalText>
          </Circle>
          <Circle
            position="absolute"
            bottom="-1"
            right="-1"
            bg="#FF3B30"
            size="18px"
            boxShadow="lg"
            border="2px solid"
            borderColor="#08080F"
          >
            <Shield size={9} color="white" fill="white" />
          </Circle>
        </Box>

        <VStack flex={1} align="stretch" spacing={2.5}>
          <Flex justify="space-between" align="center">
            <VStack align="start" spacing={0}>
              <TacticalText variant="heading" fontSize="xs" color="white" letterSpacing="0.05em">
                {rank.toUpperCase()}
              </TacticalText>
              <TacticalText variant="caption" fontSize="8px" color="rgba(255,255,255,0.3)">
                GUARDIAN_LEVEL_SYS
              </TacticalText>
            </VStack>
            <TacticalText variant="mono" fontSize="9px" color="sos.blue.400" fontWeight="700">
              {xp} / {nextLevelXp} <Text as="span" opacity={0.4}>XP</Text>
            </TacticalText>
          </Flex>

          <Box position="relative" pt={0.5}>
            <Progress
              value={progress}
              size="xs"
              borderRadius="full"
              bg="rgba(255,255,255,0.06)"
              colorScheme="blue"
              h="2.5px"
            />
          </Box>
        </VStack>

        <Box pl={3} borderLeft="1px solid" borderColor="rgba(255,255,255,0.1)" display={{ base: 'none', lg: 'block' }}>
          <VStack spacing={0} align="center">
            <Icon as={Trophy} boxSize="12px" color="sos.blue.400" />
            <TacticalText variant="caption" fontSize="7px" mt={1} opacity={0.4}>BADGES</TacticalText>
            <TacticalText variant="mono" fontSize="xs" color="white" fontWeight="700">12</TacticalText>
          </VStack>
        </Box>
      </HStack>
    </GlassPanel>
  );
}

// Minimal Box fix
const Text = ({ children, ...props }: any) => (
  <Box as="span" {...props}>{children}</Box>
);
