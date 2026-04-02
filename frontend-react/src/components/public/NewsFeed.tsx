import React from 'react';
import { Calendar, MapPin, ExternalLink, Info, Award, Crosshair } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Box, VStack, HStack, Circle, Link, Icon, Center, Flex, Tooltip, 
  Badge, IconButton 
} from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNewsFeed } from '../../hooks/useNewsFeed';
import { TacticalText } from '../atoms/TacticalText';
import { GlassPanel } from '../atoms/GlassPanel';
import { TacticalButton } from '../atoms/TacticalButton';

interface NewsFeedProps {
  news: NewsFeedItem[];
  isLoading: boolean;
  onSelect?: (item: NewsFeedItem) => void;
}

export interface NewsFeedItem {
  id: string | number;
  title: string;
  description?: string;
  content?: string;
  category?: string;
  status?: string;
  riskScore?: number;
  emergencyLevel?: number;
  latitude?: number;
  longitude?: number;
  publishedAt?: string;
  at?: string;
  externalUrl?: string;
}

export const NewsFeed: React.FC<NewsFeedProps> = ({ news, isLoading, onSelect }) => {
  const { getRiskColor, getRiskBg } = useNewsFeed();

  if (isLoading) {
    return (
      <VStack spacing={4} align="stretch">
        {[1, 2, 3].map((i) => (
          <GlassPanel key={i} h="140px" opacity={0.5} className="animate-pulse" />
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
    <VStack spacing={5} align="stretch">
      <AnimatePresence initial={false}>
        {news.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            <GlassPanel
              p={5}
              cursor="default"
              transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
              _hover={{ 
                borderColor: 'sos.blue.500', 
                bg: 'whiteAlpha.100',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
              }}
              position="relative"
              overflow="hidden"
              borderLeft="4px solid"
              borderLeftColor={getRiskColor(item.riskScore || 50, item.category)}
            >
              <VStack align="stretch" spacing={4}>
                {/* Header Information */}
                <Flex justify="space-between" align="flex-start">
                  <VStack align="flex-start" spacing={1.5} flex={1}>
                    <HStack spacing={2}>
                      <Badge 
                        bg={getRiskBg(item.riskScore || 50, item.category)} 
                        color={getRiskColor(item.riskScore || 50, item.category)}
                        fontSize="8px"
                        px={2}
                        borderRadius="sm"
                        fontWeight="bold"
                        letterSpacing="1px"
                      >
                       {item.category || 'EVENTO'}
                      </Badge>
                      <TacticalText variant="mono" fontSize="9px" color="whiteAlpha.400">
                        {item.status || 'ACTIVE'}
                      </TacticalText>
                    </HStack>
                    <TacticalText variant="heading" fontSize="md" color="white" lineHeight="1.2">
                      {item.title}
                    </TacticalText>
                  </VStack>

                  <Box alignSelf="flex-start">
                    <Tooltip label={`Risco: ${item.riskScore || 0}%`}>
                      <HStack 
                        px={3} 
                        py={1.5} 
                        bg="whiteAlpha.50" 
                        borderRadius="xl" 
                        border="1px solid" 
                        borderColor="whiteAlpha.100"
                      >
                        <Icon as={Award} size={12} color={getRiskColor(item.riskScore || 0, item.category)} />
                        <TacticalText variant="mono" fontSize="12px" fontWeight="bold">
                          LVL {(item.emergencyLevel || Math.ceil((item.riskScore || 0) / 20))}
                        </TacticalText>
                      </HStack>
                    </Tooltip>
                  </Box>
                </Flex>

                <TacticalText color="whiteAlpha.800" noOfLines={2} fontSize="xs" lineHeight="1.5">
                  {item.description || item.content}
                </TacticalText>

                {/* Tactical Metrics & Info */}
                <HStack spacing={4} justify="space-between" align="center">
                  <VStack align="flex-start" spacing={1}>
                    <HStack spacing={1.5}>
                      <MapPin size={10} color="#007AFF" />
                      <TacticalText fontSize="9px" color="whiteAlpha.600">
                        {item.latitude ? `${item.latitude.toFixed(4)}, ${item.longitude?.toFixed(4)}` : 'REGIONAL_ZONE'}
                      </TacticalText>
                    </HStack>
	                    <HStack spacing={1.5}>
	                      <Calendar size={10} color="gray" />
	                      <TacticalText fontSize="9px" color="whiteAlpha.400">
	                        {(() => {
	                          const publishedAt = item.publishedAt ?? item.at;
	                          return publishedAt ? format(new Date(publishedAt), "dd/MM HH:mm", { locale: ptBR }) : '--/-- --:--';
	                        })()}
	                      </TacticalText>
	                    </HStack>
                  </VStack>

                  <HStack spacing={2}>
                    {item.externalUrl && (
                      <IconButton
                        as={Link}
                        href={item.externalUrl}
                        isExternal
                        aria-label="External Link"
                        icon={<ExternalLink size={14} />}
                        size="sm"
                        variant="ghost"
                        borderRadius="lg"
                        _hover={{ bg: 'whiteAlpha.100', color: 'sos.blue.300' }}
                      />
                    )}
                    <TacticalButton
                      variant="tactical"
                      size="xs"
                      h="32px"
                      px={4}
                      leftIcon={<Crosshair size={12} />}
                      onClick={() => onSelect?.(item)}
                      borderRadius="lg"
                    >
                      LOCALIZAR
                    </TacticalButton>
                  </HStack>
                </HStack>
              </VStack>
            </GlassPanel>
          </motion.div>
        ))}
      </AnimatePresence>
    </VStack>
  );
};
