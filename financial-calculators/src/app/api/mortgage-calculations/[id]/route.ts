import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { 
  getMortgageCalculationById,
  deleteMortgageCalculation 
} from '@/lib/database';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const calculationId = parseInt(id);
    if (isNaN(calculationId)) {
      return NextResponse.json({ error: 'Invalid calculation ID' }, { status: 400 });
    }

    // Verify the calculation exists and belongs to the user
    const calculation = getMortgageCalculationById(calculationId);
    if (!calculation) {
      return NextResponse.json({ error: 'Calculation not found' }, { status: 404 });
    }

    if (calculation.userId !== parseInt(session.user.id)) {
      return NextResponse.json({ error: 'Unauthorized to delete this calculation' }, { status: 403 });
    }

    // Delete the calculation (CASCADE will handle related data)
    const success = deleteMortgageCalculation(calculationId);
    
    if (success) {
      return NextResponse.json({ message: 'Calculation deleted successfully' });
    } else {
      return NextResponse.json({ error: 'Failed to delete calculation' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error deleting mortgage calculation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}