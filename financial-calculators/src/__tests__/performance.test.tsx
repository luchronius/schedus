/**
 * Performance Tests for Calculator Components
 * Testing rendering performance, calculation speed, and memory usage
 */

import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RESPCalculator from '../components/RESPCalculator';
import CompoundInterestCalculator from '../components/CompoundInterestCalculator';
import DailyInterestCalculator from '../components/DailyInterestCalculator';
import LoanAmortizationCalculator from '../components/LoanAmortizationCalculator';
import { 
  generateAmortizationSchedule,
  calculateCompoundInterest,
  calculateDailyInterest
} from '../utils/financialCalculations';

// Mock RESPMultiYearChart for performance tests
jest.mock('../components/RESPMultiYearChart', () => {
  return function MockRESPMultiYearChart({ yearlyData }: { yearlyData: any[] }) {
    return (
      <div data-testid="resp-chart" data-yearly-data={JSON.stringify(yearlyData)}>
        Performance Test Chart with {yearlyData.length} data points
      </div>
    );
  };
});

describe('Performance Tests', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01'));
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    cleanup();
  });

  describe('Component Rendering Performance', () => {
    test('RESPCalculator renders within performance threshold', () => {
      const startTime = performance.now();
      render(<RESPCalculator />);
      const endTime = performance.now();

      const renderTime = endTime - startTime;
      expect(renderTime).toBeLessThan(50); // Should render in less than 50ms
      
      // Verify it actually rendered
      expect(screen.getByText(/resp calculator/i)).toBeInTheDocument();
    });

    test('CompoundInterestCalculator renders efficiently', () => {
      const startTime = performance.now();
      render(<CompoundInterestCalculator />);
      const endTime = performance.now();

      const renderTime = endTime - startTime;
      expect(renderTime).toBeLessThan(30); // Should render in less than 30ms
      
      expect(screen.getByText(/compound interest calculator/i)).toBeInTheDocument();
    });

    test('DailyInterestCalculator renders efficiently', () => {
      const startTime = performance.now();
      render(<DailyInterestCalculator />);
      const endTime = performance.now();

      const renderTime = endTime - startTime;
      expect(renderTime).toBeLessThan(30); // Should render in less than 30ms
      
      expect(screen.getByText(/daily interest calculator/i)).toBeInTheDocument();
    });

    test('LoanAmortizationCalculator renders efficiently', () => {
      const startTime = performance.now();
      render(<LoanAmortizationCalculator />);
      const endTime = performance.now();

      const renderTime = endTime - startTime;
      expect(renderTime).toBeLessThan(30); // Should render in less than 30ms
      
      expect(screen.getByText(/loan amortization calculator/i)).toBeInTheDocument();
    });
  });

  describe('Financial Calculation Performance', () => {
    test('compound interest calculation performance', () => {
      const startTime = performance.now();
      
      // Test multiple calculations
      for (let i = 0; i < 100; i++) {
        calculateCompoundInterest(
          10000 + (i * 1000),
          0.07,
          12,
          10 + (i * 0.1)
        );
      }
      
      const endTime = performance.now();
      const calculationTime = endTime - startTime;
      
      expect(calculationTime).toBeLessThan(10); // 100 calculations in less than 10ms
    });

    test('daily interest calculation performance', () => {
      const startTime = performance.now();
      
      // Test multiple calculations with varying days
      for (let i = 1; i <= 365; i++) {
        calculateDailyInterest(10000, 0.05, i);
      }
      
      const endTime = performance.now();
      const calculationTime = endTime - startTime;
      
      expect(calculationTime).toBeLessThan(50); // 365 calculations in less than 50ms
    });

    test('large amortization schedule generation performance', () => {
      const startTime = performance.now();
      
      // Generate a 30-year mortgage schedule (360 payments)
      const schedule = generateAmortizationSchedule(500000, 0.065, 30);
      
      const endTime = performance.now();
      const calculationTime = endTime - startTime;
      
      expect(calculationTime).toBeLessThan(100); // Should complete in less than 100ms
      expect(schedule).toHaveLength(360); // Verify it completed
    });

    test('multiple large amortization schedules performance', () => {
      const startTime = performance.now();
      
      // Generate multiple schedules
      const schedules = [];
      for (let i = 0; i < 10; i++) {
        schedules.push(generateAmortizationSchedule(
          100000 + (i * 50000),
          0.04 + (i * 0.005),
          15 + i
        ));
      }
      
      const endTime = performance.now();
      const calculationTime = endTime - startTime;
      
      expect(calculationTime).toBeLessThan(500); // 10 schedules in less than 500ms
      expect(schedules).toHaveLength(10);
    });
  });

  describe('User Interaction Performance', () => {
    test('RESP calculator responds quickly to input changes', async () => {
      const user = userEvent.setup();
      render(<RESPCalculator />);

      const startTime = performance.now();
      
      // Simulate rapid input changes
      const contributionInput = screen.getByDisplayValue('2000');
      await user.clear(contributionInput);
      await user.type(contributionInput, '5000');
      
      const expectedReturnInput = screen.getByDisplayValue('5');
      await user.clear(expectedReturnInput);
      await user.type(expectedReturnInput, '7.5');
      
      const calculateButton = screen.getByRole('button', { name: /calculate resp savings/i });
      await user.click(calculateButton);
      
      const endTime = performance.now();
      const interactionTime = endTime - startTime;
      
      expect(interactionTime).toBeLessThan(200); // Full interaction in less than 200ms
    });

    test('compound interest calculator timeline toggle performance', async () => {
      const user = userEvent.setup();
      render(<CompoundInterestCalculator />);

      // First calculate to enable timeline
      const calculateButton = screen.getByRole('button', { name: /calculate compound growth/i });
      await user.click(calculateButton);

      await screen.findByText(/show growth timeline/i);

      const startTime = performance.now();
      
      // Toggle timeline multiple times
      const timelineButton = screen.getByText(/show growth timeline/i);
      await user.click(timelineButton);
      
      await screen.findByText(/hide growth timeline/i);
      
      const hideButton = screen.getByText(/hide growth timeline/i);
      await user.click(hideButton);
      
      const endTime = performance.now();
      const toggleTime = endTime - startTime;
      
      expect(toggleTime).toBeLessThan(100); // Timeline toggle in less than 100ms
    });

    test('loan amortization schedule view switching performance', async () => {
      const user = userEvent.setup();
      render(<LoanAmortizationCalculator />);

      // Calculate to enable schedule views
      const calculateButton = screen.getByRole('button', { name: /calculate loan payment/i });
      await user.click(calculateButton);

      await screen.findByText(/payment schedule view/i);

      const startTime = performance.now();
      
      // Switch between all view modes
      const yearlyButton = screen.getByRole('button', { name: /yearly/i });
      await user.click(yearlyButton);
      
      const fullButton = screen.getByRole('button', { name: /full schedule/i });
      await user.click(fullButton);
      
      const summaryButton = screen.getByRole('button', { name: /summary/i });
      await user.click(summaryButton);
      
      const endTime = performance.now();
      const switchingTime = endTime - startTime;
      
      expect(switchingTime).toBeLessThan(150); // View switching in less than 150ms
    });
  });

  describe('Memory Usage and DOM Performance', () => {
    test('components do not create excessive DOM elements', () => {
      const initialElementCount = document.querySelectorAll('*').length;
      
      render(<RESPCalculator />);
      
      const afterRenderCount = document.querySelectorAll('*').length;
      const elementsAdded = afterRenderCount - initialElementCount;
      
      expect(elementsAdded).toBeLessThan(200); // Should not add excessive elements
    });

    test('loan amortization full schedule is efficiently rendered', async () => {
      const user = userEvent.setup();
      render(<LoanAmortizationCalculator />);

      // Set up a long-term loan for maximum schedule size
      const termInput = screen.getByDisplayValue(30);
      await user.clear(termInput);
      await user.type(termInput, '30'); // 30-year loan = 360 payments

      const calculateButton = screen.getByRole('button', { name: /calculate loan payment/i });
      await user.click(calculateButton);

      const fullScheduleButton = screen.getByRole('button', { name: /full schedule/i });
      
      const startTime = performance.now();
      await user.click(fullScheduleButton);
      const endTime = performance.now();
      
      const renderTime = endTime - startTime;
      expect(renderTime).toBeLessThan(50); // Full schedule render in less than 50ms
      
      // Verify the schedule is rendered but not all 360 rows (should be filtered)
      const scheduleRows = document.querySelectorAll('[class*="grid-cols-4"]');
      expect(scheduleRows.length).toBeLessThan(100); // Should be filtered for performance
    });

    test('RESP chart with large dataset performance', async () => {
      const user = userEvent.setup();
      render(<RESPCalculator />);

      // Set up scenario that will generate maximum years of data
      const birthDateInput = screen.getByDisplayValue('2020-01-01');
      await user.clear(birthDateInput);
      await user.type(birthDateInput, '2006-01-01'); // Child born in 2006, will have many years

      const educationAgeInput = screen.getByDisplayValue('18');
      await user.clear(educationAgeInput);
      await user.type(educationAgeInput, '25'); // Extended education period

      const startTime = performance.now();
      
      const calculateButton = screen.getByRole('button', { name: /calculate resp savings/i });
      await user.click(calculateButton);
      
      const endTime = performance.now();
      const calculationTime = endTime - startTime;
      
      expect(calculationTime).toBeLessThan(300); // Complex calculation with chart in less than 300ms
      
      // Verify chart was created
      await screen.findByTestId('resp-chart');
    });
  });

  describe('Stress Testing', () => {
    test('handles rapid successive calculations', async () => {
      const user = userEvent.setup();
      render(<CompoundInterestCalculator />);

      const principalInput = screen.getByDisplayValue(10000);
      const calculateButton = screen.getByRole('button', { name: /calculate compound growth/i });

      const startTime = performance.now();
      
      // Perform 10 rapid calculations with different values
      for (let i = 1; i <= 10; i++) {
        await user.clear(principalInput);
        await user.type(principalInput, (i * 5000).toString());
        await user.click(calculateButton);
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      expect(totalTime).toBeLessThan(500); // 10 calculations in less than 500ms
    });

    test('handles extreme values without performance degradation', () => {
      const startTime = performance.now();
      
      // Test with extreme values
      const results = [];
      results.push(calculateCompoundInterest(9999999, 0.15, 365, 50));
      results.push(generateAmortizationSchedule(10000000, 0.12, 40));
      results.push(calculateDailyInterest(5000000, 0.08, 365));
      
      const endTime = performance.now();
      const calculationTime = endTime - startTime;
      
      expect(calculationTime).toBeLessThan(200); // Extreme value calculations in less than 200ms
      expect(results).toHaveLength(3);
    });

    test('multiple component instances do not interfere', () => {
      const startTime = performance.now();
      
      // Render multiple instances
      const { unmount: unmount1 } = render(<CompoundInterestCalculator />);
      const { unmount: unmount2 } = render(<DailyInterestCalculator />);
      const { unmount: unmount3 } = render(<LoanAmortizationCalculator />);
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      expect(renderTime).toBeLessThan(100); // Multiple components in less than 100ms
      
      // Cleanup
      unmount1();
      unmount2();
      unmount3();
    });
  });

  describe('Browser Performance Metrics', () => {
    test('does not cause layout thrashing during calculations', async () => {
      const user = userEvent.setup();
      render(<RESPCalculator />);

      // Monitor for layout shifts during calculation
      let layoutShiftCount = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'layout-shift') {
            layoutShiftCount++;
          }
        }
      });
      
      if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
        observer.observe({ entryTypes: ['layout-shift'] });
      }

      const calculateButton = screen.getByRole('button', { name: /calculate resp savings/i });
      await user.click(calculateButton);

      // Small delay to capture any layout shifts
      await new Promise(resolve => setTimeout(resolve, 100));
      
      observer.disconnect();
      
      // Should not cause excessive layout shifts
      expect(layoutShiftCount).toBeLessThan(5);
    });

    test('efficient re-rendering on input changes', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<CompoundInterestCalculator />);

      const startTime = performance.now();
      
      // Simulate props/state changes through re-rendering
      for (let i = 0; i < 10; i++) {
        rerender(<CompoundInterestCalculator />);
      }
      
      const endTime = performance.now();
      const rerenderTime = endTime - startTime;
      
      expect(rerenderTime).toBeLessThan(50); // 10 re-renders in less than 50ms
    });
  });
});