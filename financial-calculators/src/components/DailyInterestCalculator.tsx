'use client';

import { useState } from 'react';
import { 
  calculateDailyInterest, 
  annualToDailyRate, 
  roundToPrecision,
  validateFinancialInput 
} from '../utils/financialCalculations';

interface DailyInterestInputs {
  principal: number;
  annualRate: number;
  days: number;
}

interface DailyInterestResults {
  dailyRate: number;
  interestEarned: number;
  totalAmount: number;
  effectiveAnnualRate: number;
}

export default function DailyInterestCalculator() {
  const [inputs, setInputs] = useState<DailyInterestInputs>({
    principal: 1000,
    annualRate: 5.0,
    days: 1
  });

  const [results, setResults] = useState<DailyInterestResults | null>(null);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const validateInputs = (): boolean => {
    const newErrors: {[key: string]: string} = {};

    const principalValidation = validateFinancialInput(inputs.principal, 'principal');
    if (!principalValidation.isValid) {
      newErrors.principal = principalValidation.error!;
    }

    const rateValidation = validateFinancialInput(inputs.annualRate / 100, 'rate');
    if (!rateValidation.isValid) {
      newErrors.annualRate = rateValidation.error!;
    }
    if (inputs.annualRate > 100) {
      newErrors.annualRate = 'Interest rate cannot exceed 100%';
    }

    if (inputs.days < 1) {
      newErrors.days = 'Number of days must be at least 1';
    }
    if (inputs.days > 365) {
      newErrors.days = 'Number of days cannot exceed 365';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const calculateResults = () => {
    if (!validateInputs()) return;

    const annualRateDecimal = inputs.annualRate / 100;
    const dailyRate = annualToDailyRate(annualRateDecimal);
    const interestEarned = calculateDailyInterest(inputs.principal, annualRateDecimal, inputs.days);
    const totalAmount = inputs.principal + interestEarned;
    
    // Calculate effective annual rate if compounded daily for full year
    const effectiveAnnualRate = Math.pow(1 + dailyRate, 365) - 1;

    setResults({
      dailyRate: roundToPrecision(dailyRate * 100, 6), // Convert to percentage with 6 decimal places
      interestEarned: roundToPrecision(interestEarned),
      totalAmount: roundToPrecision(totalAmount),
      effectiveAnnualRate: roundToPrecision(effectiveAnnualRate * 100, 4) // Convert to percentage
    });
  };

  const handleInputChange = (field: keyof DailyInterestInputs, value: number) => {
    setInputs(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <h2 className="text-3xl font-bold text-gray-900 mb-6">Daily Interest Calculator</h2>
      <p className="text-gray-600 mb-8">
        Calculate precise daily interest earnings using compound interest formulas. 
        Perfect for understanding how much interest you earn per day on your investments.
      </p>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div>
            <label htmlFor="daily-principal-amount" className="block text-sm font-medium text-gray-700 mb-2">
              Principal Amount ($)
            </label>
            <input
              id="daily-principal-amount"
              type="number"
              value={inputs.principal}
              onChange={(e) => handleInputChange('principal', Number(e.target.value))}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.principal ? 'border-red-300' : 'border-gray-300'
              }`}
              step="0.01"
              placeholder="Enter principal amount"
            />
            {errors.principal && (
              <p className="text-red-600 text-sm mt-1">{errors.principal}</p>
            )}
          </div>

          <div>
            <label htmlFor="daily-annual-rate" className="block text-sm font-medium text-gray-700 mb-2">
              Annual Interest Rate (%)
            </label>
            <input
              id="daily-annual-rate"
              type="number"
              value={inputs.annualRate}
              onChange={(e) => handleInputChange('annualRate', Number(e.target.value))}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.annualRate ? 'border-red-300' : 'border-gray-300'
              }`}
              max="100"
              step="0.1"
              placeholder="Enter annual interest rate"
            />
            {errors.annualRate && (
              <p className="text-red-600 text-sm mt-1">{errors.annualRate}</p>
            )}
          </div>

          <div>
            <label htmlFor="number-of-days" className="block text-sm font-medium text-gray-700 mb-2">
              Number of Days
            </label>
            <input
              id="number-of-days"
              type="number"
              value={inputs.days}
              onChange={(e) => handleInputChange('days', Number(e.target.value))}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.days ? 'border-red-300' : 'border-gray-300'
              }`}
              min="1"
              max="365"
              step="1"
              placeholder="Enter number of days"
            />
            {errors.days && (
              <p className="text-red-600 text-sm mt-1">{errors.days}</p>
            )}
          </div>

          <button
            onClick={calculateResults}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 transition-colors font-semibold shadow-md"
          >
            Calculate Daily Interest
          </button>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Formula Used:</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <div>Daily Rate = (1 + Annual Rate)<sup>1/365</sup> - 1</div>
              <div>Interest = Principal × Daily Rate × Days</div>
            </div>
          </div>
        </div>

        {results && (
          <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Calculation Results</h3>
            
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg border border-blue-300">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-700">Daily Interest Rate:</span>
                  <span className="font-semibold text-lg text-blue-600">
                    {results.dailyRate.toFixed(6)}%
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Precise daily rate calculated from {inputs.annualRate}% annual rate
                </p>
              </div>

              <div className="bg-white p-4 rounded-lg border border-green-300">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-700">Interest Earned:</span>
                  <span className="font-semibold text-lg text-green-600">
                    ${results.interestEarned.toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Interest earned over {inputs.days} day{inputs.days > 1 ? 's' : ''}
                </p>
              </div>

              <div className="bg-white p-4 rounded-lg border border-purple-300">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-700">Total Amount:</span>
                  <span className="font-semibold text-lg text-purple-600">
                    ${results.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Principal + Interest
                </p>
              </div>

              <div className="bg-white p-4 rounded-lg border border-orange-300">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-700">Effective Annual Rate:</span>
                  <span className="font-semibold text-lg text-orange-600">
                    {results.effectiveAnnualRate.toFixed(4)}%
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  If compounded daily for full year
                </p>
              </div>
            </div>

            <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Example Use Case:</h4>
              <p className="text-sm text-gray-600">
                For ${inputs.principal.toLocaleString()} at {inputs.annualRate}% annual rate:
                <br />
                Daily rate: {results.dailyRate.toFixed(6)}%
                <br />
                Interest per day: ${(results.interestEarned / inputs.days).toFixed(2)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}