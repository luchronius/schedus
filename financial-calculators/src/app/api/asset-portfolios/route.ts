import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getUserByEmail, createAssetPortfolio, getAssetPortfoliosByUserId, AssetPortfolioData } from '@/lib/database';

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

    const body = await request.json();
    const data: AssetPortfolioData = {
      userId: user.id,
      portfolioName: body.portfolioName,
      lastUpdated: new Date().toISOString().split('T')[0],
      usdToCadRate: body.usdToCadRate || 1.35
    };
    
    // Validate required fields
    if (!data.portfolioName) {
      return NextResponse.json({ error: 'Portfolio name is required' }, { status: 400 });
    }

    const portfolio = createAssetPortfolio(data);
    
    return NextResponse.json({ 
      success: true, 
      portfolioId: portfolio.id,
      message: 'Asset portfolio created successfully' 
    });

  } catch (error) {
    console.error('Error creating asset portfolio:', error);
    return NextResponse.json({ 
      error: 'Failed to create asset portfolio' 
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = getUserByEmail(session.user.email);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const portfolios = getAssetPortfoliosByUserId(user.id);
    
    return NextResponse.json({ 
      success: true, 
      portfolios 
    });

  } catch (error) {
    console.error('Error fetching asset portfolios:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch asset portfolios' 
    }, { status: 500 });
  }
}