import type { LayerItem } from '../types/app';
import type { OperationsSnapshot } from '../services/operationsApi';

export const buildLayersFromSnapshot = (snapshot: OperationsSnapshot | null): LayerItem[] => {
  const supportCount = snapshot?.layers.supportPoints.length ?? 0;
  const riskCount = snapshot?.layers.riskAreas.length ?? 0;
  const hotspotCount = snapshot?.layers.hotspots.length ?? 0;

  return [
    { id: 'ly-support-points', nome: 'Pontos de apoio', ativa: supportCount > 0, opacidade: 85, legenda: `${supportCount} registros operacionais` },
    { id: 'ly-risk-areas', nome: 'Áreas de risco', ativa: riskCount > 0, opacidade: 75, legenda: `${riskCount} áreas monitoradas` },
    { id: 'ly-hotspots', nome: 'Hotspots priorizados', ativa: hotspotCount > 0, opacidade: 90, legenda: `${hotspotCount} pontos derivados da base operacional` },
  ];
};
