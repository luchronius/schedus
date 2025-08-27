'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export function useCashflowData() {
  const { data: session, status } = useSession();
  const [investments, setInvestments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load data based on authentication status
  useEffect(() => {
    if (status === 'loading') return; // Still checking auth status
    
    if (session?.user) {
      loadUserData();
    } else {
      loadLocalStorageData();
    }
  }, [session, status]);

  const loadUserData = async () => {
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
      setError(err.message);
      console.error('Error loading user data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadLocalStorageData = () => {
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

  const addInvestment = async (investment) => {
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
        const newInvestment = { 
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
      setError(err.message);
      throw err;
    }
  };

  const updateInvestment = async (id, investment) => {
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
        const updatedInvestments = investments.map(inv => 
          inv.id === id ? { ...investment, id } : inv
        );
        
        setInvestments(updatedInvestments);
        localStorage.setItem('cashflowTracker_investments', JSON.stringify(updatedInvestments));
        return { ...investment, id };
      }
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const deleteInvestment = async (id) => {
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
      setError(err.message);
      throw err;
    }
  };

  const addExpense = async (expense) => {
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
        const newExpense = { 
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
      setError(err.message);
      throw err;
    }
  };

  const updateExpense = async (id, expense) => {
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
        const updatedExpenses = expenses.map(exp => 
          exp.id === id ? { ...expense, id } : exp
        );
        
        setExpenses(updatedExpenses);
        localStorage.setItem('cashflowTracker_expenses', JSON.stringify(updatedExpenses));
        return { ...expense, id };
      }
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const deleteExpense = async (id) => {
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
      setError(err.message);
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