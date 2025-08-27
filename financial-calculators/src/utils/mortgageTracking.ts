import { MortgageSnapshot, MortgagePayment, MortgageSettings } from '@/lib/database';

export interface PrepaymentImpact {
  interestSaved: number;
  timeSavedMonths: number;
  newPayoffDate: Date;
  originalPayoffDate: Date;
  balanceAtTime: number;
}

export interface MortgageHistoryPoint {
  date: string;
  balance: number;
  monthlyPayment: number;
  interestRate: number;
  event?: {
    type: 'payment' | 'lump_sum' | 'rate_change';
    amount: number;
    description?: string;
  };
}

export interface CurrentMortgageState {
  currentBalance: number;
  nextPaymentDate: string;
  nextPaymentAmount: number;
  daysUntilPayment: number;
  interestRate: number;
  estimatedPayoffDate: Date;
  totalPaidToDate: number;
  totalInterestPaid: number;
  principalPaid: number;
  monthsRemaining: number;
}

// Calculate the impact of a specific prepayment
export function calculatePrepaymentImpact(
  principal: number,
  annualRate: number,
  monthlyPayment: number,
  prepaymentAmount: number,
  prepaymentMonth: number,
  originalTermMonths: number
): PrepaymentImpact {
  const monthlyRate = annualRate / 12 / 100;
  
  // Calculate without prepayment
  const originalPayoffMonths = Math.ceil(
    -Math.log(1 - (principal * monthlyRate) / monthlyPayment) / Math.log(1 + monthlyRate)
  );
  
  // Calculate remaining balance at prepayment time
  let remainingBalance = principal;
  for (let month = 1; month < prepaymentMonth; month++) {
    const interestPayment = remainingBalance * monthlyRate;
    const principalPayment = monthlyPayment - interestPayment;
    remainingBalance -= principalPayment;
  }
  
  // Apply prepayment
  const balanceAfterPrepayment = Math.max(0, remainingBalance - prepaymentAmount);
  
  // Calculate new payoff time
  let newPayoffMonths = prepaymentMonth;
  if (balanceAfterPrepayment > 0) {
    const remainingMonths = Math.ceil(
      -Math.log(1 - (balanceAfterPrepayment * monthlyRate) / monthlyPayment) / Math.log(1 + monthlyRate)
    );
    newPayoffMonths = prepaymentMonth + remainingMonths;
  }
  
  // Calculate interest savings
  const originalTotalInterest = (originalPayoffMonths * monthlyPayment) - principal;
  const newTotalInterest = ((newPayoffMonths - prepaymentMonth) * monthlyPayment) + 
                          (prepaymentMonth * monthlyPayment) - principal;
  const interestSaved = Math.max(0, originalTotalInterest - newTotalInterest);
  
  const timeSavedMonths = Math.max(0, originalPayoffMonths - newPayoffMonths);
  
  const today = new Date();
  const originalPayoffDate = new Date(today.getFullYear(), today.getMonth() + originalPayoffMonths, today.getDate());
  const newPayoffDate = new Date(today.getFullYear(), today.getMonth() + newPayoffMonths, today.getDate());
  
  return {
    interestSaved,
    timeSavedMonths,
    newPayoffDate,
    originalPayoffDate,
    balanceAtTime: remainingBalance
  };
}

