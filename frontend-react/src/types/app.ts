export type Severity = 'baixo' | 'moderado' | 'alto' | 'alerta' | 'emergencia';

export interface HotspotItem {
  id: string;
  nome: string;
  tipoRisco: 'enchente' | 'deslizamento' | 'desabamento';
  severidade: Severity;
  score: number;
  municipio: string;
  ultimaAtualizacao: string;
}

export interface MissingPersonItem {
  id: string;
  nome: string;
  idadeAproximada: number;
  ultimaLocalizacao: string;
  dataHora: string;
  contato: string;
  status: 'novo' | 'em_verificacao' | 'localizado' | 'duplicado';
}

export interface ReportItem {
  id: string;
  tipo: 'pessoa' | 'animal';
  descricao: string;
  localizacao: string;
  credibilidade: 'alta' | 'media' | 'baixa';
  criadoEm: string;
}

export interface LayerItem {
  id: string;
  nome: string;
  ativa: boolean;
  opacidade: number;
  legenda: string;
}
