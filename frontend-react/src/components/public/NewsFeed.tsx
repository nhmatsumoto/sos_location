import React from 'react';
import { Calendar, MapPin, ExternalLink, Info, Award } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Box, VStack, HStack, Circle, Link, Icon, Center } from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNewsFeed } from '../../hooks/useNewsFeed';
import { TacticalText } from '../atoms/TacticalText';
import { GlassPanel } from '../atoms/GlassPanel';

interface NewsFeedProps {
  news: any[]; 
  isLoading: boolean;
  onSelect?: (item: any) => void;
}

/**
 * Tactical News Feed
 * Displays indexed disaster and weather reports with risk mapping.
 * Converted from Tailwind to Chakra UI with refined design tokens.
 */
export const NewsFeed: React.FC<NewsFeedProps> = ({ news, isLoading, onSelect }) => {
  const { getRiskColor, getRiskBg } = useNewsFeed();

  if (isLoading) {
    return (
      <VStack spacing={4} align="stretch">
        {[1, 2, 3].map((i) => (
          <GlassPanel key={i} h="120px" opacity={0.5} className="animate-pulse" />
        ))}
      </VStack>
    );
  }

  if (news.length === 0) {
    return (
      <Center p={12} flexDir="column">
        <Circle size="64px" bg="whiteAlpha.100" mb={4}>
          <Info size={32} color="gray" />
        </Circle>
        <TacticalText variant="heading" fontSize="md">Nenhum evento detectado</TacticalText>
        <TacticalText variant="caption">Tente ajustar seus filtros ou aguarde novas indexações.</TacticalText>
      </Center>
    );
  }

  return (
    <VStack spacing={4} align="stretch">
      <AnimatePresence initial={false}>
        {news.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          >
            <GlassPanel
              p={6}
              cursor="pointer"
              transition="all 0.4s"
              _hover={{ borderColor: 'sos.blue.500', transform: 'translateX(4px)', bg: 'whiteAlpha.100' }}
              _active={{ transform: 'scale(0.98)' }}
              onClick={() => onSelect?.(item)}
              position="relative"
              overflow="hidden"
            >
              {/* Subtle Category Accent */}
              <Box
                position="absolute"
                top="-16px"
                left="-16px"
                w="48px"
                h="48px"
                borderRadius="full"
                filter="blur(24px)"
                opacity={0.2}
                bg={getRiskColor(item.riskScore || 50, item.category)}
              />

              <VStack align="stretch" spacing={4}>
                <HStack justify="space-between" align="flex-start">
                  <VStack align="flex-start" spacing={1}>
                    <HStack spacing={2}>
                      <Circle size="6px" bg={getRiskColor(item.riskScore || 50, item.category)} boxShadow={`0 0 8px ${getRiskColor(item.riskScore || 50, item.category)}`} />
                      <TacticalText variant="subheading" fontSize="8px" letterSpacing="0.2em">
                        {item.category || 'EVENTO'} // {item.status || 'ACTIVE'}
                      </TacticalText>
                    </HStack>
                    <TacticalText variant="heading" fontSize="sm" color="white" lineHeight="shorter">
                      {item.title}
                    </TacticalText>
                  </VStack>

                  <VStack align="flex-end" spacing={2} flexShrink={0}>
                    <Box px={2.5} py={1} bg="sos.blue.500/10" borderRadius="lg" border="1px solid" borderColor="sos.blue.500/20">
                      <TacticalText variant="mono" fontSize="9px" color="sos.blue.400">
                        {item.source}
                      </TacticalText>
                    </Box>
                    <HStack 
                      px={2} 
                      py={0.5} 
                      bg={getRiskBg(item.riskScore || 0, item.category)} 
                      borderRadius="lg" 
                      border="1px solid" 
                      borderColor={`${getRiskColor(item.riskScore || 0, item.category)}/20`}
                    >
                      <Icon as={Award} size={10} color={getRiskColor(item.riskScore || 0, item.category)} />
                      <TacticalText variant="mono" fontSize="10px" color={getRiskColor(item.riskScore || 0, item.category)}>
                        LVL {(item.emergencyLevel || Math.ceil((item.riskScore || 0) / 20))}
                      </TacticalText>
                    </HStack>
                  </VStack>
                </HStack>

                <TacticalText color="whiteAlpha.700" noOfLines={3} fontSize="xs" lineHeight="relaxed">
                  {item.description || item.content}
                </TacticalText>

                {/* Tactical Metrics Row */}
                <HStack spacing={3} py={1}>
                  {item.areaKm2 && (
                    <Box px={2} py={0.5} bg="whiteAlpha.50" borderRadius="md" border="1px solid" borderColor="whiteAlpha.100">
                      <TacticalText fontSize="9px" color="whiteAlpha.600">AREA: {item.areaKm2}km²</TacticalText>
                    </Box>
                  )}
                  {item.estimatedCost && (
                    <Box px={2} py={0.5} bg="whiteAlpha.50" borderRadius="md" border="1px solid" borderColor="whiteAlpha.100">
                      <TacticalText fontSize="9px" color="whiteAlpha.600">COST: {item.estimatedCost}</TacticalText>
                    </Box>
                  )}
                  <Box px={2} py={0.5} bg="whiteAlpha.50" borderRadius="md" border="1px solid" borderColor="whiteAlpha.100">
                    <TacticalText fontSize="9px" color="whiteAlpha.600">SCORE: {(item.riskScore || 0).toFixed(0)}%</TacticalText>
                  </Box>
                </HStack>

                <HStack justify="space-between" pt={2} borderTop="1px solid" borderColor="whiteAlpha.100">
                   <HStack spacing={4}>
                      <HStack spacing={1.5}>
                        <MapPin size={12} color="gray" />
                        <TacticalText fontSize="9px">{item.latitude ? `${item.latitude.toFixed(4)}, ${item.longitude?.toFixed(4)}` : 'Coordenada Local'}</TacticalText>
                      </HStack>
                      <HStack spacing={1.5}>
                        <Calendar size={12} color="gray" />
                        <TacticalText fontSize="9px" color="whiteAlpha.400">
                          {item.publishedAt || item.at ? format(new Date(item.publishedAt || item.at), "dd/MM HH:mm", { locale: ptBR }) : '--/-- --:--'}
                        </TacticalText>
                      </HStack>
                   </HStack>

                   {item.externalUrl && (
                     <Link 
                       href={item.externalUrl} 
                       isExternal 
                       p={2} 
                       borderRadius="full" 
                       bg="whiteAlpha.50" 
                       _hover={{ bg: 'whiteAlpha.100', color: 'white' }} 
                       transition="all 0.2s"
                     >
                       <ExternalLink size={14} color="gray" />
                     </Link>
                   )}
                </HStack>
              </VStack>
            </GlassPanel>
          </motion.div>
        ))}
      </AnimatePresence>
    </VStack>
  );
};
