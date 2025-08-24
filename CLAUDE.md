# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a comprehensive financial calculators suite built with Next.js 15, React 19, and TypeScript. The project provides four specialized financial calculators:

1. **RESP Calculator** (main/home page) - Canadian education savings planning with government grants
2. **Daily Interest Calculator** - Precise daily interest calculations using compound formulas
3. **Compound Interest Calculator** - Multi-frequency compounding with timeline visualization
4. **Loan Amortization Calculator** - Complete loan payment schedules and analysis

## Development Commands

### Core Development
```bash
cd resp-calculator
npm run dev          # Start development server with Turbopack
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Testing
```bash
npm test             # Run all Jest tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
npm run test:ci      # Run tests for CI/CD (no watch)
```

### Test Filtering
```bash
# Run specific test file
npm test -- RESPCalculator.test.tsx

# Run tests matching pattern
npm test -- --testNamePattern="renders main title"

# Run only unit tests
npm test -- --testPathPatterns="components/__tests__"
```

## Architecture

### File Structure
```
resp-calculator/src/
├── app/                     # Next.js App Router
│   ├── page.tsx            # RESP Calculator (home)
│   ├── daily-interest/     # Daily interest calculator route
│   ├── compound-interest/  # Compound interest calculator route
│   ├── loan-amortization/  # Loan amortization calculator route
│   └── mortgage/           # Mortgage calculator route (legacy)
├── components/             # React components
│   ├── RESPCalculator.tsx          # Main RESP calculator
│   ├── DailyInterestCalculator.tsx # Daily interest calculations
│   ├── CompoundInterestCalculator.tsx # Compound interest with visualizations
│   ├── LoanAmortizationCalculator.tsx # Loan payment schedules
│   ├── RESPMultiYearChart.tsx      # Data visualization component
│   ├── NavigationHeader.tsx        # Main navigation
│   └── __tests__/                  # Component unit tests
└── utils/
    ├── financialCalculations.ts    # Core financial formulas
    └── __tests__/                  # Utility function tests
```

### Key Technical Patterns

#### Financial Calculations
- All calculations use high-precision arithmetic (10 decimal places internally, 2 for display)
- Compound interest formulas: `A = P(1 + r/n)^(nt)`
- Daily rate conversion: `r_daily = (1 + r_annual)^(1/365) - 1`
- Located in `utils/financialCalculations.ts`

#### Component Architecture
- All calculator components are client-side (`'use client'`)
- Use React hooks for state management (useState, useMemo)
- Environment variable integration for default values
- Input validation with realistic financial ranges

#### Data Visualization
- Custom SVG-based charts in `RESPMultiYearChart.tsx`
- Responsive design with segmented data display for long-term projections
- Performance optimized for large datasets

## Environment Variables

The RESP Calculator supports environment variable configuration:
```bash
NEXT_PUBLIC_DEFAULT_BIRTH_DATE=2020-01-01
NEXT_PUBLIC_DEFAULT_EDUCATION_AGE=18
NEXT_PUBLIC_DEFAULT_CURRENT_SAVINGS=5000
NEXT_PUBLIC_DEFAULT_CONTRIBUTION_AMOUNT=2000
NEXT_PUBLIC_DEFAULT_EXPECTED_RETURN=5.0
# ... and more defaults
```

## Testing Strategy

### Test Categories
1. **Unit Tests** (`components/__tests__/`) - Individual component behavior
2. **Integration Tests** (`src/__tests__/integration.test.tsx`) - Complete workflows
3. **Performance Tests** (`src/__tests__/performance.test.tsx`) - Render/calculation speed
4. **Accessibility Tests** (`src/__tests__/accessibility.test.tsx`) - WCAG compliance
5. **Financial Logic Tests** (`utils/__tests__/`) - Mathematical accuracy

### Coverage Requirements
- Overall: 80% minimum
- Financial calculations: 90%+ 
- Calculator components: 85%+

## Configuration Files

- `package.json` - Dependencies and scripts
- `next.config.ts` - Next.js configuration
- `tailwind.config.ts` - Tailwind CSS setup
- `jest.config.js` - Jest testing configuration
- `eslint.config.mjs` - ESLint rules
- `tsconfig.json` - TypeScript configuration

## Code Conventions

### Financial Calculations
- Always use the utilities in `financialCalculations.ts`
- Maintain 10-decimal precision for internal calculations
- Round to 2 decimal places for user display
- Validate inputs with realistic ranges (e.g., interest rates 0-50%, reasonable loan amounts)

### Component Patterns
- Use TypeScript interfaces for all props and state
- Implement comprehensive input validation
- Follow existing naming conventions (e.g., `CalculatorInputs`, `CalculationResults`)
- Use Tailwind for consistent styling

### State Management
- Use React hooks for component state
- Implement useMemo for expensive calculations
- Handle edge cases (zero values, extreme inputs)

### Error Handling
- Display user-friendly error messages
- Validate all financial inputs
- Handle calculation edge cases gracefully

## Testing Best Practices

- Write tests from user perspective, not implementation details
- Use realistic financial scenarios in tests
- Include accessibility testing for all interactive elements
- Test mathematical accuracy against known financial formulas
- Ensure performance benchmarks are met (components render <50ms, calculations <100ms)

## Canadian Financial Context

The RESP Calculator specifically handles Canadian regulations:
- CESG (Canada Education Savings Grant) calculations
- $50,000 lifetime contribution limits
- $7,200 maximum government grants
- Age-based grant eligibility (up to age 17)