'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import type { RealEstateAssetDB, BankAccountDB, RegisteredAccountDB, AssetPortfolioSnapshot, AssetPortfolio } from '@/lib/database';

// Canadian Asset Classes
interface RealEstateAsset {
  id: string;
  propertyType: 'primary_residence' | 'investment_property' | 'vacation_home' | 'commercial';
  address: string;
  estimatedValue: number;
  mortgageBalance: number;
  monthlyPayment?: number;
  interestRate?: number;
  acquisitionDate?: string;
  notes?: string;
}

interface BankAccount {
  id: string;
  accountType: 'chequing' | 'savings' | 'high_interest_savings';
  institutionName: string;
  accountName?: string;
  currentBalance: number;
  currency: 'CAD' | 'USD';
  interestRate?: number;
  notes?: string;
}

interface RegisteredAccount {
  id: string;
  accountType: 'rrsp' | 'tfsa' | 'fhsa' | 'resp';
  institutionName: string;
  accountName?: string;
  currentBalance: number;
  contributionRoom?: number;
  yearlyContribution?: number;
  beneficiary?: string; // For RESP
  notes?: string;
}

interface AssetData {
  realEstate: RealEstateAsset[];
  bankAccounts: BankAccount[];
  registeredAccounts: RegisteredAccount[];
  stocks: StockAsset[];
  lastUpdated: string;
}

interface StockAsset {
  id: string;
  companyName: string;
  ticker: string;
  shares: number;
  costBasis: number;
  currentValue: number; // Price per share
  currency: 'CAD' | 'USD';
  isPrivate: boolean;
  exchangeName?: string;
  industry?: string;
  notes?: string;
}

interface AssetSummary {
  totalRealEstate: number;
  totalMortgageDebt: number;
  netRealEstate: number;
  totalCash: number;
  totalRRSP: number;
  totalTFSA: number;
  totalFHSA: number;
  totalRESP: number;
  totalRegistered: number;
  totalStocks: number;
  totalAssets: number;
  totalDebt: number;
  netWorth: number;
}

