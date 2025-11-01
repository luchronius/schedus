import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { 
  getUserByEmail, 
  getUserInvestmentById,
  updateUserInvestment,
  deleteUserInvestment,
  CreateInvestmentParams,
  UserInvestment
} from '@/lib/database';

// Transform database format to frontend format
function transformInvestmentFromDB(investment: UserInvestment) {
  return {
    id: investment.id,
    user_id: investment.user_id,
    type: investment.type,
    amount: investment.amount,
    month: investment.month,
    year: investment.year,
    description: investment.description,
    isRecurring: investment.is_recurring, // Transform snake_case to camelCase
    created_at: investment.created_at
  };
}

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

    const investmentId = parseInt(id);
    const investment = await request.json();
    
    // Validate required fields
    if (!investment.type || investment.amount === undefined || 
        investment.month === undefined || investment.year === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if investment exists and belongs to user
    const existingInvestment = getUserInvestmentById(investmentId);
    if (!existingInvestment || existingInvestment.user_id !== user.id) {
      return NextResponse.json({ error: 'Investment not found' }, { status: 404 });
    }

    const updateData: Partial<CreateInvestmentParams> = {
      type: investment.type,
      amount: investment.amount,
      month: investment.month,
      year: investment.year,
      description: investment.description || '',
      is_recurring: investment.isRecurring || false // Transform camelCase to snake_case
    };

    const success = updateUserInvestment(investmentId, user.id, updateData);
    
    if (!success) {
      return NextResponse.json({ error: 'Failed to update investment' }, { status: 500 });
    }

    // Return updated investment
    const updatedInvestment = getUserInvestmentById(investmentId);
    if (!updatedInvestment) {
      return NextResponse.json({ error: 'Investment not found' }, { status: 404 });
    }
    
    const transformedInvestment = transformInvestmentFromDB(updatedInvestment);
    return NextResponse.json(transformedInvestment);
  } catch (error) {
    console.error('Update investment error:', error);
    return NextResponse.json({ error: 'Failed to update investment' }, { status: 500 });
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

    const investmentId = parseInt(id);
    
    // Check if investment exists and belongs to user
    const existingInvestment = getUserInvestmentById(investmentId);
    if (!existingInvestment || existingInvestment.user_id !== user.id) {
      return NextResponse.json({ error: 'Investment not found' }, { status: 404 });
    }

    const success = deleteUserInvestment(investmentId, user.id);
    
    if (!success) {
      return NextResponse.json({ error: 'Failed to delete investment' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete investment error:', error);
    return NextResponse.json({ error: 'Failed to delete investment' }, { status: 500 });
  }
}