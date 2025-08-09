'use client';

import { useState } from 'react';
import {
  calculateMonthlyPayment,
  generateAmortizationSchedule,
  AmortizationPayment,
  roundToPrecision,
  validateFinancialInput
} from '../utils/financialCalculations';

interface LoanInputs {
  loanAmount: number;
  annualRate: number;
  termInYears: number;
}

interface LoanResults {
  monthlyPayment: number;
  totalPayments: number;
  totalInterest: number;
  schedule: AmortizationPayment[];
}

export default function LoanAmortizationCalculator() {
  const [inputs, setInputs] = useState<LoanInputs>({
    loanAmount: 250000,
    annualRate: 6.5,
    termInYears: 30
  });

  const [results, setResults] = useState<LoanResults | null>(null);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [scheduleView, setScheduleView] = useState<'summary' | 'yearly' | 'full'>('summary');
  
  const validateInputs = (): boolean => {
    const newErrors: {[key: string]: string} = {};

    const loanValidation = validateFinancialInput(inputs.loanAmount, 'principal');
    if (!loanValidation.isValid) {
      newErrors.loanAmount = loanValidation.error!;
    }
    if (inputs.loanAmount < 0) {
      newErrors.loanAmount = 'Principal amount cannot be negative';
    }

    const rateValidation = validateFinancialInput(inputs.annualRate / 100, 'rate');
    if (!rateValidation.isValid) {
      newErrors.annualRate = rateValidation.error!;
    }

    const termValidation = validateFinancialInput(inputs.termInYears, 'time');
    if (!termValidation.isValid) {
      newErrors.termInYears = termValidation.error!;
    }

    if (inputs.termInYears < 1) {
      newErrors.termInYears = 'Loan term must be at least 1 year';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const calculateResults = () => {
    if (!validateInputs()) return;

    const annualRateDecimal = inputs.annualRate / 100;
    const monthlyPayment = calculateMonthlyPayment(inputs.loanAmount, annualRateDecimal, inputs.termInYears);
    const schedule = generateAmortizationSchedule(inputs.loanAmount, annualRateDecimal, inputs.termInYears);
    
    const totalPayments = monthlyPayment * inputs.termInYears * 12;
    const totalInterest = totalPayments - inputs.loanAmount;

    setResults({
      monthlyPayment,
      totalPayments,
      totalInterest,
      schedule
    });
  };

  const handleInputChange = (field: keyof LoanInputs, value: number) => {
    setInputs(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const getYearlySummary = (schedule: AmortizationPayment[]) => {
    const yearlySummary = [];
    const paymentsPerYear = 12;
    
    for (let year = 1; year <= inputs.termInYears; year++) {
      const startPayment = (year - 1) * paymentsPerYear;
      const endPayment = Math.min(year * paymentsPerYear, schedule.length);
      
      const yearPayments = schedule.slice(startPayment, endPayment);
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
      <h2 className="text-3xl font-bold text-gray-900 mb-6">Loan Amortization Calculator</h2>
      <p className="text-gray-600 mb-8">
        Calculate your monthly loan payments and see how much goes to principal vs. interest over the life of your loan.
        Perfect for mortgages, auto loans, and personal loans.
      </p>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div>
            <label htmlFor="loan-amount" className="block text-sm font-medium text-gray-700 mb-2">
              Loan Amount ($)
            </label>
            <input
              id="loan-amount"
              type="number"
              value={inputs.loanAmount}
              onChange={(e) => handleInputChange('loanAmount', Number(e.target.value))}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                errors.loanAmount ? 'border-red-300' : 'border-gray-300'
              }`}
              step="0.01"
              placeholder="Enter loan amount"
            />
            {errors.loanAmount && (
              <p className="text-red-600 text-sm mt-1">{errors.loanAmount}</p>
            )}
          </div>

          <div>
            <label htmlFor="loan-annual-rate" className="block text-sm font-medium text-gray-700 mb-2">
              Annual Interest Rate (%)
            </label>
            <input
              id="loan-annual-rate"
              type="number"
              value={inputs.annualRate}
              onChange={(e) => handleInputChange('annualRate', Number(e.target.value))}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                errors.annualRate ? 'border-red-300' : 'border-gray-300'
              }`}
              max="100"
              step="0.01"
              placeholder="Enter annual interest rate"
            />
            {errors.annualRate && (
              <p className="text-red-600 text-sm mt-1">{errors.annualRate}</p>
            )}
          </div>

          <div>
            <label htmlFor="loan-term" className="block text-sm font-medium text-gray-700 mb-2">
              Loan Term (Years)
            </label>
            <input
              id="loan-term"
              type="number"
              value={inputs.termInYears}
              onChange={(e) => handleInputChange('termInYears', Number(e.target.value))}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                errors.termInYears ? 'border-red-300' : 'border-gray-300'
              }`}
              min="1"
              max="50"
              step="1"
              placeholder="Enter loan term in years"
            />
            {errors.termInYears && (
              <p className="text-red-600 text-sm mt-1">{errors.termInYears}</p>
            )}
          </div>

          <button
            onClick={calculateResults}
            className="w-full bg-purple-600 text-white py-3 px-6 rounded-md hover:bg-purple-700 transition-colors font-semibold shadow-md"
          >
            Calculate Loan Payment
          </button>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Formula Used:</h4>
            <div className="text-sm text-gray-600">
              M = P × [r(1+r)<sup>n</sup>] / [(1+r)<sup>n</sup> - 1]
              <br />
              <span className="text-xs">
                Where: M = monthly payment, P = principal, r = monthly rate, n = total payments
              </span>
            </div>
          </div>
        </div>

        {results && (
          <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Loan Summary</h3>
            
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg border border-purple-300">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-700">Monthly Payment:</span>
                  <span className="font-bold text-xl text-purple-600">
                    ${results.monthlyPayment.toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Fixed payment for {inputs.termInYears} years ({inputs.termInYears * 12} payments)
                </p>
              </div>

              <div className="bg-white p-4 rounded-lg border border-red-300">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-700">Total Interest:</span>
                  <span className="font-semibold text-lg text-red-600">
                    ${results.totalInterest.toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Total interest paid over loan term
                </p>
              </div>

              <div className="bg-white p-4 rounded-lg border border-blue-300">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-700">Total Payments:</span>
                  <span className="font-semibold text-lg text-blue-600">
                    ${results.totalPayments.toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Principal + Interest
                </p>
              </div>

              <div className="bg-white p-4 rounded-lg border border-green-300">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-700">Interest as % of Loan:</span>
                  <span className="font-semibold text-lg text-green-600">
                    {((results.totalInterest / inputs.loanAmount) * 100).toFixed(1)}%
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Interest cost relative to loan amount
                </p>
              </div>
            </div>

            <div className="mt-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Payment Schedule View:</h4>
              <div className="flex space-x-2 mb-4">
                <button
                  onClick={() => setScheduleView('summary')}
                  className={`px-3 py-1 text-sm rounded ${
                    scheduleView === 'summary' 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Summary
                </button>
                <button
                  onClick={() => setScheduleView('yearly')}
                  className={`px-3 py-1 text-sm rounded ${
                    scheduleView === 'yearly' 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Yearly
                </button>
                <button
                  onClick={() => setScheduleView('full')}
                  className={`px-3 py-1 text-sm rounded ${
                    scheduleView === 'full' 
                      ? 'bg-purple-600 text-white' 
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
                      <div className="text-purple-600">
                        Principal: ${results.schedule[0]?.principalPayment.toFixed(2)}
                      </div>
                      <div className="text-red-600">
                        Interest: ${results.schedule[0]?.interestPayment.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-gray-700">Last Payment:</div>
                      <div className="text-purple-600">
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
                          <div className="text-purple-600">P: ${yearData.totalPrincipal.toLocaleString()}</div>
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
                    {results.schedule.filter((_, index) => index % 6 === 0 || index === results.schedule.length - 1).map((payment) => (
                      <div key={payment.paymentNumber} className="text-xs grid grid-cols-4 gap-2 py-1 border-b border-gray-100">
                        <div>{payment.paymentNumber}</div>
                        <div className="text-purple-600">${payment.principalPayment.toFixed(2)}</div>
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
                <li>• Early payments are mostly interest, later payments mostly principal</li>
                <li>• Extra principal payments can significantly reduce total interest</li>
                <li>• Monthly payment: ${(results.monthlyPayment / inputs.loanAmount * 100).toFixed(3)}% of loan amount</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}