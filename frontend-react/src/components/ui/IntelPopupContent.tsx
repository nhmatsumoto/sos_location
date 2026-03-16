import { Flex, VStack, HStack, Text, Badge, Divider, Icon, Link, Box, Grid } from '@chakra-ui/react';
import { Calendar, Cloud, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { NewsNotification } from '../../services/newsApi';
import { TacticalText } from '../atoms/TacticalText';

interface IntelPopupContentProps {
  item: NewsNotification;
}

export function IntelPopupContent({ item }: IntelPopupContentProps) {
  return (
    <VStack align="stretch" spacing={4} minW="300px" p={4} bg="transparent">
      {/* Header telemetry */}
      <Flex justify="space-between" align="center">
        <HStack spacing={2}>
           <Box boxSize="8px" borderRadius="full" bg={(item.riskScore || 0) > 80 ? 'red.500' : 'sos.blue.500'} boxShadow={`0 0 10px ${(item.riskScore || 0) > 80 ? 'red' : 'blue'}`} />
           <TacticalText variant="mono" fontSize="10px" color="whiteAlpha.600">INTEL_ENTRY_{item.id.slice(-6).toUpperCase()}</TacticalText>
        </HStack>
        <Badge
          variant="solid"
          bg={(item.riskScore || 0) > 80 ? 'red.900' : 'sos.blue.900'}
          color={(item.riskScore || 0) > 80 ? 'red.200' : 'sos.blue.200'}
          border="1px solid"
          borderColor={(item.riskScore || 0) > 80 ? 'red.500' : 'sos.blue.500'}
          fontSize="9px"
          px={3}
          py={0.5}
          borderRadius="full"
        >
          RISK: {(item.riskScore || 0).toFixed(0)}%
        </Badge>
      </Flex>

      <VStack align="start" spacing={1}>
        <Text fontSize="md" fontWeight="900" color="white" lineHeight="1.1" letterSpacing="tight">
          {item.title.toUpperCase()}
        </Text>
        <HStack spacing={1} color="sos.blue.400">
          <Icon as={Calendar} boxSize="10px" />
          <TacticalText variant="mono" fontSize="9px">
            {item.publishedAt ? format(new Date(item.publishedAt), 'dd MMM yyyy HH:mm', { locale: ptBR }) : 'REAL_TIME_FEED'}
          </TacticalText>
        </HStack>
      </VStack>

      <Divider borderColor="whiteAlpha.100" />

      {/* Metrics Grid */}
      <Grid templateColumns="repeat(2, 1fr)" gap={2}>
        <Box p={2} bg="whiteAlpha.50" borderRadius="md" border="1px solid" borderColor="whiteAlpha.100">
           <Text fontSize="8px" color="whiteAlpha.500" fontWeight="bold">STATUS</Text>
           <Text fontSize="10px" color="white" fontWeight="black">{item.status || 'OPERATIONAL'}</Text>
        </Box>
        <Box p={2} bg="whiteAlpha.50" borderRadius="md" border="1px solid" borderColor="whiteAlpha.100">
           <Text fontSize="8px" color="whiteAlpha.500" fontWeight="bold">MAGNITUDE</Text>
           <Text fontSize="10px" color="white" fontWeight="black">{item.areaKm2 || '0.0'} KM²</Text>
        </Box>
      </Grid>

      {item.climateInfo && (
        <Box bg="sos.blue.500/10" p={3} borderRadius="xl" border="1px solid" borderColor="sos.blue.500/30" position="relative" overflow="hidden">
           <Box position="absolute" top={0} left={0} w="2px" h="full" bg="sos.blue.500" />
           <HStack justify="space-between">
              <VStack align="start" spacing={0}>
                 <Text fontSize="8px" color="sos.blue.400" fontWeight="black">ENVIRONMENTAL TELEMETRY</Text>
                 <Text fontSize="12px" color="white" fontWeight="black">
                   {item.climateInfo.temperature}°C / {item.climateInfo.humidity}% RH
                 </Text>
              </VStack>
              <Icon as={Cloud} boxSize="20px" color="sos.blue.400" opacity={0.5} />
           </HStack>
        </Box>
      )}

      <Text fontSize="11px" color="whiteAlpha.700" lineHeight="tall" fontWeight="medium">
        {item.content || item.description || "Nenhum dado adicional disponível para este registro."}
      </Text>

      {item.involvedAgencies && item.involvedAgencies.length > 0 && (
        <Box>
            <Text fontSize="8px" color="whiteAlpha.400" fontWeight="black" mb={2}>ACTIVE_UNITS:</Text>
            <HStack spacing={1} wrap="wrap">
              {item.involvedAgencies.map(agency => (
                <Badge key={agency} fontSize="7px" bg="whiteAlpha.100" color="white" border="1px solid" borderColor="whiteAlpha.200">{agency}</Badge>
              ))}
            </HStack>
        </Box>
      )}

      <Flex justify="space-between" align="center" pt={2}>
        <HStack spacing={2}>
           <Box boxSize="20px" bg="whiteAlpha.100" borderRadius="md" display="flex" alignItems="center" justifyContent="center">
              <Text fontSize="9px" fontWeight="black" color="sos.blue.400">{item.source?.slice(0, 1) || 'Q'}</Text>
           </Box>
           <VStack align="start" spacing={0}>
              <Text fontSize="8px" color="whiteAlpha.400" fontWeight="bold">SOURCE_ORGN</Text>
              <Text fontSize="9px" color="white" fontWeight="black">{item.source || 'GUARDIAN_NET'}</Text>
           </VStack>
        </HStack>
        {item.externalUrl && (
          <Link
            href={item.externalUrl}
            isExternal
            bg="sos.blue.500"
            px={3}
            py={1.5}
            borderRadius="md"
            fontSize="9px"
            fontWeight="black"
            color="white"
            _hover={{ bg: 'sos.blue.400', transform: 'translateY(-1px)' }}
            transition="all 0.2s"
          >
            INTEL <Icon as={ExternalLink} boxSize="10px" ml={1} />
          </Link>
        )}
      </Flex>
    </VStack>
  );
}
