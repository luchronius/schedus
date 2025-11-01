import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { 
  getUserByEmail, 
  getUserExpensesByUserId, 
  createUserExpense,
  CreateExpenseParams
} from '@/lib/database';

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = getUserByEmail(session.user.email);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const expenses = getUserExpensesByUserId(user.id);
    return NextResponse.json(expenses);
  } catch (error) {
    console.error('Get expenses error:', error);
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = getUserByEmail(session.user.email);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const expense = await request.json();
    
    // Validate required fields
    if (!expense.category || !expense.description || expense.amount === undefined || 
        expense.month === undefined || expense.year === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const expenseParams: CreateExpenseParams = {
      user_id: user.id,
      category: expense.category,
      description: expense.description,
      amount: expense.amount,
      month: expense.month,
      year: expense.year
    };

    const newExpense = createUserExpense(expenseParams);
    return NextResponse.json(newExpense);
  } catch (error) {
    console.error('Create expense error:', error);
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
  }
}