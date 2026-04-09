import { useState } from 'react';
import {
  Users, PackageOpen, Activity, Flame, Shield, FilePlus, Zap, PlusCircle
} from 'lucide-react';
import {
  Box, VStack, Tooltip, Text, HStack, Divider, type BoxProps, Badge
} from '@chakra-ui/react';

const actionItems = [
  { label: 'Relato de Campo', shortLabel: 'Relato',     icon: FilePlus,    color: '#007AFF', bg: 'rgba(0,122,255,0.10)' },
  { label: 'Voluntários',     shortLabel: 'Voluntários', icon: Users,       color: '#FF9500', bg: 'rgba(255,149,0,0.10)' },
  { label: 'Doações',         shortLabel: 'Doações',     icon: PackageOpen, color: '#34C759', bg: 'rgba(52,199,89,0.10)' },
  { label: 'Resgate',         shortLabel: 'Resgate',     icon: Activity,    color: '#FF3B30', bg: 'rgba(255,59,48,0.10)' },
  { label: 'Bombeiros',       shortLabel: 'Bombeiros',   icon: Flame,       color: '#FF6B00', bg: 'rgba(255,107,0,0.10)' },
  { label: 'Exército',        shortLabel: 'Exército',    icon: Shield,      color: '#8E8E93', bg: 'rgba(142,142,147,0.10)' },
];

interface CommandDockProps extends BoxProps {
  onAction?: (label: string) => void;
  onToggleLiveOps?: () => void;
  liveOpsActive?: boolean;
}

export function CommandDock({ onAction, onToggleLiveOps, liveOpsActive, ...props }: CommandDockProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Box
      position="absolute"
      bottom={8}
      left="80px"
      zIndex={50}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      {...props}
    >
      <Box
        bg="#111119"
        border="1px solid rgba(255,255,255,0.09)"
        borderRadius="lg"
        overflow="hidden"
        transition="width 0.18s ease"
      >
        <VStack spacing={0} py={1.5} align="stretch">

          {/* Live Operations */}
          <Tooltip label={!expanded ? 'Live Operations' : undefined} placement="right" hasArrow>
            <Box
              as="button"
              onClick={onToggleLiveOps}
              display="flex"
              alignItems="center"
              gap={expanded ? 3 : 0}
              justifyContent={expanded ? 'flex-start' : 'center'}
              h="44px"
              px={expanded ? 4 : 0}
              w={expanded ? '192px' : '52px'}
              mx={1}
              borderRadius="md"
              transition="all 0.18s ease"
              bg={liveOpsActive ? 'rgba(0,122,255,0.12)' : 'transparent'}
              color={liveOpsActive ? '#007AFF' : 'rgba(255,255,255,0.60)'}
              _hover={{ bg: 'rgba(0,122,255,0.10)', color: '#007AFF' }}
              cursor="pointer"
              border="none"
              background={liveOpsActive ? 'rgba(0,122,255,0.12)' : 'transparent'}
            >
              <Box flexShrink={0} display="flex" alignItems="center" justifyContent="center" w="28px">
                <Zap size={16} />
              </Box>
              {expanded && (
                <HStack spacing={2} flex={1}>
                  <Text fontSize="sm" fontWeight="500" whiteSpace="nowrap">
                    Live Operations
                  </Text>
                  {liveOpsActive && (
                    <Badge
                      bg="sos.blue.500"
                      color="white"
                      borderRadius="sm"
                      fontSize="9px"
                      px={1.5}
                      py={0.5}
                    >
                      ao vivo
                    </Badge>
                  )}
                </HStack>
              )}
            </Box>
          </Tooltip>

          <Box mx={2} my={1}>
            <Divider borderColor="rgba(255,255,255,0.07)" />
          </Box>

          {/* Field Actions */}
          {actionItems.map((action) => {
            const Icon = action.icon;
            return (
              <Tooltip
                key={action.label}
                label={!expanded ? action.label : undefined}
                placement="right"
                hasArrow
              >
                <Box
                  as="button"
                  onClick={() => onAction?.(action.shortLabel)}
                  display="flex"
                  alignItems="center"
                  gap={expanded ? 3 : 0}
                  justifyContent={expanded ? 'flex-start' : 'center'}
                  h="40px"
                  px={expanded ? 4 : 0}
                  w={expanded ? '192px' : '52px'}
                  mx={1}
                  borderRadius="md"
                  transition="all 0.18s ease"
                  color="rgba(255,255,255,0.50)"
                  _hover={{ bg: action.bg, color: action.color }}
                  cursor="pointer"
                  border="none"
                  background="transparent"
                >
                  <Box
                    flexShrink={0}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    w="28px"
                  >
                    <Icon size={16} />
                  </Box>
                  {expanded && (
                    <Text fontSize="sm" fontWeight="400" whiteSpace="nowrap" color="rgba(255,255,255,0.70)">
                      {action.label}
                    </Text>
                  )}
                </Box>
              </Tooltip>
            );
          })}

          <Box mx={2} my={1}>
            <Divider borderColor="rgba(255,255,255,0.07)" />
          </Box>

          <Tooltip label={!expanded ? 'Novo Ponto Tático' : undefined} placement="right" hasArrow>
            <Box
              as="button"
              onClick={() => onAction?.('Relato')}
              display="flex"
              alignItems="center"
              gap={expanded ? 3 : 0}
              justifyContent={expanded ? 'flex-start' : 'center'}
              h="40px"
              px={expanded ? 4 : 0}
              w={expanded ? '192px' : '52px'}
              mx={1}
              borderRadius="md"
              transition="all 0.18s ease"
              color="rgba(255,255,255,0.35)"
              _hover={{ bg: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.65)' }}
              cursor="pointer"
              border="none"
              background="transparent"
            >
              <Box flexShrink={0} display="flex" alignItems="center" justifyContent="center" w="28px">
                <PlusCircle size={16} />
              </Box>
              {expanded && (
                <Text fontSize="sm" fontWeight="400" whiteSpace="nowrap" color="rgba(255,255,255,0.35)">
                  Novo Ponto Tático
                </Text>
              )}
            </Box>
          </Tooltip>
        </VStack>
      </Box>
    </Box>
  );
}
