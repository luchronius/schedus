/**
 * Unit tests for LoanAmortizationCalculator component
 * Testing loan amortization calculations, payment schedules, user interactions, and edge cases
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoanAmortizationCalculator from '../LoanAmortizationCalculator';

describe('LoanAmortizationCalculator', () => {
  describe('Component Rendering', () => {
    test('renders main title and description', () => {
      render(<LoanAmortizationCalculator />);
      
      expect(screen.getByRole('heading', { name: /loan amortization calculator/i })).toBeInTheDocument();
      expect(screen.getByText(/calculate your monthly loan payments/i)).toBeInTheDocument();
      expect(screen.getByText(/perfect for mortgages, auto loans, and personal loans/i)).toBeInTheDocument();
    });

    test('renders all input fields with default values', () => {
      render(<LoanAmortizationCalculator />);
      
      expect(screen.getByLabelText(/loan amount/i)).toHaveValue(250000);
      expect(screen.getByLabelText(/annual interest rate/i)).toHaveValue(6.5);
      expect(screen.getByLabelText(/loan term/i)).toHaveValue(30);
    });

    test('renders calculate button', () => {
      render(<LoanAmortizationCalculator />);
      
      expect(screen.getByRole('button', { name: /calculate loan payment/i })).toBeInTheDocument();
    });

    test('displays loan payment formula', () => {
      render(<LoanAmortizationCalculator />);
      
      expect(screen.getByText(/formula used:/i)).toBeInTheDocument();
      expect(screen.getByText(/M = P × \[r\(1\+r\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Where: M = monthly payment, P = principal/i)).toBeInTheDocument();
    });
  });

  describe('Input Validation', () => {
    test('enforces minimum and maximum values for inputs', () => {
      render(<LoanAmortizationCalculator />);
      
      const loanAmountInput = screen.getByLabelText(/loan amount/i) as HTMLInputElement;
      const rateInput = screen.getByLabelText(/annual interest rate/i) as HTMLInputElement;
      const termInput = screen.getByLabelText(/loan term/i) as HTMLInputElement;
      
      expect(loanAmountInput.min).toBe(''); // Min constraint removed for validation testing
      expect(loanAmountInput.step).toBe('0.01');
      expect(rateInput.min).toBe(''); // Min constraint removed for validation testing
      expect(rateInput.max).toBe('100');
      expect(rateInput.step).toBe('0.01');
      expect(termInput.min).toBe('1');
      expect(termInput.max).toBe('50');
      expect(termInput.step).toBe('1');
    });

    test('shows validation error for negative loan amount', async () => {
      const user = userEvent.setup();
      render(<LoanAmortizationCalculator />);
      
      const loanAmountInput = screen.getByLabelText(/loan amount/i);
      const calculateButton = screen.getByRole('button', { name: /calculate loan payment/i });
      
      fireEvent.change(loanAmountInput, { target: { value: '-100000' } });
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/principal amount cannot be negative/i)).toBeInTheDocument();
      });
      
      expect(loanAmountInput).toHaveClass('border-red-300');
    });

    test('shows validation error for invalid interest rate', async () => {
      const user = userEvent.setup();
      render(<LoanAmortizationCalculator />);
      
      const rateInput = screen.getByLabelText(/annual interest rate/i);
      const calculateButton = screen.getByRole('button', { name: /calculate loan payment/i });
      
      await user.clear(rateInput);
      await user.type(rateInput, '150');
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/interest rate cannot exceed 100%/i)).toBeInTheDocument();
      });
      
      expect(rateInput).toHaveClass('border-red-300');
    });

    test('shows validation error for invalid loan term', async () => {
      const user = userEvent.setup();
      render(<LoanAmortizationCalculator />);
      
      const termInput = screen.getByLabelText(/loan term/i);
      const calculateButton = screen.getByRole('button', { name: /calculate loan payment/i });
      
      await user.clear(termInput);
      await user.type(termInput, '0');
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/loan term must be at least 1 year/i)).toBeInTheDocument();
      });
      
      expect(termInput).toHaveClass('border-red-300');
    });

    test('clears error when input is corrected', async () => {
      const user = userEvent.setup();
      render(<LoanAmortizationCalculator />);
      
      const loanAmountInput = screen.getByLabelText(/loan amount/i);
      const calculateButton = screen.getByRole('button', { name: /calculate loan payment/i });
      
      // Create error
      fireEvent.change(loanAmountInput, { target: { value: '-100000' } });
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/principal amount cannot be negative/i)).toBeInTheDocument();
      });
      
      // Correct the error
      fireEvent.change(loanAmountInput, { target: { value: '200000' } });
      
      await waitFor(() => {
        expect(screen.queryByText(/principal amount cannot be negative/i)).not.toBeInTheDocument();
      });
      
      expect(loanAmountInput).not.toHaveClass('border-red-300');
    });
  });

  describe('Calculation Logic', () => {
    test('performs basic loan calculation with default values', async () => {
      const user = userEvent.setup();
      render(<LoanAmortizationCalculator />);
      
      // Use default values: $250,000 at 6.5% for 30 years
      const calculateButton = screen.getByRole('button', { name: /calculate loan payment/i });
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/loan summary/i)).toBeInTheDocument();
      });
      
      // Check for result sections
      expect(screen.getAllByText(/monthly payment:/i)).toHaveLength(2); // One in results, one in insights
      expect(screen.getByText(/total interest:/i)).toBeInTheDocument();
      expect(screen.getByText(/total payments:/i)).toBeInTheDocument();
      expect(screen.getByText(/interest as % of loan:/i)).toBeInTheDocument();
    });

    test('calculates correct monthly payment for known values', async () => {
      const user = userEvent.setup();
      render(<LoanAmortizationCalculator />);
      
      const loanAmountInput = screen.getByLabelText(/loan amount/i);
      const rateInput = screen.getByLabelText(/annual interest rate/i);
      const termInput = screen.getByLabelText(/loan term/i);
      const calculateButton = screen.getByRole('button', { name: /calculate loan payment/i });
      
      // Set specific values for known calculation
      await user.clear(loanAmountInput);
      await user.type(loanAmountInput, '200000');
      await user.clear(rateInput);
      await user.type(rateInput, '5.0');
      await user.clear(termInput);
      await user.type(termInput, '30');
      
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/loan summary/i)).toBeInTheDocument();
      });
      
      // Should be around $1073.64 for these values
      const monthlyPaymentElements = screen.getAllByText(/monthly payment:/i);
      const monthlyPayment = monthlyPaymentElements[0].parentElement?.textContent;
      expect(monthlyPayment).toMatch(/\$1,073/);
    });

    test('handles zero interest rate correctly', async () => {
      const user = userEvent.setup();
      render(<LoanAmortizationCalculator />);
      
      const loanAmountInput = screen.getByLabelText(/loan amount/i);
      const rateInput = screen.getByLabelText(/annual interest rate/i);
      const termInput = screen.getByLabelText(/loan term/i);
      const calculateButton = screen.getByRole('button', { name: /calculate loan payment/i });
      
      await user.clear(loanAmountInput);
      await user.type(loanAmountInput, '120000');
      await user.clear(rateInput);
      await user.type(rateInput, '0');
      await user.clear(termInput);
      await user.type(termInput, '10');
      
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/loan summary/i)).toBeInTheDocument();
      });
      
      // With 0% interest, payment should be principal / total months
      const monthlyPaymentElements = screen.getAllByText(/monthly payment:/i);
      const monthlyPayment = monthlyPaymentElements[0].parentElement?.textContent;
      expect(monthlyPayment).toContain('$1,000'); // 120000 / 120 months
      
      const totalInterest = screen.getByText(/total interest:/i).parentElement?.textContent;
      expect(totalInterest).toContain('$0'); // No interest
    });

    test('calculates total payments and interest correctly', async () => {
      const user = userEvent.setup();
      render(<LoanAmortizationCalculator />);
      
      const loanAmountInput = screen.getByLabelText(/loan amount/i);
      const rateInput = screen.getByLabelText(/annual interest rate/i);
      const termInput = screen.getByLabelText(/loan term/i);
      const calculateButton = screen.getByRole('button', { name: /calculate loan payment/i });
      
      await user.clear(loanAmountInput);
      await user.type(loanAmountInput, '100000');
      await user.clear(rateInput);
      await user.type(rateInput, '6');
      await user.clear(termInput);
      await user.type(termInput, '15');
      
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/loan summary/i)).toBeInTheDocument();
      });
      
      // Check that total payments = monthly payment * number of payments
      const totalPayments = screen.getByText(/total payments:/i).parentElement?.textContent;
      const totalInterest = screen.getByText(/total interest:/i).parentElement?.textContent;
      
      expect(totalPayments).toMatch(/\$\d{1,3},\d{3}/);
      expect(totalInterest).toMatch(/\$\d{1,2},\d{3}/);
    });

    test('calculates interest percentage correctly', async () => {
      const user = userEvent.setup();
      render(<LoanAmortizationCalculator />);
      
      const calculateButton = screen.getByRole('button', { name: /calculate loan payment/i });
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/loan summary/i)).toBeInTheDocument();
      });
      
      // Interest as percentage should show reasonable value
      const interestPercent = screen.getByText(/interest as % of loan:/i).parentElement?.textContent;
      expect(interestPercent).toMatch(/\d{2,3}\.\d%/); // Should be something like 123.4%
    });
  });

  describe('Amortization Schedule Views', () => {
    test('displays schedule view buttons after calculation', async () => {
      const user = userEvent.setup();
      render(<LoanAmortizationCalculator />);
      
      const calculateButton = screen.getByRole('button', { name: /calculate loan payment/i });
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/payment schedule view:/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /summary/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /yearly/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /full schedule/i })).toBeInTheDocument();
      });
    });

    test('summary view shows first and last payment details', async () => {
      const user = userEvent.setup();
      render(<LoanAmortizationCalculator />);
      
      const calculateButton = screen.getByRole('button', { name: /calculate loan payment/i });
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/first payment:/i)).toBeInTheDocument();
        expect(screen.getByText(/last payment:/i)).toBeInTheDocument();
      });
    });

    test('switches to yearly view correctly', async () => {
      const user = userEvent.setup();
      render(<LoanAmortizationCalculator />);
      
      const calculateButton = screen.getByRole('button', { name: /calculate loan payment/i });
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /yearly/i })).toBeInTheDocument();
      });
      
      const yearlyButton = screen.getByRole('button', { name: /yearly/i });
      await user.click(yearlyButton);
      
      await waitFor(() => {
        const year1Elements = screen.getAllByText(/year 1/i);
        expect(year1Elements.length).toBeGreaterThan(0);
        expect(yearlyButton).toHaveClass('bg-purple-600');
      });
    });

    test('switches to full schedule view correctly', async () => {
      const user = userEvent.setup();
      render(<LoanAmortizationCalculator />);
      
      const calculateButton = screen.getByRole('button', { name: /calculate loan payment/i });
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /full schedule/i })).toBeInTheDocument();
      });
      
      const fullScheduleButton = screen.getByRole('button', { name: /full schedule/i });
      await user.click(fullScheduleButton);
      
      await waitFor(() => {
        expect(screen.getByText(/payment #/i)).toBeInTheDocument();
        const principalElements = screen.getAllByText(/principal/i);
        expect(principalElements.length).toBeGreaterThan(0);
        const interestElements = screen.getAllByText(/interest/i);
        expect(interestElements.length).toBeGreaterThan(0);
        expect(screen.getByText(/balance/i)).toBeInTheDocument();
        expect(fullScheduleButton).toHaveClass('bg-purple-600');
      });
    });

    test('yearly view shows all loan years', async () => {
      const user = userEvent.setup();
      render(<LoanAmortizationCalculator />);
      
      const termInput = screen.getByLabelText(/loan term/i);
      const calculateButton = screen.getByRole('button', { name: /calculate loan payment/i });
      
      // Set to 5 years for easier testing
      await user.clear(termInput);
      await user.type(termInput, '5');
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /yearly/i })).toBeInTheDocument();
      });
      
      const yearlyButton = screen.getByRole('button', { name: /yearly/i });
      await user.click(yearlyButton);
      
      await waitFor(() => {
        expect(screen.getByText(/year 1/i)).toBeInTheDocument();
        expect(screen.getByText(/year 2/i)).toBeInTheDocument();
        expect(screen.getByText(/year 3/i)).toBeInTheDocument();
        expect(screen.getByText(/year 4/i)).toBeInTheDocument();
        expect(screen.getByText(/year 5/i)).toBeInTheDocument();
      });
    });
  });

  describe('User Interface and Experience', () => {
    test('displays key insights after calculation', async () => {
      const user = userEvent.setup();
      render(<LoanAmortizationCalculator />);
      
      const calculateButton = screen.getByRole('button', { name: /calculate loan payment/i });
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/key insights:/i)).toBeInTheDocument();
        expect(screen.getByText(/early payments are mostly interest/i)).toBeInTheDocument();
        expect(screen.getByText(/extra principal payments can significantly reduce/i)).toBeInTheDocument();
        expect(screen.getByText(/monthly payment:.*% of loan amount/i)).toBeInTheDocument();
      });
    });

    test('shows proper styling for different result sections', async () => {
      const user = userEvent.setup();
      render(<LoanAmortizationCalculator />);
      
      const calculateButton = screen.getByRole('button', { name: /calculate loan payment/i });
      await user.click(calculateButton);
      
      await waitFor(() => {
        const resultsContainer = screen.getByText(/loan summary/i).closest('.bg-purple-50');
        expect(resultsContainer).toBeInTheDocument();
        
        const monthlyPaymentElements = screen.getAllByText(/monthly payment:/i);
        const monthlyPayment = monthlyPaymentElements[0].closest('.border-purple-300');
        expect(monthlyPayment).toBeInTheDocument();
        
        const totalInterest = screen.getByText(/total interest:/i).closest('.border-red-300');
        expect(totalInterest).toBeInTheDocument();
        
        const totalPayments = screen.getByText(/total payments:/i).closest('.border-blue-300');
        expect(totalPayments).toBeInTheDocument();
      });
    });

    test('displays payment count information', async () => {
      const user = userEvent.setup();
      render(<LoanAmortizationCalculator />);
      
      const termInput = screen.getByLabelText(/loan term/i);
      const calculateButton = screen.getByRole('button', { name: /calculate loan payment/i });
      
      await user.clear(termInput);
      await user.type(termInput, '15');
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/fixed payment for 15 years \(180 payments\)/i)).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('handles very small loan amounts', async () => {
      const user = userEvent.setup();
      render(<LoanAmortizationCalculator />);
      
      const loanAmountInput = screen.getByLabelText(/loan amount/i);
      const calculateButton = screen.getByRole('button', { name: /calculate loan payment/i });
      
      await user.clear(loanAmountInput);
      await user.type(loanAmountInput, '1000');
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/loan summary/i)).toBeInTheDocument();
      });
    });

    test('handles very long loan terms', async () => {
      const user = userEvent.setup();
      render(<LoanAmortizationCalculator />);
      
      const termInput = screen.getByLabelText(/loan term/i);
      const calculateButton = screen.getByRole('button', { name: /calculate loan payment/i });
      
      await user.clear(termInput);
      await user.type(termInput, '40');
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/loan summary/i)).toBeInTheDocument();
        expect(screen.getByText(/fixed payment for 40 years \(480 payments\)/i)).toBeInTheDocument();
      });
    });

    test('handles very short loan terms', async () => {
      const user = userEvent.setup();
      render(<LoanAmortizationCalculator />);
      
      const termInput = screen.getByLabelText(/loan term/i);
      const calculateButton = screen.getByRole('button', { name: /calculate loan payment/i });
      
      await user.clear(termInput);
      await user.type(termInput, '1');
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/loan summary/i)).toBeInTheDocument();
        expect(screen.getByText(/fixed payment for 1 years \(12 payments\)/i)).toBeInTheDocument();
      });
    });

    test('handles high interest rates', async () => {
      const user = userEvent.setup();
      render(<LoanAmortizationCalculator />);
      
      const rateInput = screen.getByLabelText(/annual interest rate/i);
      const calculateButton = screen.getByRole('button', { name: /calculate loan payment/i });
      
      await user.clear(rateInput);
      await user.type(rateInput, '25');
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/loan summary/i)).toBeInTheDocument();
      });
      
      // High interest rate should result in high total interest
      const interestPercent = screen.getByText(/interest as % of loan:/i).parentElement?.textContent;
      expect(interestPercent).toMatch(/\d{3,4}\.\d%/); // Should be over 100%
    });

    test('handles very low interest rates', async () => {
      const user = userEvent.setup();
      render(<LoanAmortizationCalculator />);
      
      const rateInput = screen.getByLabelText(/annual interest rate/i);
      const calculateButton = screen.getByRole('button', { name: /calculate loan payment/i });
      
      await user.clear(rateInput);
      await user.type(rateInput, '0.5');
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/loan summary/i)).toBeInTheDocument();
      });
      
      // Low interest rate should result in low total interest
      const interestPercent = screen.getByText(/interest as % of loan:/i).parentElement?.textContent;
      expect(interestPercent).toMatch(/\d{1,2}\.\d%/); // Should be much less than 100%
    });
  });

  describe('Accessibility', () => {
    test('has proper labels for all form inputs', () => {
      render(<LoanAmortizationCalculator />);
      
      const inputs = screen.getAllByRole('spinbutton');
      
      inputs.forEach(input => {
        expect(input).toHaveAccessibleName();
      });
    });

    test('buttons have proper accessible names', async () => {
      const user = userEvent.setup();
      render(<LoanAmortizationCalculator />);
      
      const calculateButton = screen.getByRole('button', { name: /calculate loan payment/i });
      expect(calculateButton).toHaveAccessibleName();
      
      await user.click(calculateButton);
      
      await waitFor(() => {
        const summaryButton = screen.getByRole('button', { name: /summary/i });
        const yearlyButton = screen.getByRole('button', { name: /yearly/i });
        const fullButton = screen.getByRole('button', { name: /full schedule/i });
        
        expect(summaryButton).toHaveAccessibleName();
        expect(yearlyButton).toHaveAccessibleName();
        expect(fullButton).toHaveAccessibleName();
      });
    });

    test('error messages are properly associated with inputs', async () => {
      const user = userEvent.setup();
      render(<LoanAmortizationCalculator />);
      
      const loanAmountInput = screen.getByLabelText(/loan amount/i);
      const calculateButton = screen.getByRole('button', { name: /calculate loan payment/i });
      
      fireEvent.change(loanAmountInput, { target: { value: '-100000' } });
      await user.click(calculateButton);
      
      await waitFor(() => {
        const errorMessage = screen.getByText(/principal amount cannot be negative/i);
        expect(errorMessage).toBeInTheDocument();
        expect(errorMessage).toHaveClass('text-red-600');
      });
    });
  });

  describe('Real-world Financial Scenarios', () => {
    test('30-year mortgage scenario', async () => {
      const user = userEvent.setup();
      render(<LoanAmortizationCalculator />);
      
      const loanAmountInput = screen.getByLabelText(/loan amount/i);
      const rateInput = screen.getByLabelText(/annual interest rate/i);
      const termInput = screen.getByLabelText(/loan term/i);
      const calculateButton = screen.getByRole('button', { name: /calculate loan payment/i });
      
      // Typical mortgage: $400,000 at 7% for 30 years
      await user.clear(loanAmountInput);
      await user.type(loanAmountInput, '400000');
      await user.clear(rateInput);
      await user.type(rateInput, '7');
      await user.clear(termInput);
      await user.type(termInput, '30');
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/loan summary/i)).toBeInTheDocument();
      });
      
      // Should be around $2661 monthly payment
      const monthlyPaymentElements = screen.getAllByText(/monthly payment:/i);
      const monthlyPayment = monthlyPaymentElements[0].parentElement?.textContent;
      expect(monthlyPayment).toMatch(/\$2,6\d{2}/);
      
      // Total interest should be substantial
      const interestPercent = screen.getByText(/interest as % of loan:/i).parentElement?.textContent;
      expect(interestPercent).toMatch(/1\d{2}\.\d%/); // Should be over 100%
    });

    test('auto loan scenario', async () => {
      const user = userEvent.setup();
      render(<LoanAmortizationCalculator />);
      
      const loanAmountInput = screen.getByLabelText(/loan amount/i);
      const rateInput = screen.getByLabelText(/annual interest rate/i);
      const termInput = screen.getByLabelText(/loan term/i);
      const calculateButton = screen.getByRole('button', { name: /calculate loan payment/i });
      
      // Auto loan: $35,000 at 4.5% for 6 years
      await user.clear(loanAmountInput);
      await user.type(loanAmountInput, '35000');
      await user.clear(rateInput);
      await user.type(rateInput, '4.5');
      await user.clear(termInput);
      await user.type(termInput, '6');
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/loan summary/i)).toBeInTheDocument();
      });
      
      // Should be around $545 monthly payment
      const monthlyPaymentElements = screen.getAllByText(/monthly payment:/i);
      const monthlyPayment = monthlyPaymentElements[0].parentElement?.textContent;
      expect(monthlyPayment).toMatch(/\$5\d{2}/);
    });

    test('personal loan scenario', async () => {
      const user = userEvent.setup();
      render(<LoanAmortizationCalculator />);
      
      const loanAmountInput = screen.getByLabelText(/loan amount/i);
      const rateInput = screen.getByLabelText(/annual interest rate/i);
      const termInput = screen.getByLabelText(/loan term/i);
      const calculateButton = screen.getByRole('button', { name: /calculate loan payment/i });
      
      // Personal loan: $15,000 at 12% for 3 years
      await user.clear(loanAmountInput);
      await user.type(loanAmountInput, '15000');
      await user.clear(rateInput);
      await user.type(rateInput, '12');
      await user.clear(termInput);
      await user.type(termInput, '3');
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/loan summary/i)).toBeInTheDocument();
      });
      
      // Should be around $498 monthly payment
      const monthlyPaymentElements = screen.getAllByText(/monthly payment:/i);
      const monthlyPayment = monthlyPaymentElements[0].parentElement?.textContent;
      expect(monthlyPayment).toMatch(/\$4\d{2}/);
      
      // High interest rate means significant interest cost
      const interestPercent = screen.getByText(/interest as % of loan:/i).parentElement?.textContent;
      expect(interestPercent).toMatch(/[1-4]\d\.\d%/); // Should be 10-40%
    });
  });
});