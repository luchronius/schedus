'use client';

import { useState } from 'react';
import {
  calculateCompoundInterest,
  roundToPrecision,
  validateFinancialInput,
  COMPOUNDING_FREQUENCIES
} from '../utils/financialCalculations';

interface CompoundInterestInputs {
  principal: number;
  annualRate: number;
  compoundingFrequency: number;
  timeInYears: number;
}

interface CompoundInterestResults {
  finalAmount: number;
  interestEarned: number;
  totalContributions: number;
  effectiveAnnualRate: number;
  monthlyGrowth: Array<{
    month: number;
    balance: number;
    interestEarned: number;
    cumulativeInterest: number;
  }>;
}

export default function CompoundInterestCalculator() {
  const [inputs, setInputs] = useState<CompoundInterestInputs>({
    principal: 10000,
    annualRate: 7.0,
    compoundingFrequency: 12, // Monthly
    timeInYears: 10
  });

  const [results, setResults] = useState<CompoundInterestResults | null>(null);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [showMonthlyBreakdown, setShowMonthlyBreakdown] = useState(false);

  const validateInputs = (): boolean => {
    const newErrors: {[key: string]: string} = {};

    const principalValidation = validateFinancialInput(inputs.principal, 'principal');
    if (!principalValidation.isValid) {
      newErrors.principal = principalValidation.error!;
    }
    if (inputs.principal < 0) {
      newErrors.principal = 'Principal amount cannot be negative';
    }

    const rateValidation = validateFinancialInput(inputs.annualRate / 100, 'rate');
    if (!rateValidation.isValid) {
      newErrors.annualRate = rateValidation.error!;
    }

    const timeValidation = validateFinancialInput(inputs.timeInYears, 'time');
    if (!timeValidation.isValid) {
      newErrors.timeInYears = timeValidation.error!;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const calculateMonthlyGrowth = (
    principal: number,
    annualRate: number,
    compoundingFreq: number,
    years: number
  ) => {
    const monthlyGrowth = [];
    const periodsPerYear = compoundingFreq;
    const ratePerPeriod = annualRate / periodsPerYear;
    const totalPeriods = Math.floor(periodsPerYear * years);
    
    let currentBalance = principal;
    let cumulativeInterest = 0;

    // Calculate for each period (month approximation for display)
    for (let period = 1; period <= totalPeriods && period <= 120; period++) { // Limit to 10 years of monthly data
      const interestThisPeriod = currentBalance * ratePerPeriod;
      currentBalance += interestThisPeriod;
      cumulativeInterest += interestThisPeriod;

      // Only add monthly entries (every 12th period for annual compounding, every 1st for monthly, etc.)
      if (period % Math.max(1, Math.round(periodsPerYear / 12)) === 0) {
        monthlyGrowth.push({
          month: Math.round(period / periodsPerYear * 12),
          balance: roundToPrecision(currentBalance),
          interestEarned: roundToPrecision(interestThisPeriod),
          cumulativeInterest: roundToPrecision(cumulativeInterest)
        });
      }
    }

    return monthlyGrowth;
  };

  const calculateResults = () => {
    if (!validateInputs()) return;

    const annualRateDecimal = inputs.annualRate / 100;
    const compoundResult = calculateCompoundInterest(
      inputs.principal,
      annualRateDecimal,
      inputs.compoundingFrequency,
      inputs.timeInYears
    );

    // Calculate effective annual rate
    const effectiveAnnualRate = Math.pow(1 + annualRateDecimal / inputs.compoundingFrequency, inputs.compoundingFrequency) - 1;

    // Calculate monthly growth for visualization
    const monthlyGrowth = calculateMonthlyGrowth(
      inputs.principal,
      annualRateDecimal,
      inputs.compoundingFrequency,
      inputs.timeInYears
    );

    setResults({
      finalAmount: compoundResult.finalAmount,
      interestEarned: compoundResult.interestEarned,
      totalContributions: inputs.principal, // For single lump sum
      effectiveAnnualRate: roundToPrecision(effectiveAnnualRate * 100, 4),
      monthlyGrowth
    });
  };

  const handleInputChange = (field: keyof CompoundInterestInputs, value: number) => {
    setInputs(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const getCompoundingLabel = (frequency: number) => {
    const freq = Object.values(COMPOUNDING_FREQUENCIES).find(f => f.value === frequency);
    return freq ? freq.label : `${frequency} times per year`;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <h2 className="text-3xl font-bold text-gray-900 mb-6">Compound Interest Calculator</h2>
      <p className="text-gray-600 mb-8">
        Calculate how your money grows with compound interest over time. 
        See the power of compounding with different frequencies and time periods.
      </p>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div>
            <label htmlFor="principal-amount" className="block text-sm font-medium text-gray-700 mb-2">
              Principal Amount ($)
            </label>
            <input
              id="principal-amount"
              type="number"
              value={inputs.principal}
              onChange={(e) => handleInputChange('principal', Number(e.target.value))}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                errors.principal ? 'border-red-300' : 'border-gray-300'
              }`}
              step="0.01"
              placeholder="Enter initial investment"
            />
            {errors.principal && (
              <p className="text-red-600 text-sm mt-1">{errors.principal}</p>
            )}
          </div>

          <div>
            <label htmlFor="annual-rate" className="block text-sm font-medium text-gray-700 mb-2">
              Annual Interest Rate (%)
            </label>
            <input
              id="annual-rate"
              type="number"
              value={inputs.annualRate}
              onChange={(e) => handleInputChange('annualRate', Number(e.target.value))}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
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
            <label htmlFor="compounding-frequency" className="block text-sm font-medium text-gray-700 mb-2">
              Compounding Frequency
            </label>
            <select
              id="compounding-frequency"
              value={inputs.compoundingFrequency}
              onChange={(e) => handleInputChange('compoundingFrequency', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              {Object.entries(COMPOUNDING_FREQUENCIES).map(([key, freq]) => (
                <option key={key} value={freq.value}>
                  {freq.label} ({freq.value}x per year)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="investment-period" className="block text-sm font-medium text-gray-700 mb-2">
              Investment Period (Years)
            </label>
            <input
              id="investment-period"
              type="number"
              value={inputs.timeInYears}
              onChange={(e) => handleInputChange('timeInYears', Number(e.target.value))}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                errors.timeInYears ? 'border-red-300' : 'border-gray-300'
              }`}
              min="0.1"
              max="50"
              step="0.1"
              placeholder="Enter investment period in years"
            />
            {errors.timeInYears && (
              <p className="text-red-600 text-sm mt-1">{errors.timeInYears}</p>
            )}
          </div>

          <button
            onClick={calculateResults}
            className="w-full bg-green-600 text-white py-3 px-6 rounded-md hover:bg-green-700 transition-colors font-semibold shadow-md"
          >
            Calculate Compound Growth
          </button>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Formula Used:</h4>
            <div className="text-sm text-gray-600">
              A = P(1 + r/n)<sup>nt</sup>
              <br />
              <span className="text-xs">
                Where: A = final amount, P = principal, r = annual rate, 
                n = compounding frequency, t = time in years
              </span>
            </div>
          </div>
        </div>

        {results && (
          <div className="bg-green-50 p-6 rounded-lg border border-green-200">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Investment Growth</h3>
            
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg border border-gray-300">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-700">Initial Investment:</span>
                  <span className="font-semibold text-lg text-gray-900">
                    ${inputs.principal.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border border-green-300">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-700">Interest Earned:</span>
                  <span className="font-semibold text-lg text-green-600">
                    ${results.interestEarned.toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {getCompoundingLabel(inputs.compoundingFrequency)} compounding over {inputs.timeInYears} years
                </p>
              </div>

              <div className="bg-white p-4 rounded-lg border border-blue-300">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-700">Final Amount:</span>
                  <span className="font-bold text-xl text-blue-600">
                    ${results.finalAmount.toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Principal + Compound Interest
                </p>
              </div>

              <div className="bg-white p-4 rounded-lg border border-purple-300">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-700">Effective Annual Rate:</span>
                  <span className="font-semibold text-lg text-purple-600">
                    {results.effectiveAnnualRate}%
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  True annual yield with compounding
                </p>
              </div>

              <div className="bg-white p-4 rounded-lg border border-orange-300">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-700">Growth Multiple:</span>
                  <span className="font-semibold text-lg text-orange-600">
                    {(results.finalAmount / inputs.principal).toFixed(2)}x
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Your money multiplied by this factor
                </p>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={() => setShowMonthlyBreakdown(!showMonthlyBreakdown)}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors text-sm"
              >
                {showMonthlyBreakdown ? 'Hide' : 'Show'} Growth Timeline
              </button>
            </div>

            {showMonthlyBreakdown && results.monthlyGrowth.length > 0 && (
              <div className="mt-4 bg-white p-4 rounded-lg border border-gray-300 max-h-64 overflow-y-auto">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Growth Timeline</h4>
                <div className="space-y-2">
                  {results.monthlyGrowth.filter((_, index) => index % 6 === 0 || index === results.monthlyGrowth.length - 1).map((period, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        Month {period.month}:
                      </span>
                      <span className="font-medium text-green-600">
                        ${period.balance.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Key Insights:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• More frequent compounding = higher returns</li>
                <li>• Interest earned: {((results.interestEarned / inputs.principal) * 100).toFixed(1)}% of initial investment</li>
                <li>• Average annual growth: ${(results.interestEarned / inputs.timeInYears).toLocaleString()}</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}