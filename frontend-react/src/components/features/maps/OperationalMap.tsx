import type { OperationsSnapshot } from '../../../services/operationsApi';
import { MapShell } from '../../../map/components/MapShell';

export function OperationalMap({ data, hideFloatingPanels = false, center, zoom }: { data: OperationsSnapshot | null; hideFloatingPanels?: boolean; center?: [number, number]; zoom?: number }) {
  return (
    <div className="h-full w-full">
      <MapShell data={data} hideFloatingPanels={hideFloatingPanels} center={center} zoom={zoom} />
    </div>
  );
}
