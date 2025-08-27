import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { 
  createMortgageCalculation, 
  getMortgageCalculationsByUserId,
  CreateMortgageCalculationParams 
} from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const calculations = getMortgageCalculationsByUserId(parseInt(session.user.id));
    return NextResponse.json(calculations);
  } catch (error) {
    console.error('Error fetching mortgage calculations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      mortgageAmount, 
      annualRate, 
      monthlyPayment, 
      extraMonthlyPayment, 
      calculationName,
      mortgageStartDate,
      paymentDayOfMonth,
      preferredPaymentDay
    } = body;

    if (!mortgageAmount || !annualRate || !monthlyPayment) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const params: CreateMortgageCalculationParams = {
      userId: parseInt(session.user.id),
      mortgageAmount: parseFloat(mortgageAmount),
      annualRate: parseFloat(annualRate),
      monthlyPayment: parseFloat(monthlyPayment),
      extraMonthlyPayment: parseFloat(extraMonthlyPayment) || 0,
      calculationName: calculationName || null,
      mortgageStartDate: mortgageStartDate || null,
      paymentDayOfMonth: paymentDayOfMonth ? parseInt(paymentDayOfMonth) : null,
      preferredPaymentDay: preferredPaymentDay ? parseInt(preferredPaymentDay) : null
    };

    const calculation = createMortgageCalculation(params);
    return NextResponse.json(calculation, { status: 201 });
  } catch (error) {
    console.error('Error creating mortgage calculation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}