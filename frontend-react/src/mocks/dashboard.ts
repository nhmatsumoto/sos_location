import type { HotspotItem, LayerItem, MissingPersonItem, ReportItem } from '../types/app';

export const hotspotsMock: HotspotItem[] = [
  { id: 'HS-001', nome: 'Encosta Serra Azul', tipoRisco: 'deslizamento', severidade: 'emergencia', score: 98, municipio: 'Ubá', ultimaAtualizacao: 'há 3 min' },
  { id: 'HS-014', nome: 'Margem Rio Turvo', tipoRisco: 'enchente', severidade: 'alerta', score: 92, municipio: 'Muriaé', ultimaAtualizacao: 'há 8 min' },
  { id: 'HS-021', nome: 'Ponte Sul', tipoRisco: 'desabamento', severidade: 'alto', score: 84, municipio: 'Cataguases', ultimaAtualizacao: 'há 16 min' },
];

export const missingPersonsMock: MissingPersonItem[] = [
  { id: 'MP-001', nome: 'Ana Ferreira', idadeAproximada: 33, ultimaLocalizacao: 'Bairro Centro, Ubá', dataHora: '2026-03-01T08:30:00Z', contato: '(32) 99999-1111', status: 'novo' },
  { id: 'MP-002', nome: 'Carlos Dias', idadeAproximada: 57, ultimaLocalizacao: 'Ponte Nova', dataHora: '2026-03-01T09:20:00Z', contato: '(31) 98888-2222', status: 'em_verificacao' },
];

export const reportsMock: ReportItem[] = [
  { id: 'RP-31', tipo: 'pessoa', descricao: 'Família ilhada solicitando remoção', localizacao: 'Rua das Flores, setor 4', credibilidade: 'alta', criadoEm: 'há 12 min' },
  { id: 'RP-32', tipo: 'animal', descricao: 'Cães presos em área alagada', localizacao: 'Vila Esperança', credibilidade: 'media', criadoEm: 'há 25 min' },
];

export const mapLayersMock: LayerItem[] = [
  { id: 'ly-hotspots', nome: 'Hotspots', ativa: true, opacidade: 85, legenda: 'Pontos críticos ranqueados' },
  { id: 'ly-heat', nome: 'Heatmap chuva 24h', ativa: true, opacidade: 60, legenda: 'Precipitação acumulada' },
  { id: 'ly-relief', nome: 'Relevo / 3D (UI)', ativa: false, opacidade: 100, legenda: 'Visualização de elevação' },
];
