import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { 
  createMortgageSettings, 
  getMortgageSettingsByCalculationId,
  CreateMortgageSettingsParams 
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
      paymentDayOfMonth,
      preferredPaymentDay,
      startDate,
      originalPrincipal,
      originalTerm
    }: CreateMortgageSettingsParams = body;

    if (!mortgageCalculationId || !paymentDayOfMonth || !startDate || 
        originalPrincipal === undefined || !originalTerm) {
      return NextResponse.json({ 
        error: 'Missing required fields' 
      }, { status: 400 });
    }

    // Validate payment day (1-28 for safety, with preferred for month-end)
    if (paymentDayOfMonth < 1 || paymentDayOfMonth > 28) {
      return NextResponse.json({ 
        error: 'Payment day must be between 1-28' 
      }, { status: 400 });
    }

    if (preferredPaymentDay && (preferredPaymentDay < 29 || preferredPaymentDay > 31)) {
      return NextResponse.json({ 
        error: 'Preferred payment day must be between 29-31' 
      }, { status: 400 });
    }

    const settings = createMortgageSettings({
      mortgageCalculationId,
      paymentDayOfMonth,
      preferredPaymentDay,
      startDate,
      originalPrincipal,
      originalTerm
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error creating mortgage settings:', error);
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

    const settings = getMortgageSettingsByCalculationId(parseInt(calculationId));
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching mortgage settings:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}