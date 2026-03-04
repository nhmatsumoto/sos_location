import { useEffect, useState } from 'react';
import { OperationalMap } from '../components/maps/OperationalMap';
import { Public3DOperationsGlobe } from '../components/maps/Public3DOperationsGlobe';
import { operationsApi, type OperationsSnapshot } from '../services/operationsApi';

export function PublicMapPage() {
  const [snapshot, setSnapshot] = useState<OperationsSnapshot | null>(null);

  const load = async () => {
    try {
      setSnapshot(await operationsApi.snapshot());
    } catch {
      setSnapshot(null);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 p-4">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-3 text-xl font-semibold text-slate-100">Mapa público (somente leitura)</h1>
        <div className="mb-4 rounded-2xl border border-slate-700/70 bg-slate-900/70 p-3 shadow-lg shadow-black/25">
          <h2 className="mb-2 text-sm font-semibold text-slate-100">Globo 3D público (Three.js + Leaflet)</h2>
          <p className="mb-3 text-xs text-slate-300">
            Eventos em tempo real de crawlers e integrações, com casas, edificações, pontos críticos e áreas delimitadas.
          </p>
          <Public3DOperationsGlobe data={snapshot} />
        </div>
        <OperationalMap data={snapshot} onRefresh={load} />
      </div>
    </div>
  );
}
