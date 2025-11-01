'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export interface MortgageData {
  id?: number;
  mortgageAmount: number;
  annualRate: number;
  monthlyPayment: number;
  extraMonthlyPayment: number;
  calculationName?: string;
  mortgageStartDate?: string;
  paymentDayOfMonth?: number;
  preferredPaymentDay?: number;
  mortgageTermMonths?: number;
  lumpSumPayments: LumpSumPaymentData[];
  rateAdjustments: RateAdjustmentData[];
}

export interface RateAdjustmentData {
  id?: number;
  effectiveDate: string;
  rateDelta: number;
  description?: string;
}

export interface LumpSumPaymentData {
  id?: number;
  amount: number;
  year: number;
  month: number;
  plannedDate?: string;
  description?: string;
  isPaid?: boolean;
  actualPaidDate?: string;
  interestSaved?: number;
  timeSaved?: number;
}

export function useMortgageData() {
  const { data: session } = useSession();
  const [savedCalculations, setSavedCalculations] = useState<MortgageData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load saved calculations when user signs in
  useEffect(() => {
    if (session?.user?.id) {
      loadCalculations();
    }
  }, [session?.user?.id]);

  const loadCalculations = async () => {
    if (!session?.user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/mortgage-calculations');
      if (!response.ok) {
        throw new Error('Failed to load calculations');
      }

      const calculations = await response.json();
      
      // Load lump sum payments for each calculation
      const calculationsWithLumpSums = await Promise.all(
        calculations.map(async (calc: any) => {
          const lumpSumResponse = await fetch(`/api/lump-sum-payments?calculationId=${calc.id}`);
          const lumpSums = lumpSumResponse.ok ? await lumpSumResponse.json() : [];
          
          const adjustmentsResponse = await fetch(`/api/rate-adjustments?calculationId=${calc.id}`);
          const rateAdjustments = adjustmentsResponse.ok ? await adjustmentsResponse.json() : [];

          return {
            ...calc,
            lumpSumPayments: lumpSums,
            rateAdjustments
          };
        })
      );

      setSavedCalculations(calculationsWithLumpSums);
    } catch (error) {
      console.error('Error loading calculations:', error);
      setError('Failed to load saved calculations');
    } finally {
      setIsLoading(false);
    }
  };

  const saveCalculation = async (data: MortgageData): Promise<number | null> => {
    if (!session?.user?.id) {
      setError('Please sign in to save calculations');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Save mortgage calculation
      const calculationResponse = await fetch('/api/mortgage-calculations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mortgageAmount: data.mortgageAmount,
          annualRate: data.annualRate,
          monthlyPayment: data.monthlyPayment,
          extraMonthlyPayment: data.extraMonthlyPayment,
          calculationName: data.calculationName,
          mortgageStartDate: data.mortgageStartDate,
          paymentDayOfMonth: data.paymentDayOfMonth,
          preferredPaymentDay: data.preferredPaymentDay,
          mortgageTermMonths: data.mortgageTermMonths
        })
      });

      if (!calculationResponse.ok) {
        throw new Error('Failed to save calculation');
      }

      const savedCalculation = await calculationResponse.json();

      // Save lump sum payments
      if (data.lumpSumPayments.length > 0) {
        await Promise.all(
          data.lumpSumPayments.map(lumpSum =>
            fetch('/api/lump-sum-payments', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                mortgageCalculationId: savedCalculation.id,
                amount: lumpSum.amount,
                year: lumpSum.year,
                month: lumpSum.month,
                plannedDate: lumpSum.plannedDate,
                description: lumpSum.description,
                isPaid: lumpSum.isPaid,
                actualPaidDate: lumpSum.actualPaidDate,
                interestSaved: lumpSum.interestSaved,
                timeSaved: lumpSum.timeSaved
              })
            })
          )
        );
      }

      // Save rate adjustments
      if (data.rateAdjustments && data.rateAdjustments.length > 0) {
        await Promise.all(
          data.rateAdjustments.map((adjustment) =>
            fetch('/api/rate-adjustments', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                mortgageCalculationId: savedCalculation.id,
                effectiveDate: adjustment.effectiveDate,
                rateDelta: typeof adjustment.rateDelta === 'number' ? adjustment.rateDelta : Number(adjustment.rateDelta) || 0,
                description: adjustment.description
              })
            })
          )
        );
      }

      // Reload calculations to get the updated list
      await loadCalculations();

      return savedCalculation.id;
    } catch (error) {
      console.error('Error saving calculation:', error);
      setError('Failed to save calculation');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const updateLumpSumPayment = async (
    calculationId: number,
    lumpSumId: number,
    updates: Partial<LumpSumPaymentData>
  ): Promise<boolean> => {
    if (!session?.user?.id) return false;

    try {
      const response = await fetch(`/api/lump-sum-payments?id=${lumpSumId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        await loadCalculations();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating lump sum payment:', error);
      return false;
    }
  };

  const markLumpSumAsPaid = async (
    calculationId: number,
    lumpSumId: number,
    actualPaidDate: string
  ): Promise<boolean> => {
    return updateLumpSumPayment(calculationId, lumpSumId, {
      isPaid: true,
      actualPaidDate
    });
  };

  const addRateAdjustment = async (
    calculationId: number,
    adjustment: RateAdjustmentData
  ): Promise<boolean> => {
    if (!session?.user?.id) return false;

    try {
      const response = await fetch('/api/rate-adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mortgageCalculationId: calculationId,
          effectiveDate: adjustment.effectiveDate,
          rateDelta: adjustment.rateDelta,
          description: adjustment.description
        })
      });

      if (response.ok) {
        await loadCalculations();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error adding rate adjustment:', error);
      return false;
    }
  };

  const updateRateAdjustment = async (
    adjustmentId: number,
    updates: Partial<RateAdjustmentData>
  ): Promise<boolean> => {
    if (!session?.user?.id) return false;

    try {
      const response = await fetch(`/api/rate-adjustments?id=${adjustmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        await loadCalculations();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating rate adjustment:', error);
      return false;
    }
  };

  const deleteRateAdjustment = async (adjustmentId: number): Promise<boolean> => {
    if (!session?.user?.id) return false;

    try {
      const response = await fetch(`/api/rate-adjustments?id=${adjustmentId}`, { method: 'DELETE' });
      if (response.ok) {
        await loadCalculations();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting rate adjustment:', error);
      return false;
    }
  };

  const deleteCalculation = async (calculationId: number): Promise<boolean> => {
    if (!session?.user?.id) {
      setError('Please sign in to delete calculations');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/mortgage-calculations/${calculationId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete calculation');
      }

      // Reload calculations to get the updated list
      await loadCalculations();
      return true;
    } catch (error) {
      console.error('Error deleting calculation:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete calculation');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    savedCalculations,
    isLoading,
    error,
    isAuthenticated: !!session?.user?.id,
    loadCalculations,
    saveCalculation,
    updateLumpSumPayment,
    markLumpSumAsPaid,
    addRateAdjustment,
    updateRateAdjustment,
    deleteRateAdjustment,
    deleteCalculation
  };
}
