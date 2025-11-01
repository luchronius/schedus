'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import NavigationHeader from '@/components/NavigationHeader';
import MortgageCalculator from '@/components/MortgageCalculator';
import MortgageTrackingDashboard from '@/components/MortgageTrackingDashboard';

export default function MortgagePage() {
  const [activeTab, setActiveTab] = useState<'calculator' | 'tracking'>('calculator');
  const { data: session } = useSession();


  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationHeader />
      
      <main>
        <section className="bg-gradient-to-b from-orange-50 to-white py-16">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                Complete Mortgage Management
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Calculate payments, track your mortgage progress, and manage prepayments all in one place. 
                Replace your bank&apos;s interface with comprehensive mortgage tracking.
              </p>
            </div>
            
            {/* Tab Navigation */}
            <div className="flex justify-center mb-8">
              <div className="bg-white rounded-lg shadow-sm p-1 inline-flex">
                <button
                  onClick={() => setActiveTab('calculator')}
                  className={`px-6 py-3 rounded-md font-medium transition-colors ${
                    activeTab === 'calculator'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Payment Calculator
                </button>
                <button
                  onClick={() => setActiveTab('tracking')}
                  className={`px-6 py-3 rounded-md font-medium transition-colors ${
                    activeTab === 'tracking'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Mortgage Tracking
                </button>
              </div>
            </div>
            
            {/* Tab Content */}
            {activeTab === 'calculator' && <MortgageCalculator />}
            
            {activeTab === 'tracking' && <MortgageTrackingDashboard />}
          </div>
        </section>
      </main>
    </div>
  );
}