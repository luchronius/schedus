'use client';

// Delete Confirmation Modal Component
export default function DeleteConfirmModal({ calculationId, mortgageCalculations, onConfirm, onCancel }: {
  calculationId: number | null;
  mortgageCalculations: any[] | undefined;
  onConfirm: (id: number) => Promise<void>;
  onCancel: () => void;
}) {
  if (!calculationId) return null;

  const calculation = mortgageCalculations?.find(calc => calc.id === calculationId);
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-red-900 mb-4">⚠️ Delete Mortgage Calculation</h3>
        
        <div className="mb-6">
          <p className="text-gray-700 mb-3">
            Are you sure you want to delete this mortgage calculation?
          </p>
          
          {calculation && (
            <div className="bg-gray-50 p-3 rounded border">
              <p className="font-medium">{calculation.calculationName || `Mortgage ${calculation.id}`}</p>
              <p className="text-sm text-gray-600">Amount: ${calculation.mortgageAmount?.toLocaleString()}</p>
              <p className="text-sm text-gray-600">Rate: {calculation.annualRate}%</p>
            </div>
          )}
          
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-red-800 text-sm font-medium">⚠️ This action cannot be undone!</p>
            <p className="text-red-700 text-sm mt-1">
              All associated data including balance snapshots, payment records, and settings will be permanently deleted.
            </p>
          </div>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={() => onConfirm(calculationId)}
            className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Yes, Delete
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}