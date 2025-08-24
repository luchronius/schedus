'use client';

import { useState } from 'react';
import {
  calculateMonthlyPayment,
  generateAmortizationSchedule,
  AmortizationPayment,
  roundToPrecision,
  validateFinancialInput
} from '../utils/financialCalculations';

interface LumpSumPayment {
  id: string;
  amount: number;
  year: number;
}

interface MortgageInputs {
  mortgageAmount: number;
  annualRate: number;
  monthlyPayment: number;
  extraMonthlyPayment: number;
  lumpSumPayments: LumpSumPayment[];
}

interface MortgageResults {
  loanAmount: number;
  monthlyPrincipalInterest: number;
  totalMonthlyPayment: number;
  totalPayments: number;
  totalInterest: number;
  schedule: AmortizationPayment[];
  standardSchedule: AmortizationPayment[];
  yearsReduced: number;
  interestSaved: number;
  actualPayoffYear: number;
  calculatedTermInYears: number;
  calculatedTermInMonths: number;
}

export default function MortgageCalculator() {
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
    lumpSumPayments: LumpSumPayment[] = []
  ): AmortizationPayment[] => {
    const monthlyRate = annualRate / 12;
    const totalPayment = monthlyPayment + extraMonthlyPayment;
    
    const schedule: AmortizationPayment[] = [];
    let remainingBalance = principal;
    let paymentNumber = 1;
    
    while (remainingBalance > 0.01 && paymentNumber <= 1200) { // Safety limit of 100 years
      const interestPayment = remainingBalance * monthlyRate;
      let principalPayment = totalPayment - interestPayment;
      
      // Apply lump sum payments if it's the right year
      const currentYear = Math.ceil(paymentNumber / 12);
      let totalLumpSumThisPayment = 0;
      
      for (const lumpSum of lumpSumPayments) {
        if (lumpSum.year === 0 && paymentNumber === 1) {
          // Apply lump sum immediately (first payment)
          totalLumpSumThisPayment += lumpSum.amount;
        } else if (currentYear === lumpSum.year && paymentNumber === lumpSum.year * 12) {
          // Apply lump sum at end of specified year
          totalLumpSumThisPayment += lumpSum.amount;
        }
      }
      
      principalPayment += totalLumpSumThisPayment;
      
      // Don't pay more than remaining balance
      if (principalPayment > remainingBalance) {
        principalPayment = remainingBalance;
      }
      
      remainingBalance -= principalPayment;
      
      schedule.push({
        paymentNumber,
        principalPayment: roundToPrecision(principalPayment),
        interestPayment: roundToPrecision(interestPayment),
        remainingBalance: roundToPrecision(Math.max(0, remainingBalance))
      });
      
      paymentNumber++;
      
      if (remainingBalance <= 0.01) break;
    }
    
    return schedule;
  };
  const [inputs, setInputs] = useState<MortgageInputs>({
    mortgageAmount: 842952.60,
    annualRate: 4.04,
    monthlyPayment: 4624.05,
    extraMonthlyPayment: 0,
    lumpSumPayments: []
  });

  const [results, setResults] = useState<MortgageResults | null>(null);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [scheduleView, setScheduleView] = useState<'summary' | 'yearly' | 'full'>('summary');

  const addLumpSumPayment = () => {
    const newLumpSum: LumpSumPayment = {
      id: Date.now().toString(),
      amount: 0,
      year: 1
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

  const updateLumpSumPayment = (id: string, field: 'amount' | 'year', value: number) => {
    setInputs(prev => ({
      ...prev,
      lumpSumPayments: prev.lumpSumPayments.map(lump =>
        lump.id === id ? { ...lump, [field]: value } : lump
      )
    }));
  };
  
  const generateScheduleWithExtraPayments = (
    principal: number,
    annualRate: number,
    termInYears: number,
    extraMonthlyPayment: number = 0,
    lumpSumPayments: LumpSumPayment[] = []
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
      
      // Apply lump sum payments if it's the right year
      const currentYear = Math.ceil(paymentNumber / 12);
      let totalLumpSumThisPayment = 0;
      
      for (const lumpSum of lumpSumPayments) {
        if (lumpSum.year === 0 && paymentNumber === 1) {
          // Apply lump sum immediately (first payment)
          totalLumpSumThisPayment += lumpSum.amount;
        } else if (currentYear === lumpSum.year && paymentNumber === lumpSum.year * 12) {
          // Apply lump sum at end of specified year
          totalLumpSumThisPayment += lumpSum.amount;
        }
      }
      
      principalPayment += totalLumpSumThisPayment;
      
      // Don't pay more than remaining balance
      if (principalPayment > remainingBalance) {
        principalPayment = remainingBalance;
      }
      
      remainingBalance -= principalPayment;
      
      schedule.push({
        paymentNumber,
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
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const calculateResults = () => {
    if (!validateInputs()) return;

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
    const standardSchedule = generateScheduleFromPayment(loanAmount, monthlyPrincipalInterest, annualRateDecimal);
    const standardTotalInterest = standardSchedule.reduce((sum, payment) => sum + payment.interestPayment, 0);
    
    // Generate schedule with extra payments
    const schedule = generateScheduleFromPayment(
      loanAmount, 
      monthlyPrincipalInterest,
      annualRateDecimal,
      inputs.extraMonthlyPayment,
      inputs.lumpSumPayments
    );
    
    const totalInterest = schedule.reduce((sum, payment) => sum + payment.interestPayment, 0);
    const interestSaved = standardTotalInterest - totalInterest;
    const actualPayoffYear = Math.ceil(schedule.length / 12);
    const standardPayoffYear = Math.ceil(standardSchedule.length / 12);
    
    // Calculate time saved based on actual payment difference (more accurate)
    const paymentDifference = standardSchedule.length - schedule.length;
    const yearsReduced = paymentDifference / 12;
    
    const totalPayments = monthlyPrincipalInterest * standardSchedule.length;
    const totalMonthlyPayment = inputs.monthlyPayment + inputs.extraMonthlyPayment;

    setResults({
      loanAmount,
      monthlyPrincipalInterest,
      totalMonthlyPayment,
      totalPayments,
      totalInterest,
      schedule,
      standardSchedule,
      yearsReduced,
      interestSaved,
      actualPayoffYear,
      calculatedTermInYears: termCalculation.years,
      calculatedTermInMonths: termCalculation.months
    });
  };

  const handleInputChange = (field: keyof MortgageInputs, value: number) => {
    setInputs(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
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
              value={inputs.mortgageAmount}
              onChange={(e) => handleInputChange('mortgageAmount', Number(e.target.value))}
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
              value={inputs.annualRate}
              onChange={(e) => handleInputChange('annualRate', Number(e.target.value))}
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
              Monthly Payment ($)
            </label>
            <input
              type="number"
              value={inputs.monthlyPayment}
              onChange={(e) => handleInputChange('monthlyPayment', Number(e.target.value))}
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


          <div className="border-t pt-4">
            <h4 className="text-lg font-semibold text-gray-700 mb-3">Extra Payments</h4>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Extra Monthly Payment ($)
                </label>
                <input
                  type="number"
                  value={inputs.extraMonthlyPayment}
                  onChange={(e) => handleInputChange('extraMonthlyPayment', Number(e.target.value))}
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
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Amount ($)
                            </label>
                            <input
                              type="number"
                              value={lumpSum.amount}
                              onChange={(e) => updateLumpSumPayment(lumpSum.id, 'amount', Number(e.target.value))}
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
                              Year
                            </label>
                            <input
                              type="number"
                              value={lumpSum.year}
                              onChange={(e) => updateLumpSumPayment(lumpSum.id, 'year', Number(e.target.value))}
                              className={`w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                                errors[`lumpSum_${lumpSum.id}_year`] ? 'border-red-300' : 'border-gray-300'
                              }`}
                              min="0"
                              max="50"
                              placeholder="Year"
                            />
                            {errors[`lumpSum_${lumpSum.id}_year`] && (
                              <p className="text-red-600 text-xs mt-1">{errors[`lumpSum_${lumpSum.id}_year`]}</p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                              0 = immediately, 1+ = end of year
                            </p>
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
            className="w-full bg-orange-600 text-white py-3 px-6 rounded-md hover:bg-orange-700 transition-colors font-semibold shadow-md"
          >
            Calculate Mortgage Payment
          </button>

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
                {(inputs.extraMonthlyPayment > 0 || inputs.lumpSumPayments.length > 0) && (
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
            </div>

            {(inputs.extraMonthlyPayment > 0 || inputs.lumpSumPayments.length > 0) && (
              <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="text-lg font-semibold text-green-800 mb-3">Extra Payment Impact</h4>
                {inputs.lumpSumPayments.length > 0 && (
                  <div className="mb-4 p-3 bg-white rounded border border-green-300">
                    <h5 className="text-sm font-semibold text-green-700 mb-2">Lump Sum Payments Summary:</h5>
                    <div className="space-y-1 text-sm">
                      {inputs.lumpSumPayments.map((lumpSum, index) => (
                        <div key={lumpSum.id} className="flex justify-between">
                          <span>Payment #{index + 1}:</span>
                          <span>${lumpSum.amount.toLocaleString()} in year {lumpSum.year === 0 ? 'immediately' : lumpSum.year}</span>
                        </div>
                      ))}
                      <div className="pt-2 border-t border-green-200 font-semibold">
                        <div className="flex justify-between">
                          <span>Total Lump Sum:</span>
                          <span>${inputs.lumpSumPayments.reduce((sum, lump) => sum + lump.amount, 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium text-gray-700 mb-2">Standard Mortgage:</div>
                    <div className="space-y-1">
                      <div>Payoff time: {results.calculatedTermInYears} years, {results.calculatedTermInMonths} months</div>
                      <div>Total interest: ${(results.standardSchedule.reduce((sum, p) => sum + p.interestPayment, 0)).toLocaleString()}</div>
                      <div>Total payments: {results.standardSchedule.length}</div>
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-700 mb-2">With Extra Payments:</div>
                    <div className="space-y-1">
                      <div className="text-green-600">Payoff time: {formatYearsAndMonths(results.schedule.length / 12)}</div>
                      <div className="text-green-600">Total interest: ${results.totalInterest.toLocaleString()}</div>
                      <div className="text-green-600">Total payments: {results.schedule.length}</div>
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-green-300">
                  <div className="text-center">
                    <span className="text-lg font-bold text-green-600">
                      You'll save ${results.interestSaved.toLocaleString()} in interest and pay off your mortgage {formatYearsAndMonths(results.yearsReduced)} early!
                    </span>
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
                  <div className="space-y-2">
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
                {(inputs.extraMonthlyPayment > 0 || inputs.lumpSumPayments.length > 0) && (
                  <li>• Extra payments will save you ${results.interestSaved.toLocaleString()} and {formatYearsAndMonths(results.yearsReduced)}</li>
                )}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}