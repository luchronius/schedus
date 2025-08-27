'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import NavigationHeader from '@/components/NavigationHeader';
import MortgageCalculator from '@/components/MortgageCalculator';
import MortgageTrackingDashboard from '@/components/MortgageTrackingDashboard';
import MortgageTimelineVisualization from '@/components/MortgageTimelineVisualization';
import { MortgageHistoryPoint, buildMortgageHistory } from '@/utils/mortgageTracking';
import { MortgageCalculation, MortgageSnapshot, MortgagePayment, MortgageSettings } from '@/lib/database';

export default function MortgagePage() {
  const [activeTab, setActiveTab] = useState<'calculator' | 'tracking' | 'timeline'>('calculator');
  const [timelineHistory, setTimelineHistory] = useState<MortgageHistoryPoint[]>([]);
  const [isLoadingTimeline, setIsLoadingTimeline] = useState(false);
  const { data: session } = useSession();

  // Fetch timeline data when user is authenticated and timeline tab is accessed
  useEffect(() => {
    async function fetchTimelineData() {
      if (!session?.user?.id || activeTab !== 'timeline') return;
      
      setIsLoadingTimeline(true);
      try {
        // Get all mortgage calculations for the user
        const calculationsResponse = await fetch('/api/mortgage-calculations');
        if (!calculationsResponse.ok) throw new Error('Failed to fetch calculations');
        const calculations: MortgageCalculation[] = await calculationsResponse.json();
        
        if (calculations.length === 0) {
          setTimelineHistory([]);
          return;
        }
        
        // For now, use the most recent calculation to build timeline
        // In a full implementation, you might want to let user select which calculation to view
        const latestCalculation = calculations[0];
        
        // Fetch snapshots and payments for this calculation
        const [snapshotsResponse, paymentsResponse, settingsResponse] = await Promise.all([
          fetch(`/api/mortgage/snapshots?calculationId=${latestCalculation.id}`),
          fetch(`/api/mortgage/payments?calculationId=${latestCalculation.id}`),
          fetch(`/api/mortgage/settings?calculationId=${latestCalculation.id}`)
        ]);
        
        const snapshots: MortgageSnapshot[] = snapshotsResponse.ok ? await snapshotsResponse.json() : [];
        const payments: MortgagePayment[] = paymentsResponse.ok ? await paymentsResponse.json() : [];
        const settings: MortgageSettings | null = settingsResponse.ok ? await settingsResponse.json() : null;
        
        // Build timeline history
        const history = buildMortgageHistory(snapshots, payments, settings);
        setTimelineHistory(history);
        
      } catch (error) {
        console.error('Error fetching timeline data:', error);
        setTimelineHistory([]);
      } finally {
        setIsLoadingTimeline(false);
      }
    }
    
    fetchTimelineData();
  }, [session?.user?.id, activeTab]);

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
                <button
                  onClick={() => setActiveTab('timeline')}
                  className={`px-6 py-3 rounded-md font-medium transition-colors ${
                    activeTab === 'timeline'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Timeline View
                </button>
              </div>
            </div>
            
            {/* Tab Content */}
            {activeTab === 'calculator' && <MortgageCalculator />}
            
            {activeTab === 'tracking' && <MortgageTrackingDashboard />}
            
            {activeTab === 'timeline' && (
              <div className="max-w-6xl mx-auto">
                {isLoadingTimeline ? (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">Mortgage Timeline</h3>
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-3 text-gray-600">Loading timeline data...</span>
                    </div>
                  </div>
                ) : !session ? (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">Mortgage Timeline</h3>
                    <p className="text-gray-500">Please sign in to view your mortgage timeline.</p>
                  </div>
                ) : (
                  <MortgageTimelineVisualization 
                    history={timelineHistory}
                    className=""
                  />
                )}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}