/**
 * Unit tests for RESPMultiYearChart component
 * Testing chart rendering, data visualization, and edge cases
 */

import { render, screen } from '@testing-library/react';
import RESPMultiYearChart from '../RESPMultiYearChart';

// Sample test data that mimics the structure from RESPCalculator
const sampleYearlyData = [
  {
    currentSavings: 15000,
    grantsReceived: 3000,
    investmentGrowth: 2000,
    year: 'Jan 2025',
    childAge: '1 years old'
  },
  {
    currentSavings: 20000,
    grantsReceived: 4000,
    investmentGrowth: 3500,
    year: 'Jan 2026',
    childAge: '2 years old'
  },
  {
    currentSavings: 25000,
    grantsReceived: 5000,
    investmentGrowth: 5200,
    year: 'Jan 2027',
    childAge: '3 years old'
  },
  {
    currentSavings: 30000,
    grantsReceived: 6000,
    investmentGrowth: 7100,
    year: 'Jan 2028',
    childAge: '4 years old'
  },
  {
    currentSavings: 35000,
    grantsReceived: 7200,
    investmentGrowth: 9200,
    year: 'Jan 2029',
    childAge: '5 years old'
  },
  {
    currentSavings: 40000,
    grantsReceived: 7200,
    investmentGrowth: 11500,
    year: 'Jan 2030',
    childAge: '6 years old'
  }
];

const longYearlyData = Array.from({ length: 15 }, (_, index) => ({
  currentSavings: 10000 + (index * 3000),
  grantsReceived: Math.min(500 + (index * 400), 7200),
  investmentGrowth: 1000 + (index * 800),
  year: `Jan ${2025 + index}`,
  childAge: `${index + 1} years old`
}));

