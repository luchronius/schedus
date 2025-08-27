import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { 
  getUserByEmail, 
  getAssetPortfolioById,
  createAssetSnapshot, 
  getAssetSnapshotsByPortfolioId,
  AssetSnapshotData 
} from '@/lib/database';

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

    const data: AssetSnapshotData = await request.json();
    
    // Validate required fields
    if (!data.portfolioId || !data.snapshotDate || !data.snapshotName) {
      return NextResponse.json({ 
        error: 'Portfolio ID, snapshot date, and snapshot name are required' 
      }, { status: 400 });
    }

    // Validate financial summary fields
    const requiredFinancialFields = [
      'totalRealEstate', 'totalMortgageDebt', 'netRealEstate', 'totalCash',
      'totalRRSP', 'totalTFSA', 'totalFHSA', 'totalRESP', 'totalRegistered',
      'totalStocks', 'totalAssets', 'totalDebt', 'netWorth'
    ];
    
    const missingFields = requiredFinancialFields.filter(field => data[field] === undefined);
    if (missingFields.length > 0) {
      return NextResponse.json({ 
        error: `Missing required financial fields: ${missingFields.join(', ')}` 
      }, { status: 400 });
    }

    // Verify portfolio ownership
    const portfolio = getAssetPortfolioById(data.portfolioId);
    if (!portfolio || portfolio.userId !== user.id) {
      return NextResponse.json({ error: 'Portfolio not found or access denied' }, { status: 404 });
    }

    const snapshot = createAssetSnapshot(data);
    
    return NextResponse.json({ 
      success: true, 
      snapshotId: snapshot.id,
      message: 'Asset snapshot created successfully' 
    });

  } catch (error) {
    console.error('Error creating asset snapshot:', error);
    return NextResponse.json({ 
      error: 'Failed to create asset snapshot' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = getUserByEmail(session.user.email);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const url = new URL(request.url);
    const portfolioId = url.searchParams.get('portfolioId');

    if (!portfolioId) {
      return NextResponse.json({ error: 'Portfolio ID is required' }, { status: 400 });
    }

    // Verify portfolio ownership
    const portfolio = getAssetPortfolioById(parseInt(portfolioId));
    if (!portfolio || portfolio.userId !== user.id) {
      return NextResponse.json({ error: 'Portfolio not found or access denied' }, { status: 404 });
    }

    const snapshots = getAssetSnapshotsByPortfolioId(parseInt(portfolioId));
    
    return NextResponse.json({ 
      success: true, 
      snapshots 
    });

  } catch (error) {
    console.error('Error fetching asset snapshots:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch asset snapshots' 
    }, { status: 500 });
  }
}