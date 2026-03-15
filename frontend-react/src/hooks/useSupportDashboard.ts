import { useState, useEffect, useCallback, useMemo } from 'react';
import { supportApi, type Campaign, type Donation, type Expense } from '../services/supportApi';
import { useNotifications } from '../context/NotificationsContext';

/**
 * Controller Hook for SupportDashboardPage
 * Manages financial transparency, donation tracking, and humanitarian campaigns.
 */
export function useSupportDashboard(incidentId: string = '00000000-0000-0000-0000-000000000000') {
  const [loading, setLoading] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const { pushNotice } = useNotifications();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [c, d, e] = await Promise.all([
        supportApi.getCampaigns(incidentId),
        supportApi.getDonations(incidentId),
        supportApi.getExpenses(incidentId)
      ]);
      setCampaigns(c);
      setDonations(d);
      setExpenses(e);
    } catch {
      pushNotice({ 
        type: 'error', 
        title: 'Auditoria Interrompida', 
        message: 'Não foi possível sincronizar o ledger financeiro.' 
      });
    } finally {
      setLoading(false);
    }
  }, [incidentId, pushNotice]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const financialSummary = useMemo(() => {
    const totalDonations = donations.reduce((acc, d) => acc + d.amount, 0);
    const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
    return {
      totalDonations,
      totalExpenses,
      balance: totalDonations - totalExpenses
    };
  }, [donations, expenses]);

  return {
    campaigns,
    donations,
    expenses,
    loading,
    financialSummary,
    actions: { loadData }
  };
}
