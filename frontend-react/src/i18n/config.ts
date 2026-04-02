import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      nav: {
        monitor: 'Monitor SOS',
        hotspots: 'Hotspots',
        missing: 'Missing Persons',
        approval: 'Tactical Approval',
        reports: 'Reports',
        searched: 'Searched Areas',
        rescue: 'Rescue Support',
        incidents: 'Incidents',
        simulations: 'Simulations',
        datahub: 'Data Hub',
        integrations: 'Integrations',
        global: 'Global Events',
        volunteer: 'Volunteer Dashboard',
        logistics: 'Logistics',
        risk: 'Risk Analysis',
        support: 'Support Point',
        sources: 'Source Management',
        map: 'Public Map',
        transparency: 'Public Transparency',
        settings: 'Settings',
        logout: 'Logout',
        status: 'Operational Status',
        internal: 'Internal Systems',
        public: 'Public Access',
        actions: 'Tactical Actions'
      },
      intel: {
        title: 'OPERATIONAL INTEL',
        status: 'GLOBAL_STATUS_REPORT',
        critical: 'CRITICAL',
        disasters: 'DISASTERS',
        war: 'WAR / CONFLICT',
        weather: 'HEAT / WEATHER',
        surveillance: 'SURVEILLANCE_INDEX'
      },
      map: {
        context: {
          mark_area: 'Mark Area',
          search_here: 'Search Intel',
          create_alert: 'Create Alert',
          support_point: 'Support Point',
          success_title: 'Tactical Command Sent',
          success_desc: 'Action registered and pending approval.'
        }
      }
    }
  },
  pt: {
    translation: {
      nav: {
        monitor: 'Monitorar SOS',
        hotspots: 'Pontos Críticos',
        missing: 'Desaparecidos',
        approval: 'Aprovação Tática',
        reports: 'Relatos',
        searched: 'Áreas Buscadas',
        rescue: 'Apoio ao Resgate',
        incidents: 'Ocorrências',
        simulations: 'Simulações',
        datahub: 'Central de Dados',
        integrations: 'Integrações',
        global: 'Eventos Globais',
        volunteer: 'Painel Voluntário',
        logistics: 'Logística',
        risk: 'Análise de Risco',
        support: 'Pontos de Apoio',
        sources: 'Gestão de Fontes',
        map: 'Mapa Público',
        transparency: 'Transparência Pública',
        settings: 'Configurações',
        logout: 'Encerrar Sessão',
        status: 'Status Operacional',
        internal: 'Sistemas Internos',
        public: 'Acesso Público',
        actions: 'Ações Táticas'
      },
      intel: {
        title: 'INTELIGÊNCIA OPERACIONAL',
        status: 'RELATÓRIO_STATUS_GLOBAL',
        critical: 'CRÍTICO',
        disasters: 'DESASTRES',
        war: 'GUERRA / CONFLITO',
        weather: 'CALOR / CLIMA',
        surveillance: 'ÍNDICE_DE_VIGILÂNCIA'
      },
      map: {
        context: {
          mark_area: 'Demarcar Área',
          search_here: 'Pesquisar Intel',
          create_alert: 'Criar Alerta',
          support_point: 'Ponto de Apoio',
          success_title: 'Comanda Tática Enviada',
          success_desc: 'Ação registrada e aguardando aprovação.'
        }
      }
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
