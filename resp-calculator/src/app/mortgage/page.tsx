import NavigationHeader from '@/components/NavigationHeader';
import MortgageCalculator from '@/components/MortgageCalculator';

export default function MortgagePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationHeader />
      
      <main>
        <section className="bg-gradient-to-b from-orange-50 to-white py-16">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                Mortgage Payment Calculator
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Enter your desired monthly payment and loan details to discover your payoff timeline and total interest cost. 
                Perfect for budget-first mortgage planning.
              </p>
            </div>
            
            <MortgageCalculator />
          </div>
        </section>
      </main>
    </div>
  );
}