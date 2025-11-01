import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { 
  getUserByEmail, 
  getUserExpenseById,
  updateUserExpense,
  deleteUserExpense,
  CreateExpenseParams
} from '@/lib/database';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = getUserByEmail(session.user.email);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const expenseId = parseInt(id);
    const expense = await request.json();
    
    // Validate required fields
    if (!expense.category || !expense.description || expense.amount === undefined || 
        expense.month === undefined || expense.year === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if expense exists and belongs to user
    const existingExpense = getUserExpenseById(expenseId);
    if (!existingExpense || existingExpense.user_id !== user.id) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    const updateData: Partial<CreateExpenseParams> = {
      category: expense.category,
      description: expense.description,
      amount: expense.amount,
      month: expense.month,
      year: expense.year
    };

    const success = updateUserExpense(expenseId, user.id, updateData);
    
    if (!success) {
      return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 });
    }

    // Return updated expense
    const updatedExpense = getUserExpenseById(expenseId);
    return NextResponse.json(updatedExpense);
  } catch (error) {
    console.error('Update expense error:', error);
    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = getUserByEmail(session.user.email);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const expenseId = parseInt(id);
    
    // Check if expense exists and belongs to user
    const existingExpense = getUserExpenseById(expenseId);
    if (!existingExpense || existingExpense.user_id !== user.id) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    const success = deleteUserExpense(expenseId, user.id);
    
    if (!success) {
      return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete expense error:', error);
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
  }
}