// Build complete mortgage history from snapshots and payments
export function buildMortgageHistory(
  snapshots: MortgageSnapshot[],
  payments: MortgagePayment[],
  settings: MortgageSettings | null
): MortgageHistoryPoint[] {
  const history: MortgageHistoryPoint[] = [];
  
  // Combine and sort all events by date
  const allEvents: Array<{
    date: string;
    type: 'snapshot' | 'payment';
    data: MortgageSnapshot | MortgagePayment;
  }> = [
    ...snapshots.map(s => ({ date: s.snapshotDate, type: 'snapshot' as const, data: s })),
    ...payments.map(p => ({ date: p.paymentDate, type: 'payment' as const, data: p }))
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  // Build chronological history
  allEvents.forEach(event => {
    if (event.type === 'snapshot') {
      const snapshot = event.data as MortgageSnapshot;
      history.push({
        date: snapshot.snapshotDate,
        balance: snapshot.remainingBalance,
        monthlyPayment: snapshot.monthlyPayment,
        interestRate: snapshot.interestRate
      });
    } else {
      const payment = event.data as MortgagePayment;
      // Find the most recent snapshot for context
      const recentSnapshot = snapshots
        .filter(s => new Date(s.snapshotDate) <= new Date(payment.paymentDate))
        .sort((a, b) => new Date(b.snapshotDate).getTime() - new Date(a.snapshotDate).getTime())[0];
      
      history.push({
        date: payment.paymentDate,
        balance: payment.remainingBalance,
        monthlyPayment: recentSnapshot?.monthlyPayment || 0,
        interestRate: recentSnapshot?.interestRate || 0,
        event: {
          type: payment.paymentType === 'lump_sum' ? 'lump_sum' : 'payment',
          amount: payment.actualAmount || payment.scheduledAmount,
          description: payment.description
        }
      });
    }
  });
  
  return history;
}

// Calculate current mortgage state from historical data
export function calculateCurrentState(
  snapshots: MortgageSnapshot[],
  payments: MortgagePayment[],
  settings: MortgageSettings | null
): CurrentMortgageState {
  const today = new Date();
  
  // Get most recent snapshot
  const latestSnapshot = snapshots
    .filter(s => new Date(s.snapshotDate) <= today)
    .sort((a, b) => new Date(b.snapshotDate).getTime() - new Date(a.snapshotDate).getTime())[0];
  
  if (!latestSnapshot || !settings) {
    return {
      currentBalance: 0,
      nextPaymentDate: '',
      nextPaymentAmount: 0,
      daysUntilPayment: 0,
      interestRate: 0,
      estimatedPayoffDate: new Date(),
      totalPaidToDate: 0,
      totalInterestPaid: 0,
      principalPaid: 0,
      monthsRemaining: 0
    };
  }
  
  // Calculate total payments made
  const paidPayments = payments.filter(p => p.isPaid);
  const totalPaidToDate = paidPayments.reduce((sum, p) => sum + (p.actualAmount || p.scheduledAmount), 0);
  const totalInterestPaid = paidPayments.reduce((sum, p) => sum + (p.interestAmount || 0), 0);
  const principalPaid = settings.originalPrincipal - latestSnapshot.remainingBalance;
  
  // Calculate next payment date
  const nextPaymentDate = calculateNextPaymentDate(today, settings.paymentDayOfMonth, settings.preferredPaymentDay);
  const daysUntilPayment = Math.ceil((nextPaymentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  // Estimate months remaining
  const monthlyRate = latestSnapshot.interestRate / 12 / 100;
  const monthsRemaining = monthlyRate > 0 ? Math.ceil(
    -Math.log(1 - (latestSnapshot.remainingBalance * monthlyRate) / latestSnapshot.monthlyPayment) / Math.log(1 + monthlyRate)
  ) : 0;
  
  const estimatedPayoffDate = new Date(today);
  estimatedPayoffDate.setMonth(estimatedPayoffDate.getMonth() + monthsRemaining);
  
  return {
    currentBalance: latestSnapshot.remainingBalance,
    nextPaymentDate: nextPaymentDate.toISOString().split('T')[0],
    nextPaymentAmount: latestSnapshot.monthlyPayment,
    daysUntilPayment,
    interestRate: latestSnapshot.interestRate,
    estimatedPayoffDate,
    totalPaidToDate,
    totalInterestPaid,
    principalPaid,
    monthsRemaining
  };
}

// Calculate next payment date with month-end handling
export function calculateNextPaymentDate(
  fromDate: Date,
  paymentDayOfMonth: number,
  preferredPaymentDay?: number
): Date {
  const nextDate = new Date(fromDate);
  
  // Move to next month if we've passed the payment date
  if (fromDate.getDate() >= paymentDayOfMonth) {
    nextDate.setMonth(nextDate.getMonth() + 1);
  }
  
  // Handle month-end edge cases
  let targetDay = paymentDayOfMonth;
  if (preferredPaymentDay && preferredPaymentDay > 28) {
    // User wants end of month payment (29-31)
    const lastDayOfMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
    targetDay = Math.min(preferredPaymentDay, lastDayOfMonth);
  }
  
  nextDate.setDate(targetDay);
  return nextDate;
}

// Calculate aggregate prepayment impact across all lump sum payments
export function calculateTotalPrepaymentImpact(
  payments: MortgagePayment[],
  originalPrincipal: number,
  annualRate: number,
  monthlyPayment: number,
  originalTermMonths: number
): {
  totalPrepayments: number;
  totalInterestSaved: number;
  totalTimeSavedMonths: number;
  paymentCount: number;
} {
  const lumpSumPayments = payments
    .filter(p => p.paymentType === 'lump_sum')
    .sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime());
  
  let totalPrepayments = 0;
  let totalInterestSaved = 0;
  let totalTimeSavedMonths = 0;
  
  // For each lump sum, calculate its individual impact
  lumpSumPayments.forEach((payment, index) => {
    const paymentAmount = payment.actualAmount || payment.scheduledAmount;
    totalPrepayments += paymentAmount;
    
    // Calculate month when payment was made (simplified - would need actual mortgage start date)
    const monthsFromStart = index * 12; // Placeholder calculation
    
    const impact = calculatePrepaymentImpact(
      originalPrincipal,
      annualRate,
      monthlyPayment,
      paymentAmount,
      monthsFromStart,
      originalTermMonths
    );
    
    totalInterestSaved += impact.interestSaved;
    totalTimeSavedMonths += impact.timeSavedMonths;
  });
  
  return {
    totalPrepayments,
    totalInterestSaved,
    totalTimeSavedMonths,
    paymentCount: lumpSumPayments.length
  };
}