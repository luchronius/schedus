import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { 
  createLumpSumPayment, 
  getLumpSumPaymentsByCalculationId,
  updateLumpSumPayment,
  deleteLumpSumPayment,
  getMortgageCalculationById,
  CreateLumpSumPaymentParams 
} from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const calculationId = searchParams.get('calculationId');

    if (!calculationId) {
      return NextResponse.json({ error: 'Missing calculationId' }, { status: 400 });
    }

    // Verify ownership
    const calculation = getMortgageCalculationById(parseInt(calculationId));
    if (!calculation || calculation.userId !== parseInt(session.user.id)) {
      return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
    }

    const lumpSums = getLumpSumPaymentsByCalculationId(parseInt(calculationId));
    return NextResponse.json(lumpSums);
  } catch (error) {
    console.error('Error fetching lump sum payments:', error);
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
      mortgageCalculationId, 
      amount, 
      year, 
      month, 
      plannedDate,
      description, 
      isPaid, 
      actualPaidDate,
      interestSaved,
      timeSaved 
    } = body;

    if (!mortgageCalculationId || !amount || year === undefined || !month) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify ownership
    const calculation = getMortgageCalculationById(parseInt(mortgageCalculationId));
    if (!calculation || calculation.userId !== parseInt(session.user.id)) {
      return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
    }

    const params: CreateLumpSumPaymentParams = {
      mortgageCalculationId: parseInt(mortgageCalculationId),
      amount: parseFloat(amount),
      year: parseInt(year),
      month: parseInt(month),
      plannedDate: plannedDate || null,
      description: description || null,
      isPaid: Boolean(isPaid),
      actualPaidDate: actualPaidDate || null,
      interestSaved: interestSaved ? parseFloat(interestSaved) : null,
      timeSaved: timeSaved ? parseInt(timeSaved) : null
    };

    const lumpSum = createLumpSumPayment(params);
    return NextResponse.json(lumpSum, { status: 201 });
  } catch (error) {
    console.error('Error creating lump sum payment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const body = await request.json();
    
    // Verify ownership through calculation
    const lumpSum = await getLumpSumPaymentsByCalculationId(parseInt(id));
    if (!lumpSum) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const updatedLumpSum = updateLumpSumPayment(parseInt(id), body);
    return NextResponse.json(updatedLumpSum);
  } catch (error) {
    console.error('Error updating lump sum payment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const success = deleteLumpSumPayment(parseInt(id));
    
    if (!success) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting lump sum payment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}