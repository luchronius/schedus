import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { 
  getUserByEmail, 
  getUserInvestmentsByUserId, 
  createUserInvestment,
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

    const investments = getUserInvestmentsByUserId(user.id);
    const transformedInvestments = investments.map(transformInvestmentFromDB);
    return NextResponse.json(transformedInvestments);
  } catch (error) {
    console.error('Get investments error:', error);
    return NextResponse.json({ error: 'Failed to fetch investments' }, { status: 500 });
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

    const investment = await request.json();
    
    // Validate required fields
    if (!investment.type || investment.amount === undefined || 
        investment.month === undefined || investment.year === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const investmentParams: CreateInvestmentParams = {
      user_id: user.id,
      type: investment.type,
      amount: investment.amount,
      month: investment.month,
      year: investment.year,
      description: investment.description || '',
      is_recurring: investment.isRecurring || false // Transform camelCase to snake_case
    };

    const newInvestment = createUserInvestment(investmentParams);
    const transformedInvestment = transformInvestmentFromDB(newInvestment);
    return NextResponse.json(transformedInvestment);
  } catch (error) {
    console.error('Create investment error:', error);
    return NextResponse.json({ error: 'Failed to create investment' }, { status: 500 });
  }
}