export default function AssetTracker() {
  const { data: session } = useSession();
  const [assets, setAssets] = useState<AssetData>({
    realEstate: [],
    bankAccounts: [],
    registeredAccounts: [],
    stocks: [],
    lastUpdated: new Date().toISOString()
  });
  const [activeTab, setActiveTab] = useState<'real_estate' | 'bank_accounts' | 'rrsp' | 'tfsa' | 'resp' | 'fhsa' | 'stocks' | 'snapshots'>('real_estate');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [portfolioName, setPortfolioName] = useState('');
  const [currentPortfolioId, setCurrentPortfolioId] = useState<number | null>(null);
  const [hasLocalStorageData, setHasLocalStorageData] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [snapshots, setSnapshots] = useState<AssetPortfolioSnapshot[]>([]);
  const [showSnapshotDialog, setShowSnapshotDialog] = useState(false);
  const [snapshotName, setSnapshotName] = useState('');
  const [snapshotNotes, setSnapshotNotes] = useState('');
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
  const [savingAssets, setSavingAssets] = useState<Set<string>>(new Set());
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [snapshotToDelete, setSnapshotToDelete] = useState<AssetPortfolioSnapshot | null>(null);
  
  // Financial Institutions List (alphabetically sorted)
  const FINANCIAL_INSTITUTIONS = [
    'BMO',
    'CIBC',
    'Industrial Alliance',
    'Interactive Brokers',
    'PC Financial',
    'Questrade',
    'RBC',
    'Scotiabank',
    'Simplii',
    'Sunlife',
    'Tangerine',
    'TD Bank',
    'WealthSimple'
  ];
  
  // Portfolio Management States
  const [portfolios, setPortfolios] = useState<AssetPortfolio[]>([]);
  const [showPortfolioDialog, setShowPortfolioDialog] = useState(false);
  const [portfolioDialogMode, setPortfolioDialogMode] = useState<'create' | 'rename' | 'delete'>('create');
  const [portfolioDialogName, setPortfolioDialogName] = useState('');
  const [selectedPortfolioForAction, setSelectedPortfolioForAction] = useState<AssetPortfolio | null>(null);
  const [isPortfolioActionLoading, setIsPortfolioActionLoading] = useState(false);
  
  const [usdToCadRate, setUsdToCadRate] = useState<number>(1.35); // Will be loaded from current portfolio
  const isInitialLoad = useRef(true);
  const updateTimeouts = useRef<{ [key: string]: NodeJS.Timeout }>({});
  const recentlyCreatedAssets = useRef<Set<string>>(new Set());
  const originalAssetData = useRef<{ [key: string]: any }>({});

  // Currency conversion helper
  const convertToCAD = useCallback((amount: number, currency: 'CAD' | 'USD'): number => {
    return currency === 'USD' ? amount * usdToCadRate : amount;
  }, [usdToCadRate]);

  // Institution Dropdown Component
  const InstitutionSelect = ({ 
    value, 
    onChange, 
    className = "" 
  }: { 
    value: string; 
    onChange: (value: string) => void;
    className?: string;
  }) => {
    const [isCustom, setIsCustom] = useState(() => !FINANCIAL_INSTITUTIONS.includes(value) && value !== '');
    const [customValue, setCustomValue] = useState(() => 
      !FINANCIAL_INSTITUTIONS.includes(value) && value !== '' ? value : ''
    );

    // Update customValue when value prop changes from outside
    useEffect(() => {
      if (!FINANCIAL_INSTITUTIONS.includes(value) && value !== '') {
        setCustomValue(value);
        setIsCustom(true);
      }
    }, [value]);

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const selectedValue = e.target.value;
      if (selectedValue === 'custom') {
        setIsCustom(true);
        // Don't change the value immediately, let user type
      } else {
        setIsCustom(false);
        setCustomValue('');
        onChange(selectedValue);
      }
    };

    const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setCustomValue(newValue);
      onChange(newValue);
    };

    if (isCustom) {
      return (
        <div className="space-y-2">
          <input
            type="text"
            value={customValue}
            onChange={handleCustomChange}
            placeholder="Enter institution name"
            className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
          />
          <button
            type="button"
            onClick={() => {
              setIsCustom(false);
              setCustomValue('');
              onChange('');
            }}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Choose from preset list
          </button>
        </div>
      );
    }

    return (
      <select
        value={FINANCIAL_INSTITUTIONS.includes(value) ? value : (value === '' ? '' : 'custom')}
        onChange={handleSelectChange}
        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
      >
        <option value="">Select Institution</option>
        {FINANCIAL_INSTITUTIONS.map((institution) => (
          <option key={institution} value={institution}>
            {institution}
          </option>
        ))}
        <option value="custom">Other (fill in yourself)</option>
      </select>
    );
  };

  // Save exchange rate to current portfolio when it changes
  useEffect(() => {
    if (currentPortfolioId && !isInitialLoad.current) {
      const timeoutId = setTimeout(async () => {
        try {
          const response = await fetch(`/api/asset-portfolios/${currentPortfolioId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ usdToCadRate }),
          });
          
          if (!response.ok) {
            console.error('Failed to save exchange rate to portfolio');
          }
        } catch (error) {
          console.error('Error saving exchange rate:', error);
        }
      }, 500); // Debounce by 500ms
      
      return () => clearTimeout(timeoutId);
    }
  }, [usdToCadRate, currentPortfolioId]);

  // Clear any pending timeouts on component mount/unmount
  useEffect(() => {
    return () => {
      Object.values(updateTimeouts.current).forEach(timeout => {
        if (timeout) clearTimeout(timeout);
      });
    };
  }, []);

  // Get initial data from localStorage or defaults
  const getInitialAssets = (): AssetData => {
    const defaults: AssetData = {
      realEstate: [],
      bankAccounts: [],
      registeredAccounts: [],
      stocks: [],
      lastUpdated: new Date().toISOString()
    };

    if (typeof window !== 'undefined' && session?.user?.id) {
      const stored = localStorage.getItem(`asset-data-${session.user.id}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          return {
            ...defaults,
            ...parsed,
            lastUpdated: parsed.lastUpdated || defaults.lastUpdated
          };
        } catch (error) {
          console.error('Error parsing stored asset data:', error);
        }
      }
    }
    return defaults;
  };

  // Load data when session becomes available
  useEffect(() => {
    const loadData = async () => {
      if (session?.user?.id && typeof window !== 'undefined') {
        // Load user's portfolios
        await loadPortfolios();
        
        // First try to load from database
        const hasDbData = await loadPortfolioFromDatabase();
        
        if (!hasDbData) {
          // If no database data, check localStorage
          const hasLocalData = checkLocalStorageData();
          if (hasLocalData) {
            // Load localStorage data and show migration prompt
            const loadedAssets = getInitialAssets();
            setAssets(loadedAssets);
            setShowSaveDialog(true);
            setPortfolioName('My Assets');
          }
        }
      }
    };

    if (session?.user?.id) {
      loadData();
    }
  }, [session?.user?.id]);

  // Save to localStorage when signed in (only if no database portfolio)
  useEffect(() => {
    if (session?.user?.id && typeof window !== 'undefined' && !isInitialLoad.current && !currentPortfolioId) {
      localStorage.setItem(`asset-data-${session.user.id}`, JSON.stringify(assets));
    }
  }, [assets, session?.user?.id, currentPortfolioId]);

  // Mark initial load complete
  useEffect(() => {
    const timer = setTimeout(() => {
      isInitialLoad.current = false;
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Calculate asset summary
  const calculateSummary = (): AssetSummary => {
    const totalRealEstate = assets.realEstate.reduce((sum, property) => sum + property.estimatedValue, 0);
    const totalMortgageDebt = assets.realEstate.reduce((sum, property) => sum + property.mortgageBalance, 0);
    const netRealEstate = totalRealEstate - totalMortgageDebt;
    
    const totalCash = assets.bankAccounts.reduce((sum, account) => sum + convertToCAD(account.currentBalance, account.currency), 0);
    
    const totalRRSP = assets.registeredAccounts
      .filter(account => account.accountType === 'rrsp')
      .reduce((sum, account) => sum + account.currentBalance, 0);
    
    const totalTFSA = assets.registeredAccounts
      .filter(account => account.accountType === 'tfsa')
      .reduce((sum, account) => sum + account.currentBalance, 0);
    
    const totalFHSA = assets.registeredAccounts
      .filter(account => account.accountType === 'fhsa')
      .reduce((sum, account) => sum + account.currentBalance, 0);
    
    const totalRESP = assets.registeredAccounts
      .filter(account => account.accountType === 'resp')
      .reduce((sum, account) => sum + account.currentBalance, 0);
    
    const totalRegistered = totalRRSP + totalTFSA + totalFHSA + totalRESP;
    const totalStocks = assets.stocks.reduce((sum, stock) => sum + convertToCAD(stock.currentValue * stock.shares, stock.currency), 0);
    const totalAssets = totalRealEstate + totalCash + totalRegistered + totalStocks;
    const totalDebt = totalMortgageDebt;
    const netWorth = totalAssets - totalDebt;

    return {
      totalRealEstate,
      totalMortgageDebt,
      netRealEstate,
      totalCash,
      totalRRSP,
      totalTFSA,
      totalFHSA,
      totalRESP,
      totalRegistered,
      totalStocks,
      totalAssets,
      totalDebt,
      netWorth
    };
  };

  const summary = calculateSummary();

  // Store original asset data when loading from database
  const storeOriginalAssetData = (assetData: AssetData) => {
    const originalData: { [key: string]: any } = {};
    
    assetData.realEstate.forEach(property => {
      originalData[`realEstate-${property.id}`] = { ...property };
    });
    
    assetData.bankAccounts.forEach(account => {
      originalData[`bankAccount-${account.id}`] = { ...account };
    });
    
    assetData.registeredAccounts.forEach(account => {
      originalData[`registeredAccount-${account.id}`] = { ...account };
    });
    
    assetData.stocks.forEach(stock => {
      originalData[`stock-${stock.id}`] = { ...stock };
    });
    
    originalAssetData.current = originalData;
  };

  // Check if an asset has changes compared to original
  const hasChanges = (assetType: string, assetId: string, currentAsset: any): boolean => {
    // New assets (timestamp IDs) always have changes
    if (isNaN(parseInt(assetId))) return true;
    
    const originalKey = `${assetType}-${assetId}`;
    const original = originalAssetData.current[originalKey];
    
    if (!original) return true; // New asset, always has changes
    
    // Compare all relevant fields
    return JSON.stringify(original) !== JSON.stringify(currentAsset);
  };

  // Add Real Estate Property
  const addRealEstate = async () => {
    const newProperty: RealEstateAsset = {
      id: Date.now().toString(),
      propertyType: 'primary_residence',
      address: '',
      estimatedValue: 0,
      mortgageBalance: 0,
      monthlyPayment: 0,
      interestRate: 0,
      acquisitionDate: new Date().toISOString().split('T')[0],
      notes: ''
    };

    // If we have a database portfolio, save to database immediately
    if (currentPortfolioId) {
      try {
        const response = await fetch('/api/real-estate-assets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            portfolioId: currentPortfolioId,
            propertyType: newProperty.propertyType,
            address: newProperty.address,
            estimatedValue: newProperty.estimatedValue,
            mortgageBalance: newProperty.mortgageBalance,
            monthlyPayment: newProperty.monthlyPayment,
            interestRate: newProperty.interestRate,
            acquisitionDate: newProperty.acquisitionDate,
            notes: newProperty.notes
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            // Reload from database to get the correct ID
            await loadPortfolioAssets(currentPortfolioId);
            return;
          }
        }
      } catch (error) {
        console.error('Error saving real estate property to database:', error);
      }
    }

    // Fallback to local state (for users without database portfolio)
    setAssets(prev => ({
      ...prev,
      realEstate: [...prev.realEstate, newProperty],
      lastUpdated: new Date().toISOString()
    }));
  };

  // Update Real Estate Property
  const updateRealEstate = (id: string, field: keyof RealEstateAsset, value: string | number | undefined) => {
    setAssets(prev => {
      const updatedAssets = {
        ...prev,
        realEstate: prev.realEstate.map(property =>
          property.id === id ? { ...property, [field]: value } : property
        ),
        lastUpdated: new Date().toISOString()
      };

      // If we have a database portfolio, debounce update to database
      if (currentPortfolioId) {
        const updatedProperty = updatedAssets.realEstate.find(prop => prop.id === id);
        // Only update database assets (numeric IDs), not new unsaved assets (timestamp IDs)
        if (updatedProperty && !isNaN(parseInt(id))) {
          debouncedUpdateToDatabase('realEstate', id, {
            propertyType: updatedProperty.propertyType,
            address: updatedProperty.address,
            estimatedValue: updatedProperty.estimatedValue,
            mortgageBalance: updatedProperty.mortgageBalance,
            monthlyPayment: updatedProperty.monthlyPayment,
            interestRate: updatedProperty.interestRate,
            acquisitionDate: updatedProperty.acquisitionDate,
            notes: updatedProperty.notes
          });
        }
      }

      return updatedAssets;
    });
  };

  // Remove Real Estate Property
  const removeRealEstate = async (id: string) => {
    // If we have a database portfolio, delete from database first
    if (currentPortfolioId && !isNaN(parseInt(id))) {
      try {
        const numericId = parseInt(id);

        const response = await fetch(`/api/real-estate-assets/${numericId}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            // Reload from database to ensure consistency
            await loadPortfolioAssets(currentPortfolioId);
            return;
          }
        }
      } catch (error) {
        console.error('Error deleting real estate property from database:', error);
      }
    }

    // Fallback to local state (for users without database portfolio)
    setAssets(prev => ({
      ...prev,
      realEstate: prev.realEstate.filter(property => property.id !== id),
      lastUpdated: new Date().toISOString()
    }));
  };

  // Add Bank Account
  const addBankAccount = async () => {
    const newAccount: BankAccount = {
      id: Date.now().toString(),
      accountType: 'chequing',
      institutionName: '',
      accountName: '',
      currentBalance: 0,
      currency: 'CAD',
      interestRate: 0,
      notes: ''
    };

    // If we have a database portfolio, save to database immediately
    if (currentPortfolioId) {
      try {
        console.log('Creating bank account with portfolio ID:', currentPortfolioId);
        const response = await fetch('/api/bank-accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            portfolioId: currentPortfolioId,
            accountType: newAccount.accountType,
            institutionName: newAccount.institutionName,
            accountName: newAccount.accountName,
            currentBalance: newAccount.currentBalance,
            currency: newAccount.currency,
            interestRate: newAccount.interestRate,
            notes: newAccount.notes
          })
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Bank account creation response:', data);
          if (data.success) {
            console.log('Bank account created successfully, reloading assets...');
            
            // Clear recently created assets tracking to allow fresh start
            recentlyCreatedAssets.current.clear();
            
            // Reload from database to get the correct ID
            await loadPortfolioAssets(currentPortfolioId);
            return;
          } else {
            console.error('Bank account creation failed:', data);
          }
        } else {
          const errorText = await response.text();
          console.error('Bank account creation HTTP error:', response.status, response.statusText);
          console.error('Error details:', errorText);
        }
      } catch (error) {
        console.error('Error saving bank account to database:', error);
      }
    }

    // Fallback to local state (for users without database portfolio)
    // Track this as a recently created asset to prevent premature update attempts
    recentlyCreatedAssets.current.add(newAccount.id);
    
    setAssets(prev => ({
      ...prev,
      bankAccounts: [...prev.bankAccounts, newAccount],
      lastUpdated: new Date().toISOString()
    }));
  };

  // Debounced update to database
  const debouncedUpdateToDatabase = useCallback((assetType: string, assetId: string, assetData: Record<string, unknown>) => {
    const key = `${assetType}-${assetId}`;
    
    // Clear existing timeout
    if (updateTimeouts.current[key]) {
      clearTimeout(updateTimeouts.current[key]);
    }

    // Set new timeout
    updateTimeouts.current[key] = setTimeout(async () => {
      if (!currentPortfolioId) return;

      try {
        // Parse the ID as number for database operations
        const numericId = parseInt(assetId);
        if (isNaN(numericId)) {
          console.error(`Invalid asset ID for database update: ${assetType} ${assetId} - this shouldn't happen for new stocks after the fix`);
          return;
        }

        let endpoint = '';
        if (assetType === 'bankAccount') {
          endpoint = `/api/bank-accounts/${numericId}`;
        } else if (assetType === 'realEstate') {
          endpoint = `/api/real-estate-assets/${numericId}`;
        } else if (assetType === 'registeredAccount') {
          endpoint = `/api/registered-accounts/${numericId}`;
        } else if (assetType === 'stock') {
          endpoint = `/api/stocks/${numericId}`;
        }

        if (endpoint) {
          console.log(`Attempting to update ${assetType} with ID ${numericId} at ${endpoint}`);
          console.log('Update data:', assetData);
          
          const response = await fetch(endpoint, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(assetData)
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Error updating ${assetType} (${response.status}):`, response.statusText);
            console.error('Error details:', errorText);
          } else {
            console.log(`Successfully updated ${assetType} with ID ${numericId}`);
          }
        }
      } catch (error) {
        console.error(`Error updating ${assetType} to database:`, error);
      }

      delete updateTimeouts.current[key];
    }, 1000); // 1 second delay
  }, [currentPortfolioId]);

  // Update Bank Account
  const updateBankAccount = (id: string, field: keyof BankAccount, value: string | number | undefined) => {
    setAssets(prev => {
      const updatedAssets = {
        ...prev,
        bankAccounts: prev.bankAccounts.map(account =>
          account.id === id ? { ...account, [field]: value } : account
        ),
        lastUpdated: new Date().toISOString()
      };

      // If we have a database portfolio, debounce update to database
      if (currentPortfolioId) {
        const updatedAccount = updatedAssets.bankAccounts.find(acc => acc.id === id);
        // Only update database assets (numeric IDs), not new unsaved assets (timestamp IDs)
        // Also skip recently created assets to avoid race conditions
        if (updatedAccount && !isNaN(parseInt(id)) && !recentlyCreatedAssets.current.has(id)) {
          debouncedUpdateToDatabase('bankAccount', id, {
            accountType: updatedAccount.accountType,
            institutionName: updatedAccount.institutionName,
            accountName: updatedAccount.accountName,
            currentBalance: updatedAccount.currentBalance,
            currency: updatedAccount.currency,
            interestRate: updatedAccount.interestRate,
            notes: updatedAccount.notes
          });
        }
      }

      return updatedAssets;
    });
  };

  // Remove Bank Account
  const removeBankAccount = async (id: string) => {
    // If we have a database portfolio, delete from database first
    if (currentPortfolioId && !isNaN(parseInt(id))) {
      try {
        const numericId = parseInt(id);

        const response = await fetch(`/api/bank-accounts/${numericId}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            // Reload from database to ensure consistency
            await loadPortfolioAssets(currentPortfolioId);
            return;
          }
        }
      } catch (error) {
        console.error('Error deleting bank account from database:', error);
      }
    }

    // Fallback to local state (for users without database portfolio)
    setAssets(prev => ({
      ...prev,
      bankAccounts: prev.bankAccounts.filter(account => account.id !== id),
      lastUpdated: new Date().toISOString()
    }));
  };

  // Add Registered Account
  const addRegisteredAccount = async (accountType: 'rrsp' | 'tfsa' | 'fhsa' | 'resp') => {
    const newAccount: RegisteredAccount = {
      id: Date.now().toString(),
      accountType,
      institutionName: '',
      accountName: '',
      currentBalance: 0,
      contributionRoom: 0,
      yearlyContribution: 0,
      beneficiary: accountType === 'resp' ? '' : undefined,
      notes: ''
    };

    // If we have a database portfolio, save to database immediately
    if (currentPortfolioId) {
      try {
        const response = await fetch('/api/registered-accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            portfolioId: currentPortfolioId,
            accountType: newAccount.accountType,
            institutionName: newAccount.institutionName,
            accountName: newAccount.accountName,
            currentBalance: newAccount.currentBalance,
            contributionRoom: newAccount.contributionRoom,
            yearlyContribution: newAccount.yearlyContribution,
            beneficiary: newAccount.beneficiary,
            notes: newAccount.notes
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            // Reload from database to get the correct ID
            await loadPortfolioAssets(currentPortfolioId);
            return;
          }
        }
      } catch (error) {
        console.error('Error saving registered account to database:', error);
      }
    }

    // Fallback to local state (for users without database portfolio)
    setAssets(prev => ({
      ...prev,
      registeredAccounts: [...prev.registeredAccounts, newAccount],
      lastUpdated: new Date().toISOString()
    }));
  };

  // Update Registered Account
  const updateRegisteredAccount = (id: string, field: keyof RegisteredAccount, value: string | number | undefined) => {
    setAssets(prev => {
      const updatedAssets = {
        ...prev,
        registeredAccounts: prev.registeredAccounts.map(account =>
          account.id === id ? { ...account, [field]: value } : account
        ),
        lastUpdated: new Date().toISOString()
      };

      // If we have a database portfolio, debounce update to database
      if (currentPortfolioId) {
        const updatedAccount = updatedAssets.registeredAccounts.find(acc => acc.id === id);
        // Only update database assets (numeric IDs), not new unsaved assets (timestamp IDs)
        if (updatedAccount && !isNaN(parseInt(id))) {
          debouncedUpdateToDatabase('registeredAccount', id, {
            accountType: updatedAccount.accountType,
            institutionName: updatedAccount.institutionName,
            accountName: updatedAccount.accountName,
            currentBalance: updatedAccount.currentBalance,
            contributionRoom: updatedAccount.contributionRoom,
            yearlyContribution: updatedAccount.yearlyContribution,
            beneficiary: updatedAccount.beneficiary,
            notes: updatedAccount.notes
          });
        }
      }

      return updatedAssets;
    });
  };

  // Remove Registered Account
  const removeRegisteredAccount = async (id: string) => {
    // If we have a database portfolio, delete from database first
    if (currentPortfolioId && !isNaN(parseInt(id))) {
      try {
        const numericId = parseInt(id);

        const response = await fetch(`/api/registered-accounts/${numericId}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            // Reload from database to ensure consistency
            await loadPortfolioAssets(currentPortfolioId);
            return;
          }
        }
      } catch (error) {
        console.error('Error deleting registered account from database:', error);
      }
    }

    // Fallback to local state (for users without database portfolio)
    setAssets(prev => ({
      ...prev,
      registeredAccounts: prev.registeredAccounts.filter(account => account.id !== id),
      lastUpdated: new Date().toISOString()
    }));
  };

  const getAccountsByType = (type: 'rrsp' | 'tfsa' | 'fhsa' | 'resp') => {
    return assets.registeredAccounts.filter(account => account.accountType === type);
  };

  // Add Stock
  const addStock = async () => {
    const newStock: StockAsset = {
      id: Date.now().toString(),
      companyName: '',
      ticker: '',
      shares: 0,
      costBasis: 0,
      currentValue: 0,
      currency: 'CAD',
      isPrivate: false,
      exchangeName: '',
      industry: '',
      notes: ''
    };

    const updatedAssets = {
      ...assets,
      stocks: [...assets.stocks, newStock],
      lastUpdated: new Date().toISOString()
    };

    setAssets(updatedAssets);

    // Only save to localStorage for now - the stock will be saved to database 
    // later when user fills in the data through the debounced update system
    if (session?.user?.id) {
      localStorage.setItem(`asset-data-${session.user.id}`, JSON.stringify(updatedAssets));
    }
  };

  // Update Stock
  const updateStock = async (stockId: string, field: keyof StockAsset, value: any) => {
    const updatedAssets = {
      ...assets,
      stocks: assets.stocks.map(stock => 
        stock.id === stockId ? { ...stock, [field]: value } : stock
      ),
      lastUpdated: new Date().toISOString()
    };
    
    setAssets(updatedAssets);
    
    if (session?.user?.id && currentPortfolioId) {
      const stock = updatedAssets.stocks.find(s => s.id === stockId);
      // Check if this is a new stock (timestamp-based ID) vs existing database stock (numeric ID)
      const isNewStock = stockId.length > 10 || isNaN(parseInt(stockId));
      
      if (stock && isNewStock && stock.companyName?.trim() && stock.currentValue > 0 && 
          (stock.isPrivate || stock.exchangeName?.trim())) {
        // Auto-save new stock to database when it has sufficient data
        // Only do this once per stock to avoid duplicate creation
        const stockKey = `stock-creation-${stockId}`;
        if (!recentlyCreatedAssets.current.has(stockKey)) {
          recentlyCreatedAssets.current.add(stockKey);
          
          try {
            const response = await fetch('/api/stocks', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                portfolioId: currentPortfolioId,
                companyName: stock.companyName,
                ticker: stock.ticker,
                shares: stock.shares,
                costBasis: stock.costBasis,
                currentValue: stock.currentValue,
                currency: stock.currency,
                isPrivate: stock.isPrivate,
                exchangeName: stock.exchangeName,
                industry: stock.industry,
                notes: stock.notes
              })
            });
            
            if (response.ok) {
              const result = await response.json();
              // Update the stock ID to the database ID
              setAssets(prev => ({
                ...prev,
                stocks: prev.stocks.map(s => 
                  s.id === stockId ? { ...s, id: result.stockId.toString() } : s
                )
              }));
              // Remove from creation tracking since it's now created
              recentlyCreatedAssets.current.delete(stockKey);
              // Clear any pending timeouts for the old ID
              const oldTimeoutKey = `stock-${stockId}`;
              if (updateTimeouts.current[oldTimeoutKey]) {
                clearTimeout(updateTimeouts.current[oldTimeoutKey]);
                delete updateTimeouts.current[oldTimeoutKey];
              }
            }
          } catch (error) {
            console.error('Error auto-saving new stock:', error);
            // Remove from creation tracking on error so it can be retried
            recentlyCreatedAssets.current.delete(stockKey);
          }
        }
      } else if (stock && !isNewStock) {
        // Update existing stock via debounced system
        debouncedUpdateToDatabase('stock', stockId, { [field]: value });
      }
      // If it's a new stock but doesn't have sufficient data yet, or is being created,
      // just save to localStorage. The debounced system will be skipped for new stocks.
    } else if (session?.user?.id) {
      localStorage.setItem(`asset-data-${session.user.id}`, JSON.stringify(updatedAssets));
    }
  };

  // Remove Stock
  const removeStock = async (stockId: string) => {
    const updatedAssets = {
      ...assets,
      stocks: assets.stocks.filter(stock => stock.id !== stockId),
      lastUpdated: new Date().toISOString()
    };
    
    setAssets(updatedAssets);
    
    if (session?.user?.id && currentPortfolioId && !isNaN(parseInt(stockId))) {
      try {
        await fetch(`/api/stocks/${stockId}`, {
          method: 'DELETE'
        });
      } catch (error) {
        console.error('Error deleting stock:', error);
      }
    } else if (session?.user?.id) {
      localStorage.setItem(`asset-data-${session.user.id}`, JSON.stringify(updatedAssets));
    }
  };

  // Check for localStorage data that needs migration
  const checkLocalStorageData = () => {
    if (typeof window !== 'undefined' && session?.user?.id) {
      const stored = localStorage.getItem(`asset-data-${session.user.id}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const hasData = parsed.realEstate?.length > 0 || 
                         parsed.bankAccounts?.length > 0 || 
                         parsed.registeredAccounts?.length > 0;
          setHasLocalStorageData(hasData);
          return hasData;
        } catch (error) {
          console.error('Error checking localStorage data:', error);
        }
      }
    }
    return false;
  };

  // Load portfolio from database
  const loadPortfolioFromDatabase = async () => {
    try {
      const response = await fetch('/api/asset-portfolios');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.portfolios?.length > 0) {
          // Load the most recent portfolio
          const portfolio = data.portfolios[0];
          setCurrentPortfolioId(portfolio.id);
          await loadPortfolioAssets(portfolio.id);
          return true;
        }
      }
    } catch (error) {
      console.error('Error loading portfolio from database:', error);
    }
    return false;
  };

  // Load assets for a specific portfolio
  const loadPortfolioAssets = async (portfolioId: number) => {
    try {
      const [realEstateResponse, bankAccountsResponse, registeredAccountsResponse, stocksResponse, portfolioResponse] = await Promise.all([
        fetch(`/api/real-estate-assets?portfolioId=${portfolioId}`),
        fetch(`/api/bank-accounts?portfolioId=${portfolioId}`),
        fetch(`/api/registered-accounts?portfolioId=${portfolioId}`),
        fetch(`/api/stocks?portfolioId=${portfolioId}`),
        fetch(`/api/asset-portfolios/${portfolioId}`)
      ]);

      if (realEstateResponse.ok && bankAccountsResponse.ok && registeredAccountsResponse.ok && stocksResponse.ok && portfolioResponse.ok) {
        const [realEstateData, bankAccountsData, registeredAccountsData, stocksData, portfolioData] = await Promise.all([
          realEstateResponse.json(),
          bankAccountsResponse.json(),
          registeredAccountsResponse.json(),
          stocksResponse.json(),
          portfolioResponse.json()
        ]);

        if (realEstateData.success && bankAccountsData.success && registeredAccountsData.success && stocksData.success) {
          const dbAssets: AssetData = {
            realEstate: realEstateData.assets?.map((asset: RealEstateAssetDB) => ({
              id: asset.id.toString(),
              propertyType: asset.propertyType,
              address: asset.address,
              estimatedValue: asset.estimatedValue,
              mortgageBalance: asset.mortgageBalance,
              monthlyPayment: asset.monthlyPayment,
              interestRate: asset.interestRate,
              acquisitionDate: asset.acquisitionDate,
              notes: asset.notes
            })) || [],
            bankAccounts: bankAccountsData.accounts?.map((account: BankAccountDB) => ({
                id: account.id.toString(),
                accountType: account.accountType,
                institutionName: account.institutionName,
                accountName: account.accountName,
                currentBalance: account.currentBalance,
                currency: account.currency || 'CAD',
                interestRate: account.interestRate,
                notes: account.notes
              })) || [],
            registeredAccounts: registeredAccountsData.accounts?.map((account: RegisteredAccountDB) => ({
              id: account.id.toString(),
              accountType: account.accountType,
              institutionName: account.institutionName,
              accountName: account.accountName,
              currentBalance: account.currentBalance,
              contributionRoom: account.contributionRoom,
              yearlyContribution: account.yearlyContribution,
              beneficiary: account.beneficiary,
              notes: account.notes
            })) || [],
            stocks: stocksData.stocks?.map((stock: any) => ({
              id: stock.id.toString(),
              companyName: stock.companyName || '',
              ticker: stock.ticker || '',
              shares: stock.shares || 0,
              costBasis: stock.costBasis || 0,
              currentValue: stock.currentValue || 0,
              currency: stock.currency || 'CAD',
              isPrivate: stock.isPrivate || false,
              exchangeName: stock.exchangeName || '',
              industry: stock.industry || '',
              notes: stock.notes || ''
            })) || [],
            lastUpdated: new Date().toISOString()
          };

          setAssets(dbAssets);
          storeOriginalAssetData(dbAssets);
          
          // Load exchange rate from portfolio
          if (portfolioData.success && portfolioData.portfolio?.usdToCadRate) {
            setUsdToCadRate(portfolioData.portfolio.usdToCadRate);
          }
        }
      }
    } catch (error) {
      console.error('Error loading portfolio assets:', error);
    }
  };

  // Migrate localStorage data to database
  const migrateToDatabase = async () => {
    if (!session?.user?.id || !hasLocalStorageData) return;
    
    setIsMigrating(true);
    
    try {
      // Create a new portfolio
      const portfolioResponse = await fetch('/api/asset-portfolios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portfolioName: portfolioName || 'My Assets'
        })
      });

      if (portfolioResponse.ok) {
        const portfolioData = await portfolioResponse.json();
        if (portfolioData.success) {
          const portfolioId = portfolioData.portfolioId;
          setCurrentPortfolioId(portfolioId);

          // Migrate real estate assets
          for (const property of assets.realEstate) {
            await fetch('/api/real-estate-assets', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                portfolioId,
                propertyType: property.propertyType,
                address: property.address,
                estimatedValue: property.estimatedValue,
                mortgageBalance: property.mortgageBalance,
                monthlyPayment: property.monthlyPayment,
                interestRate: property.interestRate,
                acquisitionDate: property.acquisitionDate,
                notes: property.notes
              })
            });
          }

          // Migrate bank accounts
          for (const account of assets.bankAccounts) {
            await fetch('/api/bank-accounts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                portfolioId,
                accountType: account.accountType,
                institutionName: account.institutionName,
                accountName: account.accountName,
                currentBalance: account.currentBalance,
                currency: account.currency || 'CAD',
                interestRate: account.interestRate,
                notes: account.notes
              })
            });
          }

          // Migrate registered accounts
          for (const account of assets.registeredAccounts) {
            await fetch('/api/registered-accounts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                portfolioId,
                accountType: account.accountType,
                institutionName: account.institutionName,
                accountName: account.accountName,
                currentBalance: account.currentBalance,
                contributionRoom: account.contributionRoom,
                yearlyContribution: account.yearlyContribution,
                beneficiary: account.beneficiary,
                notes: account.notes
              })
            });
          }

          // Clear localStorage after successful migration
          localStorage.removeItem(`asset-data-${session.user.id}`);
          setHasLocalStorageData(false);
          
          // Reload data from database
          await loadPortfolioAssets(portfolioId);
        }
      }
    } catch (error) {
      console.error('Error migrating data to database:', error);
    } finally {
      setIsMigrating(false);
      setShowSaveDialog(false);
    }
  };

  // Load snapshots from database
  const loadSnapshots = async (portfolioId: number) => {
    try {
      const response = await fetch(`/api/asset-snapshots?portfolioId=${portfolioId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.snapshots) {
          setSnapshots(data.snapshots);
        }
      }
    } catch (error) {
      console.error('Error loading snapshots:', error);
    }
  };

  // Create a new snapshot
  const createSnapshot = async () => {
    if (!currentPortfolioId || !snapshotName.trim()) return;
    
    setIsCreatingSnapshot(true);
    
    try {
      const summary = calculateSummary();
      const snapshotData = {
        portfolioId: currentPortfolioId,
        snapshotDate: new Date().toISOString().split('T')[0],
        snapshotName: snapshotName.trim(),
        totalRealEstate: summary.totalRealEstate,
        totalMortgageDebt: summary.totalMortgageDebt,
        netRealEstate: summary.netRealEstate,
        totalCash: summary.totalCash,
        totalRRSP: summary.totalRRSP,
        totalTFSA: summary.totalTFSA,
        totalFHSA: summary.totalFHSA,
        totalRESP: summary.totalRESP,
        totalRegistered: summary.totalRegistered,
        totalStocks: summary.totalStocks,
        totalAssets: summary.totalAssets,
        totalDebt: summary.totalDebt,
        netWorth: summary.netWorth,
        notes: snapshotNotes.trim() || undefined
      };

      const response = await fetch('/api/asset-snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(snapshotData)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Reload snapshots
          await loadSnapshots(currentPortfolioId);
          setShowSnapshotDialog(false);
          setSnapshotName('');
          setSnapshotNotes('');
        }
      }
    } catch (error) {
      console.error('Error creating snapshot:', error);
    } finally {
      setIsCreatingSnapshot(false);
    }
  };

  // Show delete confirmation dialog
  const showDeleteSnapshotConfirmation = (snapshot: AssetPortfolioSnapshot) => {
    setSnapshotToDelete(snapshot);
    setShowDeleteConfirmation(true);
  };

  // Delete a snapshot (after confirmation)
  const deleteSnapshot = async () => {
    if (!snapshotToDelete) return;
    
    try {
      const response = await fetch(`/api/asset-snapshots/${snapshotToDelete.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && currentPortfolioId) {
          // Reload snapshots
          await loadSnapshots(currentPortfolioId);
          // Close confirmation dialog
          setShowDeleteConfirmation(false);
          setSnapshotToDelete(null);
        }
      }
    } catch (error) {
      console.error('Error deleting snapshot:', error);
      // Close confirmation dialog even on error
      setShowDeleteConfirmation(false);
      setSnapshotToDelete(null);
    }
  };

  // Cancel delete confirmation
  const cancelDeleteSnapshot = () => {
    setShowDeleteConfirmation(false);
    setSnapshotToDelete(null);
  };

  // Portfolio Management Functions
  const loadPortfolios = async () => {
    if (!session?.user?.id) return;
    
    try {
      const response = await fetch('/api/asset-portfolios');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPortfolios(data.portfolios);
        }
      }
    } catch (error) {
      console.error('Error loading portfolios:', error);
    }
  };

  const createNewPortfolio = async (name: string) => {
    setIsPortfolioActionLoading(true);
    
    try {
      const response = await fetch('/api/asset-portfolios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portfolioName: name })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          await loadPortfolios();
          // Switch to the new portfolio
          await switchToPortfolio(data.portfolioId);
          setShowPortfolioDialog(false);
          setPortfolioDialogName('');
        }
      }
    } catch (error) {
      console.error('Error creating portfolio:', error);
    } finally {
      setIsPortfolioActionLoading(false);
    }
  };

  const renamePortfolio = async (portfolioId: number, newName: string) => {
    setIsPortfolioActionLoading(true);
    
    try {
      const response = await fetch(`/api/asset-portfolios/${portfolioId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portfolioName: newName })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          await loadPortfolios();
          setShowPortfolioDialog(false);
          setPortfolioDialogName('');
          setSelectedPortfolioForAction(null);
        }
      }
    } catch (error) {
      console.error('Error renaming portfolio:', error);
    } finally {
      setIsPortfolioActionLoading(false);
    }
  };

  const deletePortfolioById = async (portfolioId: number) => {
    setIsPortfolioActionLoading(true);
    
    try {
      const response = await fetch(`/api/asset-portfolios/${portfolioId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          await loadPortfolios();
          
          // If we deleted the current portfolio, switch to another one or clear current
          if (currentPortfolioId === portfolioId) {
            const remainingPortfolios = await getUpdatedPortfolios();
            if (remainingPortfolios.length > 0) {
              await switchToPortfolio(remainingPortfolios[0].id);
            } else {
              setCurrentPortfolioId(null);
              setAssets({
                realEstate: [],
                bankAccounts: [],
                registeredAccounts: [],
                stocks: [],
                lastUpdated: new Date().toISOString()
              });
            }
          }
          
          setShowPortfolioDialog(false);
          setSelectedPortfolioForAction(null);
        }
      }
    } catch (error) {
      console.error('Error deleting portfolio:', error);
    } finally {
      setIsPortfolioActionLoading(false);
    }
  };

  const getUpdatedPortfolios = async (): Promise<AssetPortfolio[]> => {
    try {
      const response = await fetch('/api/asset-portfolios');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          return data.portfolios;
        }
      }
    } catch (error) {
      console.error('Error fetching updated portfolios:', error);
    }
    return [];
  };

  const switchToPortfolio = async (portfolioId: number) => {
    setCurrentPortfolioId(portfolioId);
    await loadPortfolioAssets(portfolioId);
    await loadSnapshots(portfolioId);
  };

  const openPortfolioDialog = (mode: 'create' | 'rename' | 'delete', portfolio?: AssetPortfolio) => {
    setPortfolioDialogMode(mode);
    setSelectedPortfolioForAction(portfolio || null);
    setPortfolioDialogName(portfolio?.portfolioName || '');
    setShowPortfolioDialog(true);
  };

  // Load snapshots when portfolio is loaded
  useEffect(() => {
    if (currentPortfolioId) {
      loadSnapshots(currentPortfolioId);
    }
  }, [currentPortfolioId]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Asset Tracker</h2>
          <p className="text-gray-600">
            Track your Canadian assets and calculate your net worth
          </p>
        </div>
        
        {session && (
          <div className="text-sm text-gray-500">
            Last updated: {new Date(assets.lastUpdated).toLocaleDateString()}
          </div>
        )}
      </div>

      {/* Portfolio Selection */}
      {session && portfolios.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div>
                <h3 className="text-lg font-semibold text-purple-900 mb-1">Portfolio</h3>
                <p className="text-sm text-purple-700">Select a portfolio to view and edit</p>
              </div>
              <div className="flex items-center space-x-2">
                <select
                  value={currentPortfolioId || ''}
                  onChange={(e) => e.target.value && switchToPortfolio(parseInt(e.target.value))}
                  className="px-3 py-2 border border-purple-300 rounded-md bg-white text-purple-900 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {!currentPortfolioId && <option value="">Select a portfolio</option>}
                  {portfolios.map(portfolio => (
                    <option key={portfolio.id} value={portfolio.id}>
                      {portfolio.portfolioName}
                    </option>
                  ))}
                </select>
                {currentPortfolioId && (
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => openPortfolioDialog('rename', portfolios.find(p => p.id === currentPortfolioId))}
                      className="px-2 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                      title="Rename portfolio"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => openPortfolioDialog('delete', portfolios.find(p => p.id === currentPortfolioId))}
                      className="px-2 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                      title="Delete portfolio"
                      disabled={portfolios.length <= 1}
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => openPortfolioDialog('create')}
              className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors text-sm font-medium"
            >
              + New Portfolio
            </button>
          </div>
        </div>
      )}

      {/* Currency Settings */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-blue-900 mb-1">Currency Settings</h3>
            <p className="text-sm text-blue-700">Set the USD to CAD exchange rate for currency conversion</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label htmlFor="usd-cad-rate" className="text-sm font-medium text-blue-900">
                1 USD = 
              </label>
              <input
                id="usd-cad-rate"
                type="number"
                value={usdToCadRate}
                onChange={(e) => setUsdToCadRate(Number(e.target.value) || 1.35)}
                className="w-20 px-2 py-1 border border-blue-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                step="0.01"
                min="0.1"
                max="10"
              />
              <span className="text-sm font-medium text-blue-900">CAD</span>
            </div>
          </div>
        </div>
      </div>

      {/* Net Worth Summary */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6 mb-8">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Net Worth Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              ${summary.netWorth.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Net Worth</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-semibold text-blue-600">
              ${summary.totalAssets.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Total Assets</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-semibold text-red-600">
              ${summary.totalDebt.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Total Debt</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-semibold text-purple-600">
              ${summary.totalRegistered.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Registered Accounts</div>
          </div>
        </div>
      </div>

      {/* Asset Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4 mb-8">
        <div className="bg-orange-50 rounded-lg p-4 text-center">
          <div className="text-lg font-semibold text-orange-600">
            ${summary.netRealEstate.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">Net Real Estate</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-lg font-semibold text-blue-600">
            ${summary.totalCash.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">Cash & Bank</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 text-center">
          <div className="text-lg font-semibold text-purple-600">
            ${summary.totalRRSP.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">RRSP</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-lg font-semibold text-green-600">
            ${summary.totalTFSA.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">TFSA</div>
        </div>
        <div className="bg-pink-50 rounded-lg p-4 text-center">
          <div className="text-lg font-semibold text-pink-600">
            ${summary.totalRESP.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">RESP</div>
        </div>
        <div className="bg-indigo-50 rounded-lg p-4 text-center">
          <div className="text-lg font-semibold text-indigo-600">
            ${summary.totalFHSA.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">FHSA</div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4 text-center">
          <div className="text-lg font-semibold text-yellow-600">
            ${summary.totalStocks.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">Stocks</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {[
            { key: 'real_estate', label: 'Real Estate', icon: '🏠', count: assets.realEstate.length },
            { key: 'bank_accounts', label: 'Bank Accounts', icon: '🏦', count: assets.bankAccounts.length },
            { key: 'rrsp', label: 'RRSP', icon: '📈', count: getAccountsByType('rrsp').length },
            { key: 'tfsa', label: 'TFSA', icon: '💰', count: getAccountsByType('tfsa').length },
            { key: 'resp', label: 'RESP', icon: '🎓', count: getAccountsByType('resp').length },
            { key: 'fhsa', label: 'FHSA', icon: '🏠', count: getAccountsByType('fhsa').length },
            { key: 'stocks', label: 'Stocks', icon: '📈', count: assets.stocks.length },
            { key: 'snapshots', label: 'Snapshots', icon: '📊', count: snapshots.length },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as 'real_estate' | 'bank_accounts' | 'rrsp' | 'tfsa' | 'resp' | 'fhsa' | 'stocks' | 'snapshots')}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === tab.key
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
              {tab.count > 0 && (
                <span className="bg-gray-200 text-gray-700 rounded-full px-2 py-1 text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'real_estate' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-gray-900">Real Estate Properties</h3>
            <button
              onClick={addRealEstate}
              className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 transition-colors"
            >
              + Add Property
            </button>
          </div>
          
          {assets.realEstate.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">🏠</div>
              <p>No properties added yet</p>
              <p className="text-sm">Click &ldquo;Add Property&rdquo; to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {assets.realEstate.map((property) => (
                <div key={property.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Property Type
                      </label>
                      <select
                        value={property.propertyType}
                        onChange={(e) => updateRealEstate(property.id, 'propertyType', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="primary_residence">Primary Residence</option>
                        <option value="investment_property">Investment Property</option>
                        <option value="vacation_home">Vacation Home</option>
                        <option value="commercial">Commercial Property</option>
                      </select>
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Address
                      </label>
                      <input
                        type="text"
                        value={property.address}
                        onChange={(e) => updateRealEstate(property.id, 'address', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="Property address"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Estimated Value ($)
                      </label>
                      <input
                        type="number"
                        value={property.estimatedValue || ''}
                        onChange={(e) => updateRealEstate(property.id, 'estimatedValue', Number(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        min="0"
                        step="1000"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Mortgage Balance ($)
                      </label>
                      <input
                        type="number"
                        value={property.mortgageBalance || ''}
                        onChange={(e) => updateRealEstate(property.id, 'mortgageBalance', Number(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        min="0"
                        step="1000"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Monthly Payment ($)
                      </label>
                      <input
                        type="number"
                        value={property.monthlyPayment || ''}
                        onChange={(e) => updateRealEstate(property.id, 'monthlyPayment', Number(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        min="0"
                        step="100"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center mt-4">
                    <div className="text-sm text-gray-600">
                      Net Equity: ${(property.estimatedValue - property.mortgageBalance).toLocaleString()}
                    </div>
                    <div className="flex gap-2">
                      {currentPortfolioId && (
                        <button
                          onClick={async () => {
                            if (!isNaN(parseInt(property.id)) && property.address && property.estimatedValue > 0) {
                              const assetKey = `realEstate-${property.id}`;
                              setSavingAssets(prev => new Set([...prev, assetKey]));
                              
                              try {
                                await debouncedUpdateToDatabase('realEstate', property.id, {
                                  propertyType: property.propertyType,
                                  address: property.address,
                                  estimatedValue: property.estimatedValue,
                                  mortgageBalance: property.mortgageBalance,
                                  monthlyPayment: property.monthlyPayment,
                                  interestRate: property.interestRate,
                                  acquisitionDate: property.acquisitionDate,
                                  notes: property.notes
                                });
                                // Update original data after successful save
                                originalAssetData.current[assetKey] = { ...property };
                              } finally {
                                setSavingAssets(prev => {
                                  const newSet = new Set(prev);
                                  newSet.delete(assetKey);
                                  return newSet;
                                });
                              }
                            }
                          }}
                          disabled={
                            !property.address || 
                            property.estimatedValue <= 0 || 
                            isNaN(parseInt(property.id)) ||
                            !hasChanges('realEstate', property.id, property) ||
                            savingAssets.has(`realEstate-${property.id}`)
                          }
                          className={`px-3 py-1 rounded text-sm transition-colors flex items-center gap-1 ${
                            !property.address || 
                            property.estimatedValue <= 0 || 
                            isNaN(parseInt(property.id)) ||
                            !hasChanges('realEstate', property.id, property) ||
                            savingAssets.has(`realEstate-${property.id}`)
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                          title={
                            savingAssets.has(`realEstate-${property.id}`) ? 'Saving...' :
                            !property.address ? 'Please enter an address to save' :
                            property.estimatedValue <= 0 ? 'Please enter a value greater than $0 to save' :
                            isNaN(parseInt(property.id)) ? 'This property needs to be saved to database first' :
                            !hasChanges('realEstate', property.id, property) ? 'No changes to save' :
                            'Save this property to database'
                          }
                        >
                          {savingAssets.has(`realEstate-${property.id}`) ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-2 border-gray-400 border-t-transparent"></div>
                              Saving...
                            </>
                          ) : (
                            <>💾 Save</>
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => removeRealEstate(property.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        🗑️ Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'bank_accounts' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-gray-900">Bank Accounts</h3>
            <button
              onClick={addBankAccount}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              + Add Account
            </button>
          </div>
          
          {assets.bankAccounts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">🏦</div>
              <p>No bank accounts added yet</p>
              <p className="text-sm">Click &ldquo;Add Account&rdquo; to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {assets.bankAccounts.map((account) => (
                <div key={account.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Account Type
                      </label>
                      <select
                        value={account.accountType}
                        onChange={(e) => updateBankAccount(account.id, 'accountType', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="chequing">Chequing</option>
                        <option value="savings">Savings</option>
                        <option value="high_interest_savings">High Interest Savings</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Institution
                      </label>
                      <InstitutionSelect
                        value={account.institutionName}
                        onChange={(value) => updateBankAccount(account.id, 'institutionName', value)}
                        className="focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Account Name
                      </label>
                      <input
                        type="text"
                        value={account.accountName || ''}
                        onChange={(e) => updateBankAccount(account.id, 'accountName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Account nickname"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Current Balance ($)
                      </label>
                      <input
                        type="number"
                        value={account.currentBalance || ''}
                        onChange={(e) => updateBankAccount(account.id, 'currentBalance', Number(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        step="100"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Currency
                      </label>
                      <select
                        value={account.currency}
                        onChange={(e) => updateBankAccount(account.id, 'currency', e.target.value as 'CAD' | 'USD')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="CAD">CAD</option>
                        <option value="USD">USD</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Interest Rate (%)
                      </label>
                      <input
                        type="number"
                        value={account.interestRate || 0}
                        onChange={(e) => updateBankAccount(account.id, 'interestRate', Number(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                        max="10"
                        step="0.1"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-2 mt-4">
                    {currentPortfolioId && (
                      <button
                        onClick={async () => {
                          if (!isNaN(parseInt(account.id)) && account.institutionName && account.currentBalance > 0) {
                            const assetKey = `bankAccount-${account.id}`;
                            setSavingAssets(prev => new Set([...prev, assetKey]));
                            
                            try {
                              await debouncedUpdateToDatabase('bankAccount', account.id, {
                                accountType: account.accountType,
                                institutionName: account.institutionName,
                                accountName: account.accountName,
                                currentBalance: account.currentBalance,
                                currency: account.currency,
                                interestRate: account.interestRate,
                                notes: account.notes
                              });
                              // Update original data after successful save
                              originalAssetData.current[assetKey] = { ...account };
                            } finally {
                              setSavingAssets(prev => {
                                const newSet = new Set(prev);
                                newSet.delete(assetKey);
                                return newSet;
                              });
                            }
                          }
                        }}
                        disabled={
                          !account.institutionName || 
                          account.currentBalance <= 0 || 
                          isNaN(parseInt(account.id)) ||
                          !hasChanges('bankAccount', account.id, account) ||
                          savingAssets.has(`bankAccount-${account.id}`)
                        }
                        className={`px-3 py-1 rounded text-sm transition-colors flex items-center gap-1 ${
                          !account.institutionName || 
                          account.currentBalance <= 0 || 
                          isNaN(parseInt(account.id)) ||
                          !hasChanges('bankAccount', account.id, account) ||
                          savingAssets.has(`bankAccount-${account.id}`)
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                        title={
                          savingAssets.has(`bankAccount-${account.id}`) ? 'Saving...' :
                          !account.institutionName ? 'Please enter an institution name to save' :
                          account.currentBalance <= 0 ? 'Please enter a balance greater than $0 to save' :
                          isNaN(parseInt(account.id)) ? 'This account needs to be saved to database first' :
                          !hasChanges('bankAccount', account.id, account) ? 'No changes to save' :
                          'Save this account to database'
                        }
                      >
                        {savingAssets.has(`bankAccount-${account.id}`) ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-2 border-gray-400 border-t-transparent"></div>
                            Saving...
                          </>
                        ) : (
                          <>💾 Save</>
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => removeBankAccount(account.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      🗑️ Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {(['rrsp', 'tfsa', 'resp', 'fhsa'] as const).includes(activeTab) && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-gray-900">
              {activeTab.toUpperCase()} Accounts
            </h3>
            <button
              onClick={() => addRegisteredAccount(activeTab)}
              className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
            >
              + Add {activeTab.toUpperCase()} Account
            </button>
          </div>
          
          {getAccountsByType(activeTab).length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">
                {activeTab === 'rrsp' && '📈'}
                {activeTab === 'tfsa' && '💰'}
                {activeTab === 'resp' && '🎓'}
                {activeTab === 'fhsa' && '🏠'}
              </div>
              <p>No {activeTab.toUpperCase()} accounts added yet</p>
              <p className="text-sm">Click &ldquo;Add {activeTab.toUpperCase()} Account&rdquo; to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {getAccountsByType(activeTab).map((account) => (
                <div key={account.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Institution
                      </label>
                      <InstitutionSelect
                        value={account.institutionName}
                        onChange={(value) => updateRegisteredAccount(account.id, 'institutionName', value)}
                        className="focus:ring-purple-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Account Name
                      </label>
                      <input
                        type="text"
                        value={account.accountName || ''}
                        onChange={(e) => updateRegisteredAccount(account.id, 'accountName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Account nickname"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Current Balance ($)
                      </label>
                      <input
                        type="number"
                        value={account.currentBalance || ''}
                        onChange={(e) => updateRegisteredAccount(account.id, 'currentBalance', Number(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        step="100"
                      />
                    </div>
                    
                    
                    {account.accountType === 'resp' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Beneficiary
                        </label>
                        <input
                          type="text"
                          value={account.beneficiary || ''}
                          onChange={(e) => updateRegisteredAccount(account.id, 'beneficiary', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="Child's name"
                        />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-end gap-2 mt-4">
                    {currentPortfolioId && (
                      <button
                        onClick={async () => {
                          if (!isNaN(parseInt(account.id)) && account.institutionName && account.currentBalance > 0) {
                            const assetKey = `registeredAccount-${account.id}`;
                            setSavingAssets(prev => new Set([...prev, assetKey]));
                            
                            try {
                              await debouncedUpdateToDatabase('registeredAccount', account.id, {
                                accountType: account.accountType,
                                institutionName: account.institutionName,
                                accountName: account.accountName,
                                currentBalance: account.currentBalance,
                                contributionRoom: account.contributionRoom,
                                yearlyContribution: account.yearlyContribution,
                                beneficiary: account.beneficiary,
                                notes: account.notes
                              });
                              // Update original data after successful save
                              originalAssetData.current[assetKey] = { ...account };
                            } finally {
                              setSavingAssets(prev => {
                                const newSet = new Set(prev);
                                newSet.delete(assetKey);
                                return newSet;
                              });
                            }
                          }
                        }}
                        disabled={
                          !account.institutionName || 
                          account.currentBalance <= 0 || 
                          isNaN(parseInt(account.id)) ||
                          !hasChanges('registeredAccount', account.id, account) ||
                          savingAssets.has(`registeredAccount-${account.id}`)
                        }
                        className={`px-3 py-1 rounded text-sm transition-colors flex items-center gap-1 ${
                          !account.institutionName || 
                          account.currentBalance <= 0 || 
                          isNaN(parseInt(account.id)) ||
                          !hasChanges('registeredAccount', account.id, account) ||
                          savingAssets.has(`registeredAccount-${account.id}`)
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                        title={
                          savingAssets.has(`registeredAccount-${account.id}`) ? 'Saving...' :
                          !account.institutionName ? 'Please enter an institution name to save' :
                          account.currentBalance <= 0 ? 'Please enter a balance greater than $0 to save' :
                          isNaN(parseInt(account.id)) ? 'This account needs to be saved to database first' :
                          !hasChanges('registeredAccount', account.id, account) ? 'No changes to save' :
                          'Save this account to database'
                        }
                      >
                        {savingAssets.has(`registeredAccount-${account.id}`) ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-2 border-gray-400 border-t-transparent"></div>
                            Saving...
                          </>
                        ) : (
                          <>💾 Save</>
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => removeRegisteredAccount(account.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      🗑️ Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stocks Section */}
      {activeTab === 'stocks' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-gray-900">
              📈 Stock Holdings
            </h3>
            <button
              onClick={addStock}
              className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
            >
              + Add Stock
            </button>
          </div>
          
          {assets.stocks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📈</div>
              <p>No stock holdings added yet</p>
              <p className="text-sm">Click "Add Stock" to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {assets.stocks.map((stock) => (
                <div key={stock.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Company Name *
                      </label>
                      <input
                        type="text"
                        value={stock.companyName}
                        onChange={(e) => updateStock(stock.id, 'companyName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="e.g., Apple Inc."
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ticker Symbol
                      </label>
                      <input
                        type="text"
                        value={stock.ticker}
                        onChange={(e) => updateStock(stock.id, 'ticker', e.target.value.toUpperCase())}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="e.g., AAPL"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Stock Type
                      </label>
                      <select
                        value={stock.isPrivate ? 'private' : 'public'}
                        onChange={(e) => updateStock(stock.id, 'isPrivate', e.target.value === 'private')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="public">Public Company</option>
                        <option value="private">Private Company</option>
                      </select>
                    </div>

                    {!stock.isPrivate && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Exchange
                        </label>
                        <input
                          type="text"
                          value={stock.exchangeName}
                          onChange={(e) => updateStock(stock.id, 'exchangeName', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="e.g., NYSE, TSX, NASDAQ"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Industry
                      </label>
                      <input
                        type="text"
                        value={stock.industry}
                        onChange={(e) => updateStock(stock.id, 'industry', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="e.g., Technology, Healthcare"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Shares Owned *
                      </label>
                      <input
                        type="number"
                        value={stock.shares || ''}
                        onChange={(e) => updateStock(stock.id, 'shares', Number(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        min="0"
                        step="0.001"
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Average Cost Basis ($)
                      </label>
                      <input
                        type="number"
                        value={stock.costBasis || ''}
                        onChange={(e) => updateStock(stock.id, 'costBasis', Number(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Current Price Per Share ($) *
                      </label>
                      <input
                        type="number"
                        value={stock.currentValue || ''}
                        onChange={(e) => updateStock(stock.id, 'currentValue', Number(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Currency
                      </label>
                      <select
                        value={stock.currency}
                        onChange={(e) => updateStock(stock.id, 'currency', e.target.value as 'CAD' | 'USD')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="CAD">CAD</option>
                        <option value="USD">USD</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={stock.notes}
                      onChange={(e) => updateStock(stock.id, 'notes', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      rows={2}
                      placeholder="Investment thesis, purchase date, etc."
                    />
                  </div>

                  {stock.costBasis > 0 && stock.currentValue > 0 && (
                    <div className="bg-gray-100 rounded-lg p-3 mt-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Total Cost Basis:</span>
                          <div className="font-semibold">${(stock.shares * stock.costBasis).toLocaleString()}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Current Price Per Share:</span>
                          <div className="font-semibold">${stock.currentValue.toLocaleString()} {stock.currency}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Current Total Value:</span>
                          <div className="font-semibold">
                            ${(stock.currentValue * stock.shares).toLocaleString()} {stock.currency}
                            {stock.currency === 'USD' && (
                              <div className="text-xs text-gray-500">
                                (${convertToCAD(stock.currentValue * stock.shares, stock.currency).toLocaleString()} CAD)
                              </div>
                            )}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">Gain/Loss:</span>
                          <div className={`font-semibold ${
                            (stock.currentValue * stock.shares) - (stock.costBasis * stock.shares) >= 0 
                              ? 'text-green-600' 
                              : 'text-red-600'
                          }`}>
                            ${((stock.currentValue * stock.shares) - (stock.costBasis * stock.shares)).toLocaleString()}
                            {stock.costBasis > 0 && (
                              <span className="ml-1">
                                ({((((stock.currentValue * stock.shares) - (stock.costBasis * stock.shares)) / (stock.costBasis * stock.shares)) * 100).toFixed(2)}%)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-end gap-2 mt-4">
                    {currentPortfolioId && (
                      <button
                        onClick={async () => {
                          if (stock.companyName?.trim() && stock.currentValue > 0 && (stock.isPrivate || stock.exchangeName?.trim())) {
                            const assetKey = `stock-${stock.id}`;
                            setSavingAssets(prev => new Set([...prev, assetKey]));
                            
                            try {
                              // Check if this is a new stock (timestamp-based ID) vs existing database stock (numeric ID)
                              const isNewStock = stock.id.length > 10 || isNaN(parseInt(stock.id));
                              
                              if (isNewStock) {
                                // Create new stock in database
                                const requestData = {
                                  portfolioId: currentPortfolioId,
                                  companyName: stock.companyName,
                                  ticker: stock.ticker,
                                  shares: stock.shares,
                                  costBasis: stock.costBasis,
                                  currentValue: stock.currentValue,
                                  currency: stock.currency,
                                  isPrivate: stock.isPrivate,
                                  exchangeName: stock.exchangeName,
                                  industry: stock.industry,
                                  notes: stock.notes
                                };
                                
                                if (!currentPortfolioId) {
                                  console.error('❌ No currentPortfolioId set! Cannot save stock.');
                                  return;
                                }
                                
                                const response = await fetch('/api/stocks', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify(requestData)
                                });
                                
                                if (response.ok) {
                                  const result = await response.json();
                                  // Update the stock ID to the database ID
                                  setAssets(prev => ({
                                    ...prev,
                                    stocks: prev.stocks.map(s => 
                                      s.id === stock.id ? { ...s, id: result.stockId.toString() } : s
                                    )
                                  }));
                                  originalAssetData.current[`stock-${result.stockId}`] = { ...stock, id: result.stockId.toString() };
                                } else {
                                  const errorData = await response.json();
                                  console.error('Failed to save stock:', errorData);
                                  console.error('Stock data sent:', {
                                    portfolioId: currentPortfolioId,
                                    companyName: stock.companyName,
                                    ticker: stock.ticker,
                                    shares: stock.shares,
                                    costBasis: stock.costBasis,
                                    currentValue: stock.currentValue,
                                    currency: stock.currency,
                                    isPrivate: stock.isPrivate,
                                    exchangeName: stock.exchangeName,
                                    industry: stock.industry,
                                    notes: stock.notes
                                  });
                                }
                              } else {
                                // Update existing stock
                                await debouncedUpdateToDatabase('stock', stock.id, {
                                  companyName: stock.companyName,
                                  ticker: stock.ticker,
                                  shares: stock.shares,
                                  costBasis: stock.costBasis,
                                  currentValue: stock.currentValue,
                                  currency: stock.currency,
                                  isPrivate: stock.isPrivate,
                                  exchangeName: stock.exchangeName,
                                  industry: stock.industry,
                                  notes: stock.notes
                                });
                                // Update original data after successful save
                                originalAssetData.current[assetKey] = { ...stock };
                              }
                            } finally {
                              setSavingAssets(prev => {
                                const newSet = new Set(prev);
                                newSet.delete(assetKey);
                                return newSet;
                              });
                            }
                          }
                        }}
                        disabled={
                          !stock.companyName?.trim() || 
                          stock.currentValue <= 0 || 
                          (!stock.isPrivate && !stock.exchangeName?.trim()) ||
                          (stock.id.length <= 10 && !isNaN(parseInt(stock.id)) && !hasChanges('stock', stock.id, stock)) ||
                          savingAssets.has(`stock-${stock.id}`)
                        }
                        className={`px-3 py-1 rounded text-sm transition-colors flex items-center gap-1 ${
                          !stock.companyName?.trim() || 
                          stock.currentValue <= 0 || 
                          (!stock.isPrivate && !stock.exchangeName?.trim()) ||
                          (stock.id.length <= 10 && !isNaN(parseInt(stock.id)) && !hasChanges('stock', stock.id, stock)) ||
                          savingAssets.has(`stock-${stock.id}`)
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                        title={
                          savingAssets.has(`stock-${stock.id}`) ? 'Saving...' :
                          !stock.companyName?.trim() ? 'Please enter a company name to save' :
                          stock.currentValue <= 0 ? 'Please enter a current value greater than $0 to save' :
                          (!stock.isPrivate && !stock.exchangeName?.trim()) ? 'Please enter an exchange name for public companies' :
                          (stock.id.length <= 10 && !isNaN(parseInt(stock.id)) && !hasChanges('stock', stock.id, stock)) ? 'No changes to save' :
                          'Save this stock to database'
                        }
                      >
                        {savingAssets.has(`stock-${stock.id}`) ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-2 border-gray-400 border-t-transparent"></div>
                            Saving...
                          </>
                        ) : (
                          <>💾 Save</>
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => removeStock(stock.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      🗑️ Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Snapshots Tab Content */}
      {activeTab === 'snapshots' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-gray-900">Asset Snapshots</h3>
            {currentPortfolioId && (
              <button
                onClick={() => {
                  setShowSnapshotDialog(true);
                  setSnapshotName(`${new Date().toLocaleDateString()} Snapshot`);
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                📊 Create Snapshot
              </button>
            )}
          </div>
          
          {snapshots.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📊</div>
              <p>No snapshots created yet</p>
              <p className="text-sm">Click &ldquo;Create Snapshot&rdquo; to save your current asset values</p>
            </div>
          ) : (
            <div className="space-y-4">
              {snapshots.map((snapshot) => (
                <div key={snapshot.id} className="bg-gray-50 rounded-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">{snapshot.snapshotName}</h4>
                      <p className="text-sm text-gray-600">
                        Taken on {new Date(snapshot.snapshotDate).toLocaleDateString()}
                      </p>
                      {snapshot.notes && (
                        <p className="text-sm text-gray-700 mt-1">{snapshot.notes}</p>
                      )}
                    </div>
                    <button
                      onClick={() => showDeleteSnapshotConfirmation(snapshot)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-xl font-bold text-green-600">
                        ${snapshot.netWorth.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-600">Net Worth</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-blue-600">
                        ${snapshot.totalAssets.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-600">Total Assets</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-red-600">
                        ${snapshot.totalDebt.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-600">Total Debt</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-purple-600">
                        ${snapshot.totalRegistered.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-600">Registered</div>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-sm">
                      <div className="text-center">
                        <div className="font-medium text-orange-600">${snapshot.netRealEstate.toLocaleString()}</div>
                        <div className="text-xs text-gray-500">Net Real Estate</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-blue-600">${snapshot.totalCash.toLocaleString()}</div>
                        <div className="text-xs text-gray-500">Cash</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-green-600">${snapshot.totalRRSP.toLocaleString()}</div>
                        <div className="text-xs text-gray-500">RRSP</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-purple-600">${snapshot.totalTFSA.toLocaleString()}</div>
                        <div className="text-xs text-gray-500">TFSA</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-indigo-600">${snapshot.totalFHSA.toLocaleString()}</div>
                        <div className="text-xs text-gray-500">FHSA</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-yellow-600">${snapshot.totalRESP.toLocaleString()}</div>
                        <div className="text-xs text-gray-500">RESP</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Authentication Prompt */}
      {!session && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-8">
          <p className="text-yellow-800">
            💡 <strong>Sign in</strong> to save your asset data permanently and access it from any device.
            Your data is currently stored locally and will be lost if you clear your browser data.
          </p>
        </div>
      )}

      {/* Migration Dialog */}
      {showSaveDialog && hasLocalStorageData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              📦 Migrate Your Asset Data
            </h3>
            <p className="text-gray-600 mb-4">
              We found asset data stored locally in your browser. Would you like to save it to your secure account? 
              This will ensure your data is always available across all your devices.
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Portfolio Name
              </label>
              <input
                type="text"
                value={portfolioName}
                onChange={(e) => setPortfolioName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="e.g., 'My Assets'"
                autoFocus
              />
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setHasLocalStorageData(false);
                  localStorage.removeItem(`asset-data-${session?.user?.id}`);
                }}
                disabled={isMigrating}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
              >
                Skip
              </button>
              <button
                onClick={migrateToDatabase}
                disabled={!portfolioName.trim() || isMigrating}
                className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isMigrating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Migrating...
                  </>
                ) : (
                  <>💾 Save to Account</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Snapshot Creation Dialog */}
      {showSnapshotDialog && currentPortfolioId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              📊 Create Asset Snapshot
            </h3>
            <p className="text-gray-600 mb-4">
              Save a point-in-time snapshot of your current asset values. This will help you track 
              your net worth growth over time and create reports.
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Snapshot Name
              </label>
              <input
                type="text"
                value={snapshotName}
                onChange={(e) => setSnapshotName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 'January 2025 Assets'"
                autoFocus
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (Optional)
              </label>
              <textarea
                value={snapshotNotes}
                onChange={(e) => setSnapshotNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Any notes about this snapshot..."
                rows={3}
              />
            </div>

            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <div className="text-sm text-gray-600 mb-2">Current values to be saved:</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between">
                  <span>Net Worth:</span>
                  <span className="font-semibold">${calculateSummary().netWorth.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Assets:</span>
                  <span className="font-semibold">${calculateSummary().totalAssets.toLocaleString()}</span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowSnapshotDialog(false);
                  setSnapshotName('');
                  setSnapshotNotes('');
                }}
                disabled={isCreatingSnapshot}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={createSnapshot}
                disabled={!snapshotName.trim() || isCreatingSnapshot}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isCreatingSnapshot ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Creating...
                  </>
                ) : (
                  <>📊 Create Snapshot</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Portfolio (for signed-in users with database portfolio) */}
      {session && currentPortfolioId && (
        <div className="bg-gray-50 rounded-lg p-6 mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Asset Portfolio Saved</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-700 font-medium">✅ Your asset data is securely saved to your account</p>
              <p className="text-sm text-gray-600 mt-1">
                Your data will sync automatically across all your devices.
              </p>
            </div>
            <div className="text-sm text-gray-500">
              Portfolio ID: {currentPortfolioId}
            </div>
          </div>
        </div>
      )}

      {/* Comprehensive Asset Summary */}
      <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-lg p-6 mt-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">📊 Complete Asset Breakdown</h3>
        
        {/* Real Estate Section */}
        {assets.realEstate.length > 0 && (
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-orange-700 mb-3">🏠 Real Estate Properties</h4>
            <div className="space-y-3">
              {assets.realEstate.map((property, index) => (
                <div key={property.id} className="bg-white rounded-lg p-4 shadow-sm border">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-gray-900">
                        {property.address || `Property ${index + 1}`}
                      </div>
                      <div className="text-sm text-gray-600 capitalize">
                        {property.propertyType.replace('_', ' ')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-green-600">
                        Net: ${(property.estimatedValue - property.mortgageBalance).toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-600">
                        Value: ${property.estimatedValue.toLocaleString()} | 
                        Debt: ${property.mortgageBalance.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div className="bg-orange-100 rounded-lg p-3">
                <div className="flex justify-between font-semibold text-orange-800">
                  <span>Total Real Estate:</span>
                  <span>${summary.netRealEstate.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bank Accounts Section */}
        {assets.bankAccounts.length > 0 && (
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-blue-700 mb-3">🏦 Bank Accounts</h4>
            <div className="space-y-3">
              {assets.bankAccounts.map((account, index) => (
                <div key={account.id} className="bg-white rounded-lg p-4 shadow-sm border">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium text-gray-900">
                        {account.accountName || `${account.institutionName} ${account.accountType}`}
                      </div>
                      <div className="text-sm text-gray-600 capitalize">
                        {account.accountType.replace('_', ' ')} • {account.institutionName}
                      </div>
                    </div>
                    <div className="font-semibold text-blue-600">
                      ${account.currentBalance.toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
              <div className="bg-blue-100 rounded-lg p-3">
                <div className="flex justify-between font-semibold text-blue-800">
                  <span>Total Cash & Bank:</span>
                  <span>${summary.totalCash.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Registered Accounts Section */}
        {assets.registeredAccounts.length > 0 && (
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-purple-700 mb-3">📈 Registered Accounts</h4>
            <div className="space-y-3">
              {/* RRSP */}
              {getAccountsByType('rrsp').length > 0 && (
                <div>
                  <div className="text-sm font-medium text-purple-600 mb-2">RRSP Accounts</div>
                  {getAccountsByType('rrsp').map((account) => (
                    <div key={account.id} className="bg-white rounded-lg p-3 shadow-sm border ml-4 mb-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium text-gray-900">
                            {account.accountName || account.institutionName}
                          </div>
                        </div>
                        <div className="font-semibold text-purple-600">
                          ${account.currentBalance.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TFSA */}
              {getAccountsByType('tfsa').length > 0 && (
                <div>
                  <div className="text-sm font-medium text-green-600 mb-2">TFSA Accounts</div>
                  {getAccountsByType('tfsa').map((account) => (
                    <div key={account.id} className="bg-white rounded-lg p-3 shadow-sm border ml-4 mb-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium text-gray-900">
                            {account.accountName || account.institutionName}
                          </div>
                        </div>
                        <div className="font-semibold text-green-600">
                          ${account.currentBalance.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* RESP */}
              {getAccountsByType('resp').length > 0 && (
                <div>
                  <div className="text-sm font-medium text-pink-600 mb-2">RESP Accounts</div>
                  {getAccountsByType('resp').map((account) => (
                    <div key={account.id} className="bg-white rounded-lg p-3 shadow-sm border ml-4 mb-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium text-gray-900">
                            {account.accountName || account.institutionName}
                          </div>
                          <div className="text-xs text-gray-600">
                            {account.beneficiary && `Beneficiary: ${account.beneficiary} | `}
                            Annual: ${(account.yearlyContribution || 0).toLocaleString()}
                          </div>
                        </div>
                        <div className="font-semibold text-pink-600">
                          ${account.currentBalance.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* FHSA */}
              {getAccountsByType('fhsa').length > 0 && (
                <div>
                  <div className="text-sm font-medium text-indigo-600 mb-2">FHSA Accounts</div>
                  {getAccountsByType('fhsa').map((account) => (
                    <div key={account.id} className="bg-white rounded-lg p-3 shadow-sm border ml-4 mb-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium text-gray-900">
                            {account.accountName || account.institutionName}
                          </div>
                        </div>
                        <div className="font-semibold text-indigo-600">
                          ${account.currentBalance.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-purple-100 rounded-lg p-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span>RRSP:</span>
                    <span className="font-semibold">${summary.totalRRSP.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TFSA:</span>
                    <span className="font-semibold">${summary.totalTFSA.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>RESP:</span>
                    <span className="font-semibold">${summary.totalRESP.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>FHSA:</span>
                    <span className="font-semibold">${summary.totalFHSA.toLocaleString()}</span>
                  </div>
                </div>
                <div className="border-t border-purple-200 mt-2 pt-2">
                  <div className="flex justify-between font-semibold text-purple-800">
                    <span>Total Registered:</span>
                    <span>${summary.totalRegistered.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stocks Section */}
        {assets.stocks.length > 0 && (
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-purple-700 mb-3">📈 Stock Holdings</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {assets.stocks.map((stock) => (
                <div key={stock.id} className="bg-white rounded-lg p-4 shadow-sm border">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-semibold text-gray-900">{stock.companyName}</div>
                      <div className="text-sm text-gray-600">
                        {stock.ticker} • {stock.shares} shares
                        {!stock.isPrivate && stock.exchangeName && ` • ${stock.exchangeName}`}
                      </div>
                    </div>
                    <div className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-800">
                      {stock.isPrivate ? 'Private' : 'Public'}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">Price/Share:</span>
                      <div className="font-semibold">${stock.currentValue.toLocaleString()} {stock.currency}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Total Value:</span>
                      <div className="font-semibold text-purple-600">
                        ${(stock.currentValue * stock.shares).toLocaleString()} {stock.currency}
                        {stock.currency === 'USD' && (
                          <div className="text-xs text-gray-500">
                            ${convertToCAD(stock.currentValue * stock.shares, stock.currency).toLocaleString()} CAD
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="bg-purple-100 rounded-lg p-3 mt-4">
              <div className="flex justify-between font-semibold text-purple-800">
                <span>Total Stocks (CAD):</span>
                <span>${summary.totalStocks.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Final Summary */}
        <div className="bg-gradient-to-r from-green-100 to-blue-100 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">${summary.totalAssets.toLocaleString()}</div>
              <div className="text-sm text-gray-700">Total Assets</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">${summary.totalDebt.toLocaleString()}</div>
              <div className="text-sm text-gray-700">Total Debt</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-600">${summary.netWorth.toLocaleString()}</div>
              <div className="text-sm text-gray-700">Net Worth</div>
            </div>
          </div>
        </div>
      </div>

      {/* Portfolio Management Dialog */}
      {showPortfolioDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {portfolioDialogMode === 'create' && '📁 Create New Portfolio'}
              {portfolioDialogMode === 'rename' && `✏️ Rename Portfolio`}
              {portfolioDialogMode === 'delete' && '🗑️ Delete Portfolio'}
            </h3>
            
            {portfolioDialogMode === 'create' && (
              <>
                <p className="text-gray-600 mb-4">
                  Create a new portfolio to organize different sets of assets.
                </p>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Portfolio Name
                  </label>
                  <input
                    type="text"
                    value={portfolioDialogName}
                    onChange={(e) => setPortfolioDialogName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g., 'Investment Portfolio', 'Personal Assets'"
                    autoFocus
                  />
                </div>
              </>
            )}

            {portfolioDialogMode === 'rename' && (
              <>
                <p className="text-gray-600 mb-4">
                  Rename "{selectedPortfolioForAction?.portfolioName}"
                </p>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Portfolio Name
                  </label>
                  <input
                    type="text"
                    value={portfolioDialogName}
                    onChange={(e) => setPortfolioDialogName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    autoFocus
                  />
                </div>
              </>
            )}

            {portfolioDialogMode === 'delete' && (
              <>
                <p className="text-gray-600 mb-4">
                  Are you sure you want to delete "{selectedPortfolioForAction?.portfolioName}"?
                </p>
                <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                  <p className="text-sm text-red-700">
                    ⚠️ This action cannot be undone. All assets, snapshots, and data in this portfolio will be permanently deleted.
                  </p>
                </div>
              </>
            )}
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowPortfolioDialog(false);
                  setPortfolioDialogName('');
                  setSelectedPortfolioForAction(null);
                }}
                disabled={isPortfolioActionLoading}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (portfolioDialogMode === 'create') {
                    createNewPortfolio(portfolioDialogName.trim());
                  } else if (portfolioDialogMode === 'rename' && selectedPortfolioForAction) {
                    renamePortfolio(selectedPortfolioForAction.id, portfolioDialogName.trim());
                  } else if (portfolioDialogMode === 'delete' && selectedPortfolioForAction) {
                    deletePortfolioById(selectedPortfolioForAction.id);
                  }
                }}
                disabled={
                  isPortfolioActionLoading ||
                  (portfolioDialogMode !== 'delete' && !portfolioDialogName.trim())
                }
                className={`px-6 py-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
                  portfolioDialogMode === 'delete'
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
              >
                {isPortfolioActionLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    {portfolioDialogMode === 'create' && 'Creating...'}
                    {portfolioDialogMode === 'rename' && 'Renaming...'}
                    {portfolioDialogMode === 'delete' && 'Deleting...'}
                  </>
                ) : (
                  <>
                    {portfolioDialogMode === 'create' && '📁 Create Portfolio'}
                    {portfolioDialogMode === 'rename' && '✏️ Rename Portfolio'}
                    {portfolioDialogMode === 'delete' && '🗑️ Delete Portfolio'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Snapshot Confirmation Dialog */}
      {showDeleteConfirmation && snapshotToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              🗑️ Delete Snapshot
            </h3>
            
            <div className="mb-6">
              <p className="text-gray-700 mb-2">
                Are you sure you want to delete this snapshot?
              </p>
              <div className="bg-gray-50 p-3 rounded-md">
                <div className="font-medium text-gray-900">
                  {snapshotToDelete.name}
                </div>
                <div className="text-sm text-gray-600">
                  Created on {new Date(snapshotToDelete.createdAt).toLocaleDateString()}
                </div>
                {snapshotToDelete.notes && (
                  <div className="text-sm text-gray-600 mt-1">
                    Notes: {snapshotToDelete.notes}
                  </div>
                )}
              </div>
              <p className="text-sm text-red-600 mt-3">
                This action cannot be undone.
              </p>
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelDeleteSnapshot}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={deleteSnapshot}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                🗑️ Delete Snapshot
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}