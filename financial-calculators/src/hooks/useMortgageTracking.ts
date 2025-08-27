import { useState, useEffect, useCallback } from 'react';
import { 
  MortgageSnapshot, 
  MortgagePayment, 
  MortgageSettings,
  CreateMortgageSnapshotParams,
  CreateMortgagePaymentParams,
  CreateMortgageSettingsParams
} from '@/lib/database';

interface UseMortgageTrackingProps {
  calculationId: number;
}

interface MortgageTrackingData {
  snapshots: MortgageSnapshot[];
  payments: MortgagePayment[];
  settings: MortgageSettings | null;
  loading: boolean;
  error: string | null;
}

interface PaymentDateCalculation {
  nextPaymentDate: Date;
  daysUntilNextPayment: number;
  isEndOfMonth: boolean;
  actualPaymentDay: number;
}

export function useMortgageTracking({ calculationId }: UseMortgageTrackingProps) {
  const [data, setData] = useState<MortgageTrackingData>({
    snapshots: [],
    payments: [],
    settings: null,
    loading: true,
    error: null
  });

  // Fetch all tracking data
  const fetchTrackingData = useCallback(async () => {
    if (!calculationId || calculationId <= 0) {
      setData(prev => ({ ...prev, loading: false, error: null }));
      return;
    }
    
    setData(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const [snapshotsRes, paymentsRes, settingsRes] = await Promise.all([
        fetch(`/api/mortgage/snapshots?calculationId=${calculationId}`),
        fetch(`/api/mortgage/payments?calculationId=${calculationId}`),
        fetch(`/api/mortgage/settings?calculationId=${calculationId}`)
      ]);

      if (!snapshotsRes.ok || !paymentsRes.ok || !settingsRes.ok) {
        throw new Error('Failed to fetch mortgage tracking data');
      }

      const [snapshots, payments, settings] = await Promise.all([
        snapshotsRes.json(),
        paymentsRes.json(),
        settingsRes.json()
      ]);

      setData({
        snapshots,
        payments,
        settings,
        loading: false,
        error: null
      });
    } catch (error) {
      setData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }, [calculationId]);

  // Add new snapshot
  const addSnapshot = useCallback(async (params: Omit<CreateMortgageSnapshotParams, 'mortgageCalculationId'>) => {
    try {
      const response = await fetch('/api/mortgage/snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...params, mortgageCalculationId: calculationId })
      });

      if (!response.ok) throw new Error('Failed to create snapshot');

      const newSnapshot = await response.json();
      setData(prev => ({
        ...prev,
        snapshots: [newSnapshot, ...prev.snapshots].sort((a, b) => 
          new Date(b.snapshotDate).getTime() - new Date(a.snapshotDate).getTime()
        )
      }));

      return newSnapshot;
    } catch (error) {
      throw error;
    }
  }, [calculationId]);

  // Add new payment
  const addPayment = useCallback(async (params: Omit<CreateMortgagePaymentParams, 'mortgageCalculationId'>) => {
    try {
      const response = await fetch('/api/mortgage/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...params, mortgageCalculationId: calculationId })
      });

      if (!response.ok) throw new Error('Failed to create payment');

      const newPayment = await response.json();
      setData(prev => ({
        ...prev,
        payments: [newPayment, ...prev.payments].sort((a, b) => 
          new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
        )
      }));

      return newPayment;
    } catch (error) {
      throw error;
    }
  }, [calculationId]);

  // Create or update settings
  const updateSettings = useCallback(async (params: Omit<CreateMortgageSettingsParams, 'mortgageCalculationId'>) => {
    try {
      const response = await fetch('/api/mortgage/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...params, mortgageCalculationId: calculationId })
      });

      if (!response.ok) throw new Error('Failed to update settings');

      const updatedSettings = await response.json();
      setData(prev => ({ ...prev, settings: updatedSettings }));

      return updatedSettings;
    } catch (error) {
      throw error;
    }
  }, [calculationId]);

  // Calculate next payment date with month-end edge case handling
  const calculateNextPaymentDate = useCallback((
    fromDate: Date = new Date(),
    paymentDay?: number,
    preferredDay?: number
  ): PaymentDateCalculation => {
    const settings = data.settings;
    const targetPaymentDay = paymentDay || settings?.paymentDayOfMonth || 1;
    const targetPreferredDay = preferredDay || settings?.preferredPaymentDay;
    
    const today = new Date(fromDate);
    const currentDay = today.getDate();
    
    // Determine if we need to go to next month
    let targetMonth = today.getMonth();
    let targetYear = today.getFullYear();
    
    if (currentDay >= targetPaymentDay) {
      targetMonth += 1;
      if (targetMonth > 11) {
        targetMonth = 0;
        targetYear += 1;
      }
    }
    
    // Handle month-end edge cases
    let actualPaymentDay = targetPaymentDay;
    let isEndOfMonth = false;
    
    if (targetPreferredDay && targetPreferredDay > 28) {
      // User wants end-of-month payment
      const lastDayOfTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
      actualPaymentDay = Math.min(targetPreferredDay, lastDayOfTargetMonth);
      isEndOfMonth = true;
    }
    
    const nextPaymentDate = new Date(targetYear, targetMonth, actualPaymentDay);
    
    // Calculate days until next payment
    const timeDiff = nextPaymentDate.getTime() - today.getTime();
    const daysUntilNextPayment = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    return {
      nextPaymentDate,
      daysUntilNextPayment,
      isEndOfMonth,
      actualPaymentDay
    };
  }, [data.settings]);

  // Get current mortgage state
  const getCurrentState = useCallback(() => {
    const latestSnapshot = data.snapshots[0]; // Sorted by date DESC
    const nextPayment = calculateNextPaymentDate();
    
    return {
      currentBalance: latestSnapshot?.remainingBalance || 0,
      currentDate: new Date().toISOString().split('T')[0],
      nextPaymentDate: nextPayment.nextPaymentDate.toISOString().split('T')[0],
      daysUntilPayment: nextPayment.daysUntilNextPayment,
      monthlyPayment: latestSnapshot?.monthlyPayment || 0,
      interestRate: latestSnapshot?.interestRate || 0,
      hasCurrentSnapshot: !!latestSnapshot
    };
  }, [data.snapshots, calculateNextPaymentDate]);

  // Calculate total impact of all prepayments
  const calculatePrepaymentImpact = useCallback(() => {
    const lumpSumPayments = data.payments.filter(p => p.paymentType === 'lump_sum');
    
    const totalPrepayments = lumpSumPayments.reduce((sum, payment) => sum + payment.scheduledAmount, 0);
    const totalInterestSaved = lumpSumPayments.reduce((sum, payment) => {
      // This would need to be calculated based on amortization - simplified for now
      return sum + (payment.interestAmount || 0);
    }, 0);
    
    return {
      totalPrepayments,
      totalInterestSaved,
      paymentCount: lumpSumPayments.length
    };
  }, [data.payments]);

  // Fetch data on mount and when calculationId changes
  useEffect(() => {
    fetchTrackingData();
  }, [fetchTrackingData]);

  return {
    ...data,
    addSnapshot,
    addPayment,
    updateSettings,
    calculateNextPaymentDate,
    getCurrentState,
    calculatePrepaymentImpact,
    refetch: fetchTrackingData
  };
}