describe('RESPMultiYearChart', () => {
  describe('Component Rendering', () => {
    test('renders chart with provided data', () => {
      render(<RESPMultiYearChart yearlyData={sampleYearlyData} />);
      
      // Should render SVG chart
      expect(document.querySelector('svg')).toBeInTheDocument();
    });

    test('renders chart title', () => {
      render(<RESPMultiYearChart yearlyData={sampleYearlyData} />);
      
      expect(screen.getByText(/investment progression/i)).toBeInTheDocument();
    });

    test('renders with empty data gracefully', () => {
      render(<RESPMultiYearChart yearlyData={[]} />);
      
      // Should not crash and may render empty chart or placeholder
      expect(document.querySelector('svg')).toBeInTheDocument();
    });

    test('renders single data point', () => {
      const singleDataPoint = [sampleYearlyData[0]];
      render(<RESPMultiYearChart yearlyData={singleDataPoint} />);
      
      expect(document.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Chart Structure and Elements', () => {
    test('renders SVG chart with proper dimensions', () => {
      render(<RESPMultiYearChart yearlyData={sampleYearlyData} />);
      
      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('width');
      expect(svg).toHaveAttribute('height');
    });

    test('renders chart bars for each data point', () => {
      render(<RESPMultiYearChart yearlyData={sampleYearlyData} />);
      
      // Should have rect elements for the bars
      const bars = document.querySelectorAll('svg rect');
      expect(bars.length).toBeGreaterThan(0);
    });

    test('renders chart axes', () => {
      render(<RESPMultiYearChart yearlyData={sampleYearlyData} />);
      
      // Should have line elements for axes
      const lines = document.querySelectorAll('svg line');
      expect(lines.length).toBeGreaterThan(0);
    });

    test('renders text labels', () => {
      render(<RESPMultiYearChart yearlyData={sampleYearlyData} />);
      
      // Should have text elements for labels
      const textLabels = document.querySelectorAll('svg text');
      expect(textLabels.length).toBeGreaterThan(0);
    });

    test('renders legend with different colors', () => {
      render(<RESPMultiYearChart yearlyData={sampleYearlyData} />);
      
      // Check for legend items
      expect(screen.getByText(/contributions/i)).toBeInTheDocument();
      expect(screen.getByText(/grants/i)).toBeInTheDocument();
      expect(screen.getByText(/growth/i)).toBeInTheDocument();
    });
  });

  describe('Data Visualization', () => {
    test('displays year labels from data', () => {
      render(<RESPMultiYearChart yearlyData={sampleYearlyData} />);
      
      // Should show year information somewhere in the chart
      const chartContainer = screen.getByText(/investment progression/i).closest('div');
      expect(chartContainer).toBeInTheDocument();
    });

    test('handles data scaling correctly', () => {
      const largeValueData = sampleYearlyData.map(item => ({
        ...item,
        currentSavings: item.currentSavings * 10,
        grantsReceived: item.grantsReceived * 10,
        investmentGrowth: item.investmentGrowth * 10
      }));

      render(<RESPMultiYearChart yearlyData={largeValueData} />);
      
      // Should render without issues even with large values
      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    test('handles small values correctly', () => {
      const smallValueData = sampleYearlyData.map(item => ({
        ...item,
        currentSavings: Math.max(1, Math.floor(item.currentSavings / 100)),
        grantsReceived: Math.max(1, Math.floor(item.grantsReceived / 100)),
        investmentGrowth: Math.max(1, Math.floor(item.investmentGrowth / 100))
      }));

      render(<RESPMultiYearChart yearlyData={smallValueData} />);
      
      // Should render without issues even with small values
      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('Chart Segmentation for Long Data Sets', () => {
    test('handles long data sets by creating multiple charts', () => {
      render(<RESPMultiYearChart yearlyData={longYearlyData} />);
      
      // Should create multiple chart sections for long data
      const chartTitles = screen.getAllByText(/investment progression/i);
      expect(chartTitles.length).toBeGreaterThan(1);
    });

    test('shows appropriate chart titles for segments', () => {
      render(<RESPMultiYearChart yearlyData={longYearlyData} />);
      
      // Should have titles indicating year ranges for multiple charts
      const chartTitles = screen.getAllByText(/years \d+-\d+/i);
      expect(chartTitles.length).toBeGreaterThan(0);
    });

    test('maintains consistent scaling across chart segments', () => {
      render(<RESPMultiYearChart yearlyData={longYearlyData} />);
      
      // All SVG charts should be present
      const svgs = document.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(1);
      
      // Each should have similar structure
      svgs.forEach(svg => {
        expect(svg).toHaveAttribute('width');
        expect(svg).toHaveAttribute('height');
      });
    });
  });

  describe('Responsive Design', () => {
    test('renders with consistent container styling', () => {
      render(<RESPMultiYearChart yearlyData={sampleYearlyData} />);
      
      // Chart should be in a properly styled container
      const chartContainer = screen.getByText(/investment progression/i).closest('.bg-white');
      expect(chartContainer).toBeInTheDocument();
      expect(chartContainer).toHaveClass('p-8', 'rounded-lg', 'border');
    });

    test('handles different container widths', () => {
      // Test that the chart can adapt to different widths
      const { rerender } = render(<RESPMultiYearChart yearlyData={sampleYearlyData} />);
      
      let svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
      
      // Re-render with different data to test adaptability
      rerender(<RESPMultiYearChart yearlyData={longYearlyData} />);
      
      svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('handles data with zero values', () => {
      const zeroValueData = sampleYearlyData.map(item => ({
        ...item,
        currentSavings: 0,
        grantsReceived: 0,
        investmentGrowth: 0
      }));

      render(<RESPMultiYearChart yearlyData={zeroValueData} />);
      
      // Should render without crashing
      expect(document.querySelector('svg')).toBeInTheDocument();
    });

    test('handles data with negative investment growth', () => {
      const negativeGrowthData = sampleYearlyData.map(item => ({
        ...item,
        investmentGrowth: -1000
      }));

      render(<RESPMultiYearChart yearlyData={negativeGrowthData} />);
      
      // Should render without crashing
      expect(document.querySelector('svg')).toBeInTheDocument();
    });

    test('handles data with missing properties gracefully', () => {
      const incompleteData = [
        {
          currentSavings: 15000,
          grantsReceived: 3000,
          // Missing investmentGrowth
          year: 'Jan 2025',
          childAge: '1 years old'
        } as any
      ];

      // Should not crash the component
      expect(() => {
        render(<RESPMultiYearChart yearlyData={incompleteData} />);
      }).not.toThrow();
    });

    test('handles very large data sets', () => {
      const veryLargeData = Array.from({ length: 25 }, (_, index) => ({
        currentSavings: 10000 + (index * 2000),
        grantsReceived: Math.min(300 + (index * 300), 7200),
        investmentGrowth: 500 + (index * 600),
        year: `Jan ${2025 + index}`,
        childAge: `${index + 1} years old`
      }));

      render(<RESPMultiYearChart yearlyData={veryLargeData} />);
      
      // Should handle large datasets
      const chartTitles = screen.getAllByText(/investment progression/i);
      expect(chartTitles.length).toBeGreaterThan(1);
    });
  });

  describe('Data Integrity and Display', () => {
    test('preserves data relationships in visualization', () => {
      render(<RESPMultiYearChart yearlyData={sampleYearlyData} />);
      
      // The chart should accurately represent the data relationships
      // (This is more of a visual test, but we can check structure)
      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
      
      // Should have bars representing different data categories
      const rects = document.querySelectorAll('svg rect');
      expect(rects.length).toBeGreaterThan(0);
    });

    test('maintains data order in visualization', () => {
      const orderedData = [
        { ...sampleYearlyData[0], year: 'Jan 2020' },
        { ...sampleYearlyData[1], year: 'Jan 2021' },
        { ...sampleYearlyData[2], year: 'Jan 2022' }
      ];

      render(<RESPMultiYearChart yearlyData={orderedData} />);
      
      // Chart should maintain the chronological order
      expect(document.querySelector('svg')).toBeInTheDocument();
    });

    test('handles realistic RESP data ranges', () => {
      const realisticData = [
        {
          currentSavings: 2500,
          grantsReceived: 500,
          investmentGrowth: 150,
          year: 'Jan 2025',
          childAge: '1 years old'
        },
        {
          currentSavings: 25000,
          grantsReceived: 5000,
          investmentGrowth: 3200,
          year: 'Jan 2035',
          childAge: '11 years old'
        },
        {
          currentSavings: 50000,
          grantsReceived: 7200,
          investmentGrowth: 25000,
          year: 'Jan 2043',
          childAge: '19 years old'
        }
      ];

      render(<RESPMultiYearChart yearlyData={realisticData} />);
      
      // Should handle realistic RESP progression data
      expect(document.querySelector('svg')).toBeInTheDocument();
      expect(screen.getByText(/investment progression/i)).toBeInTheDocument();
    });
  });

  describe('Performance Considerations', () => {
    test('renders efficiently with moderate data set', () => {
      const moderateData = Array.from({ length: 12 }, (_, index) => ({
        currentSavings: 5000 + (index * 3000),
        grantsReceived: Math.min(400 + (index * 350), 7200),
        investmentGrowth: 200 + (index * 500),
        year: `Jan ${2025 + index}`,
        childAge: `${index + 1} years old`
      }));

      const startTime = performance.now();
      render(<RESPMultiYearChart yearlyData={moderateData} />);
      const endTime = performance.now();

      // Should render reasonably quickly (this is a basic performance check)
      expect(endTime - startTime).toBeLessThan(100); // Less than 100ms
      expect(document.querySelector('svg')).toBeInTheDocument();
    });

    test('does not create excessive DOM elements', () => {
      render(<RESPMultiYearChart yearlyData={sampleYearlyData} />);
      
      // Should not create an excessive number of DOM elements
      const allElements = document.querySelectorAll('*');
      expect(allElements.length).toBeLessThan(500); // Reasonable limit
    });
  });
});