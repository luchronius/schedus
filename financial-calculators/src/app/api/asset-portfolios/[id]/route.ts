import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { 
  getUserByEmail, 
  getAssetPortfolioById, 
  updateAssetPortfolio, 
  deleteAssetPortfolio
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

    const portfolioId = parseInt(id);
    const portfolio = getAssetPortfolioById(portfolioId);
    
    if (!portfolio) {
      return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
    }

    // Verify ownership
    if (portfolio.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    return NextResponse.json({ 
      success: true, 
      portfolio 
    });

  } catch (error) {
    console.error('Error fetching asset portfolio:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch asset portfolio' 
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

    const portfolioId = parseInt(id);
    const portfolio = getAssetPortfolioById(portfolioId);
    
    if (!portfolio) {
      return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
    }

    // Verify ownership
    if (portfolio.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    
    // Validate required fields - portfolioName is optional for exchange rate updates
    if (!body.portfolioName && body.usdToCadRate === undefined) {
      return NextResponse.json({ error: 'Portfolio name or exchange rate is required' }, { status: 400 });
    }

    const data: any = {
      lastUpdated: new Date().toISOString().split('T')[0]
    };
    
    if (body.portfolioName) {
      data.portfolioName = body.portfolioName;
    }
    
    if (body.usdToCadRate !== undefined) {
      data.usdToCadRate = body.usdToCadRate;
    }

    const success = updateAssetPortfolio(portfolioId, data);
    
    if (success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Asset portfolio updated successfully' 
      });
    } else {
      return NextResponse.json({ 
        error: 'Failed to update asset portfolio' 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error updating asset portfolio:', error);
    return NextResponse.json({ 
      error: 'Failed to update asset portfolio' 
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

    const portfolioId = parseInt(id);
    const portfolio = getAssetPortfolioById(portfolioId);
    
    if (!portfolio) {
      return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
    }

    // Verify ownership
    if (portfolio.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const success = deleteAssetPortfolio(portfolioId);
    
    if (success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Asset portfolio deleted successfully' 
      });
    } else {
      return NextResponse.json({ 
        error: 'Failed to delete asset portfolio' 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error deleting asset portfolio:', error);
    return NextResponse.json({ 
      error: 'Failed to delete asset portfolio' 
    }, { status: 500 });
  }
}