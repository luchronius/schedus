import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { 
  createMortgageSnapshot, 
  getMortgageSnapshotsByCalculationId,
  CreateMortgageSnapshotParams 
} from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      mortgageCalculationId,
      snapshotDate,
      remainingBalance,
      monthlyPayment,
      interestRate,
      nextPaymentDate,
      description
    }: CreateMortgageSnapshotParams = body;

    if (!mortgageCalculationId || !snapshotDate || remainingBalance === undefined || 
        !monthlyPayment || interestRate === undefined || !nextPaymentDate) {
      return NextResponse.json({ 
        error: 'Missing required fields' 
      }, { status: 400 });
    }

    const snapshot = createMortgageSnapshot({
      mortgageCalculationId,
      snapshotDate,
      remainingBalance,
      monthlyPayment,
      interestRate,
      nextPaymentDate,
      description
    });

    return NextResponse.json(snapshot);
  } catch (error) {
    console.error('Error creating mortgage snapshot:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const calculationId = searchParams.get('calculationId');

    if (!calculationId) {
      return NextResponse.json({ 
        error: 'Missing calculationId parameter' 
      }, { status: 400 });
    }

    const snapshots = getMortgageSnapshotsByCalculationId(parseInt(calculationId));
    return NextResponse.json(snapshots);
  } catch (error) {
    console.error('Error fetching mortgage snapshots:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}