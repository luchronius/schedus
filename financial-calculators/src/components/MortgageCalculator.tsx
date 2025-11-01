'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useMortgageData, MortgageData } from '@/hooks/useMortgageData';
import { monthsToTermParts, normalizeTermParts, termPartsToMonths } from '@/utils/mortgageTerm';
import {
  calculateMonthlyPayment,
  generateAmortizationSchedule,
  AmortizationPayment,
  roundToPrecision,
  validateFinancialInput
} from '../utils/financialCalculations';

const RATE_ADJUSTMENT_OPTIONS = [
  -1.5, -1.25, -1.0, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5
].map((value) => ({
  value,
  label: `${value > 0 ? '+' : ''}${value.toFixed(2)}%`
}));
const DEFAULT_TERM_YEARS = 25;
const DEFAULT_TERM_ADDITIONAL_MONTHS = 0;
const DEFAULT_TERM_TOTAL_MONTHS = termPartsToMonths(DEFAULT_TERM_YEARS, DEFAULT_TERM_ADDITIONAL_MONTHS);
const MAX_TERM_YEARS = 50;

interface RateAdjustment {
  id: string;
  effectiveDate: string; // ISO date string for when the rate changes
  rateDelta: number; // Percent change applied to the base annual rate
  description?: string;
}

interface RateAdjustmentImpact {
  interestWithAdjustments: number;
  interestWithoutAdjustments: number;
  interestDifference: number;
  termWithAdjustments: number; // months
  termWithoutAdjustments: number; // months
  termDifferenceMonths: number;
}

interface LumpSumPayment {
  id: string;
  amount: number;
  plannedDate?: string; // ISO date string for precise scheduling
  actualDate?: string; // ISO date string for when actually paid
  actualPaidDate?: string; // Legacy compatibility field
  year: number; // Keep for backward compatibility
  month: number; // Keep for backward compatibility
  description?: string;
  isPaid?: boolean;
  interestSaved?: number;
  timeSaved?: number; // in months
}

interface MortgageInputs {
  mortgageAmount: number;
  annualRate: number;
  monthlyPayment: number;
  extraMonthlyPayment: number;
  mortgageStartDate: string; // ISO date string for mortgage origination
  paymentDayOfMonth: number; // 1-28 for safe monthly payment day
  preferredPaymentDay?: number; // 29-31 for month-end preferences
  mortgageTermYears: number;
  mortgageTermAdditionalMonths: number;
  lumpSumPayments: LumpSumPayment[];
  rateAdjustments: RateAdjustment[];
}

interface LumpSumImpact {
  lumpSumId: string;
  interestSaved: number;
  timeSaved: number; // in months
  principalReduction: number;
  cumulativeInterestSaved: number;
}

interface MortgageResults {
  loanAmount: number;
  monthlyPrincipalInterest: number;
  totalMonthlyPayment: number;
  totalPaid: number;
  standardTotalPaid: number;
  totalInterest: number;
  schedule: AmortizationPayment[];
  standardSchedule: AmortizationPayment[];
  yearsReduced: number;
  interestSaved: number;
  interestSavedVsBaseline?: number | null;
  interestSavedAtOriginalTerm?: number | null;
  baselineTotalInterest?: number | null;
  baselineTotalPaid?: number | null;
  baselineScheduleLength?: number | null;
  actualPayoffYear: number;
  calculatedTermInYears: number;
  calculatedTermInMonths: number;
  lumpSumImpacts: LumpSumImpact[];
  remainingBalanceAtOriginalTerm: number | null;
  standardRemainingBalanceAtOriginalTerm: number | null;
  baselineRemainingBalanceAtOriginalTerm: number | null;
  rateAdjustmentImpact?: RateAdjustmentImpact;
}

