import NavigationHeader from '@/components/NavigationHeader';
import AssetTracker from '@/components/AssetTracker';

export default function AssetTrackerPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationHeader />
      
      <main>
        <section className="bg-gradient-to-b from-blue-50 to-white py-16">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                Asset Tracker
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Track your Canadian assets and calculate your net worth. Monitor real estate, bank accounts, 
                and registered accounts (RRSP, TFSA, FHSA, RESP) all in one place.
              </p>
            </div>
            
            <AssetTracker />
          </div>
        </section>
      </main>
    </div>
  );
}

export const metadata = {
  title: 'Asset Tracker - Track Your Canadian Assets & Net Worth',
  description: 'Comprehensive asset tracking tool for Canadian investors. Track real estate, bank accounts, RRSP, TFSA, FHSA, and RESP accounts to calculate your net worth.',
};