import { useState, useEffect, useCallback } from 'react';
import { logisticsApi, type SupplyItem } from '../services/logisticsApi';
import { useNotifications } from '../context/useNotifications';

/**
 * Controller Hook for LogisticsPage
 * Manages supply chain telemetry, shipment forms, and operational synchronization.
 */
export function useLogisticsDashboard() {
  const [loading, setLoading] = useState(false);
  const [supplies, setSupplies] = useState<SupplyItem[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Partial<SupplyItem>>({
    item: '',
    quantity: 0,
    unit: 'un',
    origin: '',
    destination: '',
    status: 'pending',
    priority: 'medium'
  });

  const { pushNotice } = useNotifications();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await logisticsApi.getAll();
      setSupplies(data);
    } catch {
      pushNotice({ 
        type: 'error', 
        title: 'Falha na Telemétria', 
        message: 'Não foi possível carregar o feed de suprimentos.' 
      });
    } finally {
      setLoading(false);
    }
  }, [pushNotice]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleCreateDraft = () => {
    setForm({
      item: '',
      quantity: 0,
      unit: 'un',
      origin: '',
      destination: '',
      status: 'pending',
      priority: 'medium'
    });
    setModalOpen(true);
  };

  const submitShipment = async () => {
    if (!form.item || !form.quantity) {
      pushNotice({ type: 'warning', title: 'Erro de Protocolo', message: 'Item e volume são obrigatórios.' });
      return;
    }

    try {
      await logisticsApi.create(form);
      pushNotice({ type: 'success', title: 'Logística Atualizada', message: 'Deslocamento de suprimento registrado.' });
      setModalOpen(false);
      await loadData();
    } catch {
      pushNotice({ type: 'error', title: 'Falha no Registro', message: 'Erro ao sincronizar com a central de suprimentos.' });
    }
  };

  const stats = {
    total: supplies.length,
    inTransit: supplies.filter(s => s.status === 'in_transit').length,
    delivered: supplies.filter(s => s.status === 'delivered').length,
    critical: supplies.filter(s => s.priority === 'high' || s.priority === 'critical').length,
  };

  return {
    supplies,
    loading,
    modalOpen,
    setModalOpen,
    form,
    setForm,
    stats,
    actions: {
      loadData,
      handleCreateDraft,
      submitShipment
    }
  };
}
