import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { 
  getUserByEmail, 
  getAssetPortfolioById,
  createRegisteredAccount, 
  getRegisteredAccountsByPortfolioId,
  RegisteredAccountData 
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

    const data: RegisteredAccountData = await request.json();
    
    // Validate required fields
    if (!data.portfolioId || !data.accountType || data.currentBalance === undefined) {
      return NextResponse.json({ 
        error: 'Portfolio ID, account type, and balance are required' 
      }, { status: 400 });
    }

    // Verify portfolio ownership
    const portfolio = getAssetPortfolioById(data.portfolioId);
    if (!portfolio || portfolio.userId !== user.id) {
      return NextResponse.json({ error: 'Portfolio not found or access denied' }, { status: 404 });
    }

    const account = createRegisteredAccount(data);
    
    return NextResponse.json({ 
      success: true, 
      accountId: account.id,
      message: 'Registered account created successfully' 
    });

  } catch (error) {
    console.error('Error creating registered account:', error);
    return NextResponse.json({ 
      error: 'Failed to create registered account' 
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
    const accountType = url.searchParams.get('accountType');

    if (!portfolioId) {
      return NextResponse.json({ error: 'Portfolio ID is required' }, { status: 400 });
    }

    // Verify portfolio ownership
    const portfolio = getAssetPortfolioById(parseInt(portfolioId));
    if (!portfolio || portfolio.userId !== user.id) {
      return NextResponse.json({ error: 'Portfolio not found or access denied' }, { status: 404 });
    }

    const accounts = getRegisteredAccountsByPortfolioId(parseInt(portfolioId), accountType || undefined);
    
    return NextResponse.json({ 
      success: true, 
      accounts 
    });

  } catch (error) {
    console.error('Error fetching registered accounts:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch registered accounts' 
    }, { status: 500 });
  }
}