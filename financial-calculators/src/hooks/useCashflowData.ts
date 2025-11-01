'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface Investment {
  id: string | number;
  type: string;
  amount: number;
  month: number;
  year: number;
  description: string;
  isRecurring: boolean;
  created_at?: string;
  user_id?: number;
}

interface Expense {
  id: string | number;
  category: string;
  description: string;
  amount: number;
  month: number;
  year: number;
  isRecurring?: boolean;
  created_at?: string;
  user_id?: number;
}

interface UseCashflowDataReturn {
  investments: Investment[];
  expenses: Expense[];
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  addInvestment: (investment: Omit<Investment, 'id' | 'created_at' | 'user_id'>) => Promise<Investment>;
  updateInvestment: (id: string | number, investment: Omit<Investment, 'id' | 'created_at' | 'user_id'>) => Promise<Investment>;
  deleteInvestment: (id: string | number) => Promise<void>;
  addExpense: (expense: Omit<Expense, 'id' | 'created_at' | 'user_id'>) => Promise<Expense>;
  updateExpense: (id: string | number, expense: Omit<Expense, 'id' | 'created_at' | 'user_id'>) => Promise<Expense>;
  deleteExpense: (id: string | number) => Promise<void>;
  refetch: () => void;
}

export function useCashflowData(): UseCashflowDataReturn {
  const { data: session, status } = useSession();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load data based on authentication status
  useEffect(() => {
    if (status === 'loading') return; // Still checking auth status
    
    if (session?.user) {
      loadUserData();
    } else {
      loadLocalStorageData();
    }
  }, [session, status]);

  const loadUserData = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      const [investmentsRes, expensesRes] = await Promise.all([
        fetch('/api/investments'),
        fetch('/api/expenses')
      ]);

      if (!investmentsRes.ok || !expensesRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const [investmentsData, expensesData] = await Promise.all([
        investmentsRes.json(),
        expensesRes.json()
      ]);

      setInvestments(investmentsData);
      setExpenses(expensesData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error loading user data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadLocalStorageData = (): void => {
    try {
      setLoading(true);
      setError(null);
      
      if (typeof window !== 'undefined') {
        const savedInvestments = localStorage.getItem('cashflowTracker_investments');
        const savedExpenses = localStorage.getItem('cashflowTracker_expenses');
        
        setInvestments(savedInvestments ? JSON.parse(savedInvestments) : []);
        setExpenses(savedExpenses ? JSON.parse(savedExpenses) : []);
      }
    } catch (err) {
      setError('Failed to load local data');
      console.error('Error loading localStorage data:', err);
      setInvestments([]);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  const addInvestment = async (investment: Omit<Investment, 'id' | 'created_at' | 'user_id'>): Promise<Investment> => {
    try {
      if (session?.user) {
        // Database mode
        const response = await fetch('/api/investments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(investment)
        });

        if (!response.ok) {
          throw new Error('Failed to save investment');
        }

        const newInvestment = await response.json();
        setInvestments(prev => [...prev, newInvestment]);
        return newInvestment;
      } else {
        // localStorage mode
        const newInvestment: Investment = { 
          ...investment, 
          id: Date.now().toString(),
          created_at: new Date().toISOString()
        };
        const updatedInvestments = [...investments, newInvestment];
        
        setInvestments(updatedInvestments);
        localStorage.setItem('cashflowTracker_investments', JSON.stringify(updatedInvestments));
        return newInvestment;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    }
  };

  const updateInvestment = async (id: string | number, investment: Omit<Investment, 'id' | 'created_at' | 'user_id'>): Promise<Investment> => {
    try {
      if (session?.user) {
        // Database mode
        const response = await fetch(`/api/investments/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(investment)
        });

        if (!response.ok) {
          throw new Error('Failed to update investment');
        }

        const updatedInvestment = await response.json();
        setInvestments(prev => prev.map(inv => inv.id == id ? updatedInvestment : inv));
        return updatedInvestment;
      } else {
        // localStorage mode
        const updatedInvestment: Investment = { ...investment, id: id.toString() };
        const updatedInvestments = investments.map(inv => 
          inv.id === id ? updatedInvestment : inv
        );
        
        setInvestments(updatedInvestments);
        localStorage.setItem('cashflowTracker_investments', JSON.stringify(updatedInvestments));
        return updatedInvestment;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    }
  };

  const deleteInvestment = async (id: string | number): Promise<void> => {
    try {
      if (session?.user) {
        // Database mode
        const response = await fetch(`/api/investments/${id}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          throw new Error('Failed to delete investment');
        }

        setInvestments(prev => prev.filter(inv => inv.id != id));
      } else {
        // localStorage mode
        const updatedInvestments = investments.filter(inv => inv.id !== id);
        setInvestments(updatedInvestments);
        localStorage.setItem('cashflowTracker_investments', JSON.stringify(updatedInvestments));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    }
  };

  const addExpense = async (expense: Omit<Expense, 'id' | 'created_at' | 'user_id'>): Promise<Expense> => {
    try {
      if (session?.user) {
        // Database mode
        const response = await fetch('/api/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(expense)
        });

        if (!response.ok) {
          throw new Error('Failed to save expense');
        }

        const newExpense = await response.json();
        setExpenses(prev => [...prev, newExpense]);
        return newExpense;
      } else {
        // localStorage mode
        const newExpense: Expense = { 
          ...expense, 
          id: Date.now().toString(),
          created_at: new Date().toISOString()
        };
        const updatedExpenses = [...expenses, newExpense];
        
        setExpenses(updatedExpenses);
        localStorage.setItem('cashflowTracker_expenses', JSON.stringify(updatedExpenses));
        return newExpense;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    }
  };

  const updateExpense = async (id: string | number, expense: Omit<Expense, 'id' | 'created_at' | 'user_id'>): Promise<Expense> => {
    try {
      if (session?.user) {
        // Database mode
        const response = await fetch(`/api/expenses/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(expense)
        });

        if (!response.ok) {
          throw new Error('Failed to update expense');
        }

        const updatedExpense = await response.json();
        setExpenses(prev => prev.map(exp => exp.id == id ? updatedExpense : exp));
        return updatedExpense;
      } else {
        // localStorage mode
        const updatedExpense: Expense = { ...expense, id: id.toString() };
        const updatedExpenses = expenses.map(exp => 
          exp.id === id ? updatedExpense : exp
        );
        
        setExpenses(updatedExpenses);
        localStorage.setItem('cashflowTracker_expenses', JSON.stringify(updatedExpenses));
        return updatedExpense;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    }
  };

  const deleteExpense = async (id: string | number): Promise<void> => {
    try {
      if (session?.user) {
        // Database mode
        const response = await fetch(`/api/expenses/${id}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          throw new Error('Failed to delete expense');
        }

        setExpenses(prev => prev.filter(exp => exp.id != id));
      } else {
        // localStorage mode
        const updatedExpenses = expenses.filter(exp => exp.id !== id);
        setExpenses(updatedExpenses);
        localStorage.setItem('cashflowTracker_expenses', JSON.stringify(updatedExpenses));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    }
  };

  return {
    investments,
    expenses,
    loading,
    error,
    isAuthenticated: !!session?.user,
    addInvestment,
    updateInvestment,
    deleteInvestment,
    addExpense,
    updateExpense,
    deleteExpense,
    refetch: session?.user ? loadUserData : loadLocalStorageData
  };
}