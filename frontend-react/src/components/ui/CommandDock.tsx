import { useState } from 'react';
import {
  Users, PackageOpen, Activity, Flame, Shield, FilePlus, Zap, PlusCircle
} from 'lucide-react';
import {
  Box, VStack, Tooltip, Text, HStack, Divider, type BoxProps, Badge
} from '@chakra-ui/react';
import { keyframes } from '@emotion/react';

const pulseGlow = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(0, 122, 255, 0.4); }
  70% { box-shadow: 0 0 0 8px rgba(0, 122, 255, 0); }
  100% { box-shadow: 0 0 0 0 rgba(0, 122, 255, 0); }
`;

const actionItems = [
  { label: 'Relato de Campo', shortLabel: 'Relato',     icon: FilePlus,    color: '#007AFF', bg: 'rgba(0,122,255,0.12)' },
  { label: 'Voluntários',     shortLabel: 'Voluntários', icon: Users,       color: '#FF9500', bg: 'rgba(255,149,0,0.12)' },
  { label: 'Doações',         shortLabel: 'Doações',     icon: PackageOpen, color: '#34C759', bg: 'rgba(52,199,89,0.12)' },
  { label: 'Resgate',         shortLabel: 'Resgate',     icon: Activity,    color: '#FF3B30', bg: 'rgba(255,59,48,0.12)' },
  { label: 'Bombeiros',       shortLabel: 'Bombeiros',   icon: Flame,       color: '#FF6B00', bg: 'rgba(255,107,0,0.12)' },
  { label: 'Exército',        shortLabel: 'Exército',    icon: Shield,      color: '#8E8E93', bg: 'rgba(142,142,147,0.12)' },
];

interface CommandDockProps extends BoxProps {
  onAction?: (label: string) => void;
  onToggleLiveOps?: () => void;
  liveOpsActive?: boolean;
}

/**
 * Command Dock — Guardian Clarity v3
 * Vertical docked action bar replacing the horizontal QuickActions.
 * Positioned bottom-left, expands labels on hover for discoverability.
 */
export function CommandDock({ onAction, onToggleLiveOps, liveOpsActive, ...props }: CommandDockProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Box
      position="absolute"
      bottom={8}
      left="80px"      // just to the right of NavigationRail (64px + 16px gap)
      zIndex={50}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      {...props}
    >
      <Box
        bg="rgba(8, 8, 15, 0.88)"
        backdropFilter="blur(24px) saturate(180%)"
        border="1px solid rgba(255,255,255,0.10)"
        borderRadius="2xl"
        overflow="hidden"
        boxShadow="0 8px 32px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.05) inset"
        transition="all 0.22s cubic-bezier(0.4, 0, 0.2, 1)"
      >
        <VStack spacing={0} py={2} align="stretch">

          {/* Live Operations — always visible, top priority */}
          <Tooltip label={!expanded ? 'Live Operations' : undefined} placement="right" hasArrow>
            <Box
              as="button"
              onClick={onToggleLiveOps}
              display="flex"
              alignItems="center"
              gap={expanded ? 3 : 0}
              justifyContent={expanded ? 'flex-start' : 'center'}
              h="48px"
              px={expanded ? 4 : 0}
              w={expanded ? '200px' : '56px'}
              mx={1}
              borderRadius="xl"
              transition="all 0.22s cubic-bezier(0.4, 0, 0.2, 1)"
              bg={liveOpsActive ? 'rgba(0,122,255,0.15)' : 'transparent'}
              color={liveOpsActive ? '#007AFF' : 'rgba(255,255,255,0.65)'}
              _hover={{ bg: 'rgba(0,122,255,0.12)', color: '#007AFF' }}
              cursor="pointer"
              border="none"
              background={liveOpsActive ? 'rgba(0,122,255,0.15)' : 'transparent'}
              animation={liveOpsActive ? `${pulseGlow} 2s infinite` : undefined}
              position="relative"
            >
              <Box flexShrink={0} display="flex" alignItems="center" justifyContent="center" w="32px">
                <Zap size={18} />
              </Box>
              {expanded && (
                <HStack spacing={2} flex={1}>
                  <Text fontSize="sm" fontWeight="700" whiteSpace="nowrap">
                    Live Operations
                  </Text>
                  {liveOpsActive && (
                    <Badge
                      bg="sos.blue.500"
                      color="white"
                      borderRadius="full"
                      fontSize="8px"
                      px={1.5}
                      py={0.5}
                    >
                      LIVE
                    </Badge>
                  )}
                </HStack>
              )}
            </Box>
          </Tooltip>

          <Box mx={3} my={1}>
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
                  h="44px"
                  px={expanded ? 4 : 0}
                  w={expanded ? '200px' : '56px'}
                  mx={1}
                  borderRadius="xl"
                  transition="all 0.22s cubic-bezier(0.4, 0, 0.2, 1)"
                  color="rgba(255,255,255,0.55)"
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
                    w="32px"
                    h="32px"
                    borderRadius="lg"
                    transition="all 0.18s"
                    _groupHover={{ bg: action.bg }}
                  >
                    <Icon size={17} />
                  </Box>
                  {expanded && (
                    <Text fontSize="sm" fontWeight="500" whiteSpace="nowrap" color="rgba(255,255,255,0.75)">
                      {action.label}
                    </Text>
                  )}
                </Box>
              </Tooltip>
            );
          })}

          <Box mx={3} my={1}>
            <Divider borderColor="rgba(255,255,255,0.07)" />
          </Box>

          {/* New tactical point */}
          <Tooltip label={!expanded ? 'Novo Ponto Tático' : undefined} placement="right" hasArrow>
            <Box
              as="button"
              onClick={() => onAction?.('Relato')}
              display="flex"
              alignItems="center"
              gap={expanded ? 3 : 0}
              justifyContent={expanded ? 'flex-start' : 'center'}
              h="44px"
              px={expanded ? 4 : 0}
              w={expanded ? '200px' : '56px'}
              mx={1}
              borderRadius="xl"
              transition="all 0.22s"
              color="rgba(255,255,255,0.40)"
              _hover={{ bg: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.70)' }}
              cursor="pointer"
              border="none"
              background="transparent"
            >
              <Box flexShrink={0} display="flex" alignItems="center" justifyContent="center" w="32px">
                <PlusCircle size={17} />
              </Box>
              {expanded && (
                <Text fontSize="sm" fontWeight="500" whiteSpace="nowrap" color="rgba(255,255,255,0.40)">
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
