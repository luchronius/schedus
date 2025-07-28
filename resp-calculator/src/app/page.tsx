import Header from '@/components/Header';
import RESPCalculator from '@/components/RESPCalculator';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main>
        <section className="bg-gradient-to-b from-blue-50 to-white py-16">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                Plan for Your Child's Education
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Use our RESP calculator to see how much you could save for your child's post-secondary education 
                with the help of government grants and compound growth.
              </p>
            </div>
            
            <RESPCalculator />
          </div>
        </section>

      </main>
    </div>
  );
}
