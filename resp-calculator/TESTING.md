# Comprehensive Testing Guide for Calculator Applications

## Overview

This codebase includes a comprehensive testing suite for financial calculator components built with React and Next.js. The test suite covers unit testing, integration testing, performance testing, and accessibility testing to ensure robust, accurate, and user-friendly financial calculations.

## Test Framework Setup

### Technologies Used
- **Jest**: JavaScript testing framework
- **React Testing Library**: Component testing utilities
- **@testing-library/user-event**: User interaction simulation
- **@testing-library/jest-dom**: Custom Jest matchers

### Configuration Files
- `jest.config.js`: Main Jest configuration with Next.js integration
- `jest.setup.js`: Global test setup and mocks
- `package.json`: Test scripts and dependencies

## Test Structure

### 1. Unit Tests
Located in `src/components/__tests__/`

#### RESPCalculator.test.tsx
Tests the comprehensive RESP (Registered Education Savings Plan) calculator:
- **Component Rendering**: Verifies all form inputs and UI elements
- **Age Calculation Logic**: Tests birth date to current age calculations
- **Input Validation**: Boundary testing and error handling
- **RESP Calculation Logic**: Financial calculations and grant eligibility
- **Grant Calculation**: CESG (Canada Education Savings Grant) logic
- **Edge Cases**: Maximum limits, zero values, negative scenarios
- **Real-world Scenarios**: Typical RESP planning workflows

#### CompoundInterestCalculator.test.tsx
Tests compound interest calculations and visualizations:
- **Input Validation**: Principal, rate, time period, and frequency validation
- **Calculation Logic**: Various compounding frequencies and scenarios
- **Growth Timeline**: Interactive timeline display and toggling
- **User Interface**: Result displays and key insights
- **Real-world Scenarios**: Retirement savings, CD investments

#### DailyInterestCalculator.test.tsx
Tests precise daily interest calculations:
- **Daily Rate Conversion**: Annual to daily rate calculations
- **Interest Scaling**: Multiple day period calculations
- **Precision Testing**: 6-decimal place accuracy requirements
- **Edge Cases**: Zero rates, maximum days, extreme values
- **Real-world Scenarios**: High-yield savings, money market accounts

#### LoanAmortizationCalculator.test.tsx
Tests loan payment and amortization schedule generation:
- **Payment Calculations**: Monthly payment accuracy
- **Amortization Schedules**: Complete payment schedules over loan terms
- **Schedule Views**: Summary, yearly, and full schedule displays
- **Interest vs Principal**: Payment breakdown analysis
- **Real-world Scenarios**: Mortgages, auto loans, personal loans

#### RESPMultiYearChart.test.tsx
Tests the data visualization component:
- **Chart Rendering**: SVG chart generation and structure
- **Data Visualization**: Accurate representation of financial data
- **Chart Segmentation**: Handling long-term projections
- **Performance**: Efficient rendering with large datasets
- **Edge Cases**: Empty data, negative values, extreme ranges

### 2. Integration Tests
Located in `src/__tests__/integration.test.tsx`

Tests complete user workflows and component interactions:
- **End-to-End Workflows**: Complete RESP planning scenarios
- **Cross-Component Validation**: Consistency between calculators
- **User Interaction Chains**: Multi-step calculation processes
- **Data Flow**: Component-to-chart data passing
- **Error Handling**: System-wide error scenarios

### 3. Performance Tests
Located in `src/__tests__/performance.test.tsx`

Tests application performance and optimization:
- **Component Rendering**: Render time benchmarks
- **Calculation Performance**: Mathematical operation speed
- **User Interaction Response**: Input change and calculation response times
- **Memory Usage**: DOM element counts and memory efficiency
- **Stress Testing**: Rapid calculations and extreme values
- **Browser Performance**: Layout stability and re-rendering efficiency

### 4. Accessibility Tests
Located in `src/__tests__/accessibility.test.tsx`

Tests WCAG compliance and inclusive design:
- **Keyboard Navigation**: Tab order and keyboard-only operation
- **Screen Reader Support**: ARIA labels and accessible names
- **Focus Management**: Logical focus flow and focus states
- **Color Contrast**: Visual accessibility for error states and results
- **Form Accessibility**: Label associations and error messaging
- **Responsive Accessibility**: Mobile and touch accessibility

### 5. Financial Calculation Tests
Located in `src/utils/__tests__/financialCalculations.test.ts`

Tests core mathematical accuracy:
- **Interest Rate Conversions**: Annual to daily/period rate calculations
- **Compound Interest**: Various compounding frequencies
- **Loan Calculations**: Payment and amortization accuracy
- **Input Validation**: Financial input boundary testing
- **Edge Cases**: Zero rates, extreme values, precision testing
- **Real-world Scenarios**: Mortgage, savings, and loan scenarios

## Running Tests

### Basic Commands
```bash
# Run all tests
npm test

# Run specific test file
npm test -- RESPCalculator.test.tsx

# Run tests with coverage
npm test:coverage

# Run tests in watch mode (development)
npm test:watch

# Run tests for CI/CD
npm test:ci
```

