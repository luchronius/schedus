'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useMortgageData } from '@/hooks/useMortgageData';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';

interface MortgageTrackingDashboardProps {
  calculationId?: number;
}

export default function MortgageTrackingDashboard({ calculationId: propCalculationId }: MortgageTrackingDashboardProps) {
  const { data: session } = useSession();
  const { savedCalculations: mortgageCalculations, deleteCalculation } = useMortgageData();
  
  const [selectedCalculationId, setSelectedCalculationId] = useState<number | null>(
    propCalculationId || (mortgageCalculations?.length > 0 ? mortgageCalculations[0]?.id : null) || null
  );
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [calculationToDelete, setCalculationToDelete] = useState<number | null>(null);

  // Update selected calculation when mortgage calculations load
  useEffect(() => {
    if (!selectedCalculationId && mortgageCalculations?.length > 0) {
      setSelectedCalculationId(mortgageCalculations[0].id);
    }
  }, [mortgageCalculations, selectedCalculationId]);

  if (!session) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Please sign in to access your mortgage tracking dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Mortgage Tracking Dashboard</h1>
        <p className="text-gray-600">Complete mortgage management to replace your bank&apos;s interface</p>
      </div>

      {/* No Mortgage Calculations Message */}
      {mortgageCalculations && mortgageCalculations.length === 0 && (
        <div className="mb-6 p-6 bg-blue-50 border border-blue-200 rounded-lg text-center">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">No Mortgage Calculations Found</h3>
          <p className="text-blue-800 mb-4">
            You need to create a mortgage calculation first before you can track it. 
          </p>
          <p className="text-blue-700">
            Go to the <strong>Payment Calculator</strong> tab to create your first mortgage calculation, 
            then return here to track your mortgage progress.
          </p>
        </div>
      )}

      {/* Mortgage Selection with Delete */}
      {mortgageCalculations && mortgageCalculations.length > 0 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {mortgageCalculations.length > 1 ? 'Select Mortgage' : 'Current Mortgage'}
          </label>
          <div className="flex gap-2">
            <select
              value={selectedCalculationId || ''}
              onChange={(e) => setSelectedCalculationId(Number(e.target.value))}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              disabled={mortgageCalculations.length === 1}
            >
              {mortgageCalculations?.map((calc) => (
                <option key={calc.id} value={calc.id}>
                  {calc.calculationName || `Mortgage ${calc.id}`} - ${calc.mortgageAmount.toLocaleString()}
                </option>
              ))}
            </select>
            {selectedCalculationId && (
              <button
                onClick={() => {
                  setCalculationToDelete(selectedCalculationId);
                  setShowDeleteConfirm(true);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                title="Delete this mortgage calculation"
              >
                🗑️ Delete
              </button>
            )}
          </div>
        </div>
      )}

      {/* Basic mortgage info display when selected */}
      {selectedCalculationId && mortgageCalculations && (
        <div className="mb-6">
          {(() => {
            const selectedCalc = mortgageCalculations.find(calc => calc.id === selectedCalculationId);
            if (!selectedCalc) return null;
            
            return (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Mortgage Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Mortgage Amount</p>
                    <p className="text-lg font-semibold">${selectedCalc.mortgageAmount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Interest Rate</p>
                    <p className="text-lg font-semibold">{selectedCalc.annualRate}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Monthly Payment</p>
                    <p className="text-lg font-semibold">${selectedCalc.monthlyPayment.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Extra Payment</p>
                    <p className="text-lg font-semibold">${selectedCalc.extraMonthlyPayment.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Enhanced tracking features coming soon message */}
      {selectedCalculationId && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Enhanced Tracking Features</h3>
          <p className="text-blue-800 mb-4">
            The comprehensive mortgage tracking features including balance snapshots, 
            payment recording, and timeline visualization are being finalized.
          </p>
          <div className="text-blue-700 text-sm">
            <strong>Coming Soon:</strong>
            <ul className="list-disc ml-5 mt-2">
              <li>Record balance snapshots at specific dates</li>
              <li>Track prepayment impacts and interest savings</li>
              <li>Visual timeline of mortgage history</li>
              <li>Payment date management with month-end handling</li>
            </ul>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <DeleteConfirmModal 
          calculationId={calculationToDelete}
          mortgageCalculations={mortgageCalculations}
          onConfirm={async (id) => {
            const success = await deleteCalculation(id);
            if (success) {
              // If we deleted the currently selected calculation, clear selection
              if (id === selectedCalculationId) {
                setSelectedCalculationId(null);
              }
            }
            setShowDeleteConfirm(false);
            setCalculationToDelete(null);
          }}
          onCancel={() => {
            setShowDeleteConfirm(false);
            setCalculationToDelete(null);
          }}
        />
      )}
    </div>
  );
}