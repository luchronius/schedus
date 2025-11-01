import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import {
  createRateAdjustment,
  getRateAdjustmentsByCalculationId,
  updateRateAdjustment,
  deleteRateAdjustment,
  getMortgageCalculationById,
  getRateAdjustmentById,
  CreateRateAdjustmentParams
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

    const calculation = getMortgageCalculationById(parseInt(calculationId, 10));
    if (!calculation || calculation.userId !== parseInt(session.user.id, 10)) {
      return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
    }

    const adjustments = getRateAdjustmentsByCalculationId(parseInt(calculationId, 10));
    return NextResponse.json(adjustments);
  } catch (error) {
    console.error('Error fetching rate adjustments:', error);
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
      effectiveDate,
      rateDelta,
      description
    } = body;

    if (!mortgageCalculationId || !effectiveDate || rateDelta === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const calculation = getMortgageCalculationById(parseInt(mortgageCalculationId, 10));
    if (!calculation || calculation.userId !== parseInt(session.user.id, 10)) {
      return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
    }

    const params: CreateRateAdjustmentParams = {
      mortgageCalculationId: parseInt(mortgageCalculationId, 10),
      effectiveDate,
      rateDelta: parseFloat(rateDelta),
      description: typeof description === 'string' && description.trim().length > 0 ? description : undefined
    };

    const adjustment = createRateAdjustment(params);
    return NextResponse.json(adjustment, { status: 201 });
  } catch (error) {
    console.error('Error creating rate adjustment:', error);
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
    const idParam = searchParams.get('id');

    if (!idParam) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const id = parseInt(idParam, 10);
    const existing = getRateAdjustmentById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const calculation = getMortgageCalculationById(existing.mortgageCalculationId);
    if (!calculation || calculation.userId !== parseInt(session.user.id, 10)) {
      return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
    }

    const body = await request.json();

    const updated = updateRateAdjustment(id, body);
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating rate adjustment:', error);
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
    const idParam = searchParams.get('id');

    if (!idParam) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const id = parseInt(idParam, 10);
    const existing = getRateAdjustmentById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const calculation = getMortgageCalculationById(existing.mortgageCalculationId);
    if (!calculation || calculation.userId !== parseInt(session.user.id, 10)) {
      return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
    }

    const success = deleteRateAdjustment(id);
    if (!success) {
      return NextResponse.json({ error: 'Failed to delete rate adjustment' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting rate adjustment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
