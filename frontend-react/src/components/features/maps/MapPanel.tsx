import type { ReactNode } from 'react';
import { Box } from '@chakra-ui/react';
import { Map } from 'lucide-react';
import { PagePanel } from '../../layout/PagePrimitives';
import { TacticalMap } from '../map/TacticalMap';

export function MapPanel({
  title = 'Mapa operacional',
  rightSlot,
  renderExtraLayers,
}: {
  title?: string;
  rightSlot?: ReactNode;
  renderExtraLayers?: () => ReactNode;
}) {
  return (
    <PagePanel title={title} icon={Map} tone="info" actions={rightSlot} p={3}>
      <Box
        position="relative"
        h={{ base: '360px', md: '520px' }}
        overflow="hidden"
        borderRadius="2xl"
        border="1px solid"
        borderColor="border.subtle"
      >
        <TacticalMap center={[-21.1215, -42.9427]} zoom={12} showLabel={false}>
          {renderExtraLayers?.()}
        </TacticalMap>
      </Box>
    </PagePanel>
  );
}
