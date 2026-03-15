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

export function MissionsPanel() {
  return (
    <Box
      w="340px"
      bg="rgba(10, 15, 28, 0.7)"
      backdropFilter="blur(30px)"
      borderRadius="2xl"
      border="1px solid"
      borderColor="whiteAlpha.200"
      boxShadow="dark-lg"
      display="flex"
      flexDirection="column"
      overflow="hidden"
    >
      {/* Header - More Objective */}
      <Box p={5} borderBottom="1px solid" borderColor="whiteAlpha.100">
        <Flex align="center" justify="space-between" mb={1}>
          <HStack spacing={2}>
            <Icon as={Target} boxSize="18px" color="sos.blue.400" />
            <Text fontSize="sm" fontWeight="800" color="white" letterSpacing="tight">
              OBJETIVOS TÁTICOS
            </Text>
          </HStack>
          <Badge bg="sos.blue.500" color="white" fontSize="9px" px={2} borderRadius="full">
            {mockMissions.filter(m => !m.completed).length} ATIVOS
          </Badge>
        </Flex>
        <Text fontSize="xs" color="whiteAlpha.500">Coordenação de campo em tempo real</Text>
      </Box>

      {/* Mission List - Cleaner Layout */}
      <VStack spacing={0} align="stretch" maxH="400px" overflowY="auto">
        {mockMissions.map((mission, index) => (
          <Box key={mission.id}>
            <HStack 
              px={5}
              py={4}
              cursor="pointer"
              role="group"
              transition="all 0.2s"
              bg={mission.completed ? "blackAlpha.200" : "transparent"}
              _hover={{ bg: mission.completed ? 'blackAlpha.300' : 'whiteAlpha.50' }}
              position="relative"
            >
              {/* Status Indicator Bar */}
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
                borderRadius="lg"
                bg={mission.completed ? "whiteAlpha.100" : "whiteAlpha.50"}
                border="1px solid"
                borderColor="whiteAlpha.100"
              >
                <Icon 
                  as={mission.type === 'validate' ? Shield : mission.type === 'report' ? Map : Rocket} 
                  boxSize="14px" 
                  color={mission.completed ? 'whiteAlpha.300' : 'sos.blue.300'} 
                />
              </Flex>

              <VStack align="flex-start" spacing={0} flex={1}>
                <HStack w="full" justify="space-between">
                  <Text 
                    fontSize="xs" 
                    fontWeight="bold" 
                    color={mission.completed ? "whiteAlpha.400" : "white"} 
                    textDecoration={mission.completed ? 'line-through' : 'none'}
                  >
                    {mission.title}
                  </Text>
                  {mission.completed && <Icon as={CheckCircle2} boxSize="14px" color="sos.green.400" />}
                </HStack>
                <Text fontSize="10px" color="whiteAlpha.500" noOfLines={1}>
                  {mission.description}
                </Text>
                <HStack mt={1} spacing={2}>
                   <Text fontSize="9px" fontWeight="black" color="sos.blue.400" fontFamily="mono">
                    +{mission.reward} XP
                  </Text>
                  {!mission.completed && (
                    <Badge fontSize="8px" variant="outline" borderColor="whiteAlpha.200" color="whiteAlpha.600" px={1}>
                      {mission.priority.toUpperCase()}
                    </Badge>
                  )}
                </HStack>
              </VStack>
              
              {!mission.completed && (
                <Icon 
                  as={ChevronRight} 
                  boxSize="16px" 
                  color="whiteAlpha.200" 
                  _groupHover={{ color: 'white', transform: 'translateX(2px)' }} 
                  transition="all 0.2s"
                />
              )}
            </HStack>
            {index < mockMissions.length - 1 && <Divider borderColor="whiteAlpha.100" />}
          </Box>
        ))}
      </VStack>

      {/* Footer - Operational Health */}
      <Box p={5} bg="blackAlpha.400" borderTop="1px solid" borderColor="whiteAlpha.100">
         <Flex align="center" justify="space-between" mb={2}>
            <Text fontSize="10px" fontWeight="800" color="whiteAlpha.600" textTransform="uppercase" letterSpacing="wider">
              PRONTIDÃO DO SETOR
            </Text>
            <Text fontSize="11px" fontWeight="black" color="sos.blue.400" fontFamily="mono">88.2%</Text>
         </Flex>
         <Progress 
           value={88.2} 
           size="xs" 
           colorScheme="blue" 
           bg="whiteAlpha.100" 
           borderRadius="full" 
         />
      </Box>
    </Box>
  );
}
