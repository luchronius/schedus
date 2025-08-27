import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { 
  getUserByEmail, 
  getAssetPortfolioById,
  createStock, 
  getStocksByPortfolioId,
  StockData 
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

    const data: StockData = await request.json();
    
    
    // Default null/undefined cost basis to 0
    if (data.costBasis === null || data.costBasis === undefined) {
      data.costBasis = 0;
    }
    
    // Validate required fields (ticker is optional, cost basis defaults to 0 if null)
    if (!data.portfolioId || !data.companyName?.trim() || 
        data.shares === undefined || 
        data.currentValue === undefined || !data.currency || data.isPrivate === undefined) {
      console.log('❌ Validation FAILED for stock creation');
      console.log('Failed checks:', {
        portfolioId: !data.portfolioId ? 'MISSING' : 'OK',
        companyName: !data.companyName?.trim() ? 'MISSING/EMPTY' : 'OK',
        ticker: !data.ticker?.trim() ? 'EMPTY (but optional)' : 'OK',
        shares: data.shares === undefined ? 'UNDEFINED' : 'OK',
        costBasis: `${data.costBasis} (auto-defaults to 0 if null)`,
        currentValue: data.currentValue === undefined ? 'UNDEFINED' : 'OK',
        currency: !data.currency ? 'MISSING' : 'OK',
        isPrivate: data.isPrivate === undefined ? 'UNDEFINED' : 'OK',
      });
      return NextResponse.json({ 
        error: 'Portfolio ID, company name, shares, current value, currency, and isPrivate are required' 
      }, { status: 400 });
    }
    console.log('✅ Basic validation passed');
    console.log('======================');

    // Verify portfolio ownership
    const portfolio = getAssetPortfolioById(data.portfolioId);
    if (!portfolio || portfolio.userId !== user.id) {
      return NextResponse.json({ error: 'Portfolio not found or access denied' }, { status: 404 });
    }

    // For public companies, exchangeName is required unless it's a private company
    if (!data.isPrivate && !data.exchangeName?.trim()) {
      return NextResponse.json({ 
        error: 'Exchange name is required for public companies' 
      }, { status: 400 });
    }

    const stock = createStock(data);
    
    return NextResponse.json({ 
      success: true, 
      stockId: stock.id,
      message: 'Stock created successfully' 
    });

  } catch (error) {
    console.error('Error creating stock:', error);
    return NextResponse.json({ 
      error: 'Failed to create stock' 
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

    const stocks = getStocksByPortfolioId(parseInt(portfolioId));
    
    return NextResponse.json({ 
      success: true, 
      stocks 
    });

  } catch (error) {
    console.error('Error fetching stocks:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch stocks' 
    }, { status: 500 });
  }
}