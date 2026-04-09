import React from 'react';
import { Box, VStack } from '@chakra-ui/react';
import { Users, AlertTriangle, PackageOpen } from 'lucide-react';
import { KpiCard } from './KpiCard';
import { ShellLiveIndicator } from '../layout/ShellPrimitives';
import type { OperationsSnapshot } from '../../services/operationsApi';

interface OperationalKPIStackProps {
  opsSnapshot: OperationsSnapshot | null;
  className?: string;
}

export const OperationalKPIStack: React.FC<OperationalKPIStackProps> = ({ opsSnapshot, className }) => {
  return (
    <Box
      className={className}
      position={className ? undefined : 'absolute'}
      top={className ? undefined : 28}
      left={className ? undefined : 4}
      zIndex={className ? undefined : 40}
      w={className ? undefined : '180px'}
    >
      <VStack align="stretch" spacing={2}>
        <ShellLiveIndicator label="Live Monitor" px={1} />
        <KpiCard title="EQUIPES" value={opsSnapshot?.kpis.activeTeams ?? '12'} icon={<Users size={16} />} trend="+2" />
        <KpiCard title="ALERTAS" value={opsSnapshot?.kpis.criticalAlerts ?? '08'} icon={<AlertTriangle size={16} />} trend="CRÍTICO" color="text-amber-400" />
        <KpiCard title="LOGÍSTICA" value={opsSnapshot?.kpis.suppliesInTransit ?? '92'} icon={<PackageOpen size={16} />} trend="-4" />
      </VStack>
    </Box>
  );
};
