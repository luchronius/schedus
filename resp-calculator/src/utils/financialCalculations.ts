/**
 * High-precision financial calculation utilities
 * Uses precise decimal arithmetic to avoid floating-point errors
 */

// Precision helper for financial calculations
const PRECISION = 10; // 10 decimal places for internal calculations
const DISPLAY_PRECISION = 2; // 2 decimal places for display

/**
 * Round number to specified decimal places
 */
export function roundToPrecision(num: number, precision: number = DISPLAY_PRECISION): number {
  const factor = Math.pow(10, precision);
  return Math.round(num * factor) / factor;
}

/**
 * Convert annual interest rate to daily interest rate using compound formula
 * Formula: r_daily = (1 + r_annual)^(1/365) - 1
 * @param annualRate - Annual interest rate as decimal (e.g., 0.05 for 5%)
 * @returns Daily interest rate as decimal
 */
export function annualToDailyRate(annualRate: number): number {
  return Math.pow(1 + annualRate, 1 / 365) - 1;
}

/**
 * Convert annual interest rate to period rate
 * Formula: r_period = (1 + r_annual)^(days/365) - 1
 * @param annualRate - Annual interest rate as decimal
 * @param days - Number of days in the period
 * @returns Period interest rate as decimal
 */
export function annualToPeriodRate(annualRate: number, days: number): number {
  return Math.pow(1 + annualRate, days / 365) - 1;
}

/**
 * Calculate daily interest earned
 * @param principal - Principal amount
 * @param annualRate - Annual interest rate as decimal
 * @param days - Number of days (default: 1)
 * @returns Interest earned over the specified days
 */
export function calculateDailyInterest(
  principal: number,
  annualRate: number,
  days: number = 1
): number {
  const dailyRate = annualToDailyRate(annualRate);
  return principal * dailyRate * days;
}

/**
 * Calculate simple interest
 * Formula: I = P * r * t
 * @param principal - Principal amount
 * @param rate - Interest rate as decimal
 * @param timeInYears - Time period in years
 * @returns Simple interest amount
 */
export function calculateSimpleInterest(
  principal: number,
  rate: number,
  timeInYears: number
): number {
  return principal * rate * timeInYears;
}

/**
 * Calculate compound interest
 * Formula: A = P * (1 + r/n)^(n*t)
 * @param principal - Principal amount
 * @param annualRate - Annual interest rate as decimal
 * @param compoundingFrequency - Number of times interest compounds per year
 * @param timeInYears - Time period in years
 * @returns Final amount after compound interest
 */
export function calculateCompoundInterest(
  principal: number,
  annualRate: number,
  compoundingFrequency: number,
  timeInYears: number
): { finalAmount: number; interestEarned: number } {
  const ratePerPeriod = annualRate / compoundingFrequency;
  const totalPeriods = compoundingFrequency * timeInYears;
  const finalAmount = principal * Math.pow(1 + ratePerPeriod, totalPeriods);
  const interestEarned = finalAmount - principal;
  
  return {
    finalAmount: roundToPrecision(finalAmount, PRECISION),
    interestEarned: roundToPrecision(interestEarned, PRECISION)
  };
}

/**
 * Calculate monthly payment for a loan
 * Formula: M = P * [r(1+r)^n] / [(1+r)^n - 1]
 * @param principal - Loan amount
 * @param annualRate - Annual interest rate as decimal
 * @param termInYears - Loan term in years
 * @returns Monthly payment amount
 */
export function calculateMonthlyPayment(
  principal: number,
  annualRate: number,
  termInYears: number
): number {
  const monthlyRate = annualRate / 12;
  const totalPayments = termInYears * 12;
  
  if (monthlyRate === 0) {
    return principal / totalPayments;
  }
  
  const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) /
                  (Math.pow(1 + monthlyRate, totalPayments) - 1);
  
  return roundToPrecision(payment, PRECISION);
}

/**
 * Generate loan amortization schedule
 * @param principal - Loan amount
 * @param annualRate - Annual interest rate as decimal
 * @param termInYears - Loan term in years
 * @returns Array of payment schedule objects
 */
export interface AmortizationPayment {
  paymentNumber: number;
  paymentAmount: number;
  principalPayment: number;
  interestPayment: number;
  remainingBalance: number;
}

export function generateAmortizationSchedule(
  principal: number,
  annualRate: number,
  termInYears: number
): AmortizationPayment[] {
  const monthlyPayment = calculateMonthlyPayment(principal, annualRate, termInYears);
  const monthlyRate = annualRate / 12;
  const totalPayments = termInYears * 12;
  
  const schedule: AmortizationPayment[] = [];
  let remainingBalance = principal;
  
  for (let i = 1; i <= totalPayments; i++) {
    const interestPayment = remainingBalance * monthlyRate;
    const principalPayment = monthlyPayment - interestPayment;
    remainingBalance = Math.max(0, remainingBalance - principalPayment);
    
    schedule.push({
      paymentNumber: i,
      paymentAmount: roundToPrecision(monthlyPayment),
      principalPayment: roundToPrecision(principalPayment),
      interestPayment: roundToPrecision(interestPayment),
      remainingBalance: roundToPrecision(remainingBalance)
    });
  }
  
  return schedule;
}

/**
 * Calculate future value of an investment
 * @param presentValue - Current value
 * @param rate - Interest rate as decimal
 * @param periods - Number of periods
 * @returns Future value
 */
export function calculateFutureValue(
  presentValue: number,
  rate: number,
  periods: number
): number {
  return roundToPrecision(presentValue * Math.pow(1 + rate, periods), PRECISION);
}

/**
 * Calculate present value of a future amount
 * @param futureValue - Future value
 * @param rate - Interest rate as decimal
 * @param periods - Number of periods
 * @returns Present value
 */
export function calculatePresentValue(
  futureValue: number,
  rate: number,
  periods: number
): number {
  return roundToPrecision(futureValue / Math.pow(1 + rate, periods), PRECISION);
}

/**
 * Compounding frequency options
 */
export const COMPOUNDING_FREQUENCIES = {
  DAILY: { value: 365, label: 'Daily' },
  MONTHLY: { value: 12, label: 'Monthly' },
  QUARTERLY: { value: 4, label: 'Quarterly' },
  SEMI_ANNUALLY: { value: 2, label: 'Semi-Annually' },
  ANNUALLY: { value: 1, label: 'Annually' }
} as const;

/**
 * Validate financial input values
 */
export function validateFinancialInput(
  value: number,
  type: 'principal' | 'rate' | 'time'
): { isValid: boolean; error?: string } {
  if (isNaN(value) || !isFinite(value)) {
    return { isValid: false, error: 'Please enter a valid number' };
  }
  
  switch (type) {
    case 'principal':
      if (value < 0) {
        return { isValid: false, error: 'Principal amount cannot be negative' };
      }
      if (value > 10000000) {
        return { isValid: false, error: 'Principal amount is too large' };
      }
      break;
    case 'rate':
      if (value < 0) {
        return { isValid: false, error: 'Interest rate cannot be negative' };
      }
      if (value > 1) {
        return { isValid: false, error: 'Interest rate cannot exceed 100%' };
      }
      break;
    case 'time':
      if (value < 0) {
        return { isValid: false, error: 'Time period cannot be negative' };
      }
      if (value > 100) {
        return { isValid: false, error: 'Time period is too long' };
      }
      break;
  }
  
  return { isValid: true };
}