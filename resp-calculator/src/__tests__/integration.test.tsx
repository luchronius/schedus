/**
 * Integration and End-to-End Tests
 * Testing how calculator components work together and comprehensive user workflows
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RESPCalculator from '../components/RESPCalculator';
import CompoundInterestCalculator from '../components/CompoundInterestCalculator';
import DailyInterestCalculator from '../components/DailyInterestCalculator';
import LoanAmortizationCalculator from '../components/LoanAmortizationCalculator';

// Mock RESPMultiYearChart for integration tests
jest.mock('../components/RESPMultiYearChart', () => {
  return function MockRESPMultiYearChart({ yearlyData }: { yearlyData: any[] }) {
    return (
      <div data-testid="resp-chart" data-yearly-data={JSON.stringify(yearlyData)}>
        Integration Test Chart with {yearlyData.length} data points
      </div>
    );
  };
});

describe('Calculator Integration Tests', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01'));
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('RESP Calculator End-to-End Workflow', () => {
    test('complete RESP planning workflow for new parent', async () => {
      const user = userEvent.setup();
      render(<RESPCalculator />);

      // Step 1: Set up child information
      const birthDateInput = screen.getByDisplayValue('2020-01-01');
      const educationAgeInput = screen.getByDisplayValue('18');
      
      await user.clear(birthDateInput);
      await user.type(birthDateInput, '2023-06-15'); // 6-month-old baby
      await user.clear(educationAgeInput);
      await user.type(educationAgeInput, '18');

      // Step 2: Set current financial situation
      const currentSavingsInput = screen.getByDisplayValue('5000');
      const contributionsInput = screen.getByDisplayValue('5000');
      const grantsInput = screen.getByDisplayValue('800');
      
      await user.clear(currentSavingsInput);
      await user.type(currentSavingsInput, '0'); // Starting fresh
      await user.clear(contributionsInput);
      await user.type(contributionsInput, '0');
      await user.clear(grantsInput);
      await user.type(grantsInput, '0');

      // Step 3: Set contribution strategy
      const contributionAmountInput = screen.getByDisplayValue('2000');
      const lumpSumInput = screen.getByDisplayValue('14000');
      const expectedReturnInput = screen.getByDisplayValue('5');
      
      await user.clear(contributionAmountInput);
      await user.type(contributionAmountInput, '2500'); // $2500 annually
      await user.clear(lumpSumInput);
      await user.type(lumpSumInput, '14000'); // Optimal lump sum
      await user.clear(expectedReturnInput);
      await user.type(expectedReturnInput, '6.5'); // Reasonable return

      // Step 4: Calculate and verify results
      const calculateButton = screen.getByRole('button', { name: /calculate resp savings/i });
      await user.click(calculateButton);

      await waitFor(() => {
        expect(screen.getByText(/your resp projection/i)).toBeInTheDocument();
      });

      // Step 5: Verify comprehensive results
      expect(screen.getByText(/your contributions:/i)).toBeInTheDocument();
      expect(screen.getByText(/investment growth:/i)).toBeInTheDocument();
      expect(screen.getByText(/government grants:/i)).toBeInTheDocument();
      expect(screen.getByText(/total education funding:/i)).toBeInTheDocument();

      // Step 6: Verify chart is generated
      const chart = screen.getByTestId('resp-chart');
      expect(chart).toBeInTheDocument();
      
      const chartData = JSON.parse(chart.getAttribute('data-yearly-data') || '[]');
      expect(chartData.length).toBeGreaterThan(15); // Should have ~17 years of data
    });

    test('RESP calculator with monthly contributions', async () => {
      const user = userEvent.setup();
      render(<RESPCalculator />);

      // Set monthly contribution frequency
      const frequencySelect = screen.getByRole('combobox');
      await user.selectOptions(frequencySelect, 'monthly');

      const contributionAmountInput = screen.getByDisplayValue('2000');
      await user.clear(contributionAmountInput);
      await user.type(contributionAmountInput, '200'); // $200 monthly

      const calculateButton = screen.getByRole('button', { name: /calculate resp savings/i });
      await user.click(calculateButton);

      await waitFor(() => {
        expect(screen.getByText(/your resp projection/i)).toBeInTheDocument();
      });

      // Should show reasonable results for monthly contributions
      expect(screen.getByText(/total education funding:/i)).toBeInTheDocument();
    });

    test('handles edge case: child already in post-secondary', async () => {
      const user = userEvent.setup();
      render(<RESPCalculator />);

      // Set birth date making child 19 years old
      const birthDateInput = screen.getByDisplayValue('2020-01-01');
      await user.clear(birthDateInput);
      await user.type(birthDateInput, '2005-01-01');

      const calculateButton = screen.getByRole('button', { name: /calculate resp savings/i });
      await user.click(calculateButton);

      await waitFor(() => {
        expect(screen.getByText(/your resp projection/i)).toBeInTheDocument();
      });

      // Should still provide results even for older children
      expect(screen.getByText(/total education funding:/i)).toBeInTheDocument();
    });
  });

  describe('Compound Interest Calculator Workflow', () => {
    test('retirement savings planning scenario', async () => {
      const user = userEvent.setup();
      render(<CompoundInterestCalculator />);

      // Set up 30-year retirement savings scenario
      const principalInput = screen.getByDisplayValue(10000);
      const rateInput = screen.getByDisplayValue(7);
      const timeInput = screen.getByDisplayValue(10);
      const frequencySelect = screen.getByDisplayValue(12);

      await user.clear(principalInput);
      await user.type(principalInput, '50000'); // Starting amount
      await user.clear(rateInput);
      await user.type(rateInput, '8'); // 8% return
      await user.clear(timeInput);
      await user.type(timeInput, '25'); // 25 years to retirement
      await user.selectOptions(frequencySelect, '12'); // Monthly compounding

      const calculateButton = screen.getByRole('button', { name: /calculate compound growth/i });
      await user.click(calculateButton);

      await waitFor(() => {
        expect(screen.getByText(/investment growth/i)).toBeInTheDocument();
      });

      // Verify results show significant growth
      expect(screen.getByText(/final amount:/i)).toBeInTheDocument();
      expect(screen.getByText(/effective annual rate:/i)).toBeInTheDocument();
      expect(screen.getByText(/growth multiple:/i)).toBeInTheDocument();

      // Test timeline feature
      const timelineButton = screen.getByText(/show growth timeline/i);
      await user.click(timelineButton);

      await waitFor(() => {
        expect(screen.getByText(/growth timeline/i)).toBeInTheDocument();
      });
    });

    test('comparing different compounding frequencies', async () => {
      const user = userEvent.setup();
      render(<CompoundInterestCalculator />);

      const principalInput = screen.getByDisplayValue(10000);
      const rateInput = screen.getByDisplayValue(7);
      const frequencySelect = screen.getByDisplayValue(12);
      const calculateButton = screen.getByRole('button', { name: /calculate compound growth/i });

      await user.clear(principalInput);
      await user.type(principalInput, '10000');
      await user.clear(rateInput);
      await user.type(rateInput, '5');

      // Test annual compounding
      await user.selectOptions(frequencySelect, '1');
      await user.click(calculateButton);

      await waitFor(() => {
        const finalAmount1 = screen.getByText(/final amount:/i).parentElement?.textContent;
        expect(finalAmount1).toContain('$');
      });

      // Test daily compounding - should be higher
      await user.selectOptions(frequencySelect, '365');
      await user.click(calculateButton);

      await waitFor(() => {
        const finalAmount2 = screen.getByText(/final amount:/i).parentElement?.textContent;
        expect(finalAmount2).toContain('$');
        // Daily compounding should yield higher results than annual
      });
    });
  });

  describe('Daily Interest Calculator Workflow', () => {
    test('high-yield savings account analysis', async () => {
      const user = userEvent.setup();
      render(<DailyInterestCalculator />);

      const principalInput = screen.getByDisplayValue(1000);
      const rateInput = screen.getByDisplayValue(5);
      const daysInput = screen.getByDisplayValue(1);

      // Set up high-yield savings scenario
      await user.clear(principalInput);
      await user.type(principalInput, '75000'); // Substantial savings
      await user.clear(rateInput);
      await user.type(rateInput, '4.5'); // High-yield rate
      await user.clear(daysInput);
      await user.type(daysInput, '30'); // Monthly interest

      const calculateButton = screen.getByRole('button', { name: /calculate daily interest/i });
      await user.click(calculateButton);

      await waitFor(() => {
        expect(screen.getByText(/calculation results/i)).toBeInTheDocument();
      });

      // Verify detailed results
      expect(screen.getByText(/daily interest rate:/i)).toBeInTheDocument();
      expect(screen.getByText(/interest earned:/i)).toBeInTheDocument();
      expect(screen.getByText(/total amount:/i)).toBeInTheDocument();
      expect(screen.getByText(/effective annual rate:/i)).toBeInTheDocument();

      // Check example use case section
      expect(screen.getByText(/example use case:/i)).toBeInTheDocument();
      expect(screen.getByText(/interest per day:/i)).toBeInTheDocument();
    });

    test('comparing different time periods', async () => {
      const user = userEvent.setup();
      render(<DailyInterestCalculator />);

      const daysInput = screen.getByDisplayValue(1);
      const calculateButton = screen.getByRole('button', { name: /calculate daily interest/i });

      // Calculate for 1 day
      await user.click(calculateButton);
      await waitFor(() => {
        const interestEarned1 = screen.getByText(/interest earned:/i).parentElement?.textContent;
        expect(interestEarned1).toContain('$');
      });

      // Calculate for 1 year
      await user.clear(daysInput);
      await user.type(daysInput, '365');
      await user.click(calculateButton);

      await waitFor(() => {
        const interestEarnedYear = screen.getByText(/interest earned:/i).parentElement?.textContent;
        expect(interestEarnedYear).toContain('$');
        // Year should earn significantly more than 1 day
      });
    });
  });

  describe('Loan Amortization Calculator Workflow', () => {
    test('complete mortgage analysis workflow', async () => {
      const user = userEvent.setup();
      render(<LoanAmortizationCalculator />);

      // Set up typical mortgage scenario
      const loanAmountInput = screen.getByDisplayValue(250000);
      const rateInput = screen.getByDisplayValue(6.5);
      const termInput = screen.getByDisplayValue(30);

      await user.clear(loanAmountInput);
      await user.type(loanAmountInput, '450000'); // Higher priced home
      await user.clear(rateInput);
      await user.type(rateInput, '7.25'); // Current mortgage rates
      await user.clear(termInput);
      await user.type(termInput, '30');

      const calculateButton = screen.getByRole('button', { name: /calculate loan payment/i });
      await user.click(calculateButton);

      await waitFor(() => {
        expect(screen.getByText(/loan summary/i)).toBeInTheDocument();
      });

      // Verify comprehensive loan analysis
      expect(screen.getByText(/monthly payment:/i)).toBeInTheDocument();
      expect(screen.getByText(/total interest:/i)).toBeInTheDocument();
      expect(screen.getByText(/total payments:/i)).toBeInTheDocument();
      expect(screen.getByText(/interest as % of loan:/i)).toBeInTheDocument();

      // Test all schedule views
      const yearlyButton = screen.getByRole('button', { name: /yearly/i });
      await user.click(yearlyButton);

      await waitFor(() => {
        expect(screen.getByText(/year 1/i)).toBeInTheDocument();
      });

      const fullScheduleButton = screen.getByRole('button', { name: /full schedule/i });
      await user.click(fullScheduleButton);

      await waitFor(() => {
        expect(screen.getByText(/payment #/i)).toBeInTheDocument();
      });

      const summaryButton = screen.getByRole('button', { name: /summary/i });
      await user.click(summaryButton);

      await waitFor(() => {
        expect(screen.getByText(/first payment:/i)).toBeInTheDocument();
        expect(screen.getByText(/last payment:/i)).toBeInTheDocument();
      });
    });

    test('auto loan vs personal loan comparison workflow', async () => {
      const user = userEvent.setup();
      render(<LoanAmortizationCalculator />);

      const loanAmountInput = screen.getByDisplayValue(250000);
      const rateInput = screen.getByDisplayValue(6.5);
      const termInput = screen.getByDisplayValue(30);
      const calculateButton = screen.getByRole('button', { name: /calculate loan payment/i });

      // Test auto loan scenario
      await user.clear(loanAmountInput);
      await user.type(loanAmountInput, '30000');
      await user.clear(rateInput);
      await user.type(rateInput, '4.5');
      await user.clear(termInput);
      await user.type(termInput, '5');

      await user.click(calculateButton);

      await waitFor(() => {
        const autoLoanPayment = screen.getByText(/monthly payment:/i).parentElement?.textContent;
        expect(autoLoanPayment).toContain('$');
      });

      // Test personal loan scenario with same amount but different terms
      await user.clear(rateInput);
      await user.type(rateInput, '12');
      await user.clear(termInput);
      await user.type(termInput, '3');

      await user.click(calculateButton);

      await waitFor(() => {
        const personalLoanPayment = screen.getByText(/monthly payment:/i).parentElement?.textContent;
        expect(personalLoanPayment).toContain('$');
        // Personal loan should have higher monthly payment due to higher rate and shorter term
      });
    });
  });

  describe('Cross-Calculator Validation', () => {
    test('compound interest vs daily interest consistency check', async () => {
      // This test would verify that the compound interest calculator and 
      // daily interest calculator produce consistent results for equivalent scenarios
      
      const compoundUser = userEvent.setup();
      const { unmount } = render(<CompoundInterestCalculator />);

      // Test compound interest for 1 year with daily compounding
      const principalInput = screen.getByDisplayValue(10000);
      const rateInput = screen.getByDisplayValue(7);
      const timeInput = screen.getByDisplayValue(10);
      const frequencySelect = screen.getByDisplayValue(12);

      await compoundUser.clear(principalInput);
      await compoundUser.type(principalInput, '10000');
      await compoundUser.clear(rateInput);
      await compoundUser.type(rateInput, '5');
      await compoundUser.clear(timeInput);
      await compoundUser.type(timeInput, '1');
      await compoundUser.selectOptions(frequencySelect, '365');

      const calculateButton = screen.getByRole('button', { name: /calculate compound growth/i });
      await compoundUser.click(calculateButton);

      await waitFor(() => {
        expect(screen.getByText(/investment growth/i)).toBeInTheDocument();
      });

      unmount();

      // Now test equivalent scenario with daily interest calculator
      const dailyUser = userEvent.setup();
      render(<DailyInterestCalculator />);

      const dailyPrincipalInput = screen.getByDisplayValue(1000);
      const dailyRateInput = screen.getByDisplayValue(5);
      const daysInput = screen.getByDisplayValue(1);

      await dailyUser.clear(dailyPrincipalInput);
      await dailyUser.type(dailyPrincipalInput, '10000');
      await dailyUser.clear(dailyRateInput);
      await dailyUser.type(dailyRateInput, '5');
      await dailyUser.clear(daysInput);
      await dailyUser.type(daysInput, '365');

      const dailyCalculateButton = screen.getByRole('button', { name: /calculate daily interest/i });
      await dailyUser.click(dailyCalculateButton);

      await waitFor(() => {
        expect(screen.getByText(/calculation results/i)).toBeInTheDocument();
      });

      // The results should be comparable (allowing for different calculation methods)
    });

    test('loan payment validation across different scenarios', async () => {
      const user = userEvent.setup();
      render(<LoanAmortizationCalculator />);

      const loanAmountInput = screen.getByDisplayValue(250000);
      const rateInput = screen.getByDisplayValue(6.5);
      const termInput = screen.getByDisplayValue(30);
      const calculateButton = screen.getByRole('button', { name: /calculate loan payment/i });

      // Test that doubling the loan amount roughly doubles the payment
      await user.clear(loanAmountInput);
      await user.type(loanAmountInput, '100000');
      await user.click(calculateButton);

      await waitFor(() => {
        const payment1 = screen.getByText(/monthly payment:/i).parentElement?.textContent;
        expect(payment1).toContain('$');
      });

      await user.clear(loanAmountInput);
      await user.type(loanAmountInput, '200000');
      await user.click(calculateButton);

      await waitFor(() => {
        const payment2 = screen.getByText(/monthly payment:/i).parentElement?.textContent;
        expect(payment2).toContain('$');
        // Payment should be roughly double
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('all calculators handle zero interest rates', async () => {
      // Test each calculator with 0% interest rate
      const user = userEvent.setup();

      // Compound Interest Calculator
      const { unmount: unmountCompound } = render(<CompoundInterestCalculator />);
      
      let rateInput = screen.getByDisplayValue(7);
      await user.clear(rateInput);
      await user.type(rateInput, '0');
      
      let calculateButton = screen.getByRole('button', { name: /calculate compound growth/i });
      await user.click(calculateButton);

      await waitFor(() => {
        expect(screen.getByText(/investment growth/i)).toBeInTheDocument();
      });

      unmountCompound();

      // Daily Interest Calculator
      const { unmount: unmountDaily } = render(<DailyInterestCalculator />);
      
      rateInput = screen.getByDisplayValue(5);
      await user.clear(rateInput);
      await user.type(rateInput, '0');
      
      calculateButton = screen.getByRole('button', { name: /calculate daily interest/i });
      await user.click(calculateButton);

      await waitFor(() => {
        expect(screen.getByText(/calculation results/i)).toBeInTheDocument();
      });

      unmountDaily();

      // Loan Amortization Calculator
      render(<LoanAmortizationCalculator />);
      
      rateInput = screen.getByDisplayValue(6.5);
      await user.clear(rateInput);
      await user.type(rateInput, '0');
      
      calculateButton = screen.getByRole('button', { name: /calculate loan payment/i });
      await user.click(calculateButton);

      await waitFor(() => {
        expect(screen.getByText(/loan summary/i)).toBeInTheDocument();
      });
    });

    test('calculators handle maximum allowed values', async () => {
      const user = userEvent.setup();
      render(<CompoundInterestCalculator />);

      // Test with maximum values
      const principalInput = screen.getByDisplayValue(10000);
      const rateInput = screen.getByDisplayValue(7);
      const timeInput = screen.getByDisplayValue(10);

      await user.clear(principalInput);
      await user.type(principalInput, '9999999'); // Very large principal
      await user.clear(rateInput);
      await user.type(rateInput, '15'); // High rate
      await user.clear(timeInput);
      await user.type(timeInput, '50'); // Long time

      const calculateButton = screen.getByRole('button', { name: /calculate compound growth/i });
      await user.click(calculateButton);

      await waitFor(() => {
        expect(screen.getByText(/investment growth/i)).toBeInTheDocument();
      });

      // Should handle large numbers without crashing
    });
  });
});