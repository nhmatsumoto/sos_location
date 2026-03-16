import { Target, CheckCircle2, ChevronRight, Rocket, Shield, Map } from 'lucide-react';
import { Box, Flex, VStack, Text, Icon, HStack, Progress, Badge, Divider } from '@chakra-ui/react';

interface Mission {
  id: string;
  title: string;
  description: string;
  reward: number;
  completed: boolean;
  type: 'report' | 'validate' | 'rescue';
  priority: 'high' | 'medium' | 'low';
}

const mockMissions: Mission[] = [
  { 
    id: '1', 
    title: 'Validar Áreas de Risco', 
    description: 'Verificar 3 pontos reportados na Zona Sul',
    reward: 500, 
    completed: false, 
    type: 'validate',
    priority: 'high'
  },
  { 
    id: '2', 
    title: 'Reportar Inundação', 
    description: 'Identificar nível da água no Setor 4',
    reward: 300, 
    completed: true, 
    type: 'report',
    priority: 'medium'
  },
  { 
    id: '3', 
    title: 'Confirmar Equipes', 
    description: 'Validar chegada da defesa civil na UBS',
    reward: 200, 
    completed: false, 
    type: 'rescue',
    priority: 'low'
  },
];

import { GlassPanel } from '../atoms/GlassPanel';
import { TacticalText } from '../atoms/TacticalText';

export function MissionsPanel() {
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
          <Badge bg="sos.blue.500" color="white" fontSize="9px" px={2} borderRadius="md" py={0.5}>
            {mockMissions.filter(m => !m.completed).length} ATIVOS
          </Badge>
        </Flex>
        <TacticalText variant="caption">Coordenação de campo // Stream</TacticalText>
      </Box>

      {/* Mission List */}
      <VStack spacing={0} align="stretch" flex={1} overflowY="auto" className="custom-scrollbar">
        {mockMissions.map((mission, index) => (
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
            {index < mockMissions.length - 1 && <Divider borderColor="whiteAlpha.50" />}
          </Box>
        ))}
      </VStack>

      {/* Footer */}
      <Box p={5} bg="whiteAlpha.50" borderTop="1px solid" borderColor="whiteAlpha.100">
         <Flex align="center" justify="space-between" mb={2}>
            <TacticalText variant="caption">PRONTIDÃO DO SETOR</TacticalText>
            <TacticalText variant="mono" fontSize="xs" color="sos.blue.400">88.2%</TacticalText>
         </Flex>
         <Progress 
           value={88.2} 
           size="xs" 
           borderRadius="full" 
           bg="whiteAlpha.100" 
           colorScheme="blue"
           h="3px"
         />
      </Box>
    </GlassPanel>
  );
}
