import NavigationHeader from '@/components/NavigationHeader';
import CashflowTracker from '@/components/CashflowTracker';

export default function CashflowTrackerPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationHeader />
      <main>
        <CashflowTracker />
      </main>
    </div>
  );
}

export const metadata = {
  title: 'Cashflow Tracker | Financial Calculators',
  description: 'Track scheduled investments (TFSA, RESP, RRSP) and major expenses from 2025-2029. Plan your financial future with comprehensive cashflow management.'
};