import { useState, useEffect, useCallback, useMemo } from 'react';
import { operationsApi, type RiskArea, type SupportPoint } from '../services/operationsApi';
import { useNotifications } from '../context/useNotifications';

type EntityMode = 'support' | 'risk';

const defaultSupport = { id: '', name: '', type: 'Abrigo', lat: '-21.1149', lng: '-42.9342', capacity: '120', status: 'active' };
const defaultRisk = { id: '', name: 'Área crítica', severity: 'high', lat: '-21.1149', lng: '-42.9342', radiusMeters: '350', notes: '', status: 'active' };

const parseNumber = (value: string) => Number(value.replace(',', '.'));

/**
 * Controller Hook for RescueSupportPage
 * Manages complex operational data (Support Points & Risk Areas), 
 * handling CRUD cycles and telemetry aggregation.
 */
export function useRescueSupport() {
  const [loading, setLoading] = useState(false);
  const [supportPoints, setSupportPoints] = useState<SupportPoint[]>([]);
  const [riskAreas, setRiskAreas] = useState<RiskArea[]>([]);
  const [mode, setMode] = useState<EntityMode>('support');
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [riskModalOpen, setRiskModalOpen] = useState(false);
  const [supportForm, setSupportForm] = useState(defaultSupport);
  const [riskForm, setRiskForm] = useState(defaultRisk);

  const { pushNotice } = useNotifications();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [support, risk] = await Promise.all([
        operationsApi.listSupportPoints(), 
        operationsApi.listRiskAreas()
      ]);
      setSupportPoints(support);
      setRiskAreas(risk);
    } catch {
      pushNotice({ type: 'error', title: 'Erro de Sincronização', message: 'Falha ao carregar ativos operacionais.' });
    } finally {
      setLoading(false);
    }
  }, [pushNotice]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const stats = useMemo(() => ({
    support: supportPoints.length,
    risk: riskAreas.length,
    criticalRisk: riskAreas.filter((item) => ['critical', 'high'].includes(item.severity)).length,
  }), [supportPoints, riskAreas]);

  const saveSupport = async () => {
    if (!supportForm.name.trim()) {
      pushNotice({ type: 'warning', title: 'Protocolo Inválido', message: 'Nome do ponto é obrigatório.' });
      return;
    }

    const payload = {
      name: supportForm.name,
      type: supportForm.type,
      lat: parseNumber(supportForm.lat),
      lng: parseNumber(supportForm.lng),
      capacity: parseNumber(supportForm.capacity),
      status: supportForm.status,
    };

    try {
      if (supportForm.id) {
        await operationsApi.updateSupportPoint(supportForm.id, payload);
        pushNotice({ type: 'success', title: 'Rede Atualizada', message: 'Ponto de apoio sincronizado.' });
      } else {
        await operationsApi.createSupportPoint(payload);
        pushNotice({ type: 'success', title: 'Ativo Registrado', message: 'Novo ponto de apoio ativado.' });
      }
      setSupportModalOpen(false);
      await loadData();
    } catch {
      pushNotice({ type: 'error', title: 'Falha Crítica', message: 'Erro ao persistir dados operacionais.' });
    }
  };

  const saveRisk = async () => {
    if (!riskForm.name.trim()) {
      pushNotice({ type: 'warning', title: 'Protocolo Inválido', message: 'Nome da área de risco é obrigatório.' });
      return;
    }

    const payload = {
      name: riskForm.name,
      severity: riskForm.severity,
      lat: parseNumber(riskForm.lat),
      lng: parseNumber(riskForm.lng),
      radiusMeters: parseNumber(riskForm.radiusMeters),
      notes: riskForm.notes,
      status: riskForm.status,
    };

    try {
      if (riskForm.id) {
        await operationsApi.updateRiskArea(riskForm.id, payload);
        pushNotice({ type: 'success', title: 'Risco Atualizado', message: 'Dados de área crítica sincronizados.' });
      } else {
        await operationsApi.createRiskArea(payload);
        pushNotice({ type: 'success', title: 'Alerta Registrado', message: 'Nova área de risco mapeada.' });
      }
      setRiskModalOpen(false);
      await loadData();
    } catch {
      pushNotice({ type: 'error', title: 'Falha Crítica', message: 'Erro ao persistir dados de risco.' });
    }
  };

  const deleteEntity = async (type: EntityMode, id: string) => {
    try {
      if (type === 'support') await operationsApi.deleteSupportPoint(id);
      else await operationsApi.deleteRiskArea(id);
      pushNotice({ type: 'success', title: 'Ativo Removido', message: 'Registro eliminado da malha operacional.' });
      await loadData();
    } catch {
      pushNotice({ type: 'error', title: 'Falha na Remoção', message: 'Não foi possível excluir o ativo.' });
    }
  };

  return {
    supportPoints, riskAreas, loading, mode, setMode,
    supportModalOpen, setSupportModalOpen, riskModalOpen, setRiskModalOpen,
    supportForm, setSupportForm, riskForm, setRiskForm,
    stats,
    actions: { loadData, saveSupport, saveRisk, deleteEntity, defaultSupport, defaultRisk }
  };
}
