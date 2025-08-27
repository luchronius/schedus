import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { 
  createMortgagePayment, 
  getMortgagePaymentsByCalculationId,
  CreateMortgagePaymentParams 
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
      paymentDate,
      scheduledAmount,
      actualAmount,
      principalAmount,
      interestAmount,
      remainingBalance,
      paymentType,
      description,
      isPaid
    }: CreateMortgagePaymentParams = body;

    if (!mortgageCalculationId || !paymentDate || scheduledAmount === undefined || 
        remainingBalance === undefined) {
      return NextResponse.json({ 
        error: 'Missing required fields' 
      }, { status: 400 });
    }

    const payment = createMortgagePayment({
      mortgageCalculationId,
      paymentDate,
      scheduledAmount,
      actualAmount,
      principalAmount,
      interestAmount,
      remainingBalance,
      paymentType,
      description,
      isPaid
    });

    return NextResponse.json(payment);
  } catch (error) {
    console.error('Error creating mortgage payment:', error);
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

    const payments = getMortgagePaymentsByCalculationId(parseInt(calculationId));
    return NextResponse.json(payments);
  } catch (error) {
    console.error('Error fetching mortgage payments:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}