### Test Filtering
```bash
# Run tests matching a pattern
npm test -- --testNamePattern="renders main title"

# Run tests in specific directory
npm test -- src/components/__tests__/

# Run only unit tests
npm test -- --testPathPatterns="components/__tests__"

# Run only integration tests
npm test -- --testPathPatterns="integration.test"
```

### Coverage Reports
```bash
# Generate coverage report
npm run test:coverage

# Coverage files generated in /coverage directory
# - HTML report: coverage/lcov-report/index.html
# - Text summary displayed in terminal
```

## Test Categories and Focus Areas

### Mathematical Accuracy
- **Precision Testing**: Financial calculations accurate to required decimal places
- **Formula Validation**: Implementation matches standard financial formulas
- **Edge Case Handling**: Zero values, extreme ranges, boundary conditions
- **Consistency Checks**: Results consistent across different calculation methods

### User Experience Testing
- **Input Validation**: Comprehensive form validation and error messaging
- **User Workflows**: Complete user journey testing
- **Interactive Elements**: Button states, toggles, and dynamic content
- **Responsive Behavior**: Testing across different screen sizes and devices

### Performance Benchmarks
- **Render Performance**: Components render within 50ms threshold
- **Calculation Speed**: Complex calculations complete within 100ms
- **Memory Efficiency**: Reasonable DOM element counts
- **User Interaction**: Response times under 200ms for user actions

### Accessibility Standards
- **WCAG 2.1 AA Compliance**: Focus management, keyboard navigation
- **Screen Reader Support**: Proper ARIA labels and semantic HTML
- **Color Contrast**: Sufficient contrast ratios for error states
- **Touch Accessibility**: Adequate touch target sizes

## Test Data and Scenarios

### Realistic Financial Scenarios
- **RESP Planning**: Various child ages and contribution strategies
- **Retirement Savings**: Long-term compound interest scenarios
- **Mortgage Analysis**: Different loan amounts, rates, and terms
- **Short-term Savings**: Daily interest and high-yield accounts

### Edge Cases and Stress Testing
- **Zero Values**: 0% interest rates, zero principal amounts
- **Maximum Limits**: RESP contribution limits ($50,000), grant limits ($7,200)
- **Extreme Values**: Large loan amounts, high interest rates, long terms
- **Invalid Inputs**: Negative values, out-of-range dates, invalid numbers

## Continuous Integration

### Test Coverage Requirements
- **Overall Coverage**: 80% minimum for statements, branches, functions, lines
- **Critical Components**: 90%+ coverage for financial calculation utilities
- **Component Coverage**: 85%+ for calculator components
- **Integration Coverage**: 75%+ for workflow scenarios

### Automated Testing
- **Pre-commit Hooks**: Run linting and basic tests before commits
- **Pull Request Testing**: Full test suite runs on PR creation
- **Deployment Testing**: Tests must pass before production deployment
- **Performance Monitoring**: Track test execution times and performance regressions

## Debugging and Troubleshooting

### Common Issues
1. **Timer-related Test Failures**: Use `jest.useFakeTimers()` for date-dependent tests
2. **Label Association Errors**: Some components may need `htmlFor` attributes added
3. **Async Test Issues**: Ensure proper use of `waitFor()` for async operations
4. **Mock Component Issues**: Verify mock implementations match expected props

### Debug Commands
```bash
# Run tests with verbose output
npm test -- --verbose

# Run single test file with debugging
npm test -- --testPathPatterns="RESPCalculator" --verbose

# Debug specific test
npm test -- --testNamePattern="specific test name" --verbose
```

### Test Environment
- **Node Version**: 22.14.0+
- **Jest Version**: 30.0.5
- **React Testing Library**: 16.3.0
- **Browser Environment**: jsdom for DOM simulation

## Best Practices

### Writing Tests
1. **Descriptive Test Names**: Clear description of what is being tested
2. **AAA Pattern**: Arrange, Act, Assert structure
3. **Single Responsibility**: Each test should test one specific behavior
4. **Realistic Data**: Use realistic financial values and scenarios
5. **User-Centric Testing**: Test from user perspective, not implementation details

### Maintenance
1. **Regular Test Reviews**: Ensure tests remain relevant as code evolves
2. **Performance Monitoring**: Watch for test execution time increases
3. **Coverage Analysis**: Regularly review coverage reports for gaps
4. **Accessibility Updates**: Keep accessibility tests current with WCAG updates

## Contributing to Tests

### Adding New Tests
1. Follow existing file naming patterns (`ComponentName.test.tsx`)
2. Include comprehensive test categories (rendering, logic, edge cases, accessibility)
3. Add realistic scenarios relevant to financial planning
4. Ensure proper cleanup and test isolation
5. Update this documentation for significant additions

### Test Quality Standards
- **Comprehensive Coverage**: Test happy paths, error cases, and edge cases
- **Performance Awareness**: Include performance considerations in test design
- **Accessibility First**: Include accessibility testing for all interactive elements
- **Documentation**: Comment complex test scenarios and explain business logic

This testing suite ensures the financial calculator applications are accurate, performant, accessible, and provide an excellent user experience for financial planning and analysis.