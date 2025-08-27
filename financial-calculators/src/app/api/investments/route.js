import { getAuthenticatedUser } from '../../../../lib/auth-helper.js';
import { investmentOps } from '../../../../lib/db-operations.js';

export async function GET(request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const investments = investmentOps.getByUserId(user.id);
    return Response.json(investments);
  } catch (error) {
    console.error('Get investments error:', error);
    return Response.json({ error: 'Failed to fetch investments' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const investment = await request.json();
    
    // Validate required fields
    if (!investment.type || !investment.amount || !investment.month || !investment.year) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = investmentOps.create(user.id, investment);
    const newInvestment = {
      id: result.lastInsertRowid,
      ...investment,
      created_at: new Date().toISOString()
    };

    return Response.json(newInvestment);
  } catch (error) {
    console.error('Create investment error:', error);
    return Response.json({ error: 'Failed to create investment' }, { status: 500 });
  }
}