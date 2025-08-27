import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { 
  getUserByEmail, 
  getBankAccountById,
  getAssetPortfolioById,
  BankAccountData 
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

    const accountId = parseInt(id);
    const account = getBankAccountById(accountId);
    
    if (!account) {
      return NextResponse.json({ error: 'Bank account not found' }, { status: 404 });
    }

    // Verify ownership through portfolio
    const portfolio = getAssetPortfolioById(account.portfolioId);
    if (!portfolio || portfolio.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    
    // Validate required fields
    if (body.accountType && !['chequing', 'savings', 'high_interest_savings'].includes(body.accountType)) {
      return NextResponse.json({ error: 'Invalid account type' }, { status: 400 });
    }

    // Update the bank account
    const updates: string[] = [];
    const values: (string | number)[] = [];
    
    if (body.accountType !== undefined) {
      updates.push('accountType = ?');
      values.push(body.accountType);
    }
    if (body.institutionName !== undefined) {
      updates.push('institutionName = ?');
      values.push(body.institutionName);
    }
    if (body.accountName !== undefined) {
      updates.push('accountName = ?');
      values.push(body.accountName);
    }
    if (body.currentBalance !== undefined) {
      updates.push('currentBalance = ?');
      values.push(body.currentBalance);
    }
    if (body.currency !== undefined) {
      updates.push('currency = ?');
      values.push(body.currency);
    }
    if (body.interestRate !== undefined) {
      updates.push('interestRate = ?');
      values.push(body.interestRate);
    }
    if (body.notes !== undefined) {
      updates.push('notes = ?');
      values.push(body.notes);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    updates.push('updatedAt = CURRENT_TIMESTAMP');
    values.push(accountId);

    const { getBankAccountById: _, getAssetPortfolioById: __, getUserByEmail: ___, ...db } = await import('@/lib/database');
    const stmt = db.default.prepare(`UPDATE bank_accounts SET ${updates.join(', ')} WHERE id = ?`);
    const result = stmt.run(...values);

    if (result.changes > 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'Bank account updated successfully' 
      });
    } else {
      return NextResponse.json({ 
        error: 'Failed to update bank account' 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error updating bank account:', error);
    return NextResponse.json({ 
      error: 'Failed to update bank account' 
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

    const accountId = parseInt(id);
    const account = getBankAccountById(accountId);
    
    if (!account) {
      return NextResponse.json({ error: 'Bank account not found' }, { status: 404 });
    }

    // Verify ownership through portfolio
    const portfolio = getAssetPortfolioById(account.portfolioId);
    if (!portfolio || portfolio.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { getBankAccountById: _, getAssetPortfolioById: __, getUserByEmail: ___, ...db } = await import('@/lib/database');
    const stmt = db.default.prepare('DELETE FROM bank_accounts WHERE id = ?');
    const result = stmt.run(accountId);

    if (result.changes > 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'Bank account deleted successfully' 
      });
    } else {
      return NextResponse.json({ 
        error: 'Failed to delete bank account' 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error deleting bank account:', error);
    return NextResponse.json({ 
      error: 'Failed to delete bank account' 
    }, { status: 500 });
  }
}