import bcrypt from 'bcryptjs';
import { userOps, investmentOps, expenseOps } from '../../../../lib/db-operations.js';

export async function POST(request) {
  try {
    const { email, password, name, localStorageData } = await request.json();

    // Basic validation
    if (!email || !password) {
      return Response.json({ error: 'Email and password are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return Response.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = userOps.getByEmail(email);
    if (existingUser) {
      return Response.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    // Hash password and create user
    const hashedPassword = bcrypt.hashSync(password, 12);
    const result = userOps.create(email, name || null, hashedPassword);
    const userId = result.lastInsertRowid;

    // Auto-migrate localStorage data if provided
    let migrationResults = { investments: 0, expenses: 0, errors: [] };

    if (localStorageData?.investments?.length > 0) {
      for (const investment of localStorageData.investments) {
        try {
          investmentOps.create(userId, investment);
          migrationResults.investments++;
        } catch (error) {
          migrationResults.errors.push(`Investment: ${error.message}`);
        }
      }
    }

    if (localStorageData?.expenses?.length > 0) {
      for (const expense of localStorageData.expenses) {
        try {
          expenseOps.create(userId, expense);
          migrationResults.expenses++;
        } catch (error) {
          migrationResults.errors.push(`Expense: ${error.message}`);
        }
      }
    }

    return Response.json({ 
      success: true, 
      userId,
      migrationResults
    });

  } catch (error) {
    console.error('Registration error:', error);
    return Response.json({ error: 'Failed to create account' }, { status: 500 });
  }
}