import NavigationHeader from '@/components/NavigationHeader';
import InvestmentTracker from '@/components/InvestmentTracker';

export default function InvestmentTrackerPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationHeader />
      <main>
        <InvestmentTracker />
      </main>
    </div>
  );
}

export const metadata = {
  title: 'Investment & Expense Tracker | Financial Calculators',
  description: 'Track scheduled investments (TFSA, RESP, RRSP) and major expenses from 2025-2029. Plan your financial future with comprehensive investment and expense management.'
};