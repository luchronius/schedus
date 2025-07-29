'use client';

import { useState } from 'react';
import RESPMultiYearChart from './RESPMultiYearChart';

interface CalculatorInputs {
  birthDate: string;
  educationAge: number;
  currentSavings: number;
  contributionsAlreadyMade: number;
  grantsAlreadyReceived: number;
  grantReceivedThisYear: boolean;
  contributionAmount: number;
  contributionFrequency: 'monthly' | 'annual';
  lumpSumAmount: number;
  expectedReturn: number;
}

interface CalculationResults {
  totalContributions: number;
  investmentGrowth: number;
  governmentGrants: number;
  totalEducationFunding: number;
  unusedGrantEligibility?: number;
  remainingContributionRoom?: number;
}

export default function RESPCalculator() {
  const [inputs, setInputs] = useState<CalculatorInputs>({
    birthDate: process.env.NEXT_PUBLIC_DEFAULT_BIRTH_DATE || '2020-01-01',
    educationAge: Number(process.env.NEXT_PUBLIC_DEFAULT_EDUCATION_AGE) || 18,
    currentSavings: Number(process.env.NEXT_PUBLIC_DEFAULT_CURRENT_SAVINGS) || 5000,
    contributionsAlreadyMade: Number(process.env.NEXT_PUBLIC_DEFAULT_CONTRIBUTIONS_ALREADY_MADE) || 5000,
    grantsAlreadyReceived: Number(process.env.NEXT_PUBLIC_DEFAULT_GRANTS_ALREADY_RECEIVED) || 800,
    grantReceivedThisYear: process.env.NEXT_PUBLIC_DEFAULT_GRANT_RECEIVED_THIS_YEAR === 'true' || false,
    contributionAmount: Number(process.env.NEXT_PUBLIC_DEFAULT_CONTRIBUTION_AMOUNT) || 2000,
    contributionFrequency: (process.env.NEXT_PUBLIC_DEFAULT_CONTRIBUTION_FREQUENCY as 'monthly' | 'annual') || 'annual',
    lumpSumAmount: Number(process.env.NEXT_PUBLIC_DEFAULT_LUMP_SUM_AMOUNT) || 14000,
    expectedReturn: Number(process.env.NEXT_PUBLIC_DEFAULT_EXPECTED_RETURN) || 5.0,
  });

  const [results, setResults] = useState<CalculationResults | null>(null);

  // Calculate current age from birth date
  const calculateCurrentAge = (birthDate: string) => {
    const birth = new Date(birthDate);
    const today = new Date();
    
    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();
    
    if (months < 0) {
      years--;
      months += 12;
    }
    
    if (today.getDate() < birth.getDate()) {
      months--;
      if (months < 0) {
        years--;
        months += 12;
      }
    }
    
    return { years, months };
  };

  // Calculate education start date (September of the year they turn educationAge)
  const calculateEducationStart = (birthDate: string, educationAge: number) => {
    const birth = new Date(birthDate);
    const educationYear = birth.getFullYear() + educationAge;
    return { month: 'September', year: educationYear };
  };

  // Calculate years and months from now to education start
  const calculateTimeToEducation = (birthDate: string, educationAge: number) => {
    const birth = new Date(birthDate);
    const educationStart = new Date(birth.getFullYear() + educationAge, 8, 1); // September 1st
    const today = new Date();
    
    const totalMonths = (educationStart.getFullYear() - today.getFullYear()) * 12 + 
                       (educationStart.getMonth() - today.getMonth());
    
    return Math.max(0, totalMonths);
  };

  // Calculate yearly progression data for multi-year chart
  const calculateYearlyProgression = () => {
    // Parse date to avoid timezone issues  
    const birthDateParts = inputs.birthDate.split('-');
    const birth = new Date(parseInt(birthDateParts[0]), parseInt(birthDateParts[1]) - 1, parseInt(birthDateParts[2]));
    const today = new Date();
    const currentYear = today.getFullYear();
    const monthlyContribution = inputs.contributionFrequency === 'monthly' 
      ? inputs.contributionAmount 
      : inputs.contributionAmount / 12;
    const monthlyRate = inputs.expectedReturn / 100 / 12;
    
    const yearlyData = [];
    let cumulativeContributions = inputs.contributionsAlreadyMade; // Start with contributions already made
    let cumulativeGrants = inputs.grantsAlreadyReceived;
    // Calculate existing investment growth: current savings - contributions - grants
    let cumulativeInvestmentGrowth = Math.max(0, inputs.currentSavings - inputs.contributionsAlreadyMade - inputs.grantsAlreadyReceived);
    const maxLifetimeContributions = 50000;
    
    // Track if lump sum has been applied
    let lumpSumApplied = false;
    let remainingContributionRoom = Math.max(0, maxLifetimeContributions - cumulativeContributions);
    
    // Start from next birthday and go until education starts
    let currentAge = calculateCurrentAge(inputs.birthDate);
    let year = currentYear;
    
    // Start from the next age they'll turn and go until education age
    const nextAge = currentAge.years + 1;
    
    for (let age = nextAge; age <= inputs.educationAge; age++) {
      const yearTheyTurnThisAge = birth.getFullYear() + age;
      const birthMonth = birth.getMonth();
      const birthdayThisYear = new Date(yearTheyTurnThisAge, birthMonth, birth.getDate());
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      // Calculate months from now/previous birthday to this birthday
      let monthsOfContributions = 12;
      let monthsForGrowthCalculation = 12;
      
      if (age === nextAge) {
        // First chart entry - from now to next birthday
        const ageNow = calculateCurrentAge(inputs.birthDate);
        const monthsToNextBirthday = ageNow.months === 0 ? 12 : 12 - ageNow.months;
        
        // Growth calculation always uses the actual time period
        monthsForGrowthCalculation = monthsToNextBirthday;
        
        // Contribution calculation depends on whether grant already received
        if (inputs.grantReceivedThisYear) {
          monthsOfContributions = 0; // No new contributions
        } else {
          monthsOfContributions = monthsToNextBirthday; // Normal contributions
        }
      } else {
        monthsForGrowthCalculation = 12;
      }
      
      // Apply lump sum in the first year if not already applied
      let lumpSumThisPeriod = 0;
      if (!lumpSumApplied && inputs.lumpSumAmount > 0) {
        lumpSumThisPeriod = Math.min(inputs.lumpSumAmount, remainingContributionRoom);
        remainingContributionRoom -= lumpSumThisPeriod;
        lumpSumApplied = true;
      }
      
      // Calculate new regular contributions for this period (limited by remaining contribution room after lump sum)
      const plannedContributionsThisPeriod = monthlyContribution * monthsOfContributions;
      const newContributionsThisPeriod = Math.min(plannedContributionsThisPeriod, remainingContributionRoom);
      
      // Total new contributions this period = lump sum + regular contributions
      const totalNewContributionsThisPeriod = lumpSumThisPeriod + newContributionsThisPeriod;
      
      // Calculate investment growth on current total RESP balance
      let growthOnExisting = 0;
      
      if (age === nextAge) {
        // First chart entry - calculate growth from today to next birthday
        // Growth is on the current RESP savings balance plus any lump sum added
        const baseAmountForGrowth = inputs.currentSavings + lumpSumThisPeriod;
        growthOnExisting = baseAmountForGrowth * (Math.pow(1 + monthlyRate, monthsForGrowthCalculation) - 1);
      } else {
        // Future years - normal growth calculation on running balance
        const currentTotalBalance = cumulativeContributions + cumulativeGrants + cumulativeInvestmentGrowth;
        growthOnExisting = currentTotalBalance * (Math.pow(1 + monthlyRate, monthsForGrowthCalculation) - 1);
      }
      
      // Calculate growth on new contributions (each contribution grows for different periods)
      let growthOnNewContributions = 0;
      for (let month = 1; month <= monthsOfContributions; month++) {
        const growthPeriod = monthsOfContributions - month + 1;
        growthOnNewContributions += monthlyContribution * (Math.pow(1 + monthlyRate, growthPeriod) - 1);
      }
      
      // Calculate grants for this year
      let newGrantsThisYear = 0;
      const feb1ThisYear = new Date(yearTheyTurnThisAge, 1, 1); // February 1st of this year
      
      if (age === nextAge) {
        // First chart entry - no new grants since we're just calculating growth to next birthday
        // If grant already received this year, no additional grants
        // If grant not received, still no new grants for this short period
        newGrantsThisYear = 0;
      } else {
        // Future years - normal grant calculation
        if (birthdayThisYear >= feb1ThisYear) {
          // CESG grant calculation: 20% on first $2,500 contributed per year
          // BUT only if there are actual new contributions this year
          const annualContribution = monthlyContribution * 12;
          let contributionForGrantCalculation = 0;
          
          if (age === nextAge + 1) {
            // First projection year: include lump sum + regular contributions
            const totalContributionsThisYear = (lumpSumApplied ? inputs.lumpSumAmount : 0) + newContributionsThisPeriod;
            contributionForGrantCalculation = Math.min(totalContributionsThisYear, 2500);
          } else {
            // Future years: only count if there are actual new contributions this year
            // If we've hit the $50k limit, newContributionsThisPeriod will be 0, so no grant
            contributionForGrantCalculation = newContributionsThisPeriod > 0 ? Math.min(newContributionsThisPeriod, 2500) : 0;
          }
          
          const yearGrant = contributionForGrantCalculation * 0.2; // 20% of eligible contribution
          const remainingEligibility = 7200 - cumulativeGrants;
          newGrantsThisYear = Math.min(yearGrant, Math.max(0, remainingEligibility));
        }
      }
      
      // Growth on grants received in February (if any)
      let grantGrowth = 0;
      if (newGrantsThisYear > 0 && birthdayThisYear >= feb1ThisYear) {
        const monthsFromFeb1ToBirthday = birthdayThisYear.getMonth() >= 1 
          ? birthdayThisYear.getMonth() - 1 
          : 11 + birthdayThisYear.getMonth();
        grantGrowth = newGrantsThisYear * (Math.pow(1 + monthlyRate, monthsFromFeb1ToBirthday) - 1);
      }
      
      // Update cumulative totals
      cumulativeContributions += totalNewContributionsThisPeriod;
      cumulativeGrants += newGrantsThisYear;
      cumulativeInvestmentGrowth += growthOnExisting + growthOnNewContributions + grantGrowth;
      
      // Update remaining contribution room for next iteration
      remainingContributionRoom = Math.max(0, maxLifetimeContributions - cumulativeContributions);
      
      yearlyData.push({
        currentSavings: Math.round(cumulativeContributions), // Total contributions so far
        grantsReceived: Math.round(cumulativeGrants), // Total grants so far
        investmentGrowth: Math.round(cumulativeInvestmentGrowth), // Cumulative growth
        year: `${monthNames[birth.getMonth()]} ${yearTheyTurnThisAge}`,
        childAge: `${age} years old`
      });
    }
    
    return yearlyData;
  };

  const calculateRESP = () => {
    // Use the yearly progression data which has the accurate calculations
    const yearlyData = calculateYearlyProgression();
    
    if (yearlyData.length === 0) {
      // No progression data, use basic calculations
      setResults({
        totalContributions: inputs.contributionsAlreadyMade,
        investmentGrowth: Math.max(0, inputs.currentSavings - inputs.contributionsAlreadyMade - inputs.grantsAlreadyReceived),
        governmentGrants: inputs.grantsAlreadyReceived,
        totalEducationFunding: inputs.currentSavings,
        unusedGrantEligibility: 7200 - inputs.grantsAlreadyReceived > 0 ? 7200 - inputs.grantsAlreadyReceived : undefined,
        remainingContributionRoom: 50000 - inputs.contributionsAlreadyMade > 0 ? 50000 - inputs.contributionsAlreadyMade : undefined,
      });
      return;
    }
    
    // Get the final year data which contains the accurate totals
    const finalYear = yearlyData[yearlyData.length - 1];
    
    // Calculate totals from the final year
    const totalContributions = finalYear.currentSavings;
    const totalGrants = finalYear.grantsReceived;
    const totalInvestmentGrowth = finalYear.investmentGrowth;
    const totalEducationFunding = totalContributions + totalGrants + totalInvestmentGrowth;
    
    // Calculate remaining eligibilities
    const unusedGrantEligibility = 7200 - totalGrants;
    const remainingContributionRoom = 50000 - totalContributions;

    setResults({
      totalContributions: Math.round(totalContributions),
      investmentGrowth: Math.round(totalInvestmentGrowth),
      governmentGrants: Math.round(totalGrants),
      totalEducationFunding: Math.round(totalEducationFunding),
      unusedGrantEligibility: unusedGrantEligibility > 0 ? Math.round(unusedGrantEligibility) : undefined,
      remainingContributionRoom: remainingContributionRoom > 0 ? Math.round(remainingContributionRoom) : undefined,
    });
  };

  const handleInputChange = (field: keyof CalculatorInputs, value: number) => {
    setInputs(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <h2 className="text-3xl font-bold text-gray-900 mb-6">RESP Calculator</h2>
      <p className="text-gray-600 mb-8">
        Plan for your child's education with our RESP calculator. See how much you could save with government grants and compound growth.
      </p>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Child's birthdate
            </label>
            <input
              type="date"
              value={inputs.birthDate}
              onChange={(e) => setInputs(prev => ({ ...prev, birthDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-td-blue focus:border-td-blue"
            />
            {inputs.birthDate && (
              <p className="text-sm text-gray-600 mt-1">
                Current age: {(() => {
                  const age = calculateCurrentAge(inputs.birthDate);
                  return `${age.years} years, ${age.months} months`;
                })()}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Age when education starts
            </label>
            <input
              type="number"
              value={inputs.educationAge}
              onChange={(e) => handleInputChange('educationAge', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-td-blue focus:border-td-blue"
              min="17"
              max="25"
            />
            {inputs.birthDate && (
              <p className="text-sm text-gray-600 mt-1">
                Education starts: {(() => {
                  const educationStart = calculateEducationStart(inputs.birthDate, inputs.educationAge);
                  return `${educationStart.month} ${educationStart.year}`;
                })()}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current RESP savings
            </label>
            <input
              type="number"
              value={inputs.currentSavings}
              onChange={(e) => handleInputChange('currentSavings', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-td-blue focus:border-td-blue"
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contributions already made
            </label>
            <input
              type="number"
              value={inputs.contributionsAlreadyMade}
              onChange={(e) => handleInputChange('contributionsAlreadyMade', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-td-blue focus:border-td-blue"
              min="0"
              max="50000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Grants already received
            </label>
            <input
              type="number"
              value={inputs.grantsAlreadyReceived}
              onChange={(e) => handleInputChange('grantsAlreadyReceived', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-td-blue focus:border-td-blue"
              min="0"
              max="7200"
            />
            <div className="mt-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={inputs.grantReceivedThisYear}
                  onChange={(e) => setInputs(prev => ({ ...prev, grantReceivedThisYear: e.target.checked }))}
                  className="mr-2 h-4 w-4 text-td-blue focus:ring-td-blue focus:ring-2 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Grant already received this year?</span>
              </label>
            </div>
            
            <div className="mt-3 p-3 bg-gray-50 rounded border">
              <div className="text-sm font-medium text-gray-700 mb-1">Investment growth so far:</div>
              <div className="text-lg font-semibold text-purple-600">
                ${Math.max(0, inputs.currentSavings - inputs.contributionsAlreadyMade - inputs.grantsAlreadyReceived).toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Current savings (${inputs.currentSavings.toLocaleString()}) - Contributions (${inputs.contributionsAlreadyMade.toLocaleString()}) - Grants (${inputs.grantsAlreadyReceived.toLocaleString()})
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contribution frequency
            </label>
            <select
              value={inputs.contributionFrequency}
              onChange={(e) => setInputs(prev => ({ ...prev, contributionFrequency: e.target.value as 'monthly' | 'annual' }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-td-blue focus:border-td-blue"
            >
              <option value="monthly">Monthly</option>
              <option value="annual">Annually</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount I will contribute
            </label>
            <input
              type="number"
              value={inputs.contributionAmount}
              onChange={(e) => handleInputChange('contributionAmount', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-td-blue focus:border-td-blue"
              min="0"
              placeholder={inputs.contributionFrequency === 'monthly' ? 'Monthly amount' : 'Annual amount'}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              One-time lump sum contribution
            </label>
            <input
              type="number"
              value={inputs.lumpSumAmount}
              onChange={(e) => handleInputChange('lumpSumAmount', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-td-blue focus:border-td-blue"
              min="0"
              max="50000"
              placeholder="Lump sum amount"
            />
            <p className="text-sm text-gray-600 mt-1">
              Optimal strategy: $14,000 lump sum to maximize grant collection over 15+ years
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Expected annual return (%)
            </label>
            <input
              type="number"
              step="0.1"
              value={inputs.expectedReturn}
              onChange={(e) => handleInputChange('expectedReturn', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-td-blue focus:border-td-blue"
              min="0"
              max="15"
            />
          </div>

          <button
            onClick={calculateRESP}
            className="w-full bg-green-600 text-white py-3 px-6 rounded-md hover:bg-green-700 transition-colors font-semibold shadow-md"
          >
            Calculate RESP Savings
          </button>
        </div>

        {results && (
          <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Your RESP Projection</h3>
            {(() => {
              // yearlyData is already calculated in calculateRESP, but we need it here too for the final year display
              const yearlyData = calculateYearlyProgression();
              const finalYear = yearlyData.length > 0 ? yearlyData[yearlyData.length - 1] : null;
              return (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Your contributions:</span>
                    <span className="font-semibold text-lg text-gray-900">${results.totalContributions.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Investment growth:</span>
                    <span className="font-semibold text-lg text-blue-600">${results.investmentGrowth.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Government grants:</span>
                    <span className="font-semibold text-lg text-td-green">${results.governmentGrants.toLocaleString()}</span>
                  </div>
                  {finalYear && (
                    <div className="bg-white p-3 rounded border border-blue-300 mt-4">
                      <div className="text-sm font-medium text-gray-600 mb-2">
                        Final Year Projection ({finalYear.year} - {finalYear.childAge}):
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="text-center">
                          <div className="text-blue-600 font-semibold">${finalYear.currentSavings.toLocaleString()}</div>
                          <div className="text-gray-500">Contributions</div>
                        </div>
                        <div className="text-center">
                          <div className="text-green-600 font-semibold">${finalYear.grantsReceived.toLocaleString()}</div>
                          <div className="text-gray-500">Grants</div>
                        </div>
                        <div className="text-center">
                          <div className="text-purple-600 font-semibold">${finalYear.investmentGrowth.toLocaleString()}</div>
                          <div className="text-gray-500">Growth</div>
                        </div>
                      </div>
                    </div>
                  )}
                  {results.unusedGrantEligibility && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Unused grant eligibility:</span>
                  <span className="font-medium text-sm text-red-600">-${results.unusedGrantEligibility.toLocaleString()}</span>
                </div>
              )}
              {results.remainingContributionRoom && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Remaining contribution room:</span>
                  <span className="font-medium text-sm text-blue-600">${results.remainingContributionRoom.toLocaleString()}</span>
                </div>
              )}
                  <hr className="border-gray-300" />
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-700">Total education funding:</span>
                    <span className="font-bold text-2xl text-td-blue">${results.totalEducationFunding.toLocaleString()}</span>
                  </div>
                </div>
              );
            })()}
            
            <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600">
                This calculation includes the Canada Education Savings Grant (CESG) of 20% on the first $2,500 contributed annually, 
                up to a lifetime maximum of $7,200 per beneficiary. RESP contributions are limited to $50,000 lifetime maximum per beneficiary. 
                Investment growth assumes compound returns over the investment period.
              </p>
            </div>
          </div>
        )}
      </div>

      {results && (
        <div className="mt-8">
          <RESPMultiYearChart yearlyData={calculateYearlyProgression()} />
        </div>
      )}
    </div>
  );
}