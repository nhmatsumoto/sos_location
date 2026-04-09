import { Box, VStack, Button, Icon, Text, Divider } from '@chakra-ui/react';
import { MapPin, Search, AlertTriangle, ShieldCheck, Ruler } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface MapContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  lat: number;
  lng: number;
  onMarkRiskArea?: (lat: number, lng: number) => void;
}

import { tacticalIntelApi } from '../../../services/tacticalIntelApi';
import { useToast } from '@chakra-ui/react';

export function MapContextMenu({ x, y, onClose, lat, lng, onMarkRiskArea }: MapContextMenuProps) {
  const { t } = useTranslation();
  const toast = useToast();

  const handleAction = async (label: string, type: string) => {
    try {
      await tacticalIntelApi.createPoint({
        type,
        title: label,
        description: `Tactical entry created at ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        latitude: lat,
        longitude: lng
      });

      toast({
        title: t('map.context.success_title') || 'Registo Tático Criado',
        description: t('map.context.success_desc') || 'O ponto foi enviado para análise e aprovação.',
        status: 'success',
        duration: 3000,
        isClosable: true,
        position: 'top-right'
      });
      onClose();
    } catch {
      toast({
        title: 'Erro operacional',
        description: 'Falha ao processar comando tático.',
        status: 'error',
      });
    }
  };

  const actions = [
    { icon: MapPin, label: t('map.context.mark_area'), color: 'sos.blue.400', type: 'Mark' },
    { icon: Search, label: t('map.context.search_here'), color: 'whiteAlpha.800', type: 'Search' },
    { icon: AlertTriangle, label: t('map.context.create_alert'), color: 'sos.red.400', type: 'Alert' },
    { icon: ShieldCheck, label: t('map.context.support_point'), color: 'green.400', type: 'Support' },
    { icon: Ruler, label: 'Medir Distância', color: 'orange.400', type: 'Measure' },
  ];

  return (
    <>
      <Box
        position="fixed"
        top={0}
        left={0}
        w="100vw"
        h="100vh"
        onClick={onClose}
        onContextMenu={(e) => { e.preventDefault(); onClose(); }}
        zIndex={10000}
        bg="transparent"
      />
      <Box
        position="fixed"
        top={y}
        left={x}
        zIndex={10001}
        bg="rgba(10, 11, 16, 0.9)"
        
        border="1px solid"
        borderColor="whiteAlpha.100"
        borderRadius="xl"
        boxShadow="2xl"
        p={2}
        minW="200px"
      >
        <VStack align="stretch" spacing={1}>
          <Box px={3} py={1}>
            <Text fontSize="8px" color="whiteAlpha.400" fontWeight="black" letterSpacing="widest">
              COORD: {lat.toFixed(6)}, {lng.toFixed(6)}
            </Text>
          </Box>
          <Divider borderColor="whiteAlpha.100" />
          {actions.map((action, i) => (
            <Button
              key={i}
              variant="ghost"
              size="sm"
              justifyContent="flex-start"
              leftIcon={<Icon as={action.icon} color={action.color} boxSize="14px" />}
              onClick={() => handleAction(action.label, action.type)}
              color="whiteAlpha.800"
              fontSize="11px"
              fontWeight="bold"
              _hover={{ bg: 'whiteAlpha.100', color: 'white' }}
              py={4}
            >
              {action.label.toUpperCase()}
            </Button>
          ))}
          {onMarkRiskArea && (
            <>
              <Divider borderColor="whiteAlpha.100" />
              <Button
                variant="ghost"
                size="sm"
                justifyContent="flex-start"
                leftIcon={<Icon as={AlertTriangle} color="orange.400" boxSize="14px" />}
                onClick={() => {
                  onMarkRiskArea(lat, lng);
                  onClose();
                }}
                color="whiteAlpha.800"
                fontSize="11px"
                fontWeight="bold"
                _hover={{ bg: 'whiteAlpha.100', color: 'white' }}
                py={4}
              >
                MARK RISK AREA
              </Button>
            </>
          )}
        </VStack>
      </Box>
    </>
  );
}
