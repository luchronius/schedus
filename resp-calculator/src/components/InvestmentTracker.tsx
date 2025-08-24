'use client';

import React, { useState, useMemo, useEffect } from 'react';

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
  category: 'Furniture' | 'Housing Upgrade' | 'Car' | 'Technology' | 'Other';
  description: string;
  amount: number;
  month: number;
  year: number;
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

export default function InvestmentTracker() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [showAddInvestment, setShowAddInvestment] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Load data from localStorage on component mount
  useEffect(() => {
    const savedInvestments = localStorage.getItem('investmentTracker_investments');
    const savedExpenses = localStorage.getItem('investmentTracker_expenses');
    
    if (savedInvestments) {
      try {
        setInvestments(JSON.parse(savedInvestments));
      } catch (error) {
        console.error('Error loading investments from localStorage:', error);
      }
    }
    
    if (savedExpenses) {
      try {
        setExpenses(JSON.parse(savedExpenses));
      } catch (error) {
        console.error('Error loading expenses from localStorage:', error);
      }
    }
  }, []);

  // Save investments to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('investmentTracker_investments', JSON.stringify(investments));
  }, [investments]);

  // Save expenses to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('investmentTracker_expenses', JSON.stringify(expenses));
  }, [expenses]);

  // Update form defaults when selected year changes
  useEffect(() => {
    setNewInvestment(prev => ({
      ...prev,
      year: selectedYear
    }));
    setNewExpense(prev => ({
      ...prev,
      year: selectedYear
    }));
  }, [selectedYear]);

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
    year: selectedYear
  });

  const years = [2025, 2026, 2027, 2028, 2029, 2030];

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
        
        const monthExpenses = expenses.filter(exp => 
          exp.month === month && exp.year === year
        );

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

  const addInvestment = () => {
    if (!newInvestment.type || !newInvestment.amount || !newInvestment.month || !newInvestment.year) {
      return;
    }

    const investment: Investment = {
      id: Date.now().toString(),
      type: newInvestment.type as Investment['type'],
      amount: newInvestment.amount,
      month: newInvestment.month,
      year: newInvestment.year,
      description: newInvestment.description || '',
      isRecurring: newInvestment.isRecurring || false
    };

    setInvestments(prev => [...prev, investment]);
    setNewInvestment({
      type: 'TFSA',
      amount: 0,
      month: 1,
      year: selectedYear,
      isRecurring: false,
      description: ''
    });
    setShowAddInvestment(false);
  };

  const addExpense = () => {
    if (!newExpense.category || !newExpense.description || !newExpense.amount || !newExpense.month || !newExpense.year) {
      return;
    }

    const expense: Expense = {
      id: Date.now().toString(),
      category: newExpense.category as Expense['category'],
      description: newExpense.description,
      amount: newExpense.amount,
      month: newExpense.month,
      year: newExpense.year
    };

    setExpenses(prev => [...prev, expense]);
    setNewExpense({
      category: 'Other',
      description: '',
      amount: 0,
      month: 1,
      year: selectedYear
    });
    setShowAddExpense(false);
  };

  const editInvestment = (investment: Investment) => {
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

  const editExpense = (expense: Expense) => {
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

  const updateInvestment = () => {
    if (!editingInvestment || !newInvestment.type || !newInvestment.amount || !newInvestment.month || !newInvestment.year) {
      return;
    }

    const updatedInvestment: Investment = {
      id: editingInvestment.id,
      type: newInvestment.type as Investment['type'],
      amount: newInvestment.amount,
      month: newInvestment.month,
      year: newInvestment.year,
      description: newInvestment.description || '',
      isRecurring: newInvestment.isRecurring || false
    };

    setInvestments(prev => prev.map(inv => inv.id === editingInvestment.id ? updatedInvestment : inv));
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
  };

  const updateExpense = () => {
    if (!editingExpense || !newExpense.category || !newExpense.description || !newExpense.amount || !newExpense.month || !newExpense.year) {
      return;
    }

    const updatedExpense: Expense = {
      id: editingExpense.id,
      category: newExpense.category as Expense['category'],
      description: newExpense.description,
      amount: newExpense.amount,
      month: newExpense.month,
      year: newExpense.year
    };

    setExpenses(prev => prev.map(exp => exp.id === editingExpense.id ? updatedExpense : exp));
    setEditingExpense(null);
    setNewExpense({
      category: 'Other',
      description: '',
      amount: 0,
      month: 1,
      year: selectedYear
    });
    setShowAddExpense(false);
  };

  const cancelEdit = () => {
    setEditingInvestment(null);
    setEditingExpense(null);
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
      year: selectedYear
    });
    setShowAddInvestment(false);
    setShowAddExpense(false);
  };

  const removeInvestment = (id: string) => {
    setInvestments(prev => prev.filter(inv => inv.id !== id));
  };

  const removeExpense = (id: string) => {
    setExpenses(prev => prev.filter(exp => exp.id !== id));
  };

  const exportToCSV = () => {
    const csvContent = generateCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `investment-tracker-${new Date().toISOString().split('T')[0]}.csv`);
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
    link.setAttribute('download', `investment-tracker-${new Date().toISOString().split('T')[0]}.json`);
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

  const clearAllData = () => {
    if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      setInvestments([]);
      setExpenses([]);
      localStorage.removeItem('investmentTracker_investments');
      localStorage.removeItem('investmentTracker_expenses');
    }
  };

  const importFromJSON = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        // Ask user if they want to replace or merge data
        const shouldReplace = investments.length > 0 || expenses.length > 0 
          ? confirm('Do you want to REPLACE existing data (OK) or MERGE with existing data (Cancel)?')
          : true;
        
        if (data.investments && Array.isArray(data.investments)) {
          // Validate investment data structure
          const validInvestments = data.investments.filter((inv: any) => 
            inv.id && inv.type && typeof inv.amount === 'number' && 
            inv.month && inv.year && typeof inv.isRecurring === 'boolean'
          );
          
          if (shouldReplace) {
            setInvestments(validInvestments);
          } else {
            setInvestments(prev => [...prev, ...validInvestments]);
          }
        }
        
        if (data.expenses && Array.isArray(data.expenses)) {
          // Validate expense data structure
          const validExpenses = data.expenses.filter((exp: any) => 
            exp.id && exp.category && exp.description && 
            typeof exp.amount === 'number' && exp.month && exp.year
          );
          
          if (shouldReplace) {
            setExpenses(validExpenses);
          } else {
            setExpenses(prev => [...prev, ...validExpenses]);
          }
        }
        
        alert('Data imported successfully!');
      } catch (error) {
        console.error('Error importing JSON:', error);
        alert('Error importing JSON file. Please check the file format.');
      }
    };
    reader.readAsText(file);
  };

  const importFromCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const lines = content.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          alert('CSV file appears to be empty or invalid.');
          return;
        }
        
        // Skip header row
        const dataLines = lines.slice(1);
        const newInvestments: Investment[] = [];
        const newExpenses: Expense[] = [];
        
        dataLines.forEach((line, index) => {
          const columns = line.split(',').map(col => col.replace(/"/g, '').trim());
          
          if (columns.length < 7) return; // Skip invalid rows
          
          const [type, category, description, amount, month, year, recurring] = columns;
          const numAmount = parseFloat(amount);
          const numMonth = parseInt(month);
          const numYear = parseInt(year);
          
          if (isNaN(numAmount) || isNaN(numMonth) || isNaN(numYear)) return;
          
          if (type === 'Investment') {
            const investment: Investment = {
              id: `imported-inv-${Date.now()}-${index}`,
              type: category as Investment['type'],
              description: description || '',
              amount: numAmount,
              month: numMonth,
              year: numYear,
              isRecurring: recurring.toLowerCase() === 'true'
            };
            newInvestments.push(investment);
          } else if (type === 'Expense') {
            const expense: Expense = {
              id: `imported-exp-${Date.now()}-${index}`,
              category: category as Expense['category'],
              description: description,
              amount: numAmount,
              month: numMonth,
              year: numYear
            };
            newExpenses.push(expense);
          }
        });
        
        // Ask user if they want to replace or merge data
        const shouldReplace = investments.length > 0 || expenses.length > 0 
          ? confirm('Do you want to REPLACE existing data (OK) or MERGE with existing data (Cancel)?')
          : true;
        
        if (shouldReplace) {
          setInvestments(newInvestments);
          setExpenses(newExpenses);
        } else {
          setInvestments(prev => [...prev, ...newInvestments]);
          setExpenses(prev => [...prev, ...newExpenses]);
        }
        
        alert(`Imported ${newInvestments.length} investments and ${newExpenses.length} expenses successfully!`);
      } catch (error) {
        console.error('Error importing CSV:', error);
        alert('Error importing CSV file. Please check the file format.');
      }
    };
    reader.readAsText(file);
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

  const getDefaultInvestments = () => {
    const defaults: Omit<Investment, 'id'>[] = [
      { type: 'TFSA', amount: 7000, month: 1, year: 2025, description: 'Annual TFSA contribution', isRecurring: true },
      { type: 'RESP', amount: 2500, month: 1, year: 2025, description: 'Annual RESP contribution', isRecurring: true },
      { type: 'RRSP', amount: 15000, month: 2, year: 2025, description: 'Annual RRSP contribution (post-tax filing)', isRecurring: true }
    ];

    const newInvestments = defaults.map(inv => ({
      ...inv,
      id: Date.now().toString() + Math.random()
    }));

    setInvestments(prev => [...prev, ...newInvestments]);
  };

  const filteredTimelineData = timelineData.filter(data => data.year === selectedYear);

  // Generate expanded investment list for summary (showing recurring investments for each year)
  const expandedInvestments = useMemo(() => {
    const expanded: (Investment & { displayYear: number })[] = [];
    
    investments.forEach(inv => {
      if (inv.isRecurring) {
        // Add the investment for each year from its start year to 2030
        for (let year = inv.year; year <= 2030; year++) {
          expanded.push({
            ...inv,
            displayYear: year,
            id: `${inv.id}-${year}` // Create unique ID for each year instance
          });
        }
      } else {
        // Non-recurring investments only appear once
        expanded.push({
          ...inv,
          displayYear: inv.year
        });
      }
    });
    
    // Sort by display year, then by month, then by description/type
    return expanded.sort((a, b) => {
      if (a.displayYear !== b.displayYear) return a.displayYear - b.displayYear;
      if (a.month !== b.month) return a.month - b.month;
      return (a.description || a.type).localeCompare(b.description || b.type);
    });
  }, [investments]);

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
      
      const yearExpenses = expenses.filter(exp => exp.year === year);
      
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

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Recurring Investment & Major Expenses Tracker 2025-2030</h1>
        <p className="text-gray-600 mb-6">
          Track your scheduled investments (TFSA, RESP, RRSP) and major expenses from 2025-2030. 
          Export your data and import it later to restore your planning.
        </p>

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
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
          >
            Add Investment
          </button>

          <button
            onClick={() => setShowAddExpense(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            Add Expense
          </button>

          {investments.length === 0 && (
            <button
              onClick={getDefaultInvestments}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm"
            >
              Add Default Investments
            </button>
          )}

          <div className="flex items-center gap-2 ml-4 border-l pl-4">
            <div className="flex items-center gap-2">
              <input
                type="file"
                id="file-import"
                accept=".json,.csv"
                onChange={handleFileImport}
                className="hidden"
              />
              <label
                htmlFor="file-import"
                className="px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 cursor-pointer text-sm"
              >
                Import File
              </label>
            </div>

            <button
              onClick={exportToCSV}
              className="px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
              disabled={investments.length === 0 && expenses.length === 0}
            >
              Export CSV
            </button>

            <button
              onClick={exportToJSON}
              className="px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
              disabled={investments.length === 0 && expenses.length === 0}
            >
              Export JSON
            </button>

            {(investments.length > 0 || expenses.length > 0) && (
              <button
                onClick={clearAllData}
                className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
              >
                Clear All
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Timeline View */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">{selectedYear} Timeline</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTimelineData.map((monthData) => (
            <div key={`${monthData.year}-${monthData.month}`} className="border rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">
                {MONTHS[monthData.month - 1]} {monthData.year}
              </h3>
              
              {monthData.investments.length > 0 && (
                <div className="mb-3">
                  <h4 className="text-sm font-medium text-green-700 mb-1">Investments</h4>
                  {monthData.investments.map((inv) => (
                    <div key={inv.id} className="text-xs text-gray-600 mb-1">
                      <span className="font-medium">{inv.description || inv.type}</span>: ${inv.amount.toLocaleString()}
                      {inv.isRecurring && <span className="text-purple-600 ml-1">(Recurring)</span>}
                    </div>
                  ))}
                </div>
              )}

              {monthData.expenses.length > 0 && (
                <div className="mb-3">
                  <h4 className="text-sm font-medium text-blue-700 mb-1">Expenses</h4>
                  {monthData.expenses.map((exp) => (
                    <div key={exp.id} className="text-xs text-gray-600 mb-1">
                      <span className="font-medium">{exp.description || exp.category}</span>: ${exp.amount.toLocaleString()}
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

      {/* Add/Edit Investment Modal */}
      {showAddInvestment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                <input
                  type="text"
                  value={newInvestment.description || ''}
                  onChange={(e) => setNewInvestment(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="e.g., Annual contribution"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="recurring"
                  checked={newInvestment.isRecurring || false}
                  onChange={(e) => setNewInvestment(prev => ({ ...prev, isRecurring: e.target.checked }))}
                  className="mr-2"
                />
                <label htmlFor="recurring" className="text-sm text-gray-700">
                  Recurring yearly
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={editingInvestment ? updateInvestment : addInvestment}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700"
              >
                {editingInvestment ? 'Update Investment' : 'Add Investment'}
              </button>
              <button
                onClick={cancelEdit}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
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
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
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
                  placeholder="e.g., New sofa, Kitchen renovation"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
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
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={editingExpense ? updateExpense : addExpense}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
              >
                {editingExpense ? 'Update Expense' : 'Add Expense'}
              </button>
              <button
                onClick={cancelEdit}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Yearly Totals */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Yearly Totals</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {years.map(year => (
            <div key={year} className="bg-gray-50 p-4 rounded-lg border">
              <h3 className="font-semibold text-gray-900 mb-3">{year}</h3>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-green-700">Investments:</span>
                  <span className="font-medium">${yearlyTotals[year]?.investments.toLocaleString() || '0'}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-blue-700">Expenses:</span>
                  <span className="font-medium">${yearlyTotals[year]?.expenses.toLocaleString() || '0'}</span>
                </div>
                
                <div className="flex justify-between border-t pt-2 font-semibold">
                  <span className="text-gray-900">Total:</span>
                  <span className="text-gray-900">${yearlyTotals[year]?.total.toLocaleString() || '0'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Grand Totals */}
        <div className="mt-6 bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border">
          <h3 className="font-semibold text-gray-900 mb-3">Grand Totals (2025-2030)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-700">
                ${Object.values(yearlyTotals).reduce((sum, year) => sum + year.investments, 0).toLocaleString()}
              </div>
              <div className="text-sm text-green-600">Total Investments</div>
            </div>
            
            <div>
              <div className="text-2xl font-bold text-blue-700">
                ${Object.values(yearlyTotals).reduce((sum, year) => sum + year.expenses, 0).toLocaleString()}
              </div>
              <div className="text-sm text-blue-600">Total Expenses</div>
            </div>
            
            <div>
              <div className="text-2xl font-bold text-gray-900">
                ${Object.values(yearlyTotals).reduce((sum, year) => sum + year.total, 0).toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Combined Total</div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="font-semibold text-green-800 mb-2">Investment Summary</h3>
          {expandedInvestments.length === 0 ? (
            <p className="text-green-600">No investments scheduled</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {expandedInvestments.map((inv) => {
                // Find the original investment for edit/delete actions
                const originalInv = investments.find(orig => orig.id === inv.id.split('-')[0]);
                return (
                  <div key={inv.id} className="flex justify-between items-center text-sm">
                    <span>
                      {inv.description || inv.type} ({MONTHS[inv.month - 1]} {inv.displayYear})
                      {inv.isRecurring && <span className="text-purple-600 ml-1 text-xs">(Recurring)</span>}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">${inv.amount.toLocaleString()}</span>
                      {originalInv && (
                        <>
                          <button
                            onClick={() => editInvestment(originalInv)}
                            className="text-blue-600 hover:text-blue-800 text-xs"
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => removeInvestment(originalInv.id)}
                            className="text-red-600 hover:text-red-800 text-xs"
                            title="Delete"
                          >
                            ×
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">Expense Summary</h3>
          {expenses.length === 0 ? (
            <p className="text-blue-600">No expenses planned</p>
          ) : (
            <div className="space-y-2">
              {expenses.map((exp) => (
                <div key={exp.id} className="flex justify-between items-center text-sm">
                  <span>{exp.description} - {MONTHS[exp.month - 1]} {exp.year}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">${exp.amount.toLocaleString()}</span>
                    <button
                      onClick={() => editExpense(exp)}
                      className="text-blue-600 hover:text-blue-800 text-xs"
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => removeExpense(exp.id)}
                      className="text-red-600 hover:text-red-800 text-xs"
                      title="Delete"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}