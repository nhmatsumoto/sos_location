import {
  Users,
  PackageOpen,
  Activity,
  Flame,
  Shield,
  Zap,
  FilePlus
} from 'lucide-react';
import { Box, HStack, IconButton, Tooltip, Button } from '@chakra-ui/react';
import { GlassPanel } from '../atoms/GlassPanel';

const actionItems = [
  { label: 'Relato', icon: <FilePlus size={18} />, color: 'sos.blue.400' },
  { label: 'Voluntários', icon: <Users size={18} />, color: 'orange.400' },
  { label: 'Doações', icon: <PackageOpen size={18} />, color: 'sos.green.400' },
  { label: 'Resgate', icon: <Activity size={18} />, color: 'sos.red.400' },
  { label: 'Bombeiros', icon: <Flame size={18} />, color: 'orange.500' },
  { label: 'Exército', icon: <Shield size={18} />, color: 'whiteAlpha.600' },
];

export function QuickActions({ onToggleLiveOps, onAction }: { onToggleLiveOps?: () => void, onAction?: (label: string) => void }) {
  return (
    <GlassPanel 
      intensity="high" 
      px={3} 
      py={2} 
      borderRadius="full" 
      gap={3}
      align="center"
    >
      <HStack spacing={2}>
        {actionItems.map((action) => (
          <Tooltip key={action.label} label={action.label} placement="top" hasArrow bg="sos.dark" color="white" fontSize="xs" fontWeight="bold">
            <IconButton
              aria-label={action.label}
              icon={action.icon}
              onClick={() => onAction && onAction(action.label)}
              variant="ghost"
              color={action.color}
              borderRadius="xl"
              w="44px"
              h="44px"
              _hover={{ 
                bg: 'whiteAlpha.100', 
                transform: 'translateY(-4px)',
                boxShadow: `0 8px 15px -4px ${action.color}33`
              }}
              transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
            />
          </Tooltip>
        ))}
      </HStack>

      <Box h="24px" w="1px" bg="whiteAlpha.200" mx={1} />

      <Button
        onClick={onToggleLiveOps}
        leftIcon={<Zap size={14} />}
        variant="ghost"
        color="sos.blue.400"
        fontSize="10px"
        fontWeight="bold"
        letterSpacing="0.2em"
        px={6}
        borderRadius="xl"
        h="44px"
        _hover={{ 
          bg: 'sos.blue.500/10',
          transform: 'scale(1.05)',
          boxShadow: '0 0 20px rgba(33, 126, 255, 0.15)'
        }}
      >
        LIVE OPERATIONS
      </Button>
    </GlassPanel>
  );
}
