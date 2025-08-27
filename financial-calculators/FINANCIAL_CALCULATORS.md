# Financial Calculators Suite

A comprehensive set of financial calculation tools built with Next.js, React, TypeScript, and Tailwind CSS. This suite provides accurate financial calculations with precision mathematical formulas for daily interest, compound interest, loan amortization, and RESP planning.

## 🚀 Features

### Daily Interest Calculator
Calculate precise daily interest earnings using compound interest formulas.

**Key Features:**
- Accurate daily interest rate conversion: `r_daily = (1 + r_annual)^(1/365) - 1`
- Support for custom time periods (1-365 days)
- High precision calculations (6 decimal places)
- Real-time validation and error handling
- Display of effective annual rate

**Use Cases:**
- High-yield savings account tracking
- Daily investment return monitoring
- Short-term investment planning
- Interest rate comparison

### Compound Interest Calculator
Harness the power of compound interest with multiple compounding frequencies.

**Key Features:**
- Multiple compounding frequencies (daily, monthly, quarterly, semi-annual, annual)
- Formula: `A = P(1 + r/n)^(nt)`
- Growth timeline visualization
- Effective annual rate calculation
- Investment growth insights

**Use Cases:**
- Long-term investment planning
- Retirement savings projections
- Education fund planning
- Understanding compounding frequency impact

### Loan Amortization Calculator
Calculate loan payments and detailed amortization schedules.

**Key Features:**
- Monthly payment calculation: `M = P × [r(1+r)^n] / [(1+r)^n - 1]`
- Complete amortization schedule generation
- Principal vs. interest breakdown
- Multiple schedule views (summary, yearly, full)
- Total interest cost analysis

**Use Cases:**
- Mortgage payment planning
- Auto loan calculations
- Personal loan analysis
- Understanding payment structure

### RESP Calculator
Plan for your child's education with government grants and compound growth.

**Key Features:**
- Canada Education Savings Grant (CESG) calculations
- Multi-year projection timeline
- Lump sum optimization strategies
- Government grant tracking
- Investment growth modeling

## 🔧 Technical Implementation

### Architecture
- **Frontend**: Next.js 15 with React 19
- **Styling**: Tailwind CSS 4
- **Language**: TypeScript
- **Testing**: Jest unit tests
- **Deployment**: Vercel-ready

### Precision & Accuracy
- **Decimal Precision**: 10 decimal places for internal calculations
- **Display Precision**: 2 decimal places for user display
- **Mathematical Accuracy**: Uses precise compound interest formulas
- **Validation**: Comprehensive input validation with realistic ranges

### File Structure
```
src/
├── app/                          # Next.js app directory
│   ├── daily-interest/           # Daily interest calculator page
│   ├── compound-interest/        # Compound interest calculator page
│   ├── loan-amortization/        # Loan amortization calculator page
│   └── page.tsx                  # RESP calculator home page
├── components/                   # React components
│   ├── DailyInterestCalculator.tsx
│   ├── CompoundInterestCalculator.tsx
│   ├── LoanAmortizationCalculator.tsx
│   ├── RESPCalculator.tsx
│   └── NavigationHeader.tsx
└── utils/                        # Utility functions
    ├── financialCalculations.ts  # Core financial formulas
    └── __tests__/               # Unit tests
        └── financialCalculations.test.ts
```

## 📊 Financial Formulas

### Daily Interest Rate Conversion
```typescript
r_daily = (1 + r_annual)^(1/365) - 1
```

### Compound Interest
```typescript
A = P * (1 + r/n)^(n*t)
```
Where:
- A = Final amount
- P = Principal
- r = Annual interest rate
- n = Compounding frequency per year
- t = Time in years

### Monthly Loan Payment
```typescript
M = P * [r(1+r)^n] / [(1+r)^n - 1]
```
Where:
- M = Monthly payment
- P = Principal loan amount
- r = Monthly interest rate
- n = Total number of payments

