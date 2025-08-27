import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { 
  getUserByEmail, 
  getRealEstateAssetById,
  getAssetPortfolioById
} from '@/lib/database';

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

    const assetId = parseInt(id);
    const asset = getRealEstateAssetById(assetId);
    
    if (!asset) {
      return NextResponse.json({ error: 'Real estate asset not found' }, { status: 404 });
    }

    // Verify ownership through portfolio
    const portfolio = getAssetPortfolioById(asset.portfolioId);
    if (!portfolio || portfolio.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    // Update the real estate asset
    const updates: string[] = [];
    const values: (string | number)[] = [];
    
    if (body.propertyType !== undefined) {
      updates.push('propertyType = ?');
      values.push(body.propertyType);
    }
    if (body.address !== undefined) {
      updates.push('address = ?');
      values.push(body.address);
    }
    if (body.estimatedValue !== undefined) {
      updates.push('estimatedValue = ?');
      values.push(body.estimatedValue);
    }
    if (body.mortgageBalance !== undefined) {
      updates.push('mortgageBalance = ?');
      values.push(body.mortgageBalance);
    }
    if (body.monthlyPayment !== undefined) {
      updates.push('monthlyPayment = ?');
      values.push(body.monthlyPayment);
    }
    if (body.interestRate !== undefined) {
      updates.push('interestRate = ?');
      values.push(body.interestRate);
    }
    if (body.acquisitionDate !== undefined) {
      updates.push('acquisitionDate = ?');
      values.push(body.acquisitionDate);
    }
    if (body.notes !== undefined) {
      updates.push('notes = ?');
      values.push(body.notes);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    updates.push('updatedAt = CURRENT_TIMESTAMP');
    values.push(assetId);

    const { getRealEstateAssetById: _, getAssetPortfolioById: __, getUserByEmail: ___, ...db } = await import('@/lib/database');
    const stmt = db.default.prepare(`UPDATE real_estate_assets SET ${updates.join(', ')} WHERE id = ?`);
    const result = stmt.run(...values);

    if (result.changes > 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'Real estate asset updated successfully' 
      });
    } else {
      return NextResponse.json({ 
        error: 'Failed to update real estate asset' 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error updating real estate asset:', error);
    return NextResponse.json({ 
      error: 'Failed to update real estate asset' 
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

    const assetId = parseInt(id);
    const asset = getRealEstateAssetById(assetId);
    
    if (!asset) {
      return NextResponse.json({ error: 'Real estate asset not found' }, { status: 404 });
    }

    // Verify ownership through portfolio
    const portfolio = getAssetPortfolioById(asset.portfolioId);
    if (!portfolio || portfolio.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { getRealEstateAssetById: _, getAssetPortfolioById: __, getUserByEmail: ___, ...db } = await import('@/lib/database');
    const stmt = db.default.prepare('DELETE FROM real_estate_assets WHERE id = ?');
    const result = stmt.run(assetId);

    if (result.changes > 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'Real estate asset deleted successfully' 
      });
    } else {
      return NextResponse.json({ 
        error: 'Failed to delete real estate asset' 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error deleting real estate asset:', error);
    return NextResponse.json({ 
      error: 'Failed to delete real estate asset' 
    }, { status: 500 });
  }
}