import type { OperationsSnapshot } from '../../services/operationsApi';
import { MapShell } from '../../map/components/MapShell';

export function OperationalMap({ data }: { data: OperationsSnapshot | null }) {
  return (
    <section className="h-full flex flex-col">
       <div className="flex-1 rounded-[2rem] overflow-hidden border border-white/5 relative shadow-inner shadow-black/40">
          <MapShell data={data} />
       </div>
    </section>
  );
}
