import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { 
  getUserByEmail, 
  getStockById,
  getAssetPortfolioById,
  StockData 
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

    const stockId = parseInt(id);
    const stock = getStockById(stockId);
    
    if (!stock) {
      return NextResponse.json({ error: 'Stock not found' }, { status: 404 });
    }

    // Verify ownership through portfolio
    const portfolio = getAssetPortfolioById(stock.portfolioId);
    if (!portfolio || portfolio.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    
    // Validate isPrivate field if provided
    if (body.isPrivate !== undefined && typeof body.isPrivate !== 'boolean') {
      return NextResponse.json({ error: 'isPrivate must be a boolean' }, { status: 400 });
    }

    // Validate that public companies have exchange name
    if (body.isPrivate === false && !body.exchangeName && !stock.exchangeName) {
      return NextResponse.json({ 
        error: 'Exchange name is required for public companies' 
      }, { status: 400 });
    }

    // Update the stock
    const updates: string[] = [];
    const values: (string | number)[] = [];
    
    if (body.companyName !== undefined) {
      updates.push('companyName = ?');
      values.push(body.companyName);
    }
    if (body.ticker !== undefined) {
      updates.push('ticker = ?');
      values.push(body.ticker);
    }
    if (body.shares !== undefined) {
      updates.push('shares = ?');
      values.push(body.shares);
    }
    if (body.costBasis !== undefined) {
      updates.push('costBasis = ?');
      values.push(body.costBasis);
    }
    if (body.currentValue !== undefined) {
      updates.push('currentValue = ?');
      values.push(body.currentValue);
    }
    if (body.currency !== undefined) {
      updates.push('currency = ?');
      values.push(body.currency);
    }
    if (body.isPrivate !== undefined) {
      updates.push('isPrivate = ?');
      values.push(body.isPrivate ? 1 : 0);
    }
    if (body.exchangeName !== undefined) {
      updates.push('exchangeName = ?');
      values.push(body.exchangeName);
    }
    if (body.industry !== undefined) {
      updates.push('industry = ?');
      values.push(body.industry);
    }
    if (body.notes !== undefined) {
      updates.push('notes = ?');
      values.push(body.notes);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    updates.push('updatedAt = CURRENT_TIMESTAMP');
    values.push(stockId);

    const { getStockById: _, getAssetPortfolioById: __, getUserByEmail: ___, ...db } = await import('@/lib/database');
    const stmt = db.default.prepare(`UPDATE stocks SET ${updates.join(', ')} WHERE id = ?`);
    const result = stmt.run(...values);

    if (result.changes > 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'Stock updated successfully' 
      });
    } else {
      return NextResponse.json({ 
        error: 'Failed to update stock' 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error updating stock:', error);
    return NextResponse.json({ 
      error: 'Failed to update stock' 
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

    const stockId = parseInt(id);
    const stock = getStockById(stockId);
    
    if (!stock) {
      return NextResponse.json({ error: 'Stock not found' }, { status: 404 });
    }

    // Verify ownership through portfolio
    const portfolio = getAssetPortfolioById(stock.portfolioId);
    if (!portfolio || portfolio.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { getStockById: _, getAssetPortfolioById: __, getUserByEmail: ___, ...db } = await import('@/lib/database');
    const stmt = db.default.prepare('DELETE FROM stocks WHERE id = ?');
    const result = stmt.run(stockId);

    if (result.changes > 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'Stock deleted successfully' 
      });
    } else {
      return NextResponse.json({ 
        error: 'Failed to delete stock' 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error deleting stock:', error);
    return NextResponse.json({ 
      error: 'Failed to delete stock' 
    }, { status: 500 });
  }
}