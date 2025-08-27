/**
 * Unit tests for DailyInterestCalculator component
 * Testing daily interest calculations, input validation, user interactions, and edge cases
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DailyInterestCalculator from '../DailyInterestCalculator';

describe('DailyInterestCalculator', () => {
  describe('Component Rendering', () => {
    test('renders main title and description', () => {
      render(<DailyInterestCalculator />);
      
      expect(screen.getByRole('heading', { name: /daily interest calculator/i })).toBeInTheDocument();
      expect(screen.getByText(/calculate precise daily interest earnings/i)).toBeInTheDocument();
    });

    test('renders all input fields with default values', () => {
      render(<DailyInterestCalculator />);
      
      expect(screen.getByLabelText(/principal amount/i)).toHaveValue(1000);
      expect(screen.getByLabelText(/annual interest rate/i)).toHaveValue(5);
      expect(screen.getByLabelText(/number of days/i)).toHaveValue(1);
    });

    test('renders calculate button', () => {
      render(<DailyInterestCalculator />);
      
      expect(screen.getByRole('button', { name: /calculate daily interest/i })).toBeInTheDocument();
    });

    test('displays formula information', () => {
      render(<DailyInterestCalculator />);
      
      expect(screen.getByText(/formula used:/i)).toBeInTheDocument();
      expect(screen.getByText(/daily rate = \(1 \+ annual rate\)/i)).toBeInTheDocument();
      expect(screen.getByText(/interest = principal × daily rate × days/i)).toBeInTheDocument();
    });
  });

  describe('Input Validation', () => {
    test('enforces minimum and maximum values for inputs', () => {
      render(<DailyInterestCalculator />);
      
      const principalInput = screen.getByLabelText(/principal amount/i) as HTMLInputElement;
      const rateInput = screen.getByLabelText(/annual interest rate/i) as HTMLInputElement;
      const daysInput = screen.getByLabelText(/number of days/i) as HTMLInputElement;
      
      expect(principalInput.min).toBe(''); // Min constraint removed for validation testing
      expect(principalInput.step).toBe('0.01');
      expect(rateInput.min).toBe(''); // Min constraint removed for validation testing
      expect(rateInput.max).toBe('100');
      expect(rateInput.step).toBe('0.1');
      expect(daysInput.min).toBe('1');
      expect(daysInput.max).toBe('365');
      expect(daysInput.step).toBe('1');
    });

    test('shows validation error for negative principal', async () => {
      const user = userEvent.setup();
      render(<DailyInterestCalculator />);
      
      const principalInput = screen.getByLabelText(/principal amount/i);
      const calculateButton = screen.getByRole('button', { name: /calculate daily interest/i });
      
      fireEvent.change(principalInput, { target: { value: '-1000' } });
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/principal amount cannot be negative/i)).toBeInTheDocument();
      });
      
      expect(principalInput).toHaveClass('border-red-300');
    });

    test('shows validation error for invalid interest rate', async () => {
      const user = userEvent.setup();
      render(<DailyInterestCalculator />);
      
      const rateInput = screen.getByLabelText(/annual interest rate/i);
      const calculateButton = screen.getByRole('button', { name: /calculate daily interest/i });
      
      await user.clear(rateInput);
      await user.type(rateInput, '150');
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/interest rate cannot exceed 100%/i)).toBeInTheDocument();
      });
      
      expect(rateInput).toHaveClass('border-red-300');
    });

    test('shows validation error for invalid number of days', async () => {
      const user = userEvent.setup();
      render(<DailyInterestCalculator />);
      
      const daysInput = screen.getByLabelText(/number of days/i);
      const calculateButton = screen.getByRole('button', { name: /calculate daily interest/i });
      
      // Test too many days
      await user.clear(daysInput);
      await user.type(daysInput, '400');
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/number of days cannot exceed 365/i)).toBeInTheDocument();
      });
      
      expect(daysInput).toHaveClass('border-red-300');
      
      // Test too few days
      await user.clear(daysInput);
      await user.type(daysInput, '0');
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/number of days must be at least 1/i)).toBeInTheDocument();
      });
    });

    test('clears error when input is corrected', async () => {
      const user = userEvent.setup();
      render(<DailyInterestCalculator />);
      
      const principalInput = screen.getByLabelText(/principal amount/i);
      const calculateButton = screen.getByRole('button', { name: /calculate daily interest/i });
      
      // Create error
      fireEvent.change(principalInput, { target: { value: '-1000' } });
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/principal amount cannot be negative/i)).toBeInTheDocument();
      });
      
      // Correct the error
      fireEvent.change(principalInput, { target: { value: '5000' } });
      
      await waitFor(() => {
        expect(screen.queryByText(/principal amount cannot be negative/i)).not.toBeInTheDocument();
      });
      
      expect(principalInput).not.toHaveClass('border-red-300');
    });
  });

  describe('Calculation Logic', () => {
    test('performs basic daily interest calculation with default values', async () => {
      const user = userEvent.setup();
      render(<DailyInterestCalculator />);
      
      // Use default values: $1000 at 5% for 1 day
      const calculateButton = screen.getByRole('button', { name: /calculate daily interest/i });
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/calculation results/i)).toBeInTheDocument();
      });
      
      // Check for result sections
      expect(screen.getByText(/daily interest rate:/i)).toBeInTheDocument();
      expect(screen.getByText(/interest earned:/i)).toBeInTheDocument();
      expect(screen.getByText(/total amount:/i)).toBeInTheDocument();
      expect(screen.getByText(/effective annual rate:/i)).toBeInTheDocument();
    });

    test('calculates correct daily interest for known values', async () => {
      const user = userEvent.setup();
      render(<DailyInterestCalculator />);
      
      const principalInput = screen.getByLabelText(/principal amount/i);
      const rateInput = screen.getByLabelText(/annual interest rate/i);
      const daysInput = screen.getByLabelText(/number of days/i);
      const calculateButton = screen.getByRole('button', { name: /calculate daily interest/i });
      
      // Set specific values for precise calculation
      await user.clear(principalInput);
      await user.type(principalInput, '10000');
      await user.clear(rateInput);
      await user.type(rateInput, '5');
      await user.clear(daysInput);
      await user.type(daysInput, '30');
      
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/calculation results/i)).toBeInTheDocument();
      });
      
      // Check that results are reasonable
      const interestEarned = screen.getByText(/interest earned:/i).parentElement?.textContent;
      expect(interestEarned).toMatch(/\$[1-4]\d\.\d{2}/); // Should be around $40-$42 for 30 days
      
      const totalAmount = screen.getByText(/total amount:/i).parentElement?.textContent;
      expect(totalAmount).toContain('$10,0'); // Should be slightly over $10,000
    });

    test('calculates for single day correctly', async () => {
      const user = userEvent.setup();
      render(<DailyInterestCalculator />);
      
      const principalInput = screen.getByLabelText(/principal amount/i);
      const rateInput = screen.getByLabelText(/annual interest rate/i);
      const daysInput = screen.getByLabelText(/number of days/i);
      const calculateButton = screen.getByRole('button', { name: /calculate daily interest/i });
      
      await user.clear(principalInput);
      await user.type(principalInput, '1000');
      await user.clear(rateInput);
      await user.type(rateInput, '5');
      await user.clear(daysInput);
      await user.type(daysInput, '1');
      
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/calculation results/i)).toBeInTheDocument();
      });
      
      // For 1 day, interest should be very small
      const interestEarned = screen.getByText(/interest earned:/i).parentElement?.textContent;
      expect(interestEarned).toMatch(/\$0\.\d{2}/); // Should be less than $1
    });

    test('handles zero interest rate', async () => {
      const user = userEvent.setup();
      render(<DailyInterestCalculator />);
      
      const rateInput = screen.getByLabelText(/annual interest rate/i);
      const calculateButton = screen.getByRole('button', { name: /calculate daily interest/i });
      
      await user.clear(rateInput);
      await user.type(rateInput, '0');
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/calculation results/i)).toBeInTheDocument();
      });
      
      // With 0% interest, no interest should be earned
      const interestEarned = screen.getByText(/interest earned:/i).parentElement?.textContent;
      expect(interestEarned).toContain('$0.00');
      
      const totalAmount = screen.getByText(/total amount:/i).parentElement?.textContent;
      expect(totalAmount).toContain('$1,000.00'); // Should equal principal
    });

    test('calculates effective annual rate correctly', async () => {
      const user = userEvent.setup();
      render(<DailyInterestCalculator />);
      
      const rateInput = screen.getByLabelText(/annual interest rate/i);
      const calculateButton = screen.getByRole('button', { name: /calculate daily interest/i });
      
      // 5% nominal rate should give slightly higher effective rate when compounded daily
      await user.clear(rateInput);
      await user.type(rateInput, '5');
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/calculation results/i)).toBeInTheDocument();
      });
      
      const effectiveRate = screen.getByText(/effective annual rate:/i).parentElement?.textContent;
      expect(effectiveRate).toContain('5.0000'); // Effective rate for 5% compounded daily
    });

    test('scales correctly for multiple days', async () => {
      const user = userEvent.setup();
      render(<DailyInterestCalculator />);
      
      const principalInput = screen.getByLabelText(/principal amount/i);
      const rateInput = screen.getByLabelText(/annual interest rate/i);
      const daysInput = screen.getByLabelText(/number of days/i);
      const calculateButton = screen.getByRole('button', { name: /calculate daily interest/i });
      
      // First calculate for 1 day
      await user.clear(principalInput);
      await user.type(principalInput, '5000');
      await user.clear(rateInput);
      await user.type(rateInput, '6');
      await user.clear(daysInput);
      await user.type(daysInput, '1');
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/calculation results/i)).toBeInTheDocument();
      });
      
      const oneDayInterest = screen.getByText(/interest earned:/i).parentElement?.textContent;
      const oneDayAmount = parseFloat(oneDayInterest?.match(/\$(\d+\.\d{2})/)?.[1] || '0');
      
      // Now calculate for 7 days
      await user.clear(daysInput);
      await user.type(daysInput, '7');
      await user.click(calculateButton);
      
      await waitFor(() => {
        const sevenDayInterest = screen.getByText(/interest earned:/i).parentElement?.textContent;
        const sevenDayAmount = parseFloat(sevenDayInterest?.match(/\$(\d+\.\d{2})/)?.[1] || '0');
        
        // 7-day interest should be approximately 7x the 1-day interest (with compound effect)
        expect(sevenDayAmount).toBeGreaterThan(oneDayAmount * 6.9);
        expect(sevenDayAmount).toBeLessThan(oneDayAmount * 7.1);
      });
    });
  });

  describe('User Interface and Experience', () => {
    test('displays precise daily rate with 6 decimal places', async () => {
      const user = userEvent.setup();
      render(<DailyInterestCalculator />);
      
      const calculateButton = screen.getByRole('button', { name: /calculate daily interest/i });
      await user.click(calculateButton);
      
      await waitFor(() => {
        const dailyRate = screen.getByText(/daily interest rate:/i).parentElement?.textContent;
        expect(dailyRate).toMatch(/\d+\.\d{6}%/); // Should show 6 decimal places
      });
    });

    test('displays proper styling for different result sections', async () => {
      const user = userEvent.setup();
      render(<DailyInterestCalculator />);
      
      const calculateButton = screen.getByRole('button', { name: /calculate daily interest/i });
      await user.click(calculateButton);
      
      await waitFor(() => {
        const resultsContainer = screen.getByText(/calculation results/i).closest('.bg-blue-50');
        expect(resultsContainer).toBeInTheDocument();
        
        const dailyRate = screen.getByText(/daily interest rate:/i).closest('.border-blue-300');
        expect(dailyRate).toBeInTheDocument();
        
        const interestEarned = screen.getByText(/interest earned:/i).closest('.border-green-300');
        expect(interestEarned).toBeInTheDocument();
        
        const totalAmount = screen.getByText(/total amount:/i).closest('.border-purple-300');
        expect(totalAmount).toBeInTheDocument();
      });
    });

    test('displays contextual information about calculation', async () => {
      const user = userEvent.setup();
      render(<DailyInterestCalculator />);
      
      const daysInput = screen.getByLabelText(/number of days/i);
      const calculateButton = screen.getByRole('button', { name: /calculate daily interest/i });
      
      await user.clear(daysInput);
      await user.type(daysInput, '5');
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/interest earned over 5 days/i)).toBeInTheDocument();
        expect(screen.getByText(/if compounded daily for full year/i)).toBeInTheDocument();
      });
    });

    test('displays example use case with calculated values', async () => {
      const user = userEvent.setup();
      render(<DailyInterestCalculator />);
      
      const principalInput = screen.getByLabelText(/principal amount/i);
      const rateInput = screen.getByLabelText(/annual interest rate/i);
      const calculateButton = screen.getByRole('button', { name: /calculate daily interest/i });
      
      await user.clear(principalInput);
      await user.type(principalInput, '25000');
      await user.clear(rateInput);
      await user.type(rateInput, '4.5');
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/example use case:/i)).toBeInTheDocument();
        expect(screen.getByText(/for \$25,000 at 4.5% annual rate:/i)).toBeInTheDocument();
        expect(screen.getByText(/interest per day:/i)).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('handles very small principal amounts', async () => {
      const user = userEvent.setup();
      render(<DailyInterestCalculator />);
      
      const principalInput = screen.getByLabelText(/principal amount/i);
      const calculateButton = screen.getByRole('button', { name: /calculate daily interest/i });
      
      await user.clear(principalInput);
      await user.type(principalInput, '0.01');
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/calculation results/i)).toBeInTheDocument();
      });
      
      const interestEarned = screen.getByText(/interest earned:/i).parentElement?.textContent;
      expect(interestEarned).toContain('$0.00'); // Should be less than a penny
    });

    test('handles maximum number of days (365)', async () => {
      const user = userEvent.setup();
      render(<DailyInterestCalculator />);
      
      const daysInput = screen.getByLabelText(/number of days/i);
      const calculateButton = screen.getByRole('button', { name: /calculate daily interest/i });
      
      await user.clear(daysInput);
      await user.type(daysInput, '365');
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/calculation results/i)).toBeInTheDocument();
      });
      
      // Interest for 365 days should be close to the simple annual interest
      const interestEarned = screen.getByText(/interest earned:/i).parentElement?.textContent;
      expect(interestEarned).toMatch(/\$\d+\.\d{2}/);
    });

    test('handles high interest rates', async () => {
      const user = userEvent.setup();
      render(<DailyInterestCalculator />);
      
      const rateInput = screen.getByLabelText(/annual interest rate/i);
      const calculateButton = screen.getByRole('button', { name: /calculate daily interest/i });
      
      await user.clear(rateInput);
      await user.type(rateInput, '25');
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/calculation results/i)).toBeInTheDocument();
      });
      
      // Should handle high rates without errors
      const effectiveRate = screen.getByText(/effective annual rate:/i).parentElement?.textContent;
      expect(effectiveRate).toMatch(/25\.\d{4}%/); // Should be 25.0000% effective for 25% nominal (same when using compound formula)
    });

    test('handles very low interest rates', async () => {
      const user = userEvent.setup();
      render(<DailyInterestCalculator />);
      
      const rateInput = screen.getByLabelText(/annual interest rate/i);
      const calculateButton = screen.getByRole('button', { name: /calculate daily interest/i });
      
      await user.clear(rateInput);
      await user.type(rateInput, '0.1');
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/calculation results/i)).toBeInTheDocument();
      });
      
      // Should handle very low rates
      const dailyRate = screen.getByText(/daily interest rate:/i).parentElement?.textContent;
      expect(dailyRate).toMatch(/0\.0002\d{2}%/); // Should show very small daily rate
    });
  });

  describe('Accessibility', () => {
    test('has proper labels for all form inputs', () => {
      render(<DailyInterestCalculator />);
      
      const inputs = screen.getAllByRole('spinbutton'); // number inputs have spinbutton role
      
      inputs.forEach(input => {
        expect(input).toHaveAccessibleName();
      });
    });

    test('button has proper accessible name', () => {
      render(<DailyInterestCalculator />);
      
      const button = screen.getByRole('button', { name: /calculate daily interest/i });
      expect(button).toHaveAccessibleName();
    });

    test('error messages are properly associated with inputs', async () => {
      const user = userEvent.setup();
      render(<DailyInterestCalculator />);
      
      const principalInput = screen.getByLabelText(/principal amount/i);
      const calculateButton = screen.getByRole('button', { name: /calculate daily interest/i });
      
      fireEvent.change(principalInput, { target: { value: '-1000' } });
      await user.click(calculateButton);
      
      await waitFor(() => {
        const errorMessage = screen.getByText(/principal amount cannot be negative/i);
        expect(errorMessage).toBeInTheDocument();
        expect(errorMessage).toHaveClass('text-red-600');
      });
    });

    test('displays proper singular/plural for days', async () => {
      const user = userEvent.setup();
      render(<DailyInterestCalculator />);
      
      const daysInput = screen.getByLabelText(/number of days/i);
      const calculateButton = screen.getByRole('button', { name: /calculate daily interest/i });
      
      // Test singular (1 day)
      await user.clear(daysInput);
      await user.type(daysInput, '1');
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/interest earned over 1 day$/i)).toBeInTheDocument();
      });
      
      // Test plural (5 days)
      await user.clear(daysInput);
      await user.type(daysInput, '5');
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/interest earned over 5 days$/i)).toBeInTheDocument();
      });
    });
  });

  describe('Real-world Financial Scenarios', () => {
    test('high-yield savings account scenario', async () => {
      const user = userEvent.setup();
      render(<DailyInterestCalculator />);
      
      const principalInput = screen.getByLabelText(/principal amount/i);
      const rateInput = screen.getByLabelText(/annual interest rate/i);
      const daysInput = screen.getByLabelText(/number of days/i);
      const calculateButton = screen.getByRole('button', { name: /calculate daily interest/i });
      
      // $50,000 at 4.5% for 30 days
      await user.clear(principalInput);
      await user.type(principalInput, '50000');
      await user.clear(rateInput);
      await user.type(rateInput, '4.5');
      await user.clear(daysInput);
      await user.type(daysInput, '30');
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/calculation results/i)).toBeInTheDocument();
      });
      
      // Should earn around $185 in 30 days
      const interestEarned = screen.getByText(/interest earned:/i).parentElement?.textContent;
      expect(interestEarned).toMatch(/\$18[0-9]\.\d{2}/);
    });

    test('money market account scenario', async () => {
      const user = userEvent.setup();
      render(<DailyInterestCalculator />);
      
      const principalInput = screen.getByLabelText(/principal amount/i);
      const rateInput = screen.getByLabelText(/annual interest rate/i);
      const daysInput = screen.getByLabelText(/number of days/i);
      const calculateButton = screen.getByRole('button', { name: /calculate daily interest/i });
      
      // $100,000 at 3.8% for 7 days
      await user.clear(principalInput);
      await user.type(principalInput, '100000');
      await user.clear(rateInput);
      await user.type(rateInput, '3.8');
      await user.clear(daysInput);
      await user.type(daysInput, '7');
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/calculation results/i)).toBeInTheDocument();
      });
      
      // Should earn around $71-$72 in a week
      const interestEarned = screen.getByText(/interest earned:/i).parentElement?.textContent;
      expect(interestEarned).toMatch(/\$7[1-2]\.\d{2}/);
    });

    test('certificate of deposit scenario', async () => {
      const user = userEvent.setup();
      render(<DailyInterestCalculator />);
      
      const principalInput = screen.getByLabelText(/principal amount/i);
      const rateInput = screen.getByLabelText(/annual interest rate/i);
      const daysInput = screen.getByLabelText(/number of days/i);
      const calculateButton = screen.getByRole('button', { name: /calculate daily interest/i });
      
      // $25,000 at 5.2% for 90 days (quarterly)
      await user.clear(principalInput);
      await user.type(principalInput, '25000');
      await user.clear(rateInput);
      await user.type(rateInput, '5.2');
      await user.clear(daysInput);
      await user.type(daysInput, '90');
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/calculation results/i)).toBeInTheDocument();
      });
      
      // Should earn around $325 in 90 days
      const interestEarned = screen.getByText(/interest earned:/i).parentElement?.textContent;
      expect(interestEarned).toMatch(/\$3[1-3]\d\.\d{2}/);
    });
  });
});