export default function MortgageCalculator() {
  const { data: session, status } = useSession();
  const { 
    savedCalculations, 
    isLoading: isSavingData, 
    error: dataError, 
    isAuthenticated,
    saveCalculation,
    markLumpSumAsPaid 
  } = useMortgageData();
  
  // Build default inputs and normalize stored mortgage data
  const buildDefaultInputs = (): MortgageInputs => ({
    mortgageAmount: 842952.60,
    annualRate: 4.04,
    monthlyPayment: 4624.05,
    extraMonthlyPayment: 0,
    mortgageStartDate: new Date().toISOString().split('T')[0], // Default to today
    paymentDayOfMonth: 12, // Default to 12th of month to match example
    preferredPaymentDay: undefined,
    mortgageTermYears: DEFAULT_TERM_YEARS,
    mortgageTermAdditionalMonths: DEFAULT_TERM_ADDITIONAL_MONTHS,
    lumpSumPayments: [] as LumpSumPayment[],
    rateAdjustments: [] as RateAdjustment[]
  });

  const normalizeInputs = (
    raw?: Partial<MortgageInputs> & { mortgageTermMonths?: number }
  ): MortgageInputs => {
    const defaults = buildDefaultInputs();

    if (!raw || typeof raw !== 'object') {
      return defaults;
    }

    const merged = {
      ...defaults,
      ...raw,
      lumpSumPayments: Array.isArray(raw.lumpSumPayments) ? raw.lumpSumPayments : defaults.lumpSumPayments,
      rateAdjustments: Array.isArray(raw.rateAdjustments) ? raw.rateAdjustments : defaults.rateAdjustments
    };

    let termParts = normalizeTermParts(
      merged.mortgageTermYears,
      merged.mortgageTermAdditionalMonths
    );

    if (raw.mortgageTermMonths !== undefined && raw.mortgageTermMonths !== null) {
      const fromTotal = monthsToTermParts(raw.mortgageTermMonths);
      if (fromTotal.years !== 0 || fromTotal.months !== 0) {
        termParts = fromTotal;
      }
    }

    if (termParts.years === 0 && termParts.months === 0) {
      termParts = {
        years: defaults.mortgageTermYears,
        months: defaults.mortgageTermAdditionalMonths
      };
    }

    let normalizedYears = Math.min(MAX_TERM_YEARS, Math.max(0, termParts.years));
    let normalizedMonths = Math.max(0, termParts.months % 12);

    if (termParts.years > MAX_TERM_YEARS) {
      normalizedMonths = 0;
    }


    return {
      ...merged,
      mortgageAmount: isNaN(Number(merged.mortgageAmount)) ? defaults.mortgageAmount : Number(merged.mortgageAmount),
      annualRate: isNaN(Number(merged.annualRate)) ? defaults.annualRate : Number(merged.annualRate),
      monthlyPayment: isNaN(Number(merged.monthlyPayment)) ? defaults.monthlyPayment : Number(merged.monthlyPayment),
      extraMonthlyPayment: isNaN(Number(merged.extraMonthlyPayment)) ? defaults.extraMonthlyPayment : Number(merged.extraMonthlyPayment),
      mortgageStartDate: merged.mortgageStartDate || defaults.mortgageStartDate,
      paymentDayOfMonth: isNaN(Number(merged.paymentDayOfMonth)) ? defaults.paymentDayOfMonth : Number(merged.paymentDayOfMonth),
      preferredPaymentDay: merged.preferredPaymentDay !== undefined && merged.preferredPaymentDay !== null && !isNaN(Number(merged.preferredPaymentDay))
        ? Number(merged.preferredPaymentDay)
        : undefined,
      mortgageTermYears: normalizedYears,
      mortgageTermAdditionalMonths: normalizedMonths,
    };
  };

  const normalizeStoredResults = (raw: any): MortgageResults | null => {
    if (!raw || typeof raw !== 'object') {
      return null;
    }

    const schedule = Array.isArray(raw.schedule) ? raw.schedule : [];
    const standardSchedule = Array.isArray(raw.standardSchedule) ? raw.standardSchedule : [];

    const totalPaid = typeof raw.totalPaid === 'number'
      ? raw.totalPaid
      : roundToPrecision(
          schedule.reduce((sum: number, payment: any) => {
            const amount = typeof payment?.paymentAmount === 'number' ? payment.paymentAmount : 0;
            return sum + amount;
          }, 0),
          2
        );

    const standardTotalPaid = typeof raw.standardTotalPaid === 'number'
      ? raw.standardTotalPaid
      : roundToPrecision(
          standardSchedule.reduce((sum: number, payment: any) => {
            const amount = typeof payment?.paymentAmount === 'number' ? payment.paymentAmount : 0;
            return sum + amount;
          }, 0),
          2
        );

    return {
      ...raw,
      schedule,
      standardSchedule,
      lumpSumImpacts: Array.isArray(raw.lumpSumImpacts) ? raw.lumpSumImpacts : [],
      remainingBalanceAtOriginalTerm: raw.remainingBalanceAtOriginalTerm ?? null,
      standardRemainingBalanceAtOriginalTerm: raw.standardRemainingBalanceAtOriginalTerm ?? null,
      baselineRemainingBalanceAtOriginalTerm: raw.baselineRemainingBalanceAtOriginalTerm ?? null,
      totalPaid,
      standardTotalPaid,
      interestSavedVsBaseline: typeof raw.interestSavedVsBaseline === 'number' ? raw.interestSavedVsBaseline : null,
      interestSavedAtOriginalTerm: typeof raw.interestSavedAtOriginalTerm === 'number' ? raw.interestSavedAtOriginalTerm : null,
      baselineTotalInterest: typeof raw.baselineTotalInterest === 'number' ? raw.baselineTotalInterest : null,
      baselineTotalPaid: typeof raw.baselineTotalPaid === 'number' ? raw.baselineTotalPaid : null,
      baselineScheduleLength: typeof raw.baselineScheduleLength === 'number' ? raw.baselineScheduleLength : null
    } as MortgageResults;
  };


  const getInitialInputs = (): MortgageInputs => {
    if (typeof window !== 'undefined' && session?.user?.id) {
      const stored = localStorage.getItem(`mortgage-inputs-${session.user.id}`);
      if (stored) {
        try {
          return normalizeInputs(JSON.parse(stored));
        } catch (error) {
          console.error('Error parsing stored mortgage inputs:', error);
        }
      }
    }
    return buildDefaultInputs();
  };
  // State declarations
  const [inputs, setInputs] = useState<MortgageInputs>(getInitialInputs);

  // Get initial results from localStorage or use null
  const getInitialResults = (): MortgageResults | null => {
    if (typeof window !== 'undefined' && session?.user?.id) {
      const stored = localStorage.getItem(`mortgage-results-${session.user.id}`);
      if (stored) {
        try {
          return normalizeStoredResults(JSON.parse(stored));
        } catch (error) {
          console.error('Error parsing stored mortgage results:', error);
        }
      }
    }
    return null;
  };

  const [results, setResults] = useState<MortgageResults | null>(getInitialResults);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [scheduleView, setScheduleView] = useState<'summary' | 'yearly' | 'full'>('summary');
  const [calculationName, setCalculationName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showHistorical, setShowHistorical] = useState(false);
  const [needsRecalculation, setNeedsRecalculation] = useState(false);
  const isInitialLoad = useRef(true);

  const deriveLumpSumSortValue = (lump: LumpSumPayment): number => {
    if (lump.plannedDate) {
      const parsed = Date.parse(lump.plannedDate);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }

    const startDate = inputs.mortgageStartDate ? new Date(inputs.mortgageStartDate) : null;
    if (startDate && !Number.isNaN(startDate.getTime())) {
      const normalizedMonth = Math.max(0, (lump.month ?? 1) - 1);
      const totalMonthsFromStart = Math.max(0, (lump.year ?? 0) * 12 + normalizedMonth);
      const derivedDate = new Date(startDate);
      derivedDate.setMonth(derivedDate.getMonth() + totalMonthsFromStart);
      const derivedTime = derivedDate.getTime();
      const indexOffset = inputs.lumpSumPayments.findIndex(item => item.id === lump.id);
      return derivedTime + (indexOffset >= 0 ? indexOffset / 1000 : 0);
    }

    const fallbackMonths = Math.max(0, (lump.year ?? 0) * 12 + Math.max(0, (lump.month ?? 1) - 1));
    const fallbackIndex = inputs.lumpSumPayments.findIndex(item => item.id === lump.id);
    return fallbackMonths + (fallbackIndex >= 0 ? fallbackIndex / 1000 : 0);
  };

  const formatLumpSumScheduleLabel = (lump: LumpSumPayment): string => {
    if (lump.plannedDate) {
      const parsed = new Date(lump.plannedDate);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toLocaleDateString();
      }
    }

    if (lump.year === 0) {
      return 'Immediate';
    }

    const parts: string[] = [];
    if (lump.year) {
      parts.push(`Year ${lump.year}`);
    }
    if (lump.month) {
      parts.push(`Month ${lump.month}`);
    }
    return parts.length > 0 ? parts.join(', ') : 'Scheduled';
  };

  const sortedLumpSums = useMemo(
    () =>
      [...inputs.lumpSumPayments].sort((a, b) => deriveLumpSumSortValue(a) - deriveLumpSumSortValue(b)),
    [inputs.lumpSumPayments, inputs.mortgageStartDate]
  );

  // Debug session state - removed for production

  // Load inputs and results from localStorage when session becomes available
  useEffect(() => {
    if (session?.user?.id && typeof window !== 'undefined') {
      const storedInputs = localStorage.getItem(`mortgage-inputs-${session.user.id}`);
      const storedResults = localStorage.getItem(`mortgage-results-${session.user.id}`);
      
      if (storedInputs) {
        try {
          const parsedInputs = JSON.parse(storedInputs);
          setInputs(parsedInputs);
        } catch (error) {
          console.error('Error parsing stored mortgage inputs:', error);
        }
      }
      
      if (storedResults) {
        try {
          const parsedResults = JSON.parse(storedResults);
          setResults(normalizeStoredResults(parsedResults));
        } catch (error) {
          console.error('Error parsing stored mortgage results:', error);
        }
      }
    }
  }, [session?.user?.id]);

  // Save inputs to localStorage when signed in user makes changes
  useEffect(() => {
    if (session?.user?.id && typeof window !== 'undefined') {
      localStorage.setItem(`mortgage-inputs-${session.user.id}`, JSON.stringify(inputs));
    }
  }, [inputs, session?.user?.id]);

  // Save results to localStorage when they change
  useEffect(() => {
    if (session?.user?.id && typeof window !== 'undefined' && results) {
      localStorage.setItem(`mortgage-results-${session.user.id}`, JSON.stringify(results));
    }
  }, [results, session?.user?.id]);

  // Mark initial load as complete after first render
  useEffect(() => {
    const timer = setTimeout(() => {
      isInitialLoad.current = false;
    }, 100); // Small delay to ensure all loading is complete
    
    return () => clearTimeout(timer);
  }, []);

  // Mark that recalculation is needed when lump sum payments change (but not on initial load)
  useEffect(() => {
    if (results && !isInitialLoad.current) {
      setNeedsRecalculation(true);
    }
  }, [inputs.lumpSumPayments, inputs.extraMonthlyPayment, inputs.rateAdjustments]);
  
  // Helper function to calculate payment number from exact date
  const calculatePaymentNumberFromDate = (mortgageStartDate: string, lumpSumDate: string, paymentDayOfMonth: number, preferredPaymentDay?: number): number => {
    const startDate = new Date(mortgageStartDate);
    const lumpDate = new Date(lumpSumDate);
    
    // If lump sum date is before mortgage start, apply it immediately (payment 1)
    if (lumpDate <= startDate) {
      return 1;
    }
    
    // Generate payment dates and find which payment period the lump sum falls into
    let paymentNumber = 1;
    let currentPaymentDate = new Date(startDate);
    
    // Move to the first payment date (next month from mortgage start)
    currentPaymentDate.setMonth(currentPaymentDate.getMonth() + 1);
    
    // Handle month-end preferences for the payment day
    const getActualPaymentDay = (date: Date) => {
      if (preferredPaymentDay && preferredPaymentDay > 28) {
        const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
        return Math.min(preferredPaymentDay, lastDayOfMonth);
      }
      return paymentDayOfMonth;
    };
    
    currentPaymentDate.setDate(getActualPaymentDay(currentPaymentDate));
    
    // Find which payment period the lump sum falls into
    while (paymentNumber <= 1200) { // Safety limit
      // If lump sum is on or before this payment date, it belongs to this payment
      if (lumpDate <= currentPaymentDate) {
        return paymentNumber;
      }
      
      // Move to next payment date
      paymentNumber++;
      currentPaymentDate.setMonth(currentPaymentDate.getMonth() + 1);
      currentPaymentDate.setDate(getActualPaymentDay(currentPaymentDate));
    }
    
    // Fallback - should not reach here
    return paymentNumber;
  };

  const getTotalTermInYears = (years: number, months: number): number => {
    return years + (months / 12);
  };

  const getTotalTermInMonths = (years: number, months: number): number => {
    return years * 12 + months;
  };

  const formatYearsAndMonths = (decimalYears: number): string => {
    const years = Math.floor(decimalYears);
    const months = Math.round((decimalYears - years) * 12);
    
    if (years === 0 && months === 0) {
      return '0 months';
    } else if (years === 0) {
      return `${months} ${months === 1 ? 'month' : 'months'}`;
    } else if (months === 0) {
      return `${years} ${years === 1 ? 'year' : 'years'}`;
    } else {
      return `${years} ${years === 1 ? 'year' : 'years'} and ${months} ${months === 1 ? 'month' : 'months'}`;
    }
  };

  const calculateTermFromPayment = (principal: number, monthlyPayment: number, annualRate: number): { years: number; months: number; totalMonths: number } => {
    if (monthlyPayment <= 0 || principal <= 0 || annualRate <= 0) {
      return { years: 0, months: 0, totalMonths: 0 };
    }

    const monthlyRate = annualRate / 12;
    
    // If payment is less than or equal to monthly interest, loan will never be paid off
    const monthlyInterest = principal * monthlyRate;
    if (monthlyPayment <= monthlyInterest) {
      return { years: 999, months: 0, totalMonths: 999 * 12 }; // Indicate infinite term
    }

    // Calculate number of payments using the loan payment formula solved for n
    // n = -log(1 - (P * r) / M) / log(1 + r)
    // where P = principal, r = monthly rate, M = monthly payment
    const numerator = Math.log(1 - (principal * monthlyRate) / monthlyPayment);
    const denominator = Math.log(1 + monthlyRate);
    const totalMonths = Math.ceil(-numerator / denominator);
    
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;
    
    return { years, months, totalMonths };
  };

  const generateScheduleFromPayment = (
    principal: number,
    monthlyPayment: number,
    annualRate: number,
    extraMonthlyPayment: number = 0,
    lumpSumPayments: LumpSumPayment[] = [],
    mortgageStartDate?: string,
    paymentDayOfMonth?: number,
    preferredPaymentDay?: number,
    rateAdjustments: RateAdjustment[] = []
  ): AmortizationPayment[] => {
    const totalPayment = monthlyPayment + extraMonthlyPayment;

    const adjustmentSchedule = (rateAdjustments || [])
      .map((adjustment) => {
        const rateDelta = (adjustment.rateDelta || 0) / 100;

        if (adjustment.effectiveDate && mortgageStartDate && paymentDayOfMonth) {
          const paymentNumber = calculatePaymentNumberFromDate(
            mortgageStartDate,
            adjustment.effectiveDate,
            paymentDayOfMonth,
            preferredPaymentDay
          );
          return { paymentNumber: Math.max(1, paymentNumber), rateDelta };
        }

        return { paymentNumber: 1, rateDelta };
      })
      .sort((a, b) => a.paymentNumber - b.paymentNumber);

    const schedule: AmortizationPayment[] = [];
    let remainingBalance = principal;
    let paymentNumber = 1;
    let cumulativeRateDelta = 0;
    let adjustmentIndex = 0;

    while (remainingBalance > 0.01 && paymentNumber <= 1200) { // Safety limit of 100 years
      while (
        adjustmentIndex < adjustmentSchedule.length &&
        paymentNumber >= adjustmentSchedule[adjustmentIndex].paymentNumber
      ) {
        cumulativeRateDelta += adjustmentSchedule[adjustmentIndex].rateDelta;
        adjustmentIndex++;
      }

      const effectiveAnnualRate = Math.max(0, annualRate + cumulativeRateDelta);
      const monthlyRate = effectiveAnnualRate / 12;

      const interestPayment = remainingBalance * monthlyRate;
      let principalPayment = totalPayment - interestPayment;

      if (principalPayment < 0) {
        principalPayment = 0;
      }

      let totalLumpSumThisPayment = 0;

      for (const lumpSum of lumpSumPayments) {
        let targetPaymentNumber: number;

        if (lumpSum.plannedDate && mortgageStartDate && paymentDayOfMonth) {
          targetPaymentNumber = calculatePaymentNumberFromDate(
            mortgageStartDate,
            lumpSum.plannedDate,
            paymentDayOfMonth,
            preferredPaymentDay
          );
        } else {
          targetPaymentNumber = lumpSum.year === 0 ? 1 : ((lumpSum.year - 1) * 12) + lumpSum.month;
        }

        if (paymentNumber === targetPaymentNumber) {
          totalLumpSumThisPayment += lumpSum.amount;
        }
      }

      principalPayment += totalLumpSumThisPayment;

      if (principalPayment > remainingBalance) {
        principalPayment = remainingBalance;
      }

      remainingBalance -= principalPayment;

      const totalPaymentAmount = interestPayment + principalPayment;

      schedule.push({
        paymentNumber,
        paymentAmount: roundToPrecision(totalPaymentAmount),
        principalPayment: roundToPrecision(principalPayment),
        interestPayment: roundToPrecision(interestPayment),
        remainingBalance: roundToPrecision(Math.max(0, remainingBalance))
      });

      paymentNumber++;

      if (remainingBalance <= 0.01) break;
    }

    return schedule;
  };

  const getInterestPaidUpToTerm = (schedule: AmortizationPayment[], targetMonths: number): number => {
    if (!Array.isArray(schedule) || targetMonths <= 0) {
      return 0;
    }

    const clampedMonths = Math.min(targetMonths, schedule.length);
    return roundToPrecision(
      schedule.slice(0, clampedMonths).reduce((sum, payment) => sum + payment.interestPayment, 0)
    );
  };

  const getRemainingBalanceAtTerm = (schedule: AmortizationPayment[], targetMonths: number): number => {
    if (!Array.isArray(schedule) || targetMonths <= 0) {
      return 0;
    }

    if (schedule.length === 0) {
      return 0;
    }

    if (schedule.length < targetMonths) {
      return 0;
    }

    const paymentIndex = Math.min(targetMonths, schedule.length) - 1;
    const payment = schedule[paymentIndex];

    return payment ? Math.max(0, roundToPrecision(payment.remainingBalance)) : 0;
  };
  const addLumpSumPayment = () => {
    // Calculate a default planned date (1 year from mortgage start)
    const startDate = new Date(inputs.mortgageStartDate || new Date().toISOString().split('T')[0]);
    const defaultPlannedDate = new Date(startDate);
    defaultPlannedDate.setFullYear(startDate.getFullYear() + 1);
    
    const newLumpSum: LumpSumPayment = {
      id: Date.now().toString(),
      amount: 0,
      plannedDate: defaultPlannedDate.toISOString().split('T')[0],
      actualDate: undefined, // This is fine as undefined since it's optional
      year: 1, // Keep for backward compatibility
      month: 1, // Keep for backward compatibility
      description: '',
      isPaid: false
    };
    setInputs(prev => ({
      ...prev,
      lumpSumPayments: [...prev.lumpSumPayments, newLumpSum]
    }));
  };

  const removeLumpSumPayment = (id: string) => {
    setInputs(prev => ({
      ...prev,
      lumpSumPayments: prev.lumpSumPayments.filter(lump => lump.id !== id)
    }));
  };

  const updateLumpSumPayment = (id: string, field: 'amount' | 'year' | 'month' | 'plannedDate' | 'actualDate' | 'description' | 'isPaid', value: number | string | boolean) => {
    setInputs(prev => ({
      ...prev,
      lumpSumPayments: prev.lumpSumPayments.map(lump => {
        if (lump.id === id) {
          const updatedLump = { ...lump, [field]: value };
          
          // If updating plannedDate, also update year/month for backward compatibility
          if (field === 'plannedDate' && typeof value === 'string') {
            const plannedDate = new Date(value);
            const mortgageStart = new Date(inputs.mortgageStartDate);
            const monthsFromStart = Math.max(1, 
              (plannedDate.getFullYear() - mortgageStart.getFullYear()) * 12 + 
              (plannedDate.getMonth() - mortgageStart.getMonth()) + 1
            );
            updatedLump.year = Math.floor((monthsFromStart - 1) / 12) + 1;
            updatedLump.month = ((monthsFromStart - 1) % 12) + 1;
          }
          
          return updatedLump;
        }
        return lump;
      })
    }));
  };

  const addRateAdjustment = () => {
    const startDate = new Date(inputs.mortgageStartDate || new Date().toISOString().split('T')[0]);
    const defaultEffectiveDate = new Date(startDate);
    defaultEffectiveDate.setFullYear(startDate.getFullYear() + 1);

    const newAdjustment: RateAdjustment = {
      id: `rate-${Date.now()}`,
      effectiveDate: defaultEffectiveDate.toISOString().split('T')[0],
      rateDelta: 0,
      description: ''
    };

    setInputs(prev => ({
      ...prev,
      rateAdjustments: [...prev.rateAdjustments, newAdjustment]
    }));
  };

  const removeRateAdjustment = (id: string) => {
    setInputs(prev => ({
      ...prev,
      rateAdjustments: prev.rateAdjustments.filter(adjustment => adjustment.id !== id)
    }));
  };

  const updateRateAdjustment = (id: string, field: 'effectiveDate' | 'rateDelta' | 'description', value: string | number) => {
    setInputs(prev => ({
      ...prev,
      rateAdjustments: prev.rateAdjustments.map(adjustment => {
        if (adjustment.id === id) {
          if (field === 'rateDelta') {
            const numericValue = typeof value === 'number' ? value : Number(value);
            return { ...adjustment, rateDelta: isNaN(numericValue) ? 0 : numericValue };
          }
          return { ...adjustment, [field]: value as string };
        }
        return adjustment;
      })
    }));
  };

  const handleSaveCalculation = async () => {
    if (!isAuthenticated) {
      alert('Please sign in to save your calculation');
      return;
    }

    if (!results) {
      alert('Please calculate results first');
      return;
    }

    const totalOriginalTermMonths = termPartsToMonths(
      inputs.mortgageTermYears,
      inputs.mortgageTermAdditionalMonths
    );

    const calculationData: MortgageData = {
      // Core mortgage values
      mortgageAmount: inputs.mortgageAmount,
      annualRate: inputs.annualRate,
      monthlyPayment: inputs.monthlyPayment,
      extraMonthlyPayment: inputs.extraMonthlyPayment,
      calculationName: calculationName.trim() || `Calculation ${new Date().toLocaleDateString()}`,
      
      // NEW: All date-based settings
      mortgageStartDate: inputs.mortgageStartDate,
      paymentDayOfMonth: inputs.paymentDayOfMonth,
      preferredPaymentDay: inputs.preferredPaymentDay,
      mortgageTermMonths: totalOriginalTermMonths,
      
      rateAdjustments: inputs.rateAdjustments.map((adjustment) => ({
        effectiveDate: adjustment.effectiveDate,
        rateDelta: adjustment.rateDelta,
        description: adjustment.description?.trim() ? adjustment.description.trim() : undefined
      })),

      // Lump sum payments with enhanced date information
      lumpSumPayments: inputs.lumpSumPayments.map((lumpSum, index) => {
        const impact = results.lumpSumImpacts.find(imp => imp.lumpSumId === lumpSum.id);
        return {
          amount: lumpSum.amount,
          year: lumpSum.year, // Keep for backward compatibility
          month: lumpSum.month, // Keep for backward compatibility
          plannedDate: lumpSum.plannedDate, // NEW: Exact planned date
          actualDate: lumpSum.actualDate, // NEW: Exact actual date
          description: lumpSum.description,
          isPaid: lumpSum.isPaid || false,
          actualPaidDate: lumpSum.actualPaidDate, // Keep for compatibility
          interestSaved: impact?.interestSaved,
          timeSaved: impact?.timeSaved
        };
      })
    };

    const savedId = await saveCalculation(calculationData);
    if (savedId) {
      setShowSaveDialog(false);
      setCalculationName('');
      alert('Calculation saved successfully!');
    }
  };

  const loadHistoricalCalculation = (calculation: MortgageData) => {
    const savedTermParts = monthsToTermParts(calculation.mortgageTermMonths ?? DEFAULT_TERM_TOTAL_MONTHS);
    let termYears = savedTermParts.years;
    let termMonths = savedTermParts.months;

    if (termYears === 0 && termMonths === 0) {
      termYears = DEFAULT_TERM_YEARS;
      termMonths = DEFAULT_TERM_ADDITIONAL_MONTHS;
    }

    if (termYears > MAX_TERM_YEARS) {
      termYears = MAX_TERM_YEARS;
      termMonths = 0;
    }

    setInputs({
      // Core mortgage values
      mortgageAmount: calculation.mortgageAmount,
      annualRate: calculation.annualRate,
      monthlyPayment: calculation.monthlyPayment,
      extraMonthlyPayment: calculation.extraMonthlyPayment,

      // Load ALL date-based settings
      mortgageStartDate: calculation.mortgageStartDate || new Date().toISOString().split('T')[0],
      paymentDayOfMonth: calculation.paymentDayOfMonth || 12,
      preferredPaymentDay: calculation.preferredPaymentDay,
      mortgageTermYears: termYears,
      mortgageTermAdditionalMonths: termMonths,

      rateAdjustments: (calculation.rateAdjustments || []).map((adjustment, index: number) => ({
        id: `${Date.now()}-rate-${index}`,
        effectiveDate: adjustment.effectiveDate,
        rateDelta: adjustment.rateDelta,
        description: adjustment.description || ''
      })),

      // Load lump sum payments with enhanced date information
      lumpSumPayments: calculation.lumpSumPayments.map((lump, index: number) => ({
        id: `${Date.now()}-${index}`,
        amount: lump.amount,
        year: lump.year,
        month: lump.month,
        plannedDate: lump.plannedDate, // Load exact planned date
        actualDate: lump.actualDate, // Load exact actual date  
        description: lump.description,
        isPaid: lump.isPaid,
        actualPaidDate: lump.actualPaidDate,
        interestSaved: lump.interestSaved,
        timeSaved: lump.timeSaved
      }))
    });
    setShowHistorical(false);
    // Trigger recalculation
    setTimeout(() => calculateResults(), 100);
  };

  const calculateIndividualLumpSumImpacts = (
    principal: number,
    monthlyPayment: number,
    annualRate: number,
    extraMonthlyPayment: number,
    lumpSumPayments: LumpSumPayment[],
    rateAdjustments: RateAdjustment[]
  ): LumpSumImpact[] => {
    const impacts: LumpSumImpact[] = [];
    const sortedLumps = [...lumpSumPayments].sort((a, b) => deriveLumpSumSortValue(a) - deriveLumpSumSortValue(b));
    
    
    // Generate baseline schedule (without any lump sums)
    const baselineSchedule = generateScheduleFromPayment(principal, monthlyPayment, annualRate, extraMonthlyPayment, [], inputs.mortgageStartDate, inputs.paymentDayOfMonth, inputs.preferredPaymentDay, rateAdjustments);
    const baselineInterest = baselineSchedule.reduce((sum, payment) => sum + payment.interestPayment, 0);
    
    // Calculate cumulative impact by adding lump sums one by one
    for (let i = 0; i < sortedLumps.length; i++) {
      const currentLumpSums = sortedLumps.slice(0, i + 1);
      const scheduleWithLumpSums = generateScheduleFromPayment(principal, monthlyPayment, annualRate, extraMonthlyPayment, currentLumpSums, inputs.mortgageStartDate, inputs.paymentDayOfMonth, inputs.preferredPaymentDay, rateAdjustments);
      const totalInterestWithLumpSums = scheduleWithLumpSums.reduce((sum, payment) => sum + payment.interestPayment, 0);
      
      // Calculate the marginal impact of this specific lump sum
      const previousLumpSums = sortedLumps.slice(0, i);
      const scheduleWithoutThisLump = generateScheduleFromPayment(principal, monthlyPayment, annualRate, extraMonthlyPayment, previousLumpSums, inputs.mortgageStartDate, inputs.paymentDayOfMonth, inputs.preferredPaymentDay, rateAdjustments);
      const interestWithoutThisLump = scheduleWithoutThisLump.reduce((sum, payment) => sum + payment.interestPayment, 0);
      
      impacts.push({
        lumpSumId: sortedLumps[i].id,
        interestSaved: interestWithoutThisLump - totalInterestWithLumpSums,
        timeSaved: scheduleWithoutThisLump.length - scheduleWithLumpSums.length,
        principalReduction: lumpSumPayments[i].amount,
        cumulativeInterestSaved: baselineInterest - totalInterestWithLumpSums
      });
    }
    
    return impacts;
  };
  
  const generateScheduleWithExtraPayments = (
    principal: number,
    annualRate: number,
    termInYears: number,
    extraMonthlyPayment: number = 0,
    lumpSumPayments: LumpSumPayment[] = [],
    mortgageStartDate?: string,
    paymentDayOfMonth?: number,
    preferredPaymentDay?: number
  ): AmortizationPayment[] => {
    const monthlyRate = annualRate / 12;
    const totalPayments = Math.ceil(termInYears * 12);
    const baseMonthlyPayment = calculateMonthlyPayment(principal, annualRate, termInYears);
    
    const schedule: AmortizationPayment[] = [];
    let remainingBalance = principal;
    let paymentNumber = 1;
    
    while (remainingBalance > 0.01 && paymentNumber <= totalPayments * 2) { // Safety limit
      const interestPayment = remainingBalance * monthlyRate;
      let principalPayment = baseMonthlyPayment - interestPayment + extraMonthlyPayment;
      
      // Apply lump sum payments if it's the right payment number
      let totalLumpSumThisPayment = 0;
      
      for (const lumpSum of lumpSumPayments) {
        let targetPaymentNumber: number;
        
        if (lumpSum.plannedDate && mortgageStartDate && paymentDayOfMonth) {
          // Use exact date calculation
          targetPaymentNumber = calculatePaymentNumberFromDate(
            mortgageStartDate,
            lumpSum.plannedDate,
            paymentDayOfMonth,
            preferredPaymentDay
          );
        } else {
          // Fallback to old year/month calculation for backward compatibility
          targetPaymentNumber = lumpSum.year === 0 ? 1 : ((lumpSum.year - 1) * 12) + lumpSum.month;
        }
        
        if (paymentNumber === targetPaymentNumber) {
          totalLumpSumThisPayment += lumpSum.amount;
        }
      }
      
      principalPayment += totalLumpSumThisPayment;
      
      // Don't pay more than remaining balance
      if (principalPayment > remainingBalance) {
        principalPayment = remainingBalance;
      }
      
      remainingBalance -= principalPayment;
      
      const totalPaymentAmount = interestPayment + principalPayment;
      
      schedule.push({
        paymentNumber,
        paymentAmount: roundToPrecision(totalPaymentAmount),
        principalPayment: roundToPrecision(principalPayment),
        interestPayment: roundToPrecision(interestPayment),
        remainingBalance: roundToPrecision(Math.max(0, remainingBalance))
      });
      
      paymentNumber++;
      
      if (remainingBalance <= 0.01) break;
    }
    
    return schedule;
  };

  const validateInputs = (): boolean => {
    const newErrors: {[key: string]: string} = {};

    const mortgageAmountValidation = validateFinancialInput(inputs.mortgageAmount, 'principal');
    if (!mortgageAmountValidation.isValid) {
      newErrors.mortgageAmount = mortgageAmountValidation.error!;
    }

    const rateValidation = validateFinancialInput(inputs.annualRate / 100, 'rate');
    if (!rateValidation.isValid) {
      newErrors.annualRate = rateValidation.error!;
    }

    if (inputs.monthlyPayment <= 0) {
      newErrors.monthlyPayment = 'Monthly payment must be greater than 0';
    }

    const monthlyInterest = (inputs.mortgageAmount * (inputs.annualRate / 100)) / 12;
    if (inputs.monthlyPayment <= monthlyInterest) {
      newErrors.monthlyPayment = `Monthly payment must be greater than $${monthlyInterest.toFixed(2)} (monthly interest)`;
    }


    if (inputs.extraMonthlyPayment < 0) {
      newErrors.extraMonthlyPayment = 'Extra payment cannot be negative';
    }

    // Validate lump sum payments
    inputs.lumpSumPayments.forEach((lumpSum, index) => {
      if (lumpSum.amount < 0) {
        newErrors[`lumpSum_${lumpSum.id}_amount`] = 'Lump sum amount cannot be negative';
      }
      if (lumpSum.amount > 0 && (lumpSum.year < 0 || lumpSum.year > 50)) {
        newErrors[`lumpSum_${lumpSum.id}_year`] = 'Lump sum year must be between 0 and 50 (0 = immediate payment)';
      }
      if (lumpSum.year > 0 && (lumpSum.month < 1 || lumpSum.month > 12)) {
        newErrors[`lumpSum_${lumpSum.id}_month`] = 'Month must be between 1 and 12';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const calculateResults = () => {
    if (!validateInputs()) return;
    
    setNeedsRecalculation(false);

    const loanAmount = inputs.mortgageAmount;
    const annualRateDecimal = inputs.annualRate / 100;
    
    // All of the monthly payment goes to principal & interest
    const monthlyPrincipalInterest = inputs.monthlyPayment;
    
    // Calculate term from payment
    const termCalculation = calculateTermFromPayment(loanAmount, monthlyPrincipalInterest, annualRateDecimal);
    
    if (termCalculation.years >= 999) {
      setErrors(prev => ({ ...prev, monthlyPayment: 'Payment too low - loan will never be paid off' }));
      return;
    }
    
    // Generate standard schedule (no extra payments)
    const standardSchedule = generateScheduleFromPayment(loanAmount, monthlyPrincipalInterest, annualRateDecimal, 0, [], inputs.mortgageStartDate, inputs.paymentDayOfMonth, inputs.preferredPaymentDay, inputs.rateAdjustments);
    const standardTotalInterest = standardSchedule.reduce((sum, payment) => sum + payment.interestPayment, 0);

    const baselineSchedule = generateScheduleFromPayment(
      loanAmount,
      monthlyPrincipalInterest,
      annualRateDecimal,
      0,
      [],
      inputs.mortgageStartDate,
      inputs.paymentDayOfMonth,
      inputs.preferredPaymentDay,
      []
    );

    const baselineTotalInterest = roundToPrecision(
      baselineSchedule.reduce((sum, payment) => sum + payment.interestPayment, 0),
      2
    );
    const baselineTotalPaid = roundToPrecision(
      baselineSchedule.reduce((sum, payment) => sum + payment.paymentAmount, 0),
      2
    );
    const baselineScheduleLength = baselineSchedule.length;

    // Generate schedule with extra payments
    const schedule = generateScheduleFromPayment(
      loanAmount, 
      monthlyPrincipalInterest,
      annualRateDecimal,
      inputs.extraMonthlyPayment,
      sortedLumpSums,
      inputs.mortgageStartDate,
      inputs.paymentDayOfMonth,
      inputs.preferredPaymentDay,
      inputs.rateAdjustments
    );
    
    const totalInterest = schedule.reduce((sum, payment) => sum + payment.interestPayment, 0);
    const interestSaved = standardTotalInterest - totalInterest;
    const interestSavedVsBaseline = baselineTotalInterest - totalInterest;
    const actualPayoffYear = Math.ceil(schedule.length / 12);
    const standardPayoffYear = Math.ceil(standardSchedule.length / 12);
    
    // Calculate time saved based on actual payment difference (more accurate)
    const paymentDifference = standardSchedule.length - schedule.length;
    const yearsReduced = paymentDifference / 12;
    
    const totalMonthlyPayment = inputs.monthlyPayment + inputs.extraMonthlyPayment;

    const standardTotalPaid = roundToPrecision(
      standardSchedule.reduce((sum, payment) => sum + payment.paymentAmount, 0),
      2
    );

    const totalPaid = roundToPrecision(
      schedule.reduce((sum, payment) => sum + payment.paymentAmount, 0),
      2
    );
    
    const originalTermMonths = termPartsToMonths(
      inputs.mortgageTermYears,
      inputs.mortgageTermAdditionalMonths
    );

    const baselineRemainingBalanceAtOriginalTerm = originalTermMonths > 0
      ? getRemainingBalanceAtTerm(baselineSchedule, originalTermMonths)
      : null;

    const remainingBalanceAtOriginalTerm = originalTermMonths > 0
      ? getRemainingBalanceAtTerm(schedule, originalTermMonths)
      : null;

    const standardRemainingBalanceAtOriginalTerm = originalTermMonths > 0
      ? getRemainingBalanceAtTerm(standardSchedule, originalTermMonths)
      : null;

    const interestPaidAtOriginalTerm = originalTermMonths > 0
      ? getInterestPaidUpToTerm(schedule, originalTermMonths)
      : null;

    const standardInterestPaidAtOriginalTerm = originalTermMonths > 0
      ? getInterestPaidUpToTerm(standardSchedule, originalTermMonths)
      : null;

    const interestSavedAtOriginalTerm =
      interestPaidAtOriginalTerm !== null && standardInterestPaidAtOriginalTerm !== null
        ? roundToPrecision(standardInterestPaidAtOriginalTerm - interestPaidAtOriginalTerm)
        : null;

    // Calculate individual lump sum impacts
    const lumpSumImpacts = calculateIndividualLumpSumImpacts(
      loanAmount,
      monthlyPrincipalInterest,
      annualRateDecimal,
      inputs.extraMonthlyPayment,
      sortedLumpSums,
      inputs.rateAdjustments
    );

    setResults({
      loanAmount,
      monthlyPrincipalInterest,
      totalMonthlyPayment,
      totalPaid,
      standardTotalPaid,
      totalInterest,
      schedule,
      standardSchedule,
      yearsReduced,
      interestSaved,
      interestSavedVsBaseline,
      interestSavedAtOriginalTerm,
      baselineTotalInterest,
      baselineTotalPaid,
      baselineScheduleLength,
      actualPayoffYear,
      calculatedTermInYears: termCalculation.years,
      calculatedTermInMonths: termCalculation.months,
      lumpSumImpacts,
      remainingBalanceAtOriginalTerm,
      standardRemainingBalanceAtOriginalTerm,
      baselineRemainingBalanceAtOriginalTerm
    });
  };

  const handleInputChange = (field: keyof MortgageInputs, value: number | string | undefined) => {
    // Ensure controlled inputs never get undefined values
    let safeValue = value;
    
    // Handle specific field defaults
    if (field === 'mortgageStartDate' && (value === undefined || value === '')) {
      safeValue = new Date().toISOString().split('T')[0];
    }
    if (field === 'paymentDayOfMonth' && (value === undefined || value === '' || isNaN(Number(value)))) {
      safeValue = 1;
    }
    if (field === 'preferredPaymentDay' && value === '') {
      safeValue = undefined; // This is intentionally undefined for optional field
    }
    
    // Handle numeric fields
    if (['mortgageAmount', 'annualRate', 'monthlyPayment', 'extraMonthlyPayment'].includes(field) && (value === undefined || value === '' || isNaN(Number(value)))) {
      safeValue = 0;
    }
    
    setInputs(prev => ({ ...prev, [field]: safeValue }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };


  const handleTermFieldChange = (
    field: 'mortgageTermYears' | 'mortgageTermAdditionalMonths',
    rawValue: string
  ) => {
    const numericValue = Number(rawValue);
    const sanitizedValue = Number.isFinite(numericValue) ? Math.max(0, Math.floor(numericValue)) : 0;

    setInputs(prev => {
      const nextYears = field === 'mortgageTermYears'
        ? Math.min(MAX_TERM_YEARS, sanitizedValue)
        : prev.mortgageTermYears;
      const nextMonthsRaw = field === 'mortgageTermAdditionalMonths'
        ? sanitizedValue
        : prev.mortgageTermAdditionalMonths;
      let normalized = normalizeTermParts(nextYears, nextMonthsRaw);
      if (normalized.years > MAX_TERM_YEARS) {
        normalized = { years: MAX_TERM_YEARS, months: 0 };
      }
      return {
        ...prev,
        mortgageTermYears: normalized.years,
        mortgageTermAdditionalMonths: normalized.months,
      };
    });

    if (errors.mortgageTerm) {
      setErrors(prev => ({ ...prev, mortgageTerm: '' }));
    }
  };

  const getYearlySummary = (schedule: AmortizationPayment[]) => {
    const yearlySummary = [];
    const paymentsPerYear = 12;
    const actualYears = Math.ceil(schedule.length / 12);
    
    for (let year = 1; year <= actualYears; year++) {
      const startPayment = (year - 1) * paymentsPerYear;
      const endPayment = Math.min(year * paymentsPerYear, schedule.length);
      
      const yearPayments = schedule.slice(startPayment, endPayment);
      if (yearPayments.length === 0) break;
      
      const totalPrincipal = yearPayments.reduce((sum, payment) => sum + payment.principalPayment, 0);
      const totalInterest = yearPayments.reduce((sum, payment) => sum + payment.interestPayment, 0);
      const endingBalance = yearPayments[yearPayments.length - 1]?.remainingBalance || 0;
      
      yearlySummary.push({
        year,
        totalPrincipal: roundToPrecision(totalPrincipal),
        totalInterest: roundToPrecision(totalInterest),
        endingBalance: roundToPrecision(endingBalance)
      });
    }
    
    return yearlySummary;
  };

  const renderRateAdjustmentImpact = () => {
    if (!results?.rateAdjustmentImpact || inputs.rateAdjustments.length === 0) {
      return null;
    }

    const {
      interestWithAdjustments,
      interestWithoutAdjustments,
      interestDifference,
      termWithAdjustments,
      termWithoutAdjustments,
      termDifferenceMonths
    } = results.rateAdjustmentImpact;

    const interestClass = interestDifference >= 0 ? 'text-green-600' : 'text-red-600';
    const interestVerb = interestDifference >= 0 ? 'saved' : 'added';

    const hasTermChange = Math.abs(termDifferenceMonths) > 0;
    const termClass = termDifferenceMonths >= 0 ? 'text-green-600' : 'text-red-600';
    const termVerb = termDifferenceMonths >= 0 ? 'sooner' : 'later';
    const termDeltaLabel = hasTermChange ? formatYearsAndMonths(Math.abs(termDifferenceMonths) / 12) : 'No change';
    const termPaymentsCount = Math.abs(termDifferenceMonths);
    const termPaymentsLabel = hasTermChange
      ? `${termPaymentsCount} ${termPaymentsCount === 1 ? 'payment' : 'payments'} ${termDifferenceMonths >= 0 ? 'fewer' : 'additional'}`
      : 'Timeline unchanged';

    return (
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-300">
        <h4 className="text-lg font-semibold text-blue-800 mb-3">Rate Change Impact</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="bg-white border border-blue-200 rounded-md p-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Without rate changes</p>
            <p className="text-base font-semibold text-gray-800">{'$' + interestWithoutAdjustments.toLocaleString()}</p>
            <p className="text-xs text-gray-500">Total interest keeping the original rate</p>
          </div>
          <div className="bg-white border border-blue-200 rounded-md p-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide">With planned changes</p>
            <p className="text-base font-semibold text-gray-800">{'$' + interestWithAdjustments.toLocaleString()}</p>
            <p className="text-xs text-gray-500">Interest cost after applied rate changes</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Interest impact</p>
            <p className={`${interestClass} text-lg font-semibold`}>{'$' + Math.abs(interestDifference).toLocaleString()} {interestVerb}</p>
            <p className="text-xs text-gray-500">Compared with leaving the rate unchanged</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Timeline impact</p>
            <p className={`${termClass} text-lg font-semibold`}>{hasTermChange ? `${termDeltaLabel} ${termVerb}` : 'No timeline change'}</p>
            <p className="text-xs text-gray-500">{hasTermChange ? termPaymentsLabel : 'Timeline unchanged'}</p>
          </div>
        </div>
      </div>
    );
  };


  const originalTermMonths = termPartsToMonths(
    inputs.mortgageTermYears,
    inputs.mortgageTermAdditionalMonths
  );
  const originalTermLabel = originalTermMonths > 0
    ? formatYearsAndMonths(originalTermMonths / 12)
    : 'Not set';
  const balanceAtOriginalTerm = results?.remainingBalanceAtOriginalTerm ?? null;
  const standardBalanceAtOriginalTerm = results?.standardRemainingBalanceAtOriginalTerm ?? null;
  const baselineBalanceAtOriginalTerm = results?.baselineRemainingBalanceAtOriginalTerm ?? null;
  const scheduleLength = results?.schedule.length ?? Number.MAX_SAFE_INTEGER;
  const standardScheduleLength = results?.standardSchedule.length ?? Number.MAX_SAFE_INTEGER;
  const loanPaidOffBeforeOriginalTerm =
    originalTermMonths > 0 &&
    scheduleLength <= originalTermMonths &&
    (results?.remainingBalanceAtOriginalTerm ?? 0) === 0;
  const standardLoanPaidOffBeforeOriginalTerm =
    originalTermMonths > 0 &&
    standardScheduleLength <= originalTermMonths &&
    (results?.standardRemainingBalanceAtOriginalTerm ?? 0) === 0;
  const baselineLoanPaidOffBeforeOriginalTerm =
    originalTermMonths > 0 &&
    (baselineBalanceAtOriginalTerm ?? 0) === 0;
  const balanceDifferenceVsStandard =
    balanceAtOriginalTerm !== null && standardBalanceAtOriginalTerm !== null
      ? standardBalanceAtOriginalTerm - balanceAtOriginalTerm
      : null;
  const balanceDifferenceVsBaseline =
    balanceAtOriginalTerm !== null && baselineBalanceAtOriginalTerm !== null
      ? baselineBalanceAtOriginalTerm - balanceAtOriginalTerm
      : null;

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <h2 className="text-3xl font-bold text-gray-900 mb-6">Mortgage Payment Calculator</h2>
      <p className="text-gray-600 mb-8">
        Work backwards from your budget! Enter your loan amount, interest rate, and desired monthly payment to discover 
        how long your mortgage will take to pay off and your total interest cost. Ideal for budget-conscious buyers who 
        want to control their monthly payment amount and understand the true cost over time.
      </p>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mortgage Amount ($)
            </label>
            <input
              type="number"
              value={inputs.mortgageAmount || 0}
              onChange={(e) => {
                const numValue = Number(e.target.value);
                handleInputChange('mortgageAmount', isNaN(numValue) ? 0 : numValue);
              }}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                errors.mortgageAmount ? 'border-red-300' : 'border-gray-300'
              }`}
              min="0"
              step="1000"
              placeholder="Enter loan amount"
            />
            {errors.mortgageAmount && (
              <p className="text-red-600 text-sm mt-1">{errors.mortgageAmount}</p>
            )}
            <p className="text-sm text-gray-600 mt-1">
              The total amount you're financing
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Interest Rate (%)
            </label>
            <input
              type="number"
              value={inputs.annualRate || 0}
              onChange={(e) => {
                const numValue = Number(e.target.value);
                handleInputChange('annualRate', isNaN(numValue) ? 0 : numValue);
              }}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                errors.annualRate ? 'border-red-300' : 'border-gray-300'
              }`}
              min="0"
              max="20"
              step="0.01"
              placeholder="Enter interest rate"
            />
            {errors.annualRate && (
              <p className="text-red-600 text-sm mt-1">{errors.annualRate}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mortgage Start Date
            </label>
            <input
              type="date"
              value={inputs.mortgageStartDate || new Date().toISOString().split('T')[0]}
              onChange={(e) => handleInputChange('mortgageStartDate', e.target.value || new Date().toISOString().split('T')[0])}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
            <p className="text-sm text-gray-600 mt-1">
              The date your mortgage began or will begin
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Day of Month
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <select
                  value={inputs.paymentDayOfMonth || 1}
                  onChange={(e) => {
                    const numValue = Number(e.target.value);
                    handleInputChange('paymentDayOfMonth', isNaN(numValue) ? 1 : numValue);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Safe day (1-28)</p>
              </div>
              <div>
                <select
                  value={inputs.preferredPaymentDay?.toString() || ''}
                  onChange={(e) => handleInputChange('preferredPaymentDay', e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="">None</option>
                  <option value="29">29th</option>
                  <option value="30">30th</option>
                  <option value="31">31st (End of Month)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Month-end preference</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Choose your monthly payment date. Month-end options fall back to the safe day when needed.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Monthly Payment ($)
            </label>
            <input
              type="number"
              value={inputs.monthlyPayment || 0}
              onChange={(e) => {
                const numValue = Number(e.target.value);
                handleInputChange('monthlyPayment', isNaN(numValue) ? 0 : numValue);
              }}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                errors.monthlyPayment ? 'border-red-300' : 'border-gray-300'
              }`}
              min="0"
              step="50"
              placeholder="Enter your desired monthly payment"
            />
            {errors.monthlyPayment && (
              <p className="text-red-600 text-sm mt-1">{errors.monthlyPayment}</p>
            )}
            <p className="text-sm text-gray-600 mt-1">
              This is your total monthly payment (principal and interest only)
            </p>
          </div>


          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Original Mortgage Term
            </label>
            <div className="flex gap-4">
              <div className="flex-1">
                <input
                  type="number"
                  value={inputs.mortgageTermYears}
                  onChange={(e) => handleTermFieldChange('mortgageTermYears', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${errors.mortgageTerm ? 'border-red-300' : 'border-gray-300'}`}
                  min="0"
                  max={MAX_TERM_YEARS}
                  step="1"
                />
                <p className="text-xs text-gray-500 mt-1">Years</p>
              </div>
              <div className="flex-1">
                <input
                  type="number"
                  value={inputs.mortgageTermAdditionalMonths}
                  onChange={(e) => handleTermFieldChange('mortgageTermAdditionalMonths', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${errors.mortgageTerm ? 'border-red-300' : 'border-gray-300'}`}
                  min="0"
                  max="11"
                  step="1"
                />
                <p className="text-xs text-gray-500 mt-1">Months</p>
              </div>
            </div>
            {errors.mortgageTerm && (
              <p className="text-red-600 text-sm mt-1">{errors.mortgageTerm}</p>
            )}
            <p className="text-sm text-gray-600 mt-1">
              Track your Canadian-style amortization to compare against the payoff timeline.
            </p>
          </div>

          <div className="border-t pt-4">
            <h4 className="text-lg font-semibold text-gray-700 mb-3">Extra Payments</h4>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Extra Monthly Payment ($)
                </label>
                <input
                  type="number"
                  value={inputs.extraMonthlyPayment || 0}
                  onChange={(e) => {
                    const numValue = Number(e.target.value);
                    handleInputChange('extraMonthlyPayment', isNaN(numValue) ? 0 : numValue);
                  }}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                    errors.extraMonthlyPayment ? 'border-red-300' : 'border-gray-300'
                  }`}
                  min="0"
                  step="50"
                  placeholder="Enter extra monthly payment"
                />
                {errors.extraMonthlyPayment && (
                  <p className="text-red-600 text-sm mt-1">{errors.extraMonthlyPayment}</p>
                )}
                <p className="text-sm text-gray-600 mt-1">
                  Additional amount paid toward principal each month
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Lump Sum Payments
                  </label>
                  <button
                    type="button"
                    onClick={addLumpSumPayment}
                    className="px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 transition-colors"
                  >
                    + Add Lump Sum
                  </button>
                </div>
                
                {inputs.lumpSumPayments.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No lump sum payments added yet. Click "Add Lump Sum" to add one.</p>
                ) : (
                  <div className="space-y-3">
                    {inputs.lumpSumPayments.map((lumpSum, index) => (
                      <div key={lumpSum.id} className="p-3 bg-gray-50 rounded-md border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">Lump Sum #{index + 1}</span>
                          <button
                            type="button"
                            onClick={() => removeLumpSumPayment(lumpSum.id)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Description (optional)
                            </label>
                            <input
                              type="text"
                              value={lumpSum.description || ''}
                              onChange={(e) => updateLumpSumPayment(lumpSum.id, 'description', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                              placeholder="e.g., Tax refund, bonus, inheritance"
                            />
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Amount ($)
                              </label>
                              <input
                                type="number"
                                value={lumpSum.amount || 0}
                                onChange={(e) => {
                                  const numValue = Number(e.target.value);
                                  updateLumpSumPayment(lumpSum.id, 'amount', isNaN(numValue) ? 0 : numValue);
                                }}
                                className={`w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                                  errors[`lumpSum_${lumpSum.id}_amount`] ? 'border-red-300' : 'border-gray-300'
                                }`}
                                min="0"
                                step="1000"
                                placeholder="Amount"
                              />
                              {errors[`lumpSum_${lumpSum.id}_amount`] && (
                                <p className="text-red-600 text-xs mt-1">{errors[`lumpSum_${lumpSum.id}_amount`]}</p>
                              )}
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Planned Payment Date
                              </label>
                              <input
                                type="date"
                                value={lumpSum.plannedDate || new Date().toISOString().split('T')[0]}
                                onChange={(e) => updateLumpSumPayment(lumpSum.id, 'plannedDate', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                min={inputs.mortgageStartDate}
                              />
                            </div>
                            
                            {lumpSum.isPaid && (
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                  Actual Payment Date
                                </label>
                                <input
                                  type="date"
                                  value={lumpSum.actualDate || lumpSum.plannedDate}
                                  onChange={(e) => updateLumpSumPayment(lumpSum.id, 'actualDate', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                />
                              </div>
                            )}
                            
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                id={`paid-${lumpSum.id}`}
                                checked={lumpSum.isPaid || false}
                                onChange={(e) => updateLumpSumPayment(lumpSum.id, 'isPaid', e.target.checked)}
                                className="h-3 w-3 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                              />
                              <label htmlFor={`paid-${lumpSum.id}`} className="ml-2 block text-xs text-gray-600">
                                Mark as paid
                              </label>
                            </div>
                          </div>
                          
                          <div className="text-xs text-gray-500 mt-2">
                            Planned for: {lumpSum.plannedDate ? new Date(lumpSum.plannedDate).toLocaleDateString() : `Year ${lumpSum.year}, Month ${lumpSum.month}`}
                            {lumpSum.isPaid && lumpSum.actualDate && (
                              <span className="block text-green-600 mt-1">
                                ✓ Paid on: {new Date(lumpSum.actualDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Rate Changes
                  </label>
                  <button
                    type="button"
                    onClick={addRateAdjustment}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                  >
                    + Add Rate Change
                  </button>
                </div>

                {inputs.rateAdjustments.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No rate changes added yet. Add one to explore adjustable scenarios.</p>
                ) : (
                  <div className="space-y-3">
                    {inputs.rateAdjustments.map((adjustment, index) => (
                      <div key={adjustment.id} className="p-3 bg-gray-50 rounded-md border border-gray-200">
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">Rate Change #{index + 1}</span>
                          <button
                            type="button"
                            onClick={() => removeRateAdjustment(adjustment.id)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Effective Date
                            </label>
                            <input
                              type="date"
                              value={adjustment.effectiveDate}
                              onChange={(e) => updateRateAdjustment(adjustment.id, 'effectiveDate', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                              min={inputs.mortgageStartDate}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Rate Change (%)
                            </label>
                            <input
                              type="number"
                              value={adjustment.rateDelta}
                              onChange={(e) => updateRateAdjustment(adjustment.id, 'rateDelta', Number(e.target.value))}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                              step="0.05"
                              min="-5"
                              max="5"
                              list={`rate-delta-options-${adjustment.id}`}
                            />
                            <datalist id={`rate-delta-options-${adjustment.id}`}>
                              {RATE_ADJUSTMENT_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                              ))}
                            </datalist>
                            <p className="text-xs text-gray-500 mt-1">Positive raises the rate, negative lowers it.</p>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Notes (optional)
                            </label>
                            <input
                              type="text"
                              value={adjustment.description || ''}
                              onChange={(e) => updateRateAdjustment(adjustment.id, 'description', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                              placeholder="e.g., Renewal, ARM reset"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>

          <button
            onClick={calculateResults}
            className={`w-full text-white py-3 px-6 rounded-md transition-colors font-semibold shadow-md ${
              needsRecalculation 
                ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
                : 'bg-orange-600 hover:bg-orange-700'
            }`}
          >
            {needsRecalculation ? 'Recalculate Required' : 'Calculate Mortgage Payment'}
          </button>

          {/* Authentication and Data Management */}
          <div className="space-y-3">
            {status === 'loading' ? (
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
                <p className="text-gray-600 text-sm">Loading authentication...</p>
              </div>
            ) : !isAuthenticated ? (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 text-center">
                <p className="text-blue-800 text-sm mb-2">
                  Sign in to save your calculations and track lump sum payments
                </p>
                <a 
                  href="/auth/signin"
                  className="inline-block bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition-colors"
                >
                  Sign In / Create Account
                </a>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2">
                  {results && (
                    <button
                      onClick={() => setShowSaveDialog(true)}
                      className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
                      disabled={isSavingData}
                    >
                      {isSavingData ? 'Saving...' : 'Save Calculation'}
                    </button>
                  )}
                  <button
                    onClick={() => setShowHistorical(true)}
                    className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors text-sm font-medium"
                  >
                    View Saved ({savedCalculations.length})
                  </button>
                </div>
                <div className="text-xs text-gray-600 text-center">
                  Signed in as {session?.user?.email}
                </div>
              </div>
            )}
            
            {dataError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
                {dataError}
              </div>
            )}
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Formula Used:</h4>
            <div className="text-sm text-gray-600">
              M = P × [r(1+r)<sup>n</sup>] / [(1+r)<sup>n</sup> - 1]
              <br />
              <span className="text-xs">
                Where: M = monthly payment, P = loan principal, r = monthly rate, n = total payments
              </span>
            </div>
          </div>
        </div>

        {results && (
          <div className="bg-orange-50 p-6 rounded-lg border border-orange-200">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Mortgage Analysis</h3>
            
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-300">
                <h4 className="text-lg font-semibold text-blue-800 mb-3">Calculated Loan Term</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {results.calculatedTermInYears}
                    </div>
                    <div className="text-sm text-blue-700">Years</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {results.calculatedTermInMonths}
                    </div>
                    <div className="text-sm text-blue-700">Months</div>
                  </div>
                </div>
                <div className="text-center mt-3 pt-3 border-t border-blue-200">
                  <div className="text-lg font-medium text-blue-800">
                    Total: {(results.calculatedTermInYears + (results.calculatedTermInMonths / 12)).toFixed(2)} years
                  </div>
                  <div className="text-sm text-blue-600">
                    ({results.standardSchedule.length} total payments)
                  </div>
                </div>
                <p className="text-sm text-blue-600 mt-3">
                  Original amortization: {originalTermLabel}
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-orange-300">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-700">Loan Amount:</span>
                  <span className="font-semibold text-lg text-gray-900">
                    ${results.loanAmount.toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Principal amount being financed
                </p>
              </div>

              <div className="bg-white p-4 rounded-lg border border-blue-300">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-700">Monthly Payment (P&I):</span>
                  <span className="font-semibold text-lg text-blue-600">
                    ${results.monthlyPrincipalInterest.toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Principal and Interest only
                </p>
              </div>

              <div className="bg-white p-4 rounded-lg border border-orange-400 border-2">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-lg font-semibold text-gray-700">Total Monthly Payment:</span>
                  <span className="font-bold text-2xl text-orange-600">
                    ${results.totalMonthlyPayment.toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Principal + Interest{inputs.extraMonthlyPayment > 0 ? ' + Extra Payment' : ''}
                </p>
                {inputs.extraMonthlyPayment > 0 && (
                  <p className="text-xs text-green-600 mt-1">
                    Includes ${inputs.extraMonthlyPayment.toLocaleString()} extra monthly payment
                  </p>
                )}
              </div>

              <div className="bg-white p-4 rounded-lg border border-red-300">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-700">Total Interest Paid:</span>
                  <span className="font-semibold text-2xl text-red-600">
                    ${results.totalInterest.toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Over {formatYearsAndMonths(results.schedule.length / 12)}
                </p>
                {(inputs.extraMonthlyPayment > 0 || sortedLumpSums.length > 0) && (
                  <div className="mt-2 pt-2 border-t border-red-200">
                    <p className="text-xs text-green-600">
                      Interest saved: ${results.interestSaved.toLocaleString()}
                    </p>
                    <p className="text-xs text-green-600">
                      Time saved: {formatYearsAndMonths(results.yearsReduced)}
                    </p>
                  </div>
                )}
              </div>
              <div className="bg-white p-4 rounded-lg border border-teal-300">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-700">Balance At Original Term</span>
                  <span className="text-sm text-teal-700">{originalTermLabel}</span>
                </div>
                {originalTermMonths > 0 ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">With current plan</span>
                      <span className="text-lg font-semibold text-teal-700">${Math.max(0, (balanceAtOriginalTerm ?? 0)).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Standard schedule (rate changes, no prepayments)</span>
                      <span className="font-medium text-gray-900">${Math.max(0, (standardBalanceAtOriginalTerm ?? 0)).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Baseline (no rate changes, no prepayments)</span>
                      <span className="font-medium text-gray-900">${Math.max(0, (baselineBalanceAtOriginalTerm ?? 0)).toLocaleString()}</span>
                    </div>
                    {balanceDifferenceVsStandard !== null && Math.abs(balanceDifferenceVsStandard) > 0.5 && (
                      <p className={`text-xs ${balanceDifferenceVsStandard > 0 ? 'text-green-600' : 'text-orange-600'}`}>
                        {balanceDifferenceVsStandard > 0
                          ? `You reduce the balance by $${Math.abs(balanceDifferenceVsStandard).toLocaleString()} compared to the standard schedule.`
                          : `You would owe $${Math.abs(balanceDifferenceVsStandard).toLocaleString()} more compared to the standard schedule.`}
                      </p>
                    )}
                    {balanceDifferenceVsBaseline !== null && Math.abs(balanceDifferenceVsBaseline) > 0.5 && (
                      <p className={`text-xs ${balanceDifferenceVsBaseline > 0 ? 'text-green-600' : 'text-orange-600'}`}>
                        {balanceDifferenceVsBaseline > 0
                          ? `You are ahead by $${Math.abs(balanceDifferenceVsBaseline).toLocaleString()} versus the no-prepayment/no-rate-change scenario.`
                          : `You would owe $${Math.abs(balanceDifferenceVsBaseline).toLocaleString()} more than the no-prepayment/no-rate-change scenario.`}
                      </p>
                    )}
                    {loanPaidOffBeforeOriginalTerm ? (
                      <p className="text-xs text-green-600">You are scheduled to be mortgage-free before the original term ends.</p>
                    ) : (
                      <p className="text-xs text-gray-500">Any remaining balance at the original term would need to be renewed or paid in a lump sum.</p>
                    )}
                    {standardLoanPaidOffBeforeOriginalTerm && !loanPaidOffBeforeOriginalTerm && (
                      <p className="text-xs text-purple-600">The standard schedule would finish before the original term.</p>
                    )}
                    {baselineLoanPaidOffBeforeOriginalTerm && !loanPaidOffBeforeOriginalTerm && (
                      <p className="text-xs text-blue-600">Even without rate changes or prepayments, the mortgage would be paid off by the original term.</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Set an original mortgage term to see the projected balance.</p>
                )}
              </div>
            </div>

            {renderRateAdjustmentImpact()}

            {(inputs.extraMonthlyPayment > 0 || sortedLumpSums.length > 0) && (
              <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="text-lg font-semibold text-green-800 mb-3">Extra Payment Impact</h4>
                {sortedLumpSums.length > 0 && (
                  <div className="mb-4 p-3 bg-white rounded border border-green-300">
                    <h5 className="text-sm font-semibold text-green-700 mb-3">Individual Lump Sum Impact Analysis:</h5>
                    <div className="space-y-3">
                      {sortedLumpSums.map((lumpSum, index) => {
                        const impact = results.lumpSumImpacts.find(imp => imp.lumpSumId === lumpSum.id);
                        const scheduleLabel = formatLumpSumScheduleLabel(lumpSum);
                        return (
                          <div key={lumpSum.id} className="p-2 bg-gray-50 rounded border border-gray-200">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <div className="font-medium text-gray-800">
                                  Extra payment on {scheduleLabel}{lumpSum.description ? ` - ${lumpSum.description}` : ''}
                                </div>
                                <div className="text-xs text-gray-600">
                                  Amount: ${lumpSum.amount.toLocaleString()}
                                </div>
                              </div>
                              <div className="text-right text-xs">
                                {impact ? (
                                  <>
                                    <div className="text-green-600 font-medium">
                                      Interest saved ${impact.interestSaved.toLocaleString()}
                                    </div>
                                    <div className="text-green-600">
                                      {Math.floor(impact.timeSaved / 12)}y {impact.timeSaved % 12}m saved
                                    </div>
                                  </>
                                ) : (
                                  <div className="text-gray-500">No savings calculated yet</div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div className="pt-2 border-t border-green-200">
                        <div className="flex justify-between items-center font-semibold text-sm">
                          <span>Total Impact:</span>
                          <div className="text-right">
                            <div className="text-green-600">
                              Lifetime interest saved ${results.interestSaved.toLocaleString()}
                            </div>
                            {typeof results.interestSavedAtOriginalTerm === 'number' && (
                              <div className="text-green-600">
                                Interest saved by original term ${results.interestSavedAtOriginalTerm.toLocaleString()}
                              </div>
                            )}
                            {balanceDifferenceVsStandard !== null && (
                              <div className="text-green-600">
                                Balance reduced at original term ${balanceDifferenceVsStandard.toLocaleString()}
                              </div>
                            )}
                            {typeof results.interestSavedVsBaseline === 'number' && (
                              <div className="text-green-600 text-xs">
                                Vs. constant rate (lifetime): ${results.interestSavedVsBaseline.toLocaleString()}
                              </div>
                            )}
                            <div className="text-xs text-gray-500">
                              Total extra paid ${sortedLumpSums.reduce((sum, lump) => sum + lump.amount, 0).toLocaleString()}
                            </div>
                            <div className="text-green-600 text-xs">
                              {formatYearsAndMonths(results.yearsReduced)} early payoff
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="font-medium text-gray-700 mb-2">Standard Mortgage:</div>
                    <div className="space-y-1">
                      <div>Payoff time: {formatYearsAndMonths(results.standardSchedule.length / 12)}</div>
                      <div>Total interest: ${(results.standardSchedule.reduce((sum, p) => sum + p.interestPayment, 0)).toLocaleString()}</div>
                      <div>Total paid: ${results.standardTotalPaid.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">Payments: {results.standardSchedule.length}</div>
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-700 mb-2">With Extra Payments:</div>
                    <div className="space-y-1">
                      <div className="text-green-600">Payoff time: {formatYearsAndMonths(results.schedule.length / 12)}</div>
                      <div className="text-green-600">Total interest: ${results.totalInterest.toLocaleString()}</div>
                      <div className="text-green-600">Total paid: ${results.totalPaid.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">Payments: {results.schedule.length}</div>
                    </div>
                  </div>
                  {typeof results.baselineTotalInterest === 'number' && typeof results.baselineTotalPaid === 'number' && typeof results.baselineScheduleLength === 'number' && (
                    <div>
                      <div className="font-medium text-gray-700 mb-2">Constant Rate (No Extras):</div>
                      <div className="space-y-1">
                        <div>Payoff time: {formatYearsAndMonths((results.baselineScheduleLength || 0) / 12)}</div>
                        <div>Total interest: ${results.baselineTotalInterest.toLocaleString()}</div>
                        <div>Total paid: ${results.baselineTotalPaid.toLocaleString()}</div>
                        <div className="text-xs text-gray-500">Payments: {results.baselineScheduleLength}</div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t border-green-300">
                  <div className="text-center">
                    <span className="text-lg font-bold text-green-600">
                      Lifetime savings: ${results.interestSaved.toLocaleString()} in interest with an early payoff of {formatYearsAndMonths(results.yearsReduced)}.
                    </span>
                    {typeof results.interestSavedAtOriginalTerm === 'number' && (
                      <span className="block text-sm text-green-700 mt-1">
                        Interest saved by original term: ${results.interestSavedAtOriginalTerm.toLocaleString()}.
                      </span>
                    )}
                    {balanceDifferenceVsStandard !== null && (
                      <span className="block text-sm text-green-700">
                        Balance reduced at original term: ${balanceDifferenceVsStandard.toLocaleString()}.
                      </span>
                    )}
                    {typeof results.interestSavedVsBaseline === 'number' && (
                      <span className="block text-xs text-green-700 mt-1">
                        Without rate changes, the lifetime interest savings would be ${results.interestSavedVsBaseline.toLocaleString()}.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Payment Schedule View:</h4>
              <div className="flex space-x-2 mb-4">
                <button
                  onClick={() => setScheduleView('summary')}
                  className={`px-3 py-1 text-sm rounded ${
                    scheduleView === 'summary' 
                      ? 'bg-orange-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Summary
                </button>
                <button
                  onClick={() => setScheduleView('yearly')}
                  className={`px-3 py-1 text-sm rounded ${
                    scheduleView === 'yearly' 
                      ? 'bg-orange-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Yearly
                </button>
                <button
                  onClick={() => setScheduleView('full')}
                  className={`px-3 py-1 text-sm rounded ${
                    scheduleView === 'full' 
                      ? 'bg-orange-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Full Schedule
                </button>
              </div>

              {scheduleView === 'summary' && (
                <div className="bg-white p-4 rounded-lg border border-gray-300">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-medium text-gray-700">First Payment:</div>
                      <div className="text-orange-600">
                        Principal: ${results.schedule[0]?.principalPayment.toFixed(2)}
                      </div>
                      <div className="text-red-600">
                        Interest: ${results.schedule[0]?.interestPayment.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-gray-700">Last Payment:</div>
                      <div className="text-orange-600">
                        Principal: ${results.schedule[results.schedule.length - 1]?.principalPayment.toFixed(2)}
                      </div>
                      <div className="text-red-600">
                        Interest: ${results.schedule[results.schedule.length - 1]?.interestPayment.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {scheduleView === 'yearly' && (
                <div className="bg-white p-4 rounded-lg border border-gray-300 max-h-64 overflow-y-auto">
                  <div className="space-y-3">
                    {getYearlySummary(results.schedule).map((yearData) => (
                      <div key={yearData.year} className="flex justify-between items-center text-sm border-b border-gray-200 pb-2">
                        <div>
                          <div className="font-medium">Year {yearData.year}</div>
                          <div className="text-xs text-gray-500">
                            Balance: ${yearData.endingBalance.toLocaleString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-orange-600">P: ${yearData.totalPrincipal.toLocaleString()}</div>
                          <div className="text-red-600">I: ${yearData.totalInterest.toLocaleString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {scheduleView === 'full' && (
                <div className="bg-white p-4 rounded-lg border border-gray-300 max-h-64 overflow-y-auto">
                  <div className="text-xs text-gray-600 mb-2 grid grid-cols-4 gap-2 font-medium">
                    <div>Payment #</div>
                    <div>Principal</div>
                    <div>Interest</div>
                    <div>Balance</div>
                  </div>
                  <div className="space-y-1">
                    {results.schedule.map((payment) => (
                      <div key={payment.paymentNumber} className="text-xs grid grid-cols-4 gap-2 py-1 border-b border-gray-100">
                        <div>{payment.paymentNumber}</div>
                        <div className="text-orange-600">${payment.principalPayment.toFixed(2)}</div>
                        <div className="text-red-600">${payment.interestPayment.toFixed(2)}</div>
                        <div>${payment.remainingBalance.toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Key Insights:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Total cost of loan: ${(results.totalInterest + results.loanAmount).toLocaleString()}</li>
                <li>• Your ${inputs.monthlyPayment.toLocaleString()} monthly payment will pay off the loan in {results.calculatedTermInYears} years, {results.calculatedTermInMonths} months</li>
                <li>• Interest represents {((results.totalInterest / results.loanAmount) * 100).toFixed(1)}% of loan amount</li>
                <li>• Principal & Interest portion: ${results.monthlyPrincipalInterest.toLocaleString()} of your monthly payment</li>
                {(inputs.extraMonthlyPayment > 0 || sortedLumpSums.length > 0) && (
                  <li>• Extra payments will save you ${results.interestSaved.toLocaleString()} and {formatYearsAndMonths(results.yearsReduced)}</li>
                )}
              </ul>
            </div>
          </div>
        )}

        {/* Current Mortgage Status - Bank Comparison View */}
        {results && session?.user?.id && (
          <div className="mt-8 bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg border-2 border-green-200">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              🏠 Current Mortgage Status
              <span className="ml-3 text-sm font-normal bg-green-100 text-green-800 px-3 py-1 rounded-full">
                Bank Replacement View
              </span>
            </h3>
            
            {(() => {
              // Calculate current status based on mortgage start date
              const today = new Date();
              const startDate = new Date(inputs.mortgageStartDate || new Date());
              
              // Debug: Check if dates are valid
              if (isNaN(startDate.getTime())) {
                console.error('Invalid mortgage start date:', inputs.mortgageStartDate);
                return null; // Return early if invalid date
              }
              // Calculate how many payments have actually occurred
              const calculatePaymentsCompleted = () => {
                let paymentsCompleted = 0;
                let currentPaymentDate = new Date(startDate);
                const paymentDay = inputs.paymentDayOfMonth || 1; // Ensure we have a valid payment day
                
                // Start from the first payment date (one month after mortgage start)
                currentPaymentDate.setMonth(currentPaymentDate.getMonth() + 1);
                
                while (currentPaymentDate <= today && paymentsCompleted < 1200) { // Safety limit
                  // Handle month-end preferences for payment day
                  let actualPaymentDay = paymentDay;
                  if (inputs.preferredPaymentDay && inputs.preferredPaymentDay > 28) {
                    const lastDayOfMonth = new Date(currentPaymentDate.getFullYear(), currentPaymentDate.getMonth() + 1, 0).getDate();
                    actualPaymentDay = Math.min(inputs.preferredPaymentDay, lastDayOfMonth);
                  }
                  
                  // Set the payment day for this month
                  currentPaymentDate.setDate(actualPaymentDay);
                  
                  // If this payment date has passed, increment completed payments
                  if (currentPaymentDate <= today) {
                    paymentsCompleted++;
                    // Move to next month for next iteration
                    currentPaymentDate = new Date(currentPaymentDate);
                    currentPaymentDate.setMonth(currentPaymentDate.getMonth() + 1);
                  } else {
                    break;
                  }
                }
                
                return paymentsCompleted;
              };
              
              const paymentsCompleted = calculatePaymentsCompleted();
              
              
              // Calculate current balance by generating up-to-date schedule with current lump sums
              const currentSchedule = generateScheduleFromPayment(
                inputs.mortgageAmount,
                inputs.monthlyPayment, 
                inputs.annualRate / 100,
                inputs.extraMonthlyPayment,
                inputs.lumpSumPayments,
                inputs.mortgageStartDate,
                inputs.paymentDayOfMonth,
                inputs.preferredPaymentDay
              );
              
              // Find current balance from up-to-date schedule
              const currentPaymentIndex = Math.max(0, paymentsCompleted - 1); // -1 because schedule is 0-indexed
              const currentScheduleItem = paymentsCompleted > 0 ? currentSchedule[currentPaymentIndex] : null;
              const currentBalance = currentScheduleItem?.remainingBalance || inputs.mortgageAmount;
              
              // Calculate next payment date
              const nextPaymentDate = new Date(today);
              if (today.getDate() >= inputs.paymentDayOfMonth) {
                nextPaymentDate.setMonth(today.getMonth() + 1);
              }
              
              // Handle month-end edge cases
              let actualPaymentDay = inputs.paymentDayOfMonth;
              if (inputs.preferredPaymentDay && inputs.preferredPaymentDay > 28) {
                const lastDayOfMonth = new Date(nextPaymentDate.getFullYear(), nextPaymentDate.getMonth() + 1, 0).getDate();
                actualPaymentDay = Math.min(inputs.preferredPaymentDay, lastDayOfMonth);
              }
              nextPaymentDate.setDate(actualPaymentDay);
              
              const daysUntilPayment = Math.ceil((nextPaymentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              const principalPaid = inputs.mortgageAmount - currentBalance;
              const percentPaid = ((principalPaid / inputs.mortgageAmount) * 100);
              const baseAnnualRate = inputs.annualRate;
              const cumulativeRateAdjustment = (inputs.rateAdjustments || [])
                .filter((adjustment) => adjustment.effectiveDate && !Number.isNaN(Date.parse(adjustment.effectiveDate)) && new Date(adjustment.effectiveDate) <= today)
                .sort((a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime())
                .reduce((sum, adjustment) => sum + adjustment.rateDelta, 0);
              const effectiveAnnualRate = roundToPrecision(baseAnnualRate + cumulativeRateAdjustment, 3);
              const effectiveRateDelta = effectiveAnnualRate - baseAnnualRate;
              const showRateDelta = Math.abs(effectiveRateDelta) > 0.005;
              
              return (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Current Balance Card */}
                  <div className="bg-white rounded-lg shadow-md p-5 border-l-4 border-blue-500">
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Current Balance</h4>
                    <div className="text-2xl font-bold text-blue-600 mb-1">
                      ${currentBalance.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600 mb-3">
                      After {paymentsCompleted} payment{paymentsCompleted !== 1 ? 's' : ''} • {today.toLocaleDateString()}
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentPaid}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {percentPaid.toFixed(1)}% paid (${principalPaid.toLocaleString()} of ${inputs.mortgageAmount.toLocaleString()})
                    </div>
                  </div>
                  
                  {/* Next Payment Card */}
                  <div className="bg-white rounded-lg shadow-md p-5 border-l-4 border-green-500">
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Next Payment</h4>
                    <div className="text-2xl font-bold text-green-600 mb-1">
                      ${inputs.monthlyPayment.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600 mb-1">
                      Due: {nextPaymentDate.toLocaleDateString()}
                    </div>
                    <div className={`text-sm font-medium ${daysUntilPayment <= 7 ? 'text-red-600' : 'text-gray-600'}`}>
                      {daysUntilPayment > 0 ? `${daysUntilPayment} days remaining` : 'Due today!'}
                    </div>
                    <div className="mt-3 text-sm text-gray-600">
                      Effective rate: {effectiveAnnualRate.toFixed(2)}%
                    </div>
                    {showRateDelta && (
                      <div className="text-xs text-gray-500">
                        Base rate {baseAnnualRate.toFixed(2)}% {effectiveRateDelta > 0 ? "+" : ""}{effectiveRateDelta.toFixed(2)}% adjustments applied
                      </div>
                    )}
                    {inputs.extraMonthlyPayment > 0 && (
                      <div className="mt-2 text-xs text-orange-600">
                        + ${inputs.extraMonthlyPayment.toLocaleString()} extra payment
                      </div>
                    )}
                  </div>
                  
                  {/* Time Remaining Card */}
                  <div className="bg-white rounded-lg shadow-md p-5 border-l-4 border-purple-500">
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Time Remaining</h4>
                    <div className="text-2xl font-bold text-purple-600 mb-1">
                      {(() => {
                        // Calculate remaining payments from current position
                        const remainingPayments = Math.max(0, results.schedule.length - paymentsCompleted);
                        const remainingYears = remainingPayments / 12;
                        return formatYearsAndMonths(remainingYears);
                      })()}
                    </div>
                    <div className="text-sm text-gray-600 mb-1">
                      Payoff: {(() => {
                        // Calculate payoff date from mortgage start + actual schedule length
                        const payoffDate = new Date(startDate);
                        payoffDate.setMonth(payoffDate.getMonth() + results.schedule.length);
                        return payoffDate.toLocaleDateString();
                      })()}
                    </div>
                    {results.yearsReduced > 0 && (
                      <div className="text-xs text-green-600 font-medium">
                        ⚡ {formatYearsAndMonths(results.yearsReduced)} ahead of schedule!
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
            
            {/* Summary Stats Row */}
            <div className="mt-6 bg-white rounded-lg shadow-md p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-14 xl:gap-20 text-center">
                <div className="space-y-3">
                  <div className="text-xl font-bold text-gray-900">${results.totalInterest.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Total Interest</div>
                </div>
                <div className="space-y-3">
                  <div className="text-xl font-bold text-gray-900">${results.totalPaid.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Total Paid (Current Plan)</div>
                  <div className="text-xs text-gray-500">Standard plan ${results.standardTotalPaid.toLocaleString()}</div>
                </div>
                <div className="space-y-3">
                  <div className="text-xl font-bold text-green-600">${results.interestSaved.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Interest Saved</div>
                </div>
                <div className="space-y-3">
                  <div className="text-xl font-bold text-blue-600">{inputs.lumpSumPayments.length}</div>
                  <div className="text-sm text-gray-600">Lump Sum Payments</div>
                </div>
              </div>
            </div>
            
            <div className="mt-4 text-center text-sm text-gray-600">
              💡 This replaces your bank's mortgage overview with precise calculations based on your actual payment schedule
            </div>
          </div>
        )}
      </div>

      {/* Save Calculation Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Save Calculation</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Calculation Name
                </label>
                <input
                  type="text"
                  value={calculationName}
                  onChange={(e) => setCalculationName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder={`Calculation ${new Date().toLocaleDateString()}`}
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowSaveDialog(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCalculation}
                  disabled={isSavingData}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {isSavingData ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Historical Calculations Dialog */}
      {showHistorical && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Saved Calculations</h3>
              <button
                onClick={() => setShowHistorical(false)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ×
              </button>
            </div>
            
            {savedCalculations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No saved calculations yet.</p>
                <p className="text-sm">Calculate and save your first mortgage scenario!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {savedCalculations.map((calc) => (
                  <div key={calc.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-medium text-gray-900">{calc.calculationName}</h4>
                        <p className="text-sm text-gray-500">
                          Saved on {new Date(calc.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => loadHistoricalCalculation(calc)}
                        className="px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 transition-colors"
                      >
                        Load
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Loan Amount:</span>
                        <div className="font-medium">${calc.mortgageAmount.toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Interest Rate:</span>
                        <div className="font-medium">{calc.annualRate}%</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Monthly Payment:</span>
                        <div className="font-medium">${calc.monthlyPayment.toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Lump Sum Payments:</span>
                        <div className="font-medium">{calc.lumpSumPayments?.length || 0}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Rate Changes:</span>
                        <div className="font-medium">{calc.rateAdjustments?.length || 0}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Original Term:</span>
                        <div className="font-medium">{calc.mortgageTermMonths ? formatYearsAndMonths(calc.mortgageTermMonths / 12) : 'Not set'}</div>
                      </div>
                    </div>
                    
                    {calc.lumpSumPayments && calc.lumpSumPayments.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Lump Sum History:</h5>
                        <div className="space-y-1">
                          {calc.lumpSumPayments.map((lump, index: number) => (
                            <div key={index} className="flex justify-between items-center text-xs">
                              <span>
                                ${lump.amount.toLocaleString()} 
                                {lump.description && ` (${lump.description})`} 
                                - {lump.year === 0 ? 'Immediate' : `Year ${lump.year}, Month ${lump.month}`}
                              </span>
                              <span className={`px-2 py-1 rounded ${
                                lump.isPaid ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                              }`}>
                                {lump.isPaid ? `Paid ${lump.actualPaidDate ? new Date(lump.actualPaidDate).toLocaleDateString() : ''}` : 'Planned'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {calc.rateAdjustments && calc.rateAdjustments.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Rate Change History:</h5>
                        <div className="space-y-1">
                          {calc.rateAdjustments.map((adjustment, index: number) => (
                            <div key={index} className="flex justify-between items-center text-xs">
                              <span>
                                {new Date(adjustment.effectiveDate).toLocaleDateString()}
                                {adjustment.description ? ` - ${adjustment.description}` : ''}
                              </span>
                              <span className={`px-2 py-1 rounded ${
                                adjustment.rateDelta >= 0 ? 'bg-purple-100 text-purple-700' : 'bg-purple-50 text-purple-600'
                              }`}>
                                {adjustment.rateDelta >= 0 ? '+' : ''}{adjustment.rateDelta.toFixed(2)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}











