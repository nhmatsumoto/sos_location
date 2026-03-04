import type { Catastrophe, CatastropheEvent, NewsUpdate } from "./types";

export const ENABLE_SIMULATION = false;

export const initialFormState = {
  locationName: '',
  latitude: '',
  longitude: '',
  description: '',
  reporterName: '',
  reporterPhone: '',
  video: null as File | null,
};

export const initialMissingForm = {
  personName: '',
  age: '',
  city: 'Ubá',
  lastSeenLocation: '',
  physicalDescription: '',
  additionalInfo: '',
  contactName: '',
  contactPhone: '',
};

export const initialRiskForm = {
  title: 'Nova área de risco mapeada',
  message: 'Possível risco identificado em campo. Avaliar prioridade.',
  severity: 'high',
  radiusMeters: '350',
  addMissingPerson: false,
  personName: '',
  city: 'Ubá',
  contactName: '',
  contactPhone: '',
  additionalInfo: '',
};

export const initialDonationForm = {
  item: 'Água potável',
  quantity: '120 kits',
  location: 'Centro comunitário de Ubá',
};

export const initialSplatForm = {
  latitude: '-21.1215',
  longitude: '-42.9427',
  video: null as File | null,
};

export const initialCatastropheForm = {
  name: 'Nova Catástrofe',
  type: 'Enchente' as Catastrophe['type'],
  status: 'Ativa' as Catastrophe['status'],
  centerLat: '-21.1215',
  centerLng: '-42.9427',
};

export const initialCatastropheEventForm = {
  title: 'Novo acontecimento',
  description: 'Equipe em campo reportou atualização da situação.',
  severity: 'high' as CatastropheEvent['severity'],
};

export const initialFlowForm = {
  sourceLat: '-21.1215',
  sourceLng: '-42.9427',
  rainfallMmPerHour: '70',
  scenario: 'encosta' as 'encosta' | 'urbano' | 'rural',
};

export const FLOATING_PANEL_WIDTHS = {
  global: 288,
  terrain: 320,
  alerts: 300,
  splat: 400
};

export const LOCAL_WEEKLY_RAIN_NEWS: NewsUpdate[] = [
  {
    id: 'local-1',
    city: 'Ubá',
    title: 'Defesa Civil mantém monitoramento de chuva intensa em áreas de encosta.',
    source: 'Painel local',
    url: '#',
    publishedAtUtc: new Date().toISOString(),
    thumbnailUrl: 'https://portaldatransparencia.gov.br/favicon.ico',
    kind: 'alert',
  },
];
