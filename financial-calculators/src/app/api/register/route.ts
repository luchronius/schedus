import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { 
  getUserByEmail, 
  createUser, 
  createUserInvestment, 
  createUserExpense,
  CreateInvestmentParams,
  CreateExpenseParams
} from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, localStorageData } = await request.json();

    // Basic validation
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    // Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = createUser({
      email,
      hashedPassword,
      name: name || email.split('@')[0] // Use email prefix as default name
    });

    // Auto-migrate localStorage data if provided
    let migrationResults = { investments: 0, expenses: 0, errors: [] };

    if (localStorageData?.investments?.length > 0) {
      for (const investment of localStorageData.investments) {
        try {
          const investmentParams: CreateInvestmentParams = {
            user_id: user.id,
            type: investment.type,
            amount: investment.amount,
            month: investment.month,
            year: investment.year,
            description: investment.description || '',
            is_recurring: investment.isRecurring || false
          };
          createUserInvestment(investmentParams);
          migrationResults.investments++;
        } catch (error) {
          migrationResults.errors.push(`Investment: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    if (localStorageData?.expenses?.length > 0) {
      for (const expense of localStorageData.expenses) {
        try {
          const expenseParams: CreateExpenseParams = {
            user_id: user.id,
            category: expense.category,
            description: expense.description,
            amount: expense.amount,
            month: expense.month,
            year: expense.year
          };
          createUserExpense(expenseParams);
          migrationResults.expenses++;
        } catch (error) {
          migrationResults.errors.push(`Expense: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      userId: user.id,
      migrationResults
    });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
  }
}