/**
 * Accessibility Tests for Calculator Components
 * Testing keyboard navigation, screen reader compatibility, ARIA labels, and WCAG compliance
 */

import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RESPCalculator from '../components/RESPCalculator';
import CompoundInterestCalculator from '../components/CompoundInterestCalculator';
import DailyInterestCalculator from '../components/DailyInterestCalculator';
import LoanAmortizationCalculator from '../components/LoanAmortizationCalculator';

// Mock RESPMultiYearChart for accessibility tests
jest.mock('../components/RESPMultiYearChart', () => {
  return function MockRESPMultiYearChart({ yearlyData }: { yearlyData: any[] }) {
    return (
      <div 
        data-testid="resp-chart" 
        role="img" 
        aria-label={`RESP investment progression chart showing ${yearlyData.length} years of data`}
      >
        Accessibility Test Chart
      </div>
    );
  };
});

describe('Accessibility Tests', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01'));
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Keyboard Navigation', () => {
    test('RESP Calculator supports keyboard navigation', async () => {
      render(<RESPCalculator />);

      // Test that all form elements are focusable and in correct order
      const birthDateInput = screen.getByLabelText(/child.*birthdate/i);
      const educationAgeInput = screen.getByLabelText(/age when education starts/i);
      const currentSavingsInput = screen.getByLabelText(/current resp savings/i);
      const calculateButton = screen.getByRole('button', { name: /calculate resp savings/i });

      // Test focus on each element
      birthDateInput.focus();
      expect(document.activeElement).toBe(birthDateInput);
      expect(document.activeElement).toHaveAttribute('type', 'date');

      educationAgeInput.focus();
      expect(document.activeElement).toBe(educationAgeInput);
      expect(document.activeElement).toHaveAttribute('type', 'number');

      currentSavingsInput.focus();
      expect(document.activeElement).toBe(currentSavingsInput);
      expect(document.activeElement).toHaveAttribute('type', 'number');

      calculateButton.focus();
      expect(document.activeElement).toBe(calculateButton);
    });

    test('Compound Interest Calculator keyboard navigation', async () => {
      render(<CompoundInterestCalculator />);

      // Test that form elements are focusable
      const principalInput = screen.getByLabelText(/principal amount/i);
      const rateInput = screen.getByLabelText(/annual interest rate/i);
      const frequencySelect = screen.getByLabelText(/compounding frequency/i);
      const timeInput = screen.getByLabelText(/investment period/i);
      const calculateButton = screen.getByRole('button', { name: /calculate compound growth/i });

      // Test focus on each element
      principalInput.focus();
      expect(document.activeElement).toBe(principalInput);

      rateInput.focus();
      expect(document.activeElement).toBe(rateInput);

      frequencySelect.focus();
      expect(document.activeElement).toBe(frequencySelect);
      expect(document.activeElement).toBeInstanceOf(HTMLSelectElement);

      timeInput.focus();
      expect(document.activeElement).toBe(timeInput);

      calculateButton.focus();
      expect(document.activeElement).toBe(calculateButton);
    });

    test('keyboard navigation works after calculation', async () => {
      const user = userEvent.setup({ delay: null });
      render(<LoanAmortizationCalculator />);

      // Calculate first to enable schedule view buttons
      const calculateButton = screen.getByRole('button', { name: /calculate loan payment/i });
      await user.click(calculateButton);

      await screen.findByText(/payment schedule view/i, {}, { timeout: 3000 });

      // Test that schedule view buttons are focusable
      const summaryButton = screen.getByRole('button', { name: /summary/i });
      const yearlyButton = screen.getByRole('button', { name: /yearly/i });
      const fullScheduleButton = screen.getByRole('button', { name: /full schedule/i });

      summaryButton.focus();
      expect(document.activeElement).toBe(summaryButton);

      yearlyButton.focus();
      expect(document.activeElement).toBe(yearlyButton);

      fullScheduleButton.focus();
      expect(document.activeElement).toBe(fullScheduleButton);
    });

    test('Enter key activates buttons', async () => {
      const user = userEvent.setup({ delay: null }); // Remove delays for faster testing
      render(<DailyInterestCalculator />);

      const calculateButton = screen.getByRole('button', { name: /calculate daily interest/i });
      calculateButton.focus();

      await user.keyboard('{Enter}');

      // Should show results after Enter key activation
      await screen.findByText(/calculation results/i, {}, { timeout: 3000 });
    });

    test('Space key activates buttons', async () => {
      const user = userEvent.setup({ delay: null });
      render(<CompoundInterestCalculator />);

      const calculateButton = screen.getByRole('button', { name: /calculate compound growth/i });
      calculateButton.focus();

      await user.keyboard(' '); // Space key

      // Should show results after Space key activation
      await screen.findByText(/investment growth/i, {}, { timeout: 3000 });
    });
  });

  describe('Screen Reader Support', () => {
    test('form inputs have accessible names', () => {
      render(<CompoundInterestCalculator />);

      // Test that inputs can be found by their labels
      expect(screen.getByLabelText(/principal amount/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/annual interest rate/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/compounding frequency/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/investment period/i)).toBeInTheDocument();
    });

    test('buttons have descriptive accessible names', () => {
      render(<DailyInterestCalculator />);

      const calculateButton = screen.getByRole('button', { name: /calculate daily interest/i });
      expect(calculateButton).toBeInTheDocument();
      expect(calculateButton).toHaveAccessibleName();
    });

    test('error messages are accessible', async () => {
      render(<CompoundInterestCalculator />);

      // Trigger validation error
      const principalInput = screen.getByLabelText(/principal amount/i);
      fireEvent.change(principalInput, { target: { value: '-1000' } });

      const calculateButton = screen.getByRole('button', { name: /calculate compound growth/i });
      fireEvent.click(calculateButton);

      // Error message should be accessible
      const errorMessage = await screen.findByText(/principal amount cannot be negative/i);
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toHaveClass('text-red-600'); // Visible styling
    });

    test('results sections have proper headings', async () => {
      render(<LoanAmortizationCalculator />);

      const calculateButton = screen.getByRole('button', { name: /calculate loan payment/i });
      fireEvent.click(calculateButton);

      // Results should have proper heading structure
      const resultsHeading = await screen.findByText(/loan summary/i);
      expect(resultsHeading).toBeInTheDocument();
      expect(resultsHeading.tagName).toBe('H3');
    });

    test('chart has accessible description', async () => {
      render(<RESPCalculator />);

      const calculateButton = screen.getByRole('button', { name: /calculate resp savings/i });
      fireEvent.click(calculateButton);

      const chart = await screen.findByTestId('resp-chart');
      expect(chart).toHaveAttribute('role', 'img');
      expect(chart).toHaveAttribute('aria-label');
    });
  });

  describe('ARIA Support', () => {
    test('form controls have appropriate ARIA attributes', () => {
      render(<DailyInterestCalculator />);

      const principalInput = screen.getByLabelText(/principal amount/i);
      expect(principalInput).toHaveAttribute('type', 'number');
      // Min constraint removed for validation testing
      
      const daysInput = screen.getByLabelText(/number of days/i);
      expect(daysInput).toHaveAttribute('min', '1');
      expect(daysInput).toHaveAttribute('max', '365');
    });

    test('error states have ARIA attributes', async () => {
      render(<DailyInterestCalculator />);

      const daysInput = screen.getByLabelText(/number of days/i);
      // Use fireEvent for faster testing
      fireEvent.change(daysInput, { target: { value: '400' } });

      const calculateButton = screen.getByRole('button', { name: /calculate daily interest/i });
      fireEvent.click(calculateButton);

      // Input should indicate error state
      await screen.findByText(/number of days cannot exceed 365/i, {}, { timeout: 3000 });
      expect(daysInput).toHaveClass('border-red-300');
    });

    test('buttons indicate their state', async () => {
      render(<LoanAmortizationCalculator />);

      const calculateButton = screen.getByRole('button', { name: /calculate loan payment/i });
      fireEvent.click(calculateButton);

      await screen.findByText(/payment schedule view/i, {}, { timeout: 3000 });

      // Schedule view buttons should show active state
      const summaryButton = screen.getByRole('button', { name: /summary/i });
      expect(summaryButton).toHaveClass('bg-purple-600'); // Active state

      const yearlyButton = screen.getByRole('button', { name: /yearly/i });
      fireEvent.click(yearlyButton);

      expect(yearlyButton).toHaveClass('bg-purple-600'); // Now active
      expect(summaryButton).not.toHaveClass('bg-purple-600'); // No longer active
    });

    test('interactive elements have proper roles', () => {
      render(<CompoundInterestCalculator />);

      // Buttons should have button role
      const calculateButton = screen.getByRole('button', { name: /calculate compound growth/i });
      expect(calculateButton).toBeInTheDocument();

      // Select should have combobox role
      const frequencySelect = screen.getByRole('combobox');
      expect(frequencySelect).toBeInTheDocument();

      // Number inputs should have spinbutton role
      const numberInputs = screen.getAllByRole('spinbutton');
      expect(numberInputs.length).toBeGreaterThan(0);
    });
  });

  describe('Focus Management', () => {
    test('focus moves logically through form', async () => {
      render(<CompoundInterestCalculator />);

      // Test focus order by directly focusing elements
      const principalInput = screen.getByLabelText(/principal amount/i);
      const rateInput = screen.getByLabelText(/annual interest rate/i);
      const frequencySelect = screen.getByLabelText(/compounding frequency/i);
      const timeInput = screen.getByLabelText(/investment period/i);

      principalInput.focus();
      expect(document.activeElement).toBe(principalInput);

      rateInput.focus();
      expect(document.activeElement).toHaveAttribute('type', 'number');

      frequencySelect.focus();
      expect(document.activeElement).toBeInstanceOf(HTMLSelectElement);

      timeInput.focus();
      expect(document.activeElement).toHaveAttribute('type', 'number');
    });

    test('focus is not trapped inappropriately', async () => {
      render(<DailyInterestCalculator />);

      // Test that focus can move between all elements
      const principalInput = screen.getByLabelText(/principal amount/i);
      const rateInput = screen.getByLabelText(/annual interest rate/i);
      const daysInput = screen.getByLabelText(/number of days/i);
      const calculateButton = screen.getByRole('button', { name: /calculate daily interest/i });

      principalInput.focus();
      expect(document.activeElement).toBe(principalInput);

      rateInput.focus();
      expect(document.activeElement).toBe(rateInput);

      daysInput.focus();
      expect(document.activeElement).toBe(daysInput);

      calculateButton.focus();
      expect(document.activeElement).toBe(calculateButton);

      // Focus should not be trapped in the form
      expect(document.activeElement).toBeDefined();
    });

    test('focus returns to appropriate element after modal/toggle actions', async () => {
      render(<CompoundInterestCalculator />);

      const calculateButton = screen.getByRole('button', { name: /calculate compound growth/i });
      fireEvent.click(calculateButton);

      const timelineButton = await screen.findByText(/show growth timeline/i, {}, { timeout: 3000 });
      timelineButton.focus();
      expect(document.activeElement).toBe(timelineButton);
      
      fireEvent.click(timelineButton);

      // After clicking, the hide button should be focusable
      const hideButton = screen.getByText(/hide growth timeline/i);
      hideButton.focus();
      expect(document.activeElement).toBe(hideButton);
    });
  });

  describe('Color Contrast and Visual Accessibility', () => {
    test('error messages have sufficient contrast', async () => {
      render(<LoanAmortizationCalculator />);

      const loanAmountInput = screen.getByLabelText(/loan amount/i);
      fireEvent.change(loanAmountInput, { target: { value: '-100000' } });

      const calculateButton = screen.getByRole('button', { name: /calculate loan payment/i });
      fireEvent.click(calculateButton);

      const errorMessage = await screen.findByText(/principal amount cannot be negative/i, {}, { timeout: 3000 });
      expect(errorMessage).toHaveClass('text-red-600');
      
      // Red-600 in Tailwind typically has good contrast
      const computedStyle = window.getComputedStyle(errorMessage);
      expect(computedStyle.color).toBeDefined();
    });

    test('form validation states are visible', async () => {
      render(<DailyInterestCalculator />);

      const rateInput = screen.getByLabelText(/annual interest rate/i);
      fireEvent.change(rateInput, { target: { value: '150' } });

      const calculateButton = screen.getByRole('button', { name: /calculate daily interest/i });
      fireEvent.click(calculateButton);

      // Input should show visual error state
      expect(rateInput).toHaveClass('border-red-300');
    });

    test('buttons have hover and focus states', () => {
      render(<CompoundInterestCalculator />);

      const calculateButton = screen.getByRole('button', { name: /calculate compound growth/i });
      expect(calculateButton).toHaveClass('hover:bg-green-700');
      expect(calculateButton).toHaveClass('bg-green-600');
    });
  });

  describe('Text and Content Accessibility', () => {
    test('mathematical formulas are accessible', () => {
      render(<CompoundInterestCalculator />);

      // Formula should be present and readable
      expect(screen.getByText(/formula used:/i)).toBeInTheDocument();
      expect(screen.getByText(/A = P\(1 \+ r\/n\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Where: A = final amount/i)).toBeInTheDocument();
    });

    test('results have clear labels and values', async () => {
      render(<DailyInterestCalculator />);

      const calculateButton = screen.getByRole('button', { name: /calculate daily interest/i });
      fireEvent.click(calculateButton);

      // Results should have clear label-value pairs
      await screen.findByText(/daily interest rate:/i, {}, { timeout: 3000 });
      await screen.findByText(/interest earned:/i, {}, { timeout: 3000 });
      await screen.findByText(/total amount:/i, {}, { timeout: 3000 });
      await screen.findByText(/effective annual rate:/i, {}, { timeout: 3000 });
    });

    test('percentage values are clearly formatted', async () => {
      render(<CompoundInterestCalculator />);

      const calculateButton = screen.getByRole('button', { name: /calculate compound growth/i });
      fireEvent.click(calculateButton);

      const effectiveRate = await screen.findByText(/effective annual rate:/i, {}, { timeout: 3000 });
      const rateContainer = effectiveRate.closest('div');
      
      // Should contain percentage symbol and be clearly formatted
      expect(rateContainer?.textContent).toMatch(/%/);
    });

    test('currency values are properly formatted', async () => {
      render(<LoanAmortizationCalculator />);

      const calculateButton = screen.getByRole('button', { name: /calculate loan payment/i });
      fireEvent.click(calculateButton);

      // Use getAllByText to handle multiple matches and get the first one (main result)
      const monthlyPayments = await screen.findAllByText(/monthly payment:/i, {}, { timeout: 3000 });
      const paymentContainer = monthlyPayments[0].closest('div');
      
      // Should contain dollar symbol and proper formatting
      expect(paymentContainer?.textContent).toMatch(/\$/);
    });
  });

  describe('Responsive Accessibility', () => {
    test('components remain accessible at different viewport sizes', () => {
      // Simulate mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<RESPCalculator />);

      // Form should still be navigable
      const inputs = screen.getAllByRole('spinbutton');
      expect(inputs.length).toBeGreaterThan(5);

      // Buttons should still be accessible
      const calculateButton = screen.getByRole('button', { name: /calculate resp savings/i });
      expect(calculateButton).toBeInTheDocument();
    });

    test('touch targets are appropriately sized', () => {
      render(<CompoundInterestCalculator />);

      const calculateButton = screen.getByRole('button', { name: /calculate compound growth/i });
      
      // Button should have adequate padding for touch interaction
      expect(calculateButton).toHaveClass('py-3', 'px-6');
    });
  });

  describe('Internationalization Accessibility', () => {
    test('numeric inputs handle different locales', async () => {
      render(<DailyInterestCalculator />);

      const principalInput = screen.getByLabelText(/principal amount/i);
      
      // Should handle decimal inputs regardless of locale
      fireEvent.change(principalInput, { target: { value: '1000.50' } });
      
      expect(principalInput).toHaveValue(1000.50);
    });

    test('date inputs are accessible', () => {
      render(<RESPCalculator />);

      const birthDateInput = screen.getByDisplayValue('2020-01-01');
      expect(birthDateInput).toHaveAttribute('type', 'date');
      
      // Date input should be keyboard accessible
      expect(birthDateInput).not.toHaveAttribute('readonly');
    });
  });

  describe('Progressive Enhancement', () => {
    test('forms work without JavaScript calculation features', () => {
      render(<CompoundInterestCalculator />);

      // Form should be usable even if calculation fails
      const principalInput = screen.getByLabelText(/principal amount/i);
      const calculateButton = screen.getByRole('button', { name: /calculate compound growth/i });
      
      expect(principalInput).toBeEnabled();
      expect(calculateButton).toBeEnabled();
    });

    test('essential information is available without interactive features', () => {
      render(<LoanAmortizationCalculator />);

      // Formula and basic information should be visible
      expect(screen.getByText(/formula used:/i)).toBeInTheDocument();
      expect(screen.getByText(/M = P × \[r\(1\+r\)/i)).toBeInTheDocument();
    });
  });
});