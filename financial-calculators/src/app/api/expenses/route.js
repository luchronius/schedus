import { getAuthenticatedUser } from '../../../../lib/auth-helper.js';
import { expenseOps } from '../../../../lib/db-operations.js';

export async function GET(request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const expenses = expenseOps.getByUserId(user.id);
    return Response.json(expenses);
  } catch (error) {
    console.error('Get expenses error:', error);
    return Response.json({ error: 'Failed to fetch expenses' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const expense = await request.json();
    
    // Validate required fields
    if (!expense.category || !expense.description || !expense.amount || !expense.month || !expense.year) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = expenseOps.create(user.id, expense);
    const newExpense = {
      id: result.lastInsertRowid,
      ...expense,
      created_at: new Date().toISOString()
    };

    return Response.json(newExpense);
  } catch (error) {
    console.error('Create expense error:', error);
    return Response.json({ error: 'Failed to create expense' }, { status: 500 });
  }
}