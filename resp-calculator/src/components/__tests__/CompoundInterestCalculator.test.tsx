/**
 * Unit tests for CompoundInterestCalculator component
 * Testing compound interest calculations, input validation, user interactions, and edge cases
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CompoundInterestCalculator from '../CompoundInterestCalculator';

describe('CompoundInterestCalculator', () => {
  describe('Component Rendering', () => {
    test('renders main title and description', () => {
      render(<CompoundInterestCalculator />);
      
      expect(screen.getByRole('heading', { name: /compound interest calculator/i })).toBeInTheDocument();
      expect(screen.getByText(/calculate how your money grows with compound interest/i)).toBeInTheDocument();
    });

    test('renders all input fields with default values', () => {
      render(<CompoundInterestCalculator />);
      
      // Check for all required input fields
      expect(screen.getByLabelText(/principal amount/i)).toHaveValue(10000);
      expect(screen.getByLabelText(/annual interest rate/i)).toHaveValue(7);
      expect(screen.getByLabelText(/compounding frequency/i)).toHaveValue('12');
      expect(screen.getByLabelText(/investment period/i)).toHaveValue(10);
    });

    test('renders calculate button', () => {
      render(<CompoundInterestCalculator />);
      
      expect(screen.getByRole('button', { name: /calculate compound growth/i })).toBeInTheDocument();
    });

    test('displays compound interest formula', () => {
      render(<CompoundInterestCalculator />);
      
      expect(screen.getByText(/formula used:/i)).toBeInTheDocument();
      expect(screen.getByText(/A = P\(1 \+ r\/n\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Where: A = final amount, P = principal/i)).toBeInTheDocument();
    });
  });

  describe('Input Validation', () => {
    test('enforces minimum and maximum values for inputs', () => {
      render(<CompoundInterestCalculator />);
      
      const principalInput = screen.getByLabelText(/principal amount/i) as HTMLInputElement;
      const rateInput = screen.getByLabelText(/annual interest rate/i) as HTMLInputElement;
      const timeInput = screen.getByLabelText(/investment period/i) as HTMLInputElement;
      
      // Min constraint removed to allow validation testing
      expect(principalInput.min).toBe('');
      expect(principalInput.step).toBe('0.01');
      expect(rateInput.min).toBe('');
      expect(rateInput.max).toBe('100');
      expect(rateInput.step).toBe('0.1');
      expect(timeInput.min).toBe('0.1');
      expect(timeInput.max).toBe('50');
      expect(timeInput.step).toBe('0.1');
    });

    test('shows validation error for negative principal', async () => {
      const user = userEvent.setup();
      render(<CompoundInterestCalculator />);
      
      const principalInput = screen.getByLabelText(/principal amount/i);
      const calculateButton = screen.getByRole('button', { name: /calculate compound growth/i });
      
      fireEvent.change(principalInput, { target: { value: '-1000' } });
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/principal amount cannot be negative/i)).toBeInTheDocument();
      });
      
      expect(principalInput).toHaveClass('border-red-300');
    });

    test('shows validation error for invalid interest rate', async () => {
      const user = userEvent.setup();
      render(<CompoundInterestCalculator />);
      
      const rateInput = screen.getByLabelText(/annual interest rate/i);
      const calculateButton = screen.getByRole('button', { name: /calculate compound growth/i });
      
      await user.clear(rateInput);
      await user.type(rateInput, '150');
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/interest rate cannot exceed 100%/i)).toBeInTheDocument();
      });
      
      expect(rateInput).toHaveClass('border-red-300');
    });

    test('shows validation error for invalid time period', async () => {
      const user = userEvent.setup();
      render(<CompoundInterestCalculator />);
      
      const timeInput = screen.getByLabelText(/investment period/i);
      const calculateButton = screen.getByRole('button', { name: /calculate compound growth/i });
      
      await user.clear(timeInput);
      await user.type(timeInput, '150');
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/time period is too long/i)).toBeInTheDocument();
      });
      
      expect(timeInput).toHaveClass('border-red-300');
    });

    test('clears error when input is corrected', async () => {
      const user = userEvent.setup();
      render(<CompoundInterestCalculator />);
      
      const principalInput = screen.getByLabelText(/principal amount/i);
      const calculateButton = screen.getByRole('button', { name: /calculate compound growth/i });
      
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

  describe('Compounding Frequency Options', () => {
    test('displays all compounding frequency options', () => {
      render(<CompoundInterestCalculator />);
      
      const frequencySelect = screen.getByLabelText(/compounding frequency/i);
      
      expect(screen.getByRole('option', { name: /daily \(365x per year\)/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /monthly \(12x per year\)/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /quarterly \(4x per year\)/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /semi-annually \(2x per year\)/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /annually \(1x per year\)/i })).toBeInTheDocument();
    });

    test('changes compounding frequency correctly', async () => {
      const user = userEvent.setup();
      render(<CompoundInterestCalculator />);
      
      const frequencySelect = screen.getByLabelText(/compounding frequency/i);
      
      // Default should be monthly (12)
      expect(frequencySelect).toHaveValue('12');
      
      // Change to daily
      await user.selectOptions(frequencySelect, '365');
      expect(frequencySelect).toHaveValue('365');
      
      // Change to annually
      await user.selectOptions(frequencySelect, '1');
      expect(frequencySelect).toHaveValue('1');
    });
  });

  describe('Calculation Logic', () => {
    test('performs basic compound interest calculation', async () => {
      const user = userEvent.setup();
      render(<CompoundInterestCalculator />);
      
      // Use default values: $10,000 at 7% for 10 years, monthly compounding
      const calculateButton = screen.getByRole('button', { name: /calculate compound growth/i });
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/investment growth/i)).toBeInTheDocument();
      });
      
      // Check for result sections
      expect(screen.getByText(/initial investment:/i)).toBeInTheDocument();
      expect(screen.getAllByText(/interest earned:/i)).toHaveLength(2); // One in results, one in insights
      expect(screen.getByText(/final amount:/i)).toBeInTheDocument();
      expect(screen.getByText(/effective annual rate:/i)).toBeInTheDocument();
      expect(screen.getByText(/growth multiple:/i)).toBeInTheDocument();
    });

    test('calculates different compounding frequencies correctly', async () => {
      const user = userEvent.setup();
      render(<CompoundInterestCalculator />);
      
      const principalInput = screen.getByLabelText(/principal amount/i);
      const rateInput = screen.getByLabelText(/annual interest rate/i);
      const timeInput = screen.getByLabelText(/investment period/i);
      const frequencySelect = screen.getByLabelText(/compounding frequency/i);
      const calculateButton = screen.getByRole('button', { name: /calculate compound growth/i });
      
      // Set up test values
      await user.clear(principalInput);
      await user.type(principalInput, '1000');
      await user.clear(rateInput);
      await user.type(rateInput, '8');
      await user.clear(timeInput);
      await user.type(timeInput, '5');
      
      // Test annual compounding
      await user.selectOptions(frequencySelect, '1');
      await user.click(calculateButton);
      
      await waitFor(() => {
        const finalAmount = screen.getByText(/final amount:/i).parentElement?.textContent;
        expect(finalAmount).toContain('$1,469'); // Approximately $1,469.33
      });
      
      // Test daily compounding (should be higher)
      await user.selectOptions(frequencySelect, '365');
      await user.click(calculateButton);
      
      await waitFor(() => {
        const finalAmount = screen.getByText(/final amount:/i).parentElement?.textContent;
        expect(finalAmount).toContain('$1,491'); // Should be higher than annual
      });
    });

    test('handles zero interest rate', async () => {
      const user = userEvent.setup();
      render(<CompoundInterestCalculator />);
      
      const rateInput = screen.getByLabelText(/annual interest rate/i);
      const calculateButton = screen.getByRole('button', { name: /calculate compound growth/i });
      
      await user.clear(rateInput);
      await user.type(rateInput, '0');
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/investment growth/i)).toBeInTheDocument();
      });
      
      // With 0% interest, final amount should equal principal
      const finalAmount = screen.getByText(/final amount:/i).parentElement?.textContent;
      expect(finalAmount).toContain('$10,000'); // Should equal the default principal
      
      const interestEarnedElements = screen.getAllByText(/interest earned:/i);
      expect(interestEarnedElements).toHaveLength(2); // One in results, one in insights
      const interestEarned = interestEarnedElements[0].parentElement?.textContent;
      expect(interestEarned).toContain('$0'); // No interest earned
    });

    test('calculates effective annual rate correctly', async () => {
      const user = userEvent.setup();
      render(<CompoundInterestCalculator />);
      
      const rateInput = screen.getByLabelText(/annual interest rate/i);
      const frequencySelect = screen.getByLabelText(/compounding frequency/i);
      const calculateButton = screen.getByRole('button', { name: /calculate compound growth/i });
      
      // 10% annual rate with monthly compounding
      await user.clear(rateInput);
      await user.type(rateInput, '10');
      await user.selectOptions(frequencySelect, '12');
      await user.click(calculateButton);
      
      await waitFor(() => {
        const effectiveRate = screen.getByText(/effective annual rate:/i).parentElement?.textContent;
        expect(effectiveRate).toContain('10.47'); // Should be ~10.47% for 10% with monthly compounding
      });
    });
  });

  describe('Growth Timeline Feature', () => {
    test('shows/hides growth timeline button after calculation', async () => {
      const user = userEvent.setup();
      render(<CompoundInterestCalculator />);
      
      // Button should not be visible initially
      expect(screen.queryByText(/show growth timeline/i)).not.toBeInTheDocument();
      
      const calculateButton = screen.getByRole('button', { name: /calculate compound growth/i });
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/show growth timeline/i)).toBeInTheDocument();
      });
    });

    test('toggles growth timeline display', async () => {
      const user = userEvent.setup();
      render(<CompoundInterestCalculator />);
      
      const calculateButton = screen.getByRole('button', { name: /calculate compound growth/i });
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/show growth timeline/i)).toBeInTheDocument();
      });
      
      const timelineButton = screen.getByText(/show growth timeline/i);
      await user.click(timelineButton);
      
      await waitFor(() => {
        expect(screen.getByText(/hide growth timeline/i)).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /growth timeline/i })).toBeInTheDocument();
      });
      
      // Should show monthly progression  
      const monthlyData = screen.getAllByText(/month \d+:/i);
      expect(monthlyData.length).toBeGreaterThan(0);
    });
  });

  describe('User Interface and Experience', () => {
    test('displays key insights after calculation', async () => {
      const user = userEvent.setup();
      render(<CompoundInterestCalculator />);
      
      const calculateButton = screen.getByRole('button', { name: /calculate compound growth/i });
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/key insights:/i)).toBeInTheDocument();
        expect(screen.getByText(/more frequent compounding = higher returns/i)).toBeInTheDocument();
        expect(screen.getByText(/interest earned:.*% of initial investment/i)).toBeInTheDocument();
        expect(screen.getByText(/average annual growth:/i)).toBeInTheDocument();
      });
    });

    test('shows appropriate styling for different result sections', async () => {
      const user = userEvent.setup();
      render(<CompoundInterestCalculator />);
      
      const calculateButton = screen.getByRole('button', { name: /calculate compound growth/i });
      await user.click(calculateButton);
      
      await waitFor(() => {
        const resultsContainer = screen.getByText(/investment growth/i).closest('.bg-green-50');
        expect(resultsContainer).toBeInTheDocument();
        
        const initialInvestment = screen.getByText(/initial investment:/i).closest('.bg-white');
        expect(initialInvestment).toBeInTheDocument();
        
        const interestEarnedElements = screen.getAllByText(/interest earned:/i);
        const interestEarned = interestEarnedElements[0].closest('.border-green-300');
        expect(interestEarned).toBeInTheDocument();
        
        const finalAmount = screen.getByText(/final amount:/i).closest('.border-blue-300');
        expect(finalAmount).toBeInTheDocument();
      });
    });

    test('displays growth multiple correctly', async () => {
      const user = userEvent.setup();
      render(<CompoundInterestCalculator />);
      
      const principalInput = screen.getByLabelText(/principal amount/i);
      const calculateButton = screen.getByRole('button', { name: /calculate compound growth/i });
      
      await user.clear(principalInput);
      await user.type(principalInput, '1000');
      await user.click(calculateButton);
      
      await waitFor(() => {
        const growthMultiple = screen.getByText(/growth multiple:/i).parentElement?.textContent;
        expect(growthMultiple).toMatch(/\d+\.\d{2}x/); // Should show format like "2.01x"
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('handles very small principal amounts', async () => {
      const user = userEvent.setup();
      render(<CompoundInterestCalculator />);
      
      const principalInput = screen.getByLabelText(/principal amount/i);
      const calculateButton = screen.getByRole('button', { name: /calculate compound growth/i });
      
      await user.clear(principalInput);
      await user.type(principalInput, '0.01');
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/investment growth/i)).toBeInTheDocument();
      });
    });

    test('handles very high interest rates', async () => {
      const user = userEvent.setup();
      render(<CompoundInterestCalculator />);
      
      const rateInput = screen.getByLabelText(/annual interest rate/i);
      const calculateButton = screen.getByRole('button', { name: /calculate compound growth/i });
      
      await user.clear(rateInput);
      await user.type(rateInput, '50');
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/investment growth/i)).toBeInTheDocument();
      });
    });

    test('handles fractional time periods', async () => {
      const user = userEvent.setup();
      render(<CompoundInterestCalculator />);
      
      const timeInput = screen.getByLabelText(/investment period/i);
      const calculateButton = screen.getByRole('button', { name: /calculate compound growth/i });
      
      await user.clear(timeInput);
      await user.type(timeInput, '1.5');
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/investment growth/i)).toBeInTheDocument();
      });
    });

    test('handles minimum time period', async () => {
      const user = userEvent.setup();
      render(<CompoundInterestCalculator />);
      
      const timeInput = screen.getByLabelText(/investment period/i);
      const calculateButton = screen.getByRole('button', { name: /calculate compound growth/i });
      
      await user.clear(timeInput);
      await user.type(timeInput, '0.1');
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/investment growth/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    test('has proper labels for all form inputs', () => {
      render(<CompoundInterestCalculator />);
      
      const numberInputs = screen.getAllByRole('spinbutton');
      const selectInputs = screen.getAllByRole('combobox');
      
      [...numberInputs, ...selectInputs].forEach(input => {
        expect(input).toHaveAccessibleName();
      });
    });

    test('button has proper accessible name', () => {
      render(<CompoundInterestCalculator />);
      
      const button = screen.getByRole('button', { name: /calculate compound growth/i });
      expect(button).toHaveAccessibleName();
    });

    test('error messages are associated with inputs', async () => {
      const user = userEvent.setup();
      render(<CompoundInterestCalculator />);
      
      const principalInput = screen.getByLabelText(/principal amount/i) as HTMLInputElement;
      const calculateButton = screen.getByRole('button', { name: /calculate compound growth/i });
      
      // Directly set the value to simulate negative input
      await user.clear(principalInput);
      fireEvent.change(principalInput, { target: { value: '-1000' } });
      await user.click(calculateButton);
      
      await waitFor(() => {
        const errorMessage = screen.getByText(/principal amount cannot be negative/i);
        expect(errorMessage).toBeInTheDocument();
        expect(errorMessage).toHaveClass('text-red-600');
      });
    });
  });

  describe('Real-world Financial Scenarios', () => {
    test('retirement savings scenario: $500/month for 30 years', async () => {
      const user = userEvent.setup();
      render(<CompoundInterestCalculator />);
      
      const principalInput = screen.getByLabelText(/principal amount/i);
      const rateInput = screen.getByLabelText(/annual interest rate/i);
      const timeInput = screen.getByLabelText(/investment period/i);
      const calculateButton = screen.getByRole('button', { name: /calculate compound growth/i });
      
      // Simulate lump sum equivalent of monthly contributions
      await user.clear(principalInput);
      await user.type(principalInput, '50000');
      await user.clear(rateInput);
      await user.type(rateInput, '7');
      await user.clear(timeInput);
      await user.type(timeInput, '30');
      
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/investment growth/i)).toBeInTheDocument();
      });
      
      // Should show significant growth over 30 years
      const finalAmount = screen.getByText(/final amount:/i).parentElement?.textContent;
      expect(finalAmount).toMatch(/\$[\d,]+/);
    });

    test('short-term savings scenario: 2-year CD', async () => {
      const user = userEvent.setup();
      render(<CompoundInterestCalculator />);
      
      const principalInput = screen.getByLabelText(/principal amount/i);
      const rateInput = screen.getByLabelText(/annual interest rate/i);
      const timeInput = screen.getByLabelText(/investment period/i);
      const frequencySelect = screen.getByLabelText(/compounding frequency/i);
      const calculateButton = screen.getByRole('button', { name: /calculate compound growth/i });
      
      await user.clear(principalInput);
      await user.type(principalInput, '10000');
      await user.clear(rateInput);
      await user.type(rateInput, '4.5');
      await user.clear(timeInput);
      await user.type(timeInput, '2');
      await user.selectOptions(frequencySelect, '12');
      
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/investment growth/i)).toBeInTheDocument();
      });
      
      // Should show modest but meaningful growth
      const interestEarnedElements = screen.getAllByText(/interest earned:/i);
      expect(interestEarnedElements).toHaveLength(2); // One in results, one in insights
      const interestEarned = interestEarnedElements[0].parentElement?.textContent;
      expect(interestEarned).toMatch(/\$9\d{2}/); // Should be around $900-$999
    });

    test('high-yield savings scenario: daily compounding', async () => {
      const user = userEvent.setup();
      render(<CompoundInterestCalculator />);
      
      const principalInput = screen.getByLabelText(/principal amount/i);
      const rateInput = screen.getByLabelText(/annual interest rate/i);
      const frequencySelect = screen.getByLabelText(/compounding frequency/i);
      const calculateButton = screen.getByRole('button', { name: /calculate compound growth/i });
      
      await user.clear(principalInput);
      await user.type(principalInput, '25000');
      await user.clear(rateInput);
      await user.type(rateInput, '4.25');
      await user.selectOptions(frequencySelect, '365');
      
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/investment growth/i)).toBeInTheDocument();
      });
      
      // Daily compounding should show slightly higher effective rate
      const effectiveRate = screen.getByText(/effective annual rate:/i).parentElement?.textContent;
      expect(effectiveRate).toContain('4.34'); // Should be ~4.34% effective rate
    });
  });
});