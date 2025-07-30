/**
 * Unit tests for financial calculation utilities
 * Testing core financial formulas for accuracy and edge cases
 */

import {
  annualToDailyRate,
  calculateDailyInterest,
  calculateSimpleInterest,
  calculateCompoundInterest,
  calculateMonthlyPayment,
  generateAmortizationSchedule,
  calculateFutureValue,
  calculatePresentValue,
  roundToPrecision,
  validateFinancialInput
} from '../financialCalculations';

describe('Financial Calculations', () => {
  describe('annualToDailyRate', () => {
    test('converts 5% annual rate to daily rate correctly', () => {
      const annualRate = 0.05;
      const dailyRate = annualToDailyRate(annualRate);
      
      // Expected: (1.05)^(1/365) - 1 ≈ 0.000133680
      expect(dailyRate).toBeCloseTo(0.000133680, 6);
    });

    test('handles 0% rate correctly', () => {
      expect(annualToDailyRate(0)).toBe(0);
    });

    test('handles high rates correctly', () => {
      const annualRate = 0.20; // 20%
      const dailyRate = annualToDailyRate(annualRate);
      expect(dailyRate).toBeCloseTo(0.000501263, 6);
    });
  });

  describe('calculateDailyInterest', () => {
    test('calculates daily interest for example case: $1000 at 5% for 1 day', () => {
      const principal = 1000;
      const annualRate = 0.05;
      const days = 1;
      
      const interest = calculateDailyInterest(principal, annualRate, days);
      
      // Expected: 1000 * 0.000133680 ≈ 0.13368
      expect(interest).toBeCloseTo(0.13368, 4);
    });

    test('scales correctly for multiple days', () => {
      const principal = 1000;
      const annualRate = 0.05;
      
      const interest1Day = calculateDailyInterest(principal, annualRate, 1);
      const interest7Days = calculateDailyInterest(principal, annualRate, 7);
      
      expect(interest7Days).toBeCloseTo(interest1Day * 7, 4);
    });

    test('handles zero principal', () => {
      expect(calculateDailyInterest(0, 0.05, 1)).toBe(0);
    });
  });

  describe('calculateSimpleInterest', () => {
    test('calculates simple interest correctly', () => {
      const principal = 1000;
      const rate = 0.05;
      const time = 2;
      
      const interest = calculateSimpleInterest(principal, rate, time);
      
      // Expected: 1000 * 0.05 * 2 = 100
      expect(interest).toBe(100);
    });

    test('handles fractional time periods', () => {
      const interest = calculateSimpleInterest(1000, 0.06, 0.5);
      expect(interest).toBe(30); // 1000 * 0.06 * 0.5
    });
  });

  describe('calculateCompoundInterest', () => {
    test('calculates compound interest with monthly compounding', () => {
      const principal = 10000;
      const annualRate = 0.07;
      const compoundingFreq = 12; // Monthly
      const years = 10;
      
      const result = calculateCompoundInterest(principal, annualRate, compoundingFreq, years);
      
      // Expected: 10000 * (1 + 0.07/12)^(12*10) ≈ 20,096.61
      expect(result.finalAmount).toBeCloseTo(20096.61, 1);
      expect(result.interestEarned).toBeCloseTo(10096.61, 1);
    });

    test('handles annual compounding correctly', () => {
      const result = calculateCompoundInterest(1000, 0.08, 1, 5);
      
      // Expected: 1000 * (1.08)^5 ≈ 1469.33
      expect(result.finalAmount).toBeCloseTo(1469.33, 1);
    });

    test('handles daily compounding', () => {
      const result = calculateCompoundInterest(5000, 0.04, 365, 3);
      
      // Should be slightly higher than annual compounding due to more frequent compounding
      const annualResult = calculateCompoundInterest(5000, 0.04, 1, 3);
      expect(result.finalAmount).toBeGreaterThan(annualResult.finalAmount);
    });
  });

  describe('calculateMonthlyPayment', () => {
    test('calculates mortgage payment correctly', () => {
      const loanAmount = 250000;
      const annualRate = 0.065; // 6.5%
      const termInYears = 30;
      
      const payment = calculateMonthlyPayment(loanAmount, annualRate, termInYears);
      
      // Expected monthly payment ≈ $1580.17
      expect(payment).toBeCloseTo(1580.17, 1);
    });

    test('handles zero interest rate', () => {
      const payment = calculateMonthlyPayment(12000, 0, 2);
      
      // With 0% interest, payment should be principal / total months
      expect(payment).toBe(500); // 12000 / 24 months
    });

    test('calculates auto loan payment', () => {
      const payment = calculateMonthlyPayment(25000, 0.055, 5);
      
      // Expected payment ≈ $476.04
      expect(payment).toBeCloseTo(476.04, 1);
    });
  });

  describe('generateAmortizationSchedule', () => {
    test('generates correct schedule length', () => {
      const schedule = generateAmortizationSchedule(100000, 0.06, 15);
      
      expect(schedule).toHaveLength(180); // 15 years * 12 months
    });

    test('first payment has correct interest amount', () => {
      const schedule = generateAmortizationSchedule(200000, 0.06, 30);
      
      // First month interest should be 200000 * (0.06/12) = 1000
      expect(schedule[0].interestPayment).toBeCloseTo(1000, 1);
    });

    test('final payment has zero remaining balance', () => {
      const schedule = generateAmortizationSchedule(50000, 0.05, 10);
      const lastPayment = schedule[schedule.length - 1];
      
      expect(lastPayment.remainingBalance).toBeCloseTo(0, 1);
    });

    test('total payments equal loan amount plus interest', () => {
      const loanAmount = 100000;
      const schedule = generateAmortizationSchedule(loanAmount, 0.07, 20);
      
      const totalPrincipal = schedule.reduce((sum, payment) => sum + payment.principalPayment, 0);
      const totalInterest = schedule.reduce((sum, payment) => sum + payment.interestPayment, 0);
      
      expect(totalPrincipal).toBeCloseTo(loanAmount, 1);
      expect(totalInterest).toBeGreaterThan(0);
    });
  });

  describe('calculateFutureValue', () => {
    test('calculates future value correctly', () => {
      const fv = calculateFutureValue(1000, 0.08, 10);
      
      // Expected: 1000 * (1.08)^10 ≈ 2158.92
      expect(fv).toBeCloseTo(2158.92, 1);
    });
  });

  describe('calculatePresentValue', () => {
    test('calculates present value correctly', () => {
      const pv = calculatePresentValue(2000, 0.05, 5);
      
      // Expected: 2000 / (1.05)^5 ≈ 1567.05
      expect(pv).toBeCloseTo(1567.05, 1);
    });

    test('is inverse of future value', () => {
      const presentValue = 1000;
      const rate = 0.06;
      const periods = 8;
      
      const futureValue = calculateFutureValue(presentValue, rate, periods);
      const backToPresentValue = calculatePresentValue(futureValue, rate, periods);
      
      expect(backToPresentValue).toBeCloseTo(presentValue, 1);
    });
  });

  describe('roundToPrecision', () => {
    test('rounds to 2 decimal places by default', () => {
      expect(roundToPrecision(123.456789)).toBe(123.46);
      expect(roundToPrecision(123.454)).toBe(123.45);
    });

    test('rounds to specified precision', () => {
      expect(roundToPrecision(123.456789, 4)).toBe(123.4568);
      expect(roundToPrecision(123.456789, 0)).toBe(123);
    });

    test('handles negative numbers', () => {
      expect(roundToPrecision(-123.456, 2)).toBe(-123.46);
    });
  });

  describe('validateFinancialInput', () => {
    describe('principal validation', () => {
      test('accepts valid principal amounts', () => {
        expect(validateFinancialInput(1000, 'principal').isValid).toBe(true);
        expect(validateFinancialInput(0, 'principal').isValid).toBe(true);
      });

      test('rejects negative principal', () => {
        const result = validateFinancialInput(-100, 'principal');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('negative');
      });

      test('rejects extremely large principal', () => {
        const result = validateFinancialInput(20000000, 'principal');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('too large');
      });

      test('rejects invalid numbers', () => {
        expect(validateFinancialInput(NaN, 'principal').isValid).toBe(false);
        expect(validateFinancialInput(Infinity, 'principal').isValid).toBe(false);
      });
    });

    describe('rate validation', () => {
      test('accepts valid rates', () => {
        expect(validateFinancialInput(0.05, 'rate').isValid).toBe(true);
        expect(validateFinancialInput(0, 'rate').isValid).toBe(true);
        expect(validateFinancialInput(1, 'rate').isValid).toBe(true);
      });

      test('rejects negative rates', () => {
        const result = validateFinancialInput(-0.01, 'rate');
        expect(result.isValid).toBe(false);
      });

      test('rejects rates over 100%', () => {
        const result = validateFinancialInput(1.1, 'rate');
        expect(result.isValid).toBe(false);
      });
    });

    describe('time validation', () => {
      test('accepts valid time periods', () => {
        expect(validateFinancialInput(5, 'time').isValid).toBe(true);
        expect(validateFinancialInput(0.5, 'time').isValid).toBe(true);
      });

      test('rejects negative time', () => {
        const result = validateFinancialInput(-1, 'time');
        expect(result.isValid).toBe(false);
      });

      test('rejects extremely long time periods', () => {
        const result = validateFinancialInput(150, 'time');
        expect(result.isValid).toBe(false);
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('handles very small interest rates', () => {
      const dailyRate = annualToDailyRate(0.0001); // 0.01%
      expect(dailyRate).toBeGreaterThan(0);
      expect(dailyRate).toBeLessThan(0.000001);
    });

    test('handles very large principal amounts within limits', () => {
      const interest = calculateDailyInterest(9999999, 0.05, 1);
      expect(interest).toBeGreaterThan(1000);
    });

    test('compound interest approaches continuous compounding limit', () => {
      const principal = 1000;
      const rate = 0.05;
      const time = 1;
      
      const daily = calculateCompoundInterest(principal, rate, 365, time);
      const hourly = calculateCompoundInterest(principal, rate, 8760, time); // 365*24
      
      // Hourly should be very close to daily (diminishing returns)
      const difference = Math.abs(hourly.finalAmount - daily.finalAmount);
      expect(difference).toBeLessThan(0.01);
    });
  });
});

describe('Real-world Financial Scenarios', () => {
  test('30-year mortgage scenario matches expected values', () => {
    const loanAmount = 400000;
    const annualRate = 0.07; // 7%
    const years = 30;
    
    const monthlyPayment = calculateMonthlyPayment(loanAmount, annualRate, years);
    const schedule = generateAmortizationSchedule(loanAmount, annualRate, years);
    
    // Should be around $2661 monthly payment
    expect(monthlyPayment).toBeCloseTo(2661, 0);
    
    // Total interest should be substantial
    const totalInterest = schedule.reduce((sum, payment) => sum + payment.interestPayment, 0);
    expect(totalInterest).toBeGreaterThan(500000); // More than the loan amount
  });

  test('retirement savings with compound interest', () => {
    const monthlyContribution = 500;
    const annualRate = 0.08;
    const years = 30;
    
    // Simulate monthly contributions with compound growth
    let totalValue = 0;
    const monthlyRate = annualRate / 12;
    
    for (let month = 1; month <= years * 12; month++) {
      totalValue += monthlyContribution;
      totalValue *= (1 + monthlyRate);
    }
    
    // Should grow to substantial amount (over $650k)
    expect(totalValue).toBeGreaterThan(650000);
  });

  test('daily interest calculation for high-yield savings', () => {
    const principal = 50000;
    const annualRate = 0.045; // 4.5% APY
    
    const dailyInterest = calculateDailyInterest(principal, annualRate, 1);
    const monthlyInterest = calculateDailyInterest(principal, annualRate, 30);
    
    // Daily interest should be around $6.18
    expect(dailyInterest).toBeCloseTo(6.18, 1);
    
    // Monthly should be approximately 30x daily (not exactly due to compounding)
    expect(monthlyInterest).toBeGreaterThan(dailyInterest * 29);
    expect(monthlyInterest).toBeLessThan(dailyInterest * 31);
  });
});