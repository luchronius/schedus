import NavigationHeader from '@/components/NavigationHeader';
import DailyInterestCalculator from '@/components/DailyInterestCalculator';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Daily Interest Calculator - Financial Tools',
  description: 'Calculate precise daily interest earnings with compound interest formulas. Perfect for understanding daily returns on investments.',
};

export default function DailyInterestPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationHeader />
      
      <main>
        <section className="bg-gradient-to-b from-blue-50 to-white py-16">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                Daily Interest Calculator
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Calculate exactly how much interest you earn per day using precise compound interest formulas. 
                Perfect for understanding your daily returns on savings and investments.
              </p>
            </div>
            
            <DailyInterestCalculator />
          </div>
        </section>

        <section className="py-12 bg-white">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              Why Use Daily Interest Calculations?
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-6">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📊</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">Precise Tracking</h3>
                <p className="text-gray-600">
                  Track your exact daily earnings with mathematical precision using compound interest formulas.
                </p>
              </div>
              <div className="text-center p-6">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">💡</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">Investment Planning</h3>
                <p className="text-gray-600">
                  Understand your daily returns to make better investment decisions and set realistic goals.
                </p>
              </div>
              <div className="text-center p-6">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🎯</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">Goal Setting</h3>
                <p className="text-gray-600">
                  Set daily, weekly, or monthly earning targets based on accurate interest calculations.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}