import React from 'react';
import { Users, AlertTriangle, PackageOpen } from 'lucide-react';
import { KpiCard } from './KpiCard';
import type { OperationsSnapshot } from '../../services/operationsApi';

interface OperationalKPIStackProps {
  opsSnapshot: OperationsSnapshot | null;
  className?: string;
}

export const OperationalKPIStack: React.FC<OperationalKPIStackProps> = ({ opsSnapshot, className }) => {
  return (
    <div className={className || "absolute top-28 left-4 z-40 flex flex-col gap-2 w-[180px]"}>
       <div className="flex items-center gap-2 mb-1 px-1">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
          </span>
          <span className="text-[10px] font-black text-cyan-500 uppercase tracking-widest">Live Monitor</span>
       </div>
       <KpiCard title="EQUIPES" value={opsSnapshot?.kpis.activeTeams ?? '12'} icon={<Users size={16} />} trend="+2" />
       <KpiCard title="ALERTAS" value={opsSnapshot?.kpis.criticalAlerts ?? '08'} icon={<AlertTriangle size={16} />} trend="CRÍTICO" color="text-amber-400" />
       <KpiCard title="LOGÍSTICA" value={opsSnapshot?.kpis.suppliesInTransit ?? '92'} icon={<PackageOpen size={16} />} trend="-4" />
    </div>
  );
};
