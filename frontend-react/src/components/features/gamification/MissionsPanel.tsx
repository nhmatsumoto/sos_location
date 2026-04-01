import { Target, CheckCircle2, ChevronRight, Rocket, Shield, Map } from 'lucide-react';
import { Box, Flex, VStack, Icon, HStack, Progress, Badge, Divider, Skeleton } from '@chakra-ui/react';

interface Mission {
  id: string;
  title: string;
  description: string;
  reward: number;
  completed: boolean;
  type: 'report' | 'validate' | 'rescue';
  priority: 'high' | 'medium' | 'low';
}

import { GlassPanel } from '../../atoms/GlassPanel';
import { TacticalText } from '../../atoms/TacticalText';

interface MissionsPanelProps {
  missions?: Mission[];
  isLoading?: boolean;
}

export function MissionsPanel({ missions, isLoading = false }: MissionsPanelProps) {
  const activeMissions = (missions ?? []).filter(m => !m.completed);
  const isEmpty = !isLoading && (!missions || missions.length === 0);

  return (
    <GlassPanel
      flexDirection="column"
      overflow="hidden"
      intensity="medium"
      variant="tactical"
      h="full"
    >
      {/* Header */}
      <Box p={5} borderBottom="1px solid" borderColor="whiteAlpha.100" bg="whiteAlpha.50">
        <Flex align="center" justify="space-between" mb={1}>
          <HStack spacing={2}>
            <Icon as={Target} boxSize="16px" color="sos.blue.400" />
            <TacticalText variant="heading" fontSize="xs">
              OBJETIVOS TÁTICOS
            </TacticalText>
          </HStack>
          {!isLoading && missions && (
            <Badge bg="sos.blue.500" color="white" fontSize="9px" px={2} borderRadius="md" py={0.5}>
              {activeMissions.length} ATIVOS
            </Badge>
          )}
          {isLoading && (
            <Skeleton h="18px" w="55px" borderRadius="md" startColor="whiteAlpha.100" endColor="whiteAlpha.200" />
          )}
        </Flex>
        <TacticalText variant="caption">Coordenação de campo // Stream</TacticalText>
      </Box>

      {/* Mission List */}
      <VStack spacing={0} align="stretch" flex={1} overflowY="auto" className="custom-scrollbar">
        {isLoading && (
          <>
            {[0, 1, 2].map(i => (
              <Box key={i} px={5} py={4} borderBottom="1px solid" borderColor="whiteAlpha.50">
                <HStack spacing={3}>
                  <Skeleton boxSize="32px" borderRadius="xl" startColor="whiteAlpha.100" endColor="whiteAlpha.200" />
                  <VStack align="start" spacing={1} flex={1}>
                    <Skeleton h="11px" w="70%" borderRadius="sm" startColor="whiteAlpha.100" endColor="whiteAlpha.200" />
                    <Skeleton h="10px" w="50%" borderRadius="sm" startColor="whiteAlpha.100" endColor="whiteAlpha.200" />
                  </VStack>
                </HStack>
              </Box>
            ))}
          </>
        )}

        {isEmpty && (
          <Flex flex={1} align="center" justify="center" py={8}>
            <VStack spacing={2}>
              <Icon as={Target} boxSize="28px" color="whiteAlpha.200" />
              <TacticalText variant="caption" color="whiteAlpha.300" textAlign="center">
                Nenhum objetivo<br />disponível no momento
              </TacticalText>
            </VStack>
          </Flex>
        )}

        {!isLoading && (missions ?? []).map((mission, index) => (
          <Box key={mission.id}>
            <HStack
              px={5}
              py={4}
              cursor="pointer"
              role="group"
              transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
              bg={mission.completed ? "whiteAlpha.50" : "transparent"}
              _hover={{ bg: 'whiteAlpha.100' }}
              position="relative"
            >
              {!mission.completed && (
                <Box
                  position="absolute"
                  left={0}
                  top="20%"
                  bottom="20%"
                  w="2px"
                  bg={mission.priority === 'high' ? 'sos.red.500' : 'sos.blue.500'}
                  borderRadius="full"
                />
              )}

              <Flex
                alignItems="center"
                justifyContent="center"
                w="32px"
                h="32px"
                borderRadius="xl"
                bg="whiteAlpha.100"
                border="1px solid"
                borderColor="whiteAlpha.100"
              >
                <Icon
                  as={mission.type === 'validate' ? Shield : mission.type === 'report' ? Map : Rocket}
                  boxSize="14px"
                  color={mission.completed ? 'whiteAlpha.300' : 'sos.blue.400'}
                />
              </Flex>

              <VStack align="flex-start" spacing={0} flex={1}>
                <HStack w="full" justify="space-between">
                  <TacticalText
                    fontSize="11px"
                    fontWeight="bold"
                    color={mission.completed ? "whiteAlpha.400" : "white"}
                    textDecoration={mission.completed ? 'line-through' : 'none'}
                  >
                    {mission.title}
                  </TacticalText>
                  {mission.completed && <Icon as={CheckCircle2} boxSize="14px" color="sos.green.400" />}
                </HStack>
                <TacticalText fontSize="10px" color="whiteAlpha.500" noOfLines={1}>
                  {mission.description}
                </TacticalText>
                <HStack mt={1} spacing={2}>
                  <TacticalText variant="mono" fontSize="9px" color="sos.blue.400">
                    +{mission.reward} XP
                  </TacticalText>
                  {!mission.completed && (
                    <Badge fontSize="8px" variant="outline" borderColor="whiteAlpha.200" color="whiteAlpha.400" px={1} borderRadius="sm">
                      {mission.priority.toUpperCase()}
                    </Badge>
                  )}
                </HStack>
              </VStack>

              {!mission.completed && (
                <Icon
                  as={ChevronRight}
                  boxSize="14px"
                  color="whiteAlpha.200"
                  _groupHover={{ color: 'white', transform: 'translateX(2px)' }}
                  transition="all 0.2s"
                />
              )}
            </HStack>
            {index < (missions ?? []).length - 1 && <Divider borderColor="whiteAlpha.50" />}
          </Box>
        ))}
      </VStack>

      {/* Footer — only shown when real data loaded */}
      {!isLoading && missions && missions.length > 0 && (
        <Box p={5} bg="whiteAlpha.50" borderTop="1px solid" borderColor="whiteAlpha.100">
          <Flex align="center" justify="space-between" mb={2}>
            <TacticalText variant="caption">OBJETIVOS CONCLUÍDOS</TacticalText>
            <TacticalText variant="mono" fontSize="xs" color="sos.blue.400">
              {missions.filter(m => m.completed).length}/{missions.length}
            </TacticalText>
          </Flex>
          <Progress
            value={missions.length > 0 ? (missions.filter(m => m.completed).length / missions.length) * 100 : 0}
            size="xs"
            borderRadius="full"
            bg="whiteAlpha.100"
            colorScheme="blue"
            h="3px"
          />
        </Box>
      )}
    </GlassPanel>
  );
}
