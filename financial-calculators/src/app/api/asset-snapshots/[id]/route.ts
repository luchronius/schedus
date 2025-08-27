import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { 
  getUserByEmail, 
  getAssetSnapshotById,
  getAssetPortfolioById,
  updateAssetSnapshot, 
  deleteAssetSnapshot,
  AssetSnapshotData 
} from '@/lib/database';

export async function GET(
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

    const snapshotId = parseInt(id);
    const snapshot = getAssetSnapshotById(snapshotId);
    
    if (!snapshot) {
      return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 });
    }

    // Verify ownership through portfolio
    const portfolio = getAssetPortfolioById(snapshot.portfolioId);
    if (!portfolio || portfolio.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    return NextResponse.json({ 
      success: true, 
      snapshot 
    });

  } catch (error) {
    console.error('Error fetching asset snapshot:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch asset snapshot' 
    }, { status: 500 });
  }
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

    const snapshotId = parseInt(id);
    const snapshot = getAssetSnapshotById(snapshotId);
    
    if (!snapshot) {
      return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 });
    }

    // Verify ownership through portfolio
    const portfolio = getAssetPortfolioById(snapshot.portfolioId);
    if (!portfolio || portfolio.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    
    // Validate required fields if updating core data
    if (body.snapshotName !== undefined && !body.snapshotName) {
      return NextResponse.json({ error: 'Snapshot name cannot be empty' }, { status: 400 });
    }

    const data: Partial<AssetSnapshotData> = {
      snapshotName: body.snapshotName,
      snapshotDate: body.snapshotDate,
      totalRealEstate: body.totalRealEstate,
      totalMortgageDebt: body.totalMortgageDebt,
      netRealEstate: body.netRealEstate,
      totalCash: body.totalCash,
      totalRRSP: body.totalRRSP,
      totalTFSA: body.totalTFSA,
      totalFHSA: body.totalFHSA,
      totalRESP: body.totalRESP,
      totalRegistered: body.totalRegistered,
      totalAssets: body.totalAssets,
      totalDebt: body.totalDebt,
      netWorth: body.netWorth,
      notes: body.notes
    };

    const success = updateAssetSnapshot(snapshotId, data);
    
    if (success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Asset snapshot updated successfully' 
      });
    } else {
      return NextResponse.json({ 
        error: 'Failed to update asset snapshot' 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error updating asset snapshot:', error);
    return NextResponse.json({ 
      error: 'Failed to update asset snapshot' 
    }, { status: 500 });
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

    const snapshotId = parseInt(id);
    const snapshot = getAssetSnapshotById(snapshotId);
    
    if (!snapshot) {
      return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 });
    }

    // Verify ownership through portfolio
    const portfolio = getAssetPortfolioById(snapshot.portfolioId);
    if (!portfolio || portfolio.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const success = deleteAssetSnapshot(snapshotId);
    
    if (success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Asset snapshot deleted successfully' 
      });
    } else {
      return NextResponse.json({ 
        error: 'Failed to delete asset snapshot' 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error deleting asset snapshot:', error);
    return NextResponse.json({ 
      error: 'Failed to delete asset snapshot' 
    }, { status: 500 });
  }
}