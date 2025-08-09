import NavigationHeader from '@/components/NavigationHeader';
import CompoundInterestCalculator from '@/components/CompoundInterestCalculator';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Compound Interest Calculator - Financial Tools',
  description: 'Calculate compound interest growth with different compounding frequencies. See the power of compounding over time.',
};

export default function CompoundInterestPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationHeader />
      
      <main>
        <section className="bg-gradient-to-b from-green-50 to-white py-16">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                Compound Interest Calculator
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Harness the power of compound interest to grow your wealth. Calculate returns with different 
                compounding frequencies and see how time and compound growth can multiply your investments.
              </p>
            </div>
            
            <CompoundInterestCalculator />
          </div>
        </section>

        <section className="py-12 bg-white">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              The Magic of Compound Interest
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="p-6 bg-green-50 rounded-lg">
                <h3 className="text-xl font-semibold mb-4 text-green-800">Einstein&apos;s &quot;8th Wonder&quot;</h3>
                <p className="text-gray-700 mb-4">
                  Albert Einstein allegedly called compound interest &quot;the eighth wonder of the world.&quot; 
                  Those who understand it, earn it. Those who don&apos;t, pay it.
                </p>
                <div className="bg-white p-4 rounded border">
                  <div className="text-sm text-gray-600 mb-2">Example: $10,000 at 7% for 30 years</div>
                  <div className="flex justify-between">
                    <span>Simple Interest:</span>
                    <span className="font-semibold">$31,000</span>
                  </div>
                  <div className="flex justify-between text-green-600 font-semibold">
                    <span>Compound Interest:</span>
                    <span>$76,123</span>
                  </div>
                </div>
              </div>
              
              <div className="p-6 bg-blue-50 rounded-lg">
                <h3 className="text-xl font-semibold mb-4 text-blue-800">Compounding Frequency Matters</h3>
                <p className="text-gray-700 mb-4">
                  The more frequently interest compounds, the more you earn. Our calculator shows the 
                  difference between daily, monthly, quarterly, and annual compounding.
                </p>
                <div className="bg-white p-4 rounded border">
                  <div className="text-sm text-gray-600 mb-2">$10,000 at 6% for 10 years:</div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Annual:</span>
                      <span>$17,908</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Monthly:</span>
                      <span>$18,194</span>
                    </div>
                    <div className="flex justify-between text-blue-600 font-semibold">
                      <span>Daily:</span>
                      <span>$18,221</span>
                    </div>
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