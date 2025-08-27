// Import from the consolidated database
import Database from 'better-sqlite3';
import { join } from 'path';

const dbPath = join(process.cwd(), 'data', 'financial-calculators.db');
const db = new Database(dbPath);

// User operations
export const userOps = {
  create: (email, name, passwordHash) => {
    const stmt = db.prepare(`
      INSERT INTO users (email, hashedPassword, name, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?)
    `);
    const now = new Date().toISOString();
    return stmt.run(email, passwordHash, name, now, now);
  },

  getByEmail: (email) => {
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    return stmt.get(email);
  },

  getById: (id) => {
    const stmt = db.prepare('SELECT id, email, name, createdAt FROM users WHERE id = ?');
    return stmt.get(id);
  }
};

// Investment operations
export const investmentOps = {
  create: (userId, investment) => {
    const stmt = db.prepare(`
      INSERT INTO user_investments (user_id, type, amount, month, year, description, is_recurring)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
      userId,
      investment.type,
      investment.amount,
      investment.month,
      investment.year,
      investment.description || '',
      investment.isRecurring ? 1 : 0
    );
  },

  getByUserId: (userId) => {
    const stmt = db.prepare(`
      SELECT id, type, amount, month, year, description, 
             is_recurring as isRecurring, created_at 
      FROM user_investments 
      WHERE user_id = ? 
      ORDER BY year, month
    `);
    return stmt.all(userId);
  },

  update: (id, userId, investment) => {
    const stmt = db.prepare(`
      UPDATE user_investments 
      SET type = ?, amount = ?, month = ?, year = ?, 
          description = ?, is_recurring = ?
      WHERE id = ? AND user_id = ?
    `);
    return stmt.run(
      investment.type,
      investment.amount,
      investment.month,
      investment.year,
      investment.description || '',
      investment.isRecurring ? 1 : 0,
      id,
      userId
    );
  },

  delete: (id, userId) => {
    const stmt = db.prepare('DELETE FROM user_investments WHERE id = ? AND user_id = ?');
    return stmt.run(id, userId);
  }
};

// Expense operations
export const expenseOps = {
  create: (userId, expense) => {
    const stmt = db.prepare(`
      INSERT INTO user_expenses (user_id, category, description, amount, month, year)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
      userId,
      expense.category,
      expense.description,
      expense.amount,
      expense.month,
      expense.year
    );
  },

  getByUserId: (userId) => {
    const stmt = db.prepare(`
      SELECT id, category, description, amount, month, year, created_at
      FROM user_expenses 
      WHERE user_id = ? 
      ORDER BY year, month
    `);
    return stmt.all(userId);
  },

  update: (id, userId, expense) => {
    const stmt = db.prepare(`
      UPDATE user_expenses 
      SET category = ?, description = ?, amount = ?, month = ?, year = ?
      WHERE id = ? AND user_id = ?
    `);
    return stmt.run(
      expense.category,
      expense.description,
      expense.amount,
      expense.month,
      expense.year,
      id,
      userId
    );
  },

  delete: (id, userId) => {
    const stmt = db.prepare('DELETE FROM user_expenses WHERE id = ? AND user_id = ?');
    return stmt.run(id, userId);
  }
};

// RESP scenario operations (optional)
export const respScenarioOps = {
  create: (userId, name, scenarioData, isDefault = false) => {
    const stmt = db.prepare(`
      INSERT INTO resp_scenarios (user_id, name, scenario_data, is_default)
      VALUES (?, ?, ?, ?)
    `);
    return stmt.run(userId, name, JSON.stringify(scenarioData), isDefault ? 1 : 0);
  },

  getByUserId: (userId) => {
    const stmt = db.prepare(`
      SELECT id, name, scenario_data, is_default, created_at
      FROM resp_scenarios 
      WHERE user_id = ? 
      ORDER BY is_default DESC, created_at DESC
    `);
    const scenarios = stmt.all(userId);
    // Parse JSON data
    return scenarios.map(scenario => ({
      ...scenario,
      scenario_data: JSON.parse(scenario.scenario_data),
      is_default: Boolean(scenario.is_default)
    }));
  },

  update: (id, userId, name, scenarioData) => {
    const stmt = db.prepare(`
      UPDATE resp_scenarios 
      SET name = ?, scenario_data = ?
      WHERE id = ? AND user_id = ?
    `);
    return stmt.run(name, JSON.stringify(scenarioData), id, userId);
  },

  delete: (id, userId) => {
    const stmt = db.prepare('DELETE FROM resp_scenarios WHERE id = ? AND user_id = ?');
    return stmt.run(id, userId);
  }
};