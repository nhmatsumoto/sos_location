import type { DrawGeometryKind } from '../../stores/appStore';

export type OperationalToolTone =
  | 'red'
  | 'amber'
  | 'sky'
  | 'rose'
  | 'emerald'
  | 'orange'
  | 'fuchsia';

export interface OperationalToolDefinition {
  type: string;
  label: string;
  shortLabel: string;
  description: string;
  instruction: string;
  geometryKind: DrawGeometryKind;
  tone: OperationalToolTone;
  icon: 'risk' | 'alert' | 'route' | 'victim' | 'support' | 'road' | 'safe' | 'search';
}

/**
 * Catálogo único das ações desenháveis. A caixa flutuante e o quadro
 * operacional compartilham estes metadados para manter rótulo, geometria e
 * instrução sincronizados.
 */
export const OPERATIONAL_TOOLS: OperationalToolDefinition[] = [
  {
    type: 'risk-area',
    label: 'Área de risco',
    shortLabel: 'Demarcar risco',
    description: 'Perímetro inseguro, colapso, incêndio ou risco secundário',
    instruction: 'Clique em pelo menos 3 pontos para contornar a área de risco.',
    geometryKind: 'polygon',
    tone: 'red',
    icon: 'risk',
  },
  {
    type: 'alert',
    label: 'Alerta',
    shortLabel: 'Criar alerta',
    description: 'Aviso urgente vinculado a um local no mapa',
    instruction: 'Clique no local que deve receber o alerta.',
    geometryKind: 'point',
    tone: 'amber',
    icon: 'alert',
  },
  {
    type: 'rescue-route',
    label: 'Rota de resgate',
    shortLabel: 'Direcionar resgate',
    description: 'Trajeto recomendado para chegada ou evacuação',
    instruction: 'Clique nos pontos do trajeto, na ordem em que o resgate deve seguir.',
    geometryKind: 'line',
    tone: 'sky',
    icon: 'route',
  },
  {
    type: 'victim-report',
    label: 'Relato de vítima',
    shortLabel: 'Relatar vítima',
    description: 'Local com vítima confirmada ou estimada',
    instruction: 'Clique no local do relato de vítima.',
    geometryKind: 'point',
    tone: 'rose',
    icon: 'victim',
  },
  {
    type: 'support-point',
    label: 'Ponto de apoio',
    shortLabel: 'Ponto de apoio',
    description: 'Abrigo, posto médico, logística ou comando',
    instruction: 'Clique no local do ponto de apoio.',
    geometryKind: 'point',
    tone: 'sky',
    icon: 'support',
  },
  {
    type: 'traffic-interruption',
    label: 'Tráfego interrompido',
    shortLabel: 'Bloquear via',
    description: 'Trecho bloqueado, ponte avariada ou acesso restrito',
    instruction: 'Clique no início e continue marcando o trecho bloqueado.',
    geometryKind: 'line',
    tone: 'orange',
    icon: 'road',
  },
  {
    type: 'safe-area',
    label: 'Área segura',
    shortLabel: 'Área segura',
    description: 'Zona liberada para reunião, triagem ou evacuação',
    instruction: 'Clique em pelo menos 3 pontos para contornar a área segura.',
    geometryKind: 'polygon',
    tone: 'emerald',
    icon: 'safe',
  },
  {
    type: 'search-sector',
    label: 'Setor de busca',
    shortLabel: 'Setor de busca',
    description: 'Área atribuída às equipes, com prioridade e vítimas',
    instruction: 'Clique em pelo menos 3 pontos para delimitar o setor de busca.',
    geometryKind: 'polygon',
    tone: 'fuchsia',
    icon: 'search',
  },
];

export const OPERATIONAL_TOOL_LABELS = Object.fromEntries(
  OPERATIONAL_TOOLS.map((tool) => [tool.type, tool.label]),
);

export function getOperationalTool(featureType: string | undefined) {
  return OPERATIONAL_TOOLS.find((tool) => tool.type === featureType);
}
