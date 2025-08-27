import { getAuthenticatedUser } from '../../../../../lib/auth-helper.js';
import { investmentOps } from '../../../../../lib/db-operations.js';

export async function PUT(request, { params }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const investment = await request.json();
    
    // Validate required fields
    if (!investment.type || !investment.amount || !investment.month || !investment.year) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = investmentOps.update(id, user.id, investment);
    
    if (result.changes === 0) {
      return Response.json({ error: 'Investment not found' }, { status: 404 });
    }

    return Response.json({ id, ...investment });
  } catch (error) {
    console.error('Update investment error:', error);
    return Response.json({ error: 'Failed to update investment' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const result = investmentOps.delete(id, user.id);
    
    if (result.changes === 0) {
      return Response.json({ error: 'Investment not found' }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Delete investment error:', error);
    return Response.json({ error: 'Failed to delete investment' }, { status: 500 });
  }
}