import { getAuthenticatedUser } from '../../../../../lib/auth-helper.js';
import { expenseOps } from '../../../../../lib/db-operations.js';

export async function PUT(request, { params }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const expense = await request.json();
    
    // Validate required fields
    if (!expense.category || !expense.description || !expense.amount || !expense.month || !expense.year) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = expenseOps.update(id, user.id, expense);
    
    if (result.changes === 0) {
      return Response.json({ error: 'Expense not found' }, { status: 404 });
    }

    return Response.json({ id, ...expense });
  } catch (error) {
    console.error('Update expense error:', error);
    return Response.json({ error: 'Failed to update expense' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const result = expenseOps.delete(id, user.id);
    
    if (result.changes === 0) {
      return Response.json({ error: 'Expense not found' }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Delete expense error:', error);
    return Response.json({ error: 'Failed to delete expense' }, { status: 500 });
  }
}