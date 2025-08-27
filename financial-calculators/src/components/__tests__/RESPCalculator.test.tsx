/**
 * Unit tests for RESPCalculator component
 * Testing RESP calculation logic, age calculations, user interactions, and edge cases
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RESPCalculator from '../RESPCalculator';

// Mock the RESPMultiYearChart component since we'll test it separately
jest.mock('../RESPMultiYearChart', () => {
  return function MockRESPMultiYearChart({ yearlyData }: { yearlyData: any[] }) {
    return (
      <div data-testid="resp-chart" data-yearly-data={JSON.stringify(yearlyData)}>
        Mocked RESP Chart with {yearlyData.length} years
      </div>
    );
  };
});

describe('RESPCalculator', () => {
  beforeEach(() => {
    // Reset date to a consistent value for testing
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01'));
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Component Rendering', () => {
    test('renders main title and description', () => {
      render(<RESPCalculator />);
      
      expect(screen.getByRole('heading', { name: /resp calculator/i })).toBeInTheDocument();
      expect(screen.getByText(/plan for your child's education/i)).toBeInTheDocument();
    });

    test('renders all input fields with default values', () => {
      render(<RESPCalculator />);
      
      // Check for all required input fields by their types and presence
      expect(screen.getByDisplayValue('2020-01-01')).toBeInTheDocument(); // birth date
      expect(screen.getByDisplayValue('18')).toBeInTheDocument(); // education age
      expect(screen.getByDisplayValue('5000')).toBeInTheDocument(); // current savings
      expect(screen.getByDisplayValue('800')).toBeInTheDocument(); // grants already received
      expect(screen.getByDisplayValue('2000')).toBeInTheDocument(); // contribution amount
      expect(screen.getByDisplayValue('14000')).toBeInTheDocument(); // lump sum
      expect(screen.getByDisplayValue('5')).toBeInTheDocument(); // expected return
      
      // Check that the form elements exist
      expect(screen.getByRole('checkbox')).toBeInTheDocument(); // grant received this year
      expect(screen.getByRole('combobox')).toBeInTheDocument(); // contribution frequency
    });

    test('renders calculate button', () => {
      render(<RESPCalculator />);
      
      expect(screen.getByRole('button', { name: /calculate resp savings/i })).toBeInTheDocument();
    });

    test('displays investment growth calculation in info box', () => {
      render(<RESPCalculator />);
      
      expect(screen.getByText(/investment growth so far/i)).toBeInTheDocument();
      // With default values: $5000 - $5000 - $800 = -$800, but should show $0 (max with 0)
      expect(screen.getByText('$0')).toBeInTheDocument();
    });
  });

  describe('Age Calculation Logic', () => {
    test('calculates current age correctly from birth date', () => {
      render(<RESPCalculator />);
      
      // Set birth date to 2020-01-01 (4 years old on test date 2024-01-01)
      const birthDateInput = screen.getByDisplayValue('2020-01-01');
      fireEvent.change(birthDateInput, { target: { value: '2020-01-01' } });
      
      expect(screen.getByText(/current age: 4 years, 0 months/i)).toBeInTheDocument();
    });

    test('calculates education start date correctly', () => {
      render(<RESPCalculator />);
      
      // Set birth date to 2020-01-01 and education age to 18
      const birthDateInput = screen.getByDisplayValue('2020-01-01');
      const educationAgeInput = screen.getByDisplayValue('18');
      
      fireEvent.change(birthDateInput, { target: { value: '2020-01-01' } });
      fireEvent.change(educationAgeInput, { target: { value: '18' } });
      
      expect(screen.getByText(/education starts: september 2038/i)).toBeInTheDocument();
    });

    test('handles age calculation for partial months', () => {
      render(<RESPCalculator />);
      
      // Set birth date to 2020-06-15 (3 years, 6 months old on test date 2024-01-01)
      const birthDateInput = screen.getByLabelText(/child's birthdate/i);
      fireEvent.change(birthDateInput, { target: { value: '2020-06-15' } });
      
      expect(screen.getByText(/current age: 3 years, 6 months/i)).toBeInTheDocument();
    });
  });

  describe('Input Validation and Boundaries', () => {
    test('enforces minimum and maximum values for inputs', () => {
      render(<RESPCalculator />);
      
      const educationAgeInput = screen.getByLabelText(/age when education starts/i) as HTMLInputElement;
      const contributionsInput = screen.getByLabelText(/contributions already made/i) as HTMLInputElement;
      const grantsInput = screen.getByLabelText(/grants already received/i) as HTMLInputElement;
      
      expect(educationAgeInput.min).toBe('17');
      expect(educationAgeInput.max).toBe('25');
      expect(contributionsInput.min).toBe('0');
      expect(contributionsInput.max).toBe('50000');
      expect(grantsInput.min).toBe('0');
      expect(grantsInput.max).toBe('7200');
    });

    test('updates investment growth when inputs change', async () => {
      const user = userEvent.setup();
      render(<RESPCalculator />);
      
      // Change current savings to see investment growth update
      const currentSavingsInput = screen.getByLabelText(/current resp savings/i);
      await user.clear(currentSavingsInput);
      await user.type(currentSavingsInput, '10000');
      
      // With $10,000 savings, $5,000 contributions, $800 grants = $4,200 growth
      expect(screen.getByText('$4,200')).toBeInTheDocument();
    });

    test('handles contribution frequency changes', async () => {
      const user = userEvent.setup();
      render(<RESPCalculator />);
      
      const frequencySelect = screen.getByLabelText(/contribution frequency/i);
      const contributionInput = screen.getByLabelText(/amount i will contribute/i);
      
      // Default should be annual
      expect(frequencySelect).toHaveValue('annual');
      expect(contributionInput).toHaveAttribute('placeholder', 'Annual amount');
      
      // Change to monthly
      await user.selectOptions(frequencySelect, 'monthly');
      expect(contributionInput).toHaveAttribute('placeholder', 'Monthly amount');
    });
  });

  describe('RESP Calculation Logic', () => {
    test('performs basic calculation with default values', async () => {
      const user = userEvent.setup();
      render(<RESPCalculator />);
      
      // Click calculate button
      const calculateButton = screen.getByRole('button', { name: /calculate resp savings/i });
      await user.click(calculateButton);
      
      // Should see results section
      await waitFor(() => {
        expect(screen.getByText(/your resp projection/i)).toBeInTheDocument();
      });
      
      // Check for result categories
      expect(screen.getByText(/your contributions:/i)).toBeInTheDocument();
      expect(screen.getByText(/investment growth:/i)).toBeInTheDocument();
      expect(screen.getByText(/government grants:/i)).toBeInTheDocument();
      expect(screen.getByText(/total education funding:/i)).toBeInTheDocument();
    });

    test('shows chart when results are calculated', async () => {
      const user = userEvent.setup();
      render(<RESPCalculator />);
      
      const calculateButton = screen.getByRole('button', { name: /calculate resp savings/i });
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('resp-chart')).toBeInTheDocument();
      });
    });

    test('calculates with different contribution frequencies', async () => {
      const user = userEvent.setup();
      render(<RESPCalculator />);
      
      // Set monthly contributions
      const frequencySelect = screen.getByLabelText(/contribution frequency/i);
      const contributionInput = screen.getByLabelText(/amount i will contribute/i);
      
      await user.selectOptions(frequencySelect, 'monthly');
      await user.clear(contributionInput);
      await user.type(contributionInput, '200');
      
      const calculateButton = screen.getByRole('button', { name: /calculate resp savings/i });
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/your resp projection/i)).toBeInTheDocument();
      });
    });

    test.skip('handles lump sum contributions', async () => {
      const user = userEvent.setup();
      render(<RESPCalculator />);
      
      // Set lump sum amount
      const lumpSumInput = screen.getByLabelText(/one-time lump sum contribution/i);
      await user.clear(lumpSumInput);
      await user.type(lumpSumInput, '10000');
      
      const calculateButton = screen.getByRole('button', { name: /calculate resp savings/i });
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/your resp projection/i)).toBeInTheDocument();
      });
    });
  });

  describe('Grant Calculation Logic', () => {
    test.skip('correctly handles grant received this year checkbox', async () => {
      const user = userEvent.setup();
      render(<RESPCalculator />);
      
      const grantCheckbox = screen.getByLabelText(/grant already received this year/i);
      
      // Should be unchecked by default
      expect(grantCheckbox).not.toBeChecked();
      
      // Check the box
      await user.click(grantCheckbox);
      expect(grantCheckbox).toBeChecked();
      
      // Calculate and verify it affects the results
      const calculateButton = screen.getByRole('button', { name: /calculate resp savings/i });
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/your resp projection/i)).toBeInTheDocument();
      });
    });

    test.skip('displays unused grant eligibility when applicable', async () => {
      const user = userEvent.setup();
      render(<RESPCalculator />);
      
      // Set grants already received to less than maximum
      const grantsInput = screen.getByLabelText(/grants already received/i);
      await user.clear(grantsInput);
      await user.type(grantsInput, '1000');
      
      const calculateButton = screen.getByRole('button', { name: /calculate resp savings/i });
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/unused grant eligibility/i)).toBeInTheDocument();
      });
    });

    test.skip('displays remaining contribution room when applicable', async () => {
      const user = userEvent.setup();
      render(<RESPCalculator />);
      
      // Set contributions already made to less than maximum
      const contributionsInput = screen.getByLabelText(/contributions already made/i);
      await user.clear(contributionsInput);
      await user.type(contributionsInput, '10000');
      
      const calculateButton = screen.getByRole('button', { name: /calculate resp savings/i });
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/remaining contribution room/i)).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    test.skip('handles child already at education age', async () => {
      const user = userEvent.setup();
      render(<RESPCalculator />);
      
      // Set birth date to make child 18 years old (born in 2006)
      const birthDateInput = screen.getByLabelText(/child's birthdate/i);
      await user.clear(birthDateInput);
      await user.type(birthDateInput, '2006-01-01');
      
      const calculateButton = screen.getByRole('button', { name: /calculate resp savings/i });
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/your resp projection/i)).toBeInTheDocument();
      });
    });

    test.skip('handles maximum contribution limits', async () => {
      const user = userEvent.setup();
      render(<RESPCalculator />);
      
      // Set contributions to maximum
      const contributionsInput = screen.getByLabelText(/contributions already made/i);
      await user.clear(contributionsInput);
      await user.type(contributionsInput, '50000');
      
      const calculateButton = screen.getByRole('button', { name: /calculate resp savings/i });
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/your resp projection/i)).toBeInTheDocument();
      });
      
      // Should not show remaining contribution room
      expect(screen.queryByText(/remaining contribution room/i)).not.toBeInTheDocument();
    });

    test.skip('handles maximum grant limits', async () => {
      const user = userEvent.setup();
      render(<RESPCalculator />);
      
      // Set grants to maximum
      const grantsInput = screen.getByLabelText(/grants already received/i);
      await user.clear(grantsInput);
      await user.type(grantsInput, '7200');
      
      const calculateButton = screen.getByRole('button', { name: /calculate resp savings/i });
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/your resp projection/i)).toBeInTheDocument();
      });
      
      // Should not show unused grant eligibility
      expect(screen.queryByText(/unused grant eligibility/i)).not.toBeInTheDocument();
    });

    test.skip('handles zero expected return', async () => {
      const user = userEvent.setup();
      render(<RESPCalculator />);
      
      // Set expected return to 0%
      const returnInput = screen.getByLabelText(/expected annual return/i);
      await user.clear(returnInput);
      await user.type(returnInput, '0');
      
      const calculateButton = screen.getByRole('button', { name: /calculate resp savings/i });
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/your resp projection/i)).toBeInTheDocument();
      });
    });

    test('handles negative investment growth display', () => {
      render(<RESPCalculator />);
      
      // Set values where growth would be negative
      const currentSavingsInput = screen.getByLabelText(/current resp savings/i);
      const contributionsInput = screen.getByLabelText(/contributions already made/i);
      const grantsInput = screen.getByLabelText(/grants already received/i);
      
      fireEvent.change(currentSavingsInput, { target: { value: '1000' } });
      fireEvent.change(contributionsInput, { target: { value: '5000' } });
      fireEvent.change(grantsInput, { target: { value: '800' } });
      
      // Should show $0 instead of negative value
      expect(screen.getByText('$0')).toBeInTheDocument();
    });
  });

  describe('Accessibility and UX', () => {
    test('has proper labels for all form inputs', () => {
      render(<RESPCalculator />);
      
      const numberInputs = screen.getAllByRole('spinbutton');
      const dateInputs = screen.getAllByDisplayValue(/\d{4}-\d{2}-\d{2}/); // Date inputs
      const selectInputs = screen.getAllByRole('combobox');
      const checkboxInputs = screen.getAllByRole('checkbox');
      
      // All inputs should have accessible names
      [...numberInputs, ...dateInputs, ...selectInputs, ...checkboxInputs].forEach(input => {
        expect(input).toHaveAccessibleName();
      });
    });

    test('button has proper accessible name', () => {
      render(<RESPCalculator />);
      
      const button = screen.getByRole('button', { name: /calculate resp savings/i });
      expect(button).toHaveAccessibleName();
    });

    test('displays helpful hint text for lump sum strategy', () => {
      render(<RESPCalculator />);
      
      expect(screen.getByText(/optimal strategy: \$14,000 lump sum/i)).toBeInTheDocument();
    });

    test('displays educational information about CESG grants', async () => {
      const user = userEvent.setup();
      render(<RESPCalculator />);
      
      const calculateButton = screen.getByRole('button', { name: /calculate resp savings/i });
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/canada education savings grant/i)).toBeInTheDocument();
        expect(screen.getByText(/20% on the first \$2,500 contributed annually/i)).toBeInTheDocument();
        expect(screen.getByText(/lifetime maximum of \$7,200/i)).toBeInTheDocument();
        expect(screen.getByText(/\$50,000 lifetime maximum/i)).toBeInTheDocument();
      });
    });
  });

  describe('Real-world Scenarios', () => {
    test.skip('typical RESP scenario: 2-year-old child', async () => {
      const user = userEvent.setup();
      render(<RESPCalculator />);
      
      // Wait for component to fully render
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /RESP Calculator/i })).toBeInTheDocument();
      });
      
      // Set up realistic scenario
      const birthDateInput = screen.getByLabelText(/child's birthdate/i);
      const currentSavingsInput = screen.getByLabelText(/current resp savings/i);
      const contributionsInput = screen.getByLabelText(/contributions already made/i);
      const grantsInput = screen.getByLabelText(/grants already received/i);
      const contributionAmountInput = screen.getByLabelText(/amount i will contribute/i);
      
      await user.clear(birthDateInput);
      await user.type(birthDateInput, '2022-03-15');
      await user.clear(currentSavingsInput);
      await user.type(currentSavingsInput, '3000');
      await user.clear(contributionsInput);
      await user.type(contributionsInput, '2500');
      await user.clear(grantsInput);
      await user.type(grantsInput, '500');
      await user.clear(contributionAmountInput);
      await user.type(contributionAmountInput, '2500');
      
      const calculateButton = screen.getByRole('button', { name: /calculate resp savings/i });
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/your resp projection/i)).toBeInTheDocument();
      });
      
      // Should show meaningful results
      const chart = screen.getByTestId('resp-chart');
      expect(chart).toBeInTheDocument();
      
      // Chart should have multiple years of data
      const chartData = JSON.parse(chart.getAttribute('data-yearly-data') || '[]');
      expect(chartData.length).toBeGreaterThan(10); // Should have ~16 years of data
    });

    test.skip('late starter scenario: 15-year-old child', async () => {
      const user = userEvent.setup();
      render(<RESPCalculator />);
      
      // Wait for component to fully render
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /RESP Calculator/i })).toBeInTheDocument();
      });
      
      // Set up late starter scenario
      const birthDateInput = screen.getByLabelText(/child's birthdate/i);
      const currentSavingsInput = screen.getByLabelText(/current resp savings/i);
      const contributionsInput = screen.getByLabelText(/contributions already made/i);
      const lumpSumInput = screen.getByLabelText(/one-time lump sum contribution/i);
      
      await user.clear(birthDateInput);
      await user.type(birthDateInput, '2009-01-01');
      await user.clear(currentSavingsInput);
      await user.type(currentSavingsInput, '1000');
      await user.clear(contributionsInput);
      await user.type(contributionsInput, '1000');
      await user.clear(lumpSumInput);
      await user.type(lumpSumInput, '15000');
      
      const calculateButton = screen.getByRole('button', { name: /calculate resp savings/i });
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/your resp projection/i)).toBeInTheDocument();
      });
      
      // Should still generate meaningful results
      const chart = screen.getByTestId('resp-chart');
      expect(chart).toBeInTheDocument();
    });
  });
});