### Simple Interest
```typescript
I = P * r * t
```
Where:
- I = Interest
- P = Principal
- r = Interest rate
- t = Time in years

## 🧪 Testing

Comprehensive unit tests cover:
- **Formula Accuracy**: All financial calculations tested against known values
- **Edge Cases**: Zero rates, extreme values, boundary conditions
- **Real-world Scenarios**: 30-year mortgages, retirement savings, daily interest
- **Input Validation**: All validation functions tested
- **Precision**: Rounding and precision handling

Run tests:
```bash
npm test
```

## 🎯 Usage Examples

### Daily Interest Example
For $1,000 at 5% annual rate for 1 day:
- Daily rate: 0.000133680% (5 decimal places)
- Interest earned: $0.13
- Formula verification: $1,000 × 0.000133680 = $0.133680

### Compound Interest Example
$10,000 at 7% compounded monthly for 10 years:
- Final amount: $20,096.61
- Interest earned: $10,096.61
- Monthly compounding advantage over annual: ~$187 extra

### Loan Amortization Example
$250,000 mortgage at 6.5% for 30 years:
- Monthly payment: $1,580.17
- Total interest: $318,860
- First payment: $1,041.67 interest, $538.50 principal
- Last payment: $8.49 interest, $1,571.68 principal

## ⚡ Getting Started

1. **Clone the repository**
```bash
git clone [repository-url]
cd resp-calculator
```

2. **Install dependencies**
```bash
npm install
```

3. **Run development server**
```bash
npm run dev
```

4. **Build for production**
```bash
npm run build
```

5. **Run tests**
```bash
npm test
```

## 🔍 Key Features & Benefits

### High Precision Mathematics
- Uses JavaScript's built-in mathematical functions for accuracy
- Avoids floating-point errors with proper rounding
- Validates all inputs for realistic financial ranges

### User Experience
- Responsive design works on all devices
- Real-time calculations with instant feedback
- Clear error messages and input validation
- Professional financial styling

### Educational Value
- Displays formulas used for transparency
- Provides insights and explanations
- Shows compound interest advantages
- Explains loan payment breakdowns

### Production Ready
- TypeScript for type safety
- Comprehensive unit tests
- Optimized Next.js performance
- Accessible design (WCAG 2.1 guidelines)

## 🌟 Advanced Features

### Amortization Schedule Views
- **Summary**: First vs. last payment comparison
- **Yearly**: Annual principal and interest totals
- **Full**: Every payment detailed (optimized display)

### Growth Timeline Visualization
- Monthly progression tracking
- Balance growth over time
- Interest accumulation display
- Key milestone highlighting

### Input Validation
- Realistic value ranges
- Format validation
- Clear error messaging
- Real-time feedback

### Responsive Design
- Mobile-first approach
- Touch-friendly interfaces
- Professional color scheme
- Consistent styling across calculators

## 🎯 Business Applications

### Financial Planning
- Personal financial goal setting
- Investment strategy development
- Loan comparison analysis
- Retirement planning assistance

### Educational Use
- Teaching compound interest concepts
- Demonstrating loan mathematics
- Financial literacy education
- Mathematical formula applications

### Professional Tools
- Financial advisor calculations
- Loan officer utilities
- Investment planning tools
- Client education resources

## 📈 Future Enhancements

Potential future features could include:
- Additional calculator types (annuity, bond yield, etc.)
- Graphical charts and visualizations
- Export functionality (PDF, CSV)
- Comparison tools
- Inflation adjustment calculations
- Tax consideration features

---

## 📝 License

This project is built for educational and professional financial calculation purposes. All calculations are provided for informational purposes and should be verified for specific financial decisions.

## 🤝 Contributing

Contributions are welcome! Please ensure:
- All financial formulas are mathematically accurate
- Comprehensive unit tests for new features
- Consistent code style and TypeScript usage
- Responsive design principles
- Accessibility compliance

---

*Built with precision, designed for professionals, accessible to everyone.*