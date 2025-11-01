'use client';

import React, { useState, useMemo, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useCashflowData } from '../hooks/useCashflowData';

interface Investment {
  id: string;
  type: 'TFSA' | 'RESP' | 'RRSP' | 'Other';
  amount: number;
  month: number;
  year: number;
  description?: string;
  isRecurring: boolean;
}

interface Expense {
  id: string;
  category: 'Food' | 'Transportation' | 'Housing' | 'Entertainment' | 'Healthcare' | 'Education' | 'Other';
  description: string;
  amount: number;
  month: number;
  year: number;
  isRecurring?: boolean;
}

interface Todo {
  id: string;
  description: string;
  createdAt: Date;
}

interface MonthData {
  month: number;
  year: number;
  investments: Investment[];
  expenses: Expense[];
  monthlyTotal: number;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const INVESTMENT_TYPES = ['TFSA', 'RESP', 'RRSP', 'Other'] as const;
const EXPENSE_CATEGORIES = ['Furniture', 'Housing Upgrade', 'Car', 'Technology', 'Other'] as const;

export default function CashflowTracker() {
  const { data: session } = useSession();
  const {
    investments,
    expenses,
    loading,
    error,
    isAuthenticated,
    addInvestment,
    updateInvestment,
    deleteInvestment,
    addExpense,
    updateExpense,
    deleteExpense
  } = useCashflowData();

  // Initialize selectedYear from localStorage or default to 2025
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const savedYear = localStorage.getItem('cashflowTracker_selectedYear');
      return savedYear ? parseInt(savedYear) : 2025;
    }
    return 2025;
  });
  const [showAddInvestment, setShowAddInvestment] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddTodo, setShowAddTodo] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [convertingTodo, setConvertingTodo] = useState<Todo | null>(null);
  // Initialize todos from localStorage
  const [todos, setTodos] = useState<Todo[]>(() => {
    if (typeof window !== 'undefined') {
      const savedTodos = localStorage.getItem('cashflowTracker_todos');
      if (savedTodos) {
        try {
          const parsed = JSON.parse(savedTodos);
          return parsed.map((todo: any) => ({
            ...todo,
            createdAt: new Date(todo.createdAt)
          }));
        } catch (error) {
          console.error('Error parsing saved todos:', error);
        }
      }
    }
    return [];
  });
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [newInvestment, setNewInvestment] = useState<Partial<Investment>>({
    type: 'TFSA',
    amount: 0,
    month: 1,
    year: selectedYear,
    isRecurring: false,
    description: ''
  });

  const [newExpense, setNewExpense] = useState<Partial<Expense>>({
    category: 'Other',
    description: '',
    amount: 0,
    month: 1,
    year: selectedYear,
    isRecurring: false
  });

  const [newTodo, setNewTodo] = useState<Partial<Todo>>({
    description: ''
  });

  const [operationLoading, setOperationLoading] = useState(false);

  const years = [2025, 2026, 2027, 2028, 2029, 2030];

  // Save selectedYear to localStorage when it changes
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cashflowTracker_selectedYear', selectedYear.toString());
    }
  }, [selectedYear]);

  // Update form defaults when selected year changes
  React.useEffect(() => {
    setNewInvestment(prev => ({
      ...prev,
      year: selectedYear
    }));
    setNewExpense(prev => ({
      ...prev,
      year: selectedYear
    }));
  }, [selectedYear]);

  // Save todos to localStorage when they change
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cashflowTracker_todos', JSON.stringify(todos));
    }
  }, [todos]);

  // Generate timeline data
  const timelineData = useMemo(() => {
    const data: MonthData[] = [];
    
    for (let year = 2025; year <= 2030; year++) {
      for (let month = 1; month <= 12; month++) {
        const monthInvestments = investments.filter(inv => {
          if (inv.isRecurring) {
            return inv.month === month && inv.year <= year;
          }
          return inv.month === month && inv.year === year;
        });
        
        const monthExpenses = expenses.filter(exp => {
          if (exp.isRecurring) {
            return exp.month === month && exp.year <= year;
          }
          return exp.month === month && exp.year === year;
        });

        const investmentTotal = monthInvestments.reduce((sum, inv) => sum + inv.amount, 0);
        const expenseTotal = monthExpenses.reduce((sum, exp) => sum + exp.amount, 0);

        data.push({
          month,
          year,
          investments: monthInvestments,
          expenses: monthExpenses,
          monthlyTotal: investmentTotal + expenseTotal
        });
        
      }
    }
    
    return data;
  }, [investments, expenses]);

  const handleAddInvestment = async () => {
    if (!newInvestment.type || !newInvestment.amount || !newInvestment.month || !newInvestment.year) {
      return;
    }

    try {
      setOperationLoading(true);
      const investment: Omit<Investment, 'id'> = {
        type: newInvestment.type as Investment['type'],
        amount: newInvestment.amount,
        month: newInvestment.month,
        year: newInvestment.year,
        description: newInvestment.description || '',
        isRecurring: newInvestment.isRecurring || false
      };

      await addInvestment(investment);
      
      // If this was converted from a todo, delete the original todo
      if (convertingTodo) {
        handleDeleteTodo(convertingTodo.id);
        setConvertingTodo(null);
      }
      
      setNewInvestment({
        type: 'TFSA',
        amount: 0,
        month: 1,
        year: selectedYear,
        isRecurring: false,
        description: ''
      });
      setShowAddInvestment(false);
    } catch (error) {
      console.error('Failed to add investment:', error);
    } finally {
      setOperationLoading(false);
    }
  };

  const handleAddExpense = async () => {
    if (!newExpense.category || !newExpense.description || !newExpense.amount || !newExpense.month || !newExpense.year) {
      return;
    }

    try {
      setOperationLoading(true);
      const expense: Omit<Expense, 'id'> = {
        category: newExpense.category as Expense['category'],
        description: newExpense.description,
        amount: newExpense.amount,
        month: newExpense.month,
        year: newExpense.year
      };

      await addExpense(expense);
      
      // If this was converted from a todo, delete the original todo
      if (convertingTodo) {
        handleDeleteTodo(convertingTodo.id);
        setConvertingTodo(null);
      }
      
      setNewExpense({
        category: 'Other',
        description: '',
        amount: 0,
        month: 1,
        year: selectedYear
      });
      setShowAddExpense(false);
    } catch (error) {
      console.error('Failed to add expense:', error);
    } finally {
      setOperationLoading(false);
    }
  };

  // Todo management functions
  const handleAddTodo = () => {
    if (!newTodo.description?.trim()) {
      return;
    }

    const todo: Todo = {
      id: Date.now().toString(),
      description: newTodo.description.trim(),
      createdAt: new Date()
    };

    setTodos(prev => [...prev, todo]);
    setNewTodo({ description: '' });
    setShowAddTodo(false);
  };

  const handleEditTodo = (todo: Todo) => {
    setEditingTodo(todo);
    setNewTodo({
      description: todo.description
    });
    setShowAddTodo(true);
  };

  const handleUpdateTodo = () => {
    if (!editingTodo || !newTodo.description?.trim()) {
      return;
    }

    setTodos(prev => prev.map(todo => 
      todo.id === editingTodo.id 
        ? { ...todo, description: newTodo.description!.trim() }
        : todo
    ));

    setEditingTodo(null);
    setNewTodo({ description: '' });
    setShowAddTodo(false);
  };

  const handleDeleteTodo = (todoId: string) => {
    setTodos(prev => prev.filter(todo => todo.id !== todoId));
  };

  const convertTodoToExpense = (todo: Todo) => {
    setConvertingTodo(todo); // Track which todo is being converted
    setNewExpense({
      category: 'Other',
      description: todo.description,
      amount: 0,
      month: new Date().getMonth() + 1,
      year: selectedYear,
      isRecurring: false
    });
    setShowAddExpense(true);
  };

  const convertTodoToInvestment = (todo: Todo) => {
    setConvertingTodo(todo); // Track which todo is being converted
    setNewInvestment({
      type: 'Other',
      amount: 0,
      month: new Date().getMonth() + 1,
      year: selectedYear,
      description: todo.description,
      isRecurring: false
    });
    setShowAddInvestment(true);
  };

  const handleEditInvestment = (investment: Investment) => {
    setEditingInvestment(investment);
    setNewInvestment({
      type: investment.type,
      amount: investment.amount,
      month: investment.month,
      year: investment.year,
      description: investment.description,
      isRecurring: investment.isRecurring
    });
    setShowAddInvestment(true);
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setNewExpense({
      category: expense.category,
      description: expense.description,
      amount: expense.amount,
      month: expense.month,
      year: expense.year
    });
    setShowAddExpense(true);
  };

  const handleUpdateInvestment = async () => {
    if (!editingInvestment || !newInvestment.type || !newInvestment.amount || !newInvestment.month || !newInvestment.year) {
      return;
    }

    try {
      setOperationLoading(true);
      const investment = {
        type: newInvestment.type as Investment['type'],
        amount: newInvestment.amount,
        month: newInvestment.month,
        year: newInvestment.year,
        description: newInvestment.description || '',
        isRecurring: newInvestment.isRecurring || false
      };

      await updateInvestment(editingInvestment.id, investment);
      setEditingInvestment(null);
      setNewInvestment({
        type: 'TFSA',
        amount: 0,
        month: 1,
        year: selectedYear,
        isRecurring: false,
        description: ''
      });
      setShowAddInvestment(false);
    } catch (error) {
      console.error('Failed to update investment:', error);
    } finally {
      setOperationLoading(false);
    }
  };

  const handleUpdateExpense = async () => {
    if (!editingExpense || !newExpense.category || !newExpense.description || !newExpense.amount || !newExpense.month || !newExpense.year) {
      return;
    }

    try {
      setOperationLoading(true);
      const expense = {
        category: newExpense.category as Expense['category'],
        description: newExpense.description,
        amount: newExpense.amount,
        month: newExpense.month,
        year: newExpense.year
      };

      await updateExpense(editingExpense.id, expense);
      setEditingExpense(null);
      setNewExpense({
        category: 'Other',
        description: '',
        amount: 0,
        month: 1,
        year: selectedYear
      });
      setShowAddExpense(false);
    } catch (error) {
      console.error('Failed to update expense:', error);
    } finally {
      setOperationLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingInvestment(null);
    setEditingExpense(null);
    setEditingTodo(null);
    setConvertingTodo(null); // Clear the converting todo on cancel
    setNewInvestment({
      type: 'TFSA',
      amount: 0,
      month: 1,
      year: selectedYear,
      isRecurring: false,
      description: ''
    });
    setNewExpense({
      category: 'Other',
      description: '',
      amount: 0,
      month: 1,
      year: selectedYear,
      isRecurring: false
    });
    setNewTodo({
      description: ''
    });
    setShowAddInvestment(false);
    setShowAddExpense(false);
    setShowAddTodo(false);
  };

  const handleRemoveInvestment = async (id: string) => {
    try {
      setOperationLoading(true);
      await deleteInvestment(id);
    } catch (error) {
      console.error('Failed to delete investment:', error);
    } finally {
      setOperationLoading(false);
    }
  };

  const handleRemoveExpense = async (id: string) => {
    try {
      setOperationLoading(true);
      await deleteExpense(id);
    } catch (error) {
      console.error('Failed to delete expense:', error);
    } finally {
      setOperationLoading(false);
    }
  };

  const getDefaultInvestments = async () => {
    const defaults = [
      { type: 'TFSA' as const, amount: 7000, month: 1, year: 2025, description: 'Annual TFSA contribution', isRecurring: true },
      { type: 'RESP' as const, amount: 2500, month: 1, year: 2025, description: 'Annual RESP contribution', isRecurring: true },
      { type: 'RRSP' as const, amount: 15000, month: 2, year: 2025, description: 'Annual RRSP contribution (post-tax filing)', isRecurring: true }
    ];

    try {
      setOperationLoading(true);
      for (const investment of defaults) {
        await addInvestment(investment);
      }
    } catch (error) {
      console.error('Failed to add default investments:', error);
    } finally {
      setOperationLoading(false);
    }
  };

  const exportToCSV = () => {
    const csvContent = generateCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `cashflow-tracker-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToJSON = () => {
    const data = {
      investments,
      expenses,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `cashflow-tracker-${new Date().toISOString().split('T')[0]}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateCSV = () => {
    let csv = 'Type,Category,Description,Amount,Month,Year,Recurring\n';
    
    // Add investments
    investments.forEach(inv => {
      csv += `Investment,${inv.type},"${inv.description || ''}",${inv.amount},${inv.month},${inv.year},${inv.isRecurring}\n`;
    });
    
    // Add expenses
    expenses.forEach(exp => {
      csv += `Expense,${exp.category},"${exp.description}",${exp.amount},${exp.month},${exp.year},false\n`;
    });
    
    return csv;
  };

  const clearAllData = async () => {
    if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      try {
        setOperationLoading(true);
        
        // Delete all investments, expenses, and todos
        const deletePromises = [
          ...investments.map(inv => deleteInvestment(inv.id)),
          ...expenses.map(exp => deleteExpense(exp.id))
        ];
        
        // Clear todos locally and from localStorage
        setTodos([]);
        localStorage.removeItem('cashflowTracker_todos');
        
        await Promise.all(deletePromises);
      } catch (error) {
        console.error('Failed to clear data:', error);
      } finally {
        setOperationLoading(false);
      }
    }
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const fileType = file.name.toLowerCase().split('.').pop();
    
    if (fileType === 'json') {
      importFromJSON(file);
    } else if (fileType === 'csv') {
      importFromCSV(file);
    } else {
      alert('Please select a JSON or CSV file.');
    }
    
    // Reset the input so the same file can be selected again
    event.target.value = '';
  };

  const importFromJSON = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        setOperationLoading(true);
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        // Ask user if they want to replace or merge data
        const shouldReplace = investments.length > 0 || expenses.length > 0 
          ? confirm('Do you want to REPLACE existing data (OK) or MERGE with existing data (Cancel)?')
          : true;
        
        if (shouldReplace) {
          await clearAllDataSilent();
        }
        
        if (data.investments && Array.isArray(data.investments)) {
          const validInvestments = data.investments.filter((inv: any) => 
            inv.type && typeof inv.amount === 'number' && 
            inv.month && inv.year && typeof inv.isRecurring === 'boolean'
          );
          
          for (const investment of validInvestments) {
            await addInvestment({
              type: investment.type,
              amount: investment.amount,
              month: investment.month,
              year: investment.year,
              description: investment.description || '',
              isRecurring: investment.isRecurring
            });
          }
        }
        
        if (data.expenses && Array.isArray(data.expenses)) {
          const validExpenses = data.expenses.filter((exp: any) => 
            exp.category && exp.description && 
            typeof exp.amount === 'number' && exp.month && exp.year
          );
          
          for (const expense of validExpenses) {
            await addExpense({
              category: expense.category,
              description: expense.description,
              amount: expense.amount,
              month: expense.month,
              year: expense.year
            });
          }
        }
        
        alert('Data imported successfully!');
      } catch (error) {
        console.error('Error importing JSON:', error);
        alert('Error importing JSON file. Please check the file format.');
      } finally {
        setOperationLoading(false);
      }
    };
    reader.readAsText(file);
  };

  const importFromCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        setOperationLoading(true);
        const content = e.target?.result as string;
        const lines = content.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          alert('CSV file appears to be empty or invalid.');
          return;
        }
        
        // Skip header row
        const dataLines = lines.slice(1);
        
        // Ask user if they want to replace or merge data
        const shouldReplace = investments.length > 0 || expenses.length > 0 
          ? confirm('Do you want to REPLACE existing data (OK) or MERGE with existing data (Cancel)?')
          : true;
        
        if (shouldReplace) {
          await clearAllDataSilent();
        }
        
        let importedInvestments = 0;
        let importedExpenses = 0;
        
        for (const line of dataLines) {
          const columns = line.split(',').map(col => col.replace(/"/g, '').trim());
          
          if (columns.length < 7) continue; // Skip invalid rows
          
          const [type, category, description, amount, month, year, recurring] = columns;
          const numAmount = parseFloat(amount);
          const numMonth = parseInt(month);
          const numYear = parseInt(year);
          
          if (isNaN(numAmount) || isNaN(numMonth) || isNaN(numYear)) continue;
          
          try {
            if (type === 'Investment') {
              await addInvestment({
                type: category as Investment['type'],
                description: description || '',
                amount: numAmount,
                month: numMonth,
                year: numYear,
                isRecurring: recurring.toLowerCase() === 'true'
              });
              importedInvestments++;
            } else if (type === 'Expense') {
              await addExpense({
                category: category as Expense['category'],
                description: description,
                amount: numAmount,
                month: numMonth,
                year: numYear
              });
              importedExpenses++;
            }
          } catch (error) {
            console.error('Error importing item:', error);
          }
        }
        
        alert(`Imported ${importedInvestments} investments and ${importedExpenses} expenses successfully!`);
      } catch (error) {
        console.error('Error importing CSV:', error);
        alert('Error importing CSV file. Please check the file format.');
      } finally {
        setOperationLoading(false);
      }
    };
    reader.readAsText(file);
  };

  const clearAllDataSilent = async () => {
    const deletePromises = [
      ...investments.map(inv => deleteInvestment(inv.id)),
      ...expenses.map(exp => deleteExpense(exp.id))
    ];
    setTodos([]); // Clear todos locally
    localStorage.removeItem('cashflowTracker_todos');
    await Promise.all(deletePromises);
  };

  // Filter timeline data for selected year
  const filteredTimelineData = timelineData.filter(data => data.year === selectedYear);

  // Calculate yearly totals
  const yearlyTotals = useMemo(() => {
    const totals: { [year: number]: { investments: number; expenses: number; total: number } } = {};
    
    for (let year = 2025; year <= 2030; year++) {
      const yearInvestments = investments.filter(inv => {
        if (inv.isRecurring) {
          return inv.year <= year;
        }
        return inv.year === year;
      });
      
      const yearExpenses = expenses.filter(exp => {
        if (exp.isRecurring) {
          return exp.year <= year;
        }
        return exp.year === year;
      });
      
      const investmentTotal = yearInvestments.reduce((sum, inv) => sum + inv.amount, 0);
      const expenseTotal = yearExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      
      totals[year] = {
        investments: investmentTotal,
        expenses: expenseTotal,
        total: investmentTotal + expenseTotal
      };
    }
    
    return totals;
  }, [investments, expenses]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6 bg-white">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Loading your cashflow data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Cashflow Tracker 2025-2030</h1>
        <p className="text-gray-600 mb-6">
          Track your scheduled investments (TFSA, RESP, RRSP) and major expenses from 2025-2030. 
          {isAuthenticated ? ' Your data is saved to your account.' : ' Sign in to save your data permanently.'}
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            Error: {error}
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-2">
            <label htmlFor="year-select" className="text-sm font-medium text-gray-700">
              Year:
            </label>
            <select
              id="year-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowAddInvestment(true)}
            disabled={operationLoading}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm disabled:opacity-50"
          >
            Add Investment
          </button>

          <button
            onClick={() => setShowAddExpense(true)}
            disabled={operationLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm disabled:opacity-50"
          >
            Add Expense
          </button>

          <button
            onClick={() => setShowAddTodo(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm"
          >
            Add To do
          </button>

          {investments.length === 0 && (
            <button
              onClick={getDefaultInvestments}
              disabled={operationLoading}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm disabled:opacity-50"
            >
              Add Default Investments
            </button>
          )}

          {/* Import/Export Section */}
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.json"
              onChange={handleFileImport}
              className="hidden"
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={operationLoading}
              className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 text-sm disabled:opacity-50"
            >
              Import CSV
            </button>
            
            <button
              onClick={exportToCSV}
              disabled={operationLoading}
              className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 text-sm disabled:opacity-50"
            >
              Export CSV
            </button>
            
            <button
              onClick={exportToJSON}
              disabled={operationLoading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm disabled:opacity-50"
            >
              Export JSON
            </button>
            
            {(investments.length > 0 || expenses.length > 0) && (
              <button
                onClick={clearAllData}
                disabled={operationLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm disabled:opacity-50"
              >
                Clear All Data
              </button>
            )}
          </div>
        </div>

        {operationLoading && (
          <div className="mb-4 p-3 bg-blue-100 border border-blue-400 text-blue-700 rounded">
            Processing...
          </div>
        )}
      </div>

      {/* To Do List */}
      {todos.length > 0 && (
        <div className="mb-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-purple-700">📝 To Do List</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Description</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Created</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {todos.map((todo) => (
                  <tr key={todo.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-900">{todo.description}</td>
                    <td className="py-3 px-4 text-gray-600 text-sm">
                      {todo.createdAt.toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEditTodo(todo)}
                          className="text-blue-500 hover:text-blue-700 p-1"
                          title="Edit todo"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => convertTodoToExpense(todo)}
                          className="text-red-500 hover:text-red-700 p-1"
                          title="Convert to expense"
                        >
                          💰
                        </button>
                        <button
                          onClick={() => convertTodoToInvestment(todo)}
                          className="text-green-500 hover:text-green-700 p-1"
                          title="Convert to investment"
                        >
                          📈
                        </button>
                        <button
                          onClick={() => handleDeleteTodo(todo.id)}
                          className="text-gray-500 hover:text-gray-700 p-1"
                          title="Delete todo"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Timeline View */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">{selectedYear} Timeline</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTimelineData.map((monthData) => (
            <div key={`${monthData.year}-${monthData.month}`} className="border rounded-lg p-4 bg-gray-50">
              <h3 className="font-semibold text-gray-900 mb-2">
                {MONTHS[monthData.month - 1]} {monthData.year}
              </h3>
              
              {monthData.investments.length > 0 && (
                <div className="mb-2">
                  <h4 className="text-sm font-medium text-green-700 mb-1">Investments:</h4>
                  {monthData.investments.map((inv) => (
                    <div key={inv.id} className="text-xs text-gray-600 mb-1 flex justify-between items-center">
                      <span>{inv.type}: {inv.description || 'Investment'} {inv.isRecurring && '🔄'}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-green-600 font-medium">${inv.amount.toLocaleString()}</span>
                        <button
                          onClick={() => handleEditInvestment(inv)}
                          className="text-blue-500 hover:text-blue-700 text-xs"
                          disabled={operationLoading}
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleRemoveInvestment(inv.id)}
                          className="text-red-500 hover:text-red-700 text-xs"
                          disabled={operationLoading}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {monthData.expenses.length > 0 && (
                <div className="mb-2">
                  <h4 className="text-sm font-medium text-red-700 mb-1">Expenses:</h4>
                  {monthData.expenses.map((exp) => (
                    <div key={exp.id} className="text-xs text-gray-600 mb-1 flex justify-between items-center">
                      <span>{exp.category}: {exp.description}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-red-600 font-medium">${exp.amount.toLocaleString()}</span>
                        <button
                          onClick={() => handleEditExpense(exp)}
                          className="text-blue-500 hover:text-blue-700 text-xs"
                          disabled={operationLoading}
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleRemoveExpense(exp.id)}
                          className="text-red-500 hover:text-red-700 text-xs"
                          disabled={operationLoading}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {monthData.monthlyTotal > 0 && (
                <div className="border-t pt-2 mt-2">
                  <div className="text-sm font-semibold text-gray-900">
                    Total: ${monthData.monthlyTotal.toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Annual Summary */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Annual Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {years.map(year => (
            <div key={year} className="border rounded-lg p-4 bg-gray-50">
              <h3 className="font-semibold text-gray-900 mb-2">{year}</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-green-700">Investments:</span>
                  <span className="font-medium">${yearlyTotals[year]?.investments.toLocaleString() || '0'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-700">Expenses:</span>
                  <span className="font-medium">${yearlyTotals[year]?.expenses.toLocaleString() || '0'}</span>
                </div>
                <div className="flex justify-between font-semibold border-t pt-1">
                  <span>Total:</span>
                  <span>${yearlyTotals[year]?.total.toLocaleString() || '0'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add/Edit Investment Modal */}
      {showAddInvestment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">
              {editingInvestment ? 'Edit Investment' : 'Add Investment'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={newInvestment.type}
                  onChange={(e) => setNewInvestment(prev => ({ ...prev, type: e.target.value as Investment['type'] }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  {INVESTMENT_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input
                  type="number"
                  value={newInvestment.amount || ''}
                  onChange={(e) => setNewInvestment(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  min="0"
                  step="100"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                  <select
                    value={newInvestment.month}
                    onChange={(e) => setNewInvestment(prev => ({ ...prev, month: parseInt(e.target.value) }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    {MONTHS.map((month, index) => (
                      <option key={month} value={index + 1}>{month}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                  <select
                    value={newInvestment.year}
                    onChange={(e) => setNewInvestment(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    {years.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={newInvestment.description || ''}
                  onChange={(e) => setNewInvestment(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Optional description"
                />
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newInvestment.isRecurring || false}
                    onChange={(e) => setNewInvestment(prev => ({ ...prev, isRecurring: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Recurring investment (applies to future years)</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={editingInvestment ? handleUpdateInvestment : handleAddInvestment}
                disabled={operationLoading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {operationLoading ? 'Saving...' : (editingInvestment ? 'Update' : 'Add')}
              </button>
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Expense Modal */}
      {showAddExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">
              {editingExpense ? 'Edit Expense' : 'Add Expense'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={newExpense.category}
                  onChange={(e) => setNewExpense(prev => ({ ...prev, category: e.target.value as Expense['category'] }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  {EXPENSE_CATEGORIES.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={newExpense.description || ''}
                  onChange={(e) => setNewExpense(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="What is this expense for?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input
                  type="number"
                  value={newExpense.amount || ''}
                  onChange={(e) => setNewExpense(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  min="0"
                  step="100"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                  <select
                    value={newExpense.month}
                    onChange={(e) => setNewExpense(prev => ({ ...prev, month: parseInt(e.target.value) }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    {MONTHS.map((month, index) => (
                      <option key={month} value={index + 1}>{month}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                  <select
                    value={newExpense.year}
                    onChange={(e) => setNewExpense(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    {years.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="expense-recurring"
                  checked={newExpense.isRecurring || false}
                  onChange={(e) => setNewExpense(prev => ({ ...prev, isRecurring: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="expense-recurring" className="ml-2 text-sm text-gray-700">
                  Recurring expense (appears every year from start year onwards)
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={editingExpense ? handleUpdateExpense : handleAddExpense}
                disabled={operationLoading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {operationLoading ? 'Saving...' : (editingExpense ? 'Update' : 'Add')}
              </button>
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Todo Modal */}
      {showAddTodo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">
              {editingTodo ? 'Edit To do' : 'Add To do'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newTodo.description || ''}
                  onChange={(e) => setNewTodo({...newTodo, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="What do you need to do?"
                  rows={3}
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={editingTodo ? handleUpdateTodo : handleAddTodo}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                {editingTodo ? 'Update' : 'Add'}
              </button>
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Total Cash Outflow Summary */}
      {(investments.length > 0 || expenses.length > 0 || todos.length > 0) && (
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center">
            <span className="font-bold text-xl">Total Cash Outflow</span>
            <span className="font-bold text-xl text-red-700">
              ${(investments.reduce((sum, inv) => sum + inv.amount, 0) + expenses.reduce((sum, exp) => sum + exp.amount, 0)).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Total Investments: ${investments.reduce((sum, inv) => sum + inv.amount, 0).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} + 
            Total Expenses: ${expenses.reduce((sum, exp) => sum + exp.amount, 0).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      )}

      {/* Investment and Expense Details by Year */}
      <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-6">All Transactions by Year</h2>
        
        <div className="space-y-6">
          {(() => {
            // Show all years 2025-2030, but only display years that have data
            const allYears = [];
            for (let year = 2025; year <= 2030; year++) {
              const yearInvestments = investments.filter(inv => {
                if (inv.isRecurring) {
                  return inv.year <= year;
                }
                return inv.year === year;
              });
              const yearExpenses = expenses.filter(exp => {
                if (exp.isRecurring) {
                  return exp.year <= year;
                }
                return exp.year === year;
              });
              
              if (yearInvestments.length > 0 || yearExpenses.length > 0) {
                allYears.push(year);
              }
            }
            
            if (allYears.length === 0) {
              return <p className="text-gray-500 italic">No transactions added yet</p>;
            }
            
            return allYears.map(year => {
              const yearInvestments = investments.filter(inv => {
                if (inv.isRecurring) {
                  return inv.year <= year;
                }
                return inv.year === year;
              });
              const yearExpenses = expenses.filter(exp => {
                if (exp.isRecurring) {
                  return exp.year <= year;
                }
                return exp.year === year;
              });
              const yearInvestmentTotal = yearInvestments.reduce((sum, inv) => sum + inv.amount, 0);
              const yearExpenseTotal = yearExpenses.reduce((sum, exp) => sum + exp.amount, 0);
              const yearNetFlow = yearInvestmentTotal + yearExpenseTotal;
              
              return (
                <div key={year} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">{year}</h3>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">Total Outflow</div>
                      <div className="font-bold text-red-700">
                        ${yearNetFlow.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Investments for this year */}
                    <div>
                      <h4 className="text-sm font-semibold text-green-700 mb-2">
                        Investments ({yearInvestments.length}) - Total: ${yearInvestmentTotal.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </h4>
                      <div className="space-y-2">
                        {yearInvestments.length > 0 ? yearInvestments.map(investment => (
                          <div key={investment.id} className="bg-green-50 p-3 rounded border-l-4 border-green-400">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="font-medium text-green-800">{investment.type}</div>
                                <div className="text-sm text-gray-600">{investment.description}</div>
                                <div className="text-xs text-gray-500">
                                  {new Date(investment.year, investment.month - 1).toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })}
                                  {investment.isRecurring && <span className="ml-2 text-blue-600">(Recurring)</span>}
                                </div>
                              </div>
                              <div className="text-green-700 font-semibold ml-4">
                                ${investment.amount.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                            </div>
                          </div>
                        )) : (
                          <div className="text-gray-500 italic text-sm">No investments this year</div>
                        )}
                      </div>
                    </div>
                    
                    {/* Expenses for this year */}
                    <div>
                      <h4 className="text-sm font-semibold text-red-700 mb-2">
                        Expenses ({yearExpenses.length}) - Total: ${yearExpenseTotal.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </h4>
                      <div className="space-y-2">
                        {yearExpenses.length > 0 ? yearExpenses.map(expense => (
                          <div key={expense.id} className="bg-red-50 p-3 rounded border-l-4 border-red-400">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="font-medium text-red-800">{expense.category}</div>
                                <div className="text-sm text-gray-600">{expense.description}</div>
                                <div className="text-xs text-gray-500">
                                  {new Date(expense.year, expense.month - 1).toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })}
                                  {expense.isRecurring && <span className="ml-2 text-blue-600">(Recurring)</span>}
                                </div>
                              </div>
                              <div className="text-red-700 font-semibold ml-4">
                                ${expense.amount.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                            </div>
                          </div>
                        )) : (
                          <div className="text-gray-500 italic text-sm">No expenses this year</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>
    </div>
  );
}