import NavigationHeader from '@/components/NavigationHeader';
import LoanAmortizationCalculator from '@/components/LoanAmortizationCalculator';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Loan Amortization Calculator - Financial Tools',
  description: 'Calculate loan payments and amortization schedules for mortgages, auto loans, and personal loans. See principal vs interest breakdown.',
};

export default function LoanAmortizationPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationHeader />
      
      <main>
        <section className="bg-gradient-to-b from-purple-50 to-white py-16">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                Loan Amortization Calculator
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Calculate your monthly loan payments and see exactly how much goes to principal versus interest. 
                Perfect for mortgages, auto loans, personal loans, and any fixed-rate installment loan.
              </p>
            </div>
            
            <LoanAmortizationCalculator />
          </div>
        </section>

        <section className="py-12 bg-white">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              Understanding Your Loan
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-6">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📋</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">Payment Breakdown</h3>
                <p className="text-gray-600">
                  See exactly how much of each payment goes to principal vs. interest over the life of your loan.
                </p>
              </div>
              <div className="text-center p-6">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">💰</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">Total Interest Cost</h3>
                <p className="text-gray-600">
                  Understand the true cost of borrowing by seeing total interest paid over the loan term.
                </p>
              </div>
              <div className="text-center p-6">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📈</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">Prepayment Impact</h3>
                <p className="text-gray-600">
                  Use the schedule to understand how extra principal payments can save you money.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-12 bg-gray-50">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              Key Loan Facts
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-xl font-semibold mb-4 text-purple-800">Early Payments = Mostly Interest</h3>
                <p className="text-gray-700 mb-4">
                  In the early years of your loan, most of your payment goes toward interest. 
                  As you progress, more goes toward principal.
                </p>
                <div className="bg-purple-50 p-4 rounded border">
                  <div className="text-sm text-gray-600 mb-2">30-year mortgage example:</div>
                  <div className="flex justify-between">
                    <span>Year 1 - Interest:</span>
                    <span className="font-semibold text-red-600">~96%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Year 1 - Principal:</span>
                    <span className="font-semibold text-green-600">~4%</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-xl font-semibold mb-4 text-green-800">Extra Payments = Big Savings</h3>
                <p className="text-gray-700 mb-4">
                  Making extra principal payments, especially early in the loan, can save thousands 
                  in interest and years off your loan term.
                </p>
                <div className="bg-green-50 p-4 rounded border">
                  <div className="text-sm text-gray-600 mb-2">$200k mortgage, extra $100/month:</div>
                  <div className="flex justify-between">
                    <span>Interest Saved:</span>
                    <span className="font-semibold text-green-600">~$31,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Time Saved:</span>
                    <span className="font-semibold text-blue-600">~4.5 years</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}