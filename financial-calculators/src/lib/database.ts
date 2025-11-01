import Database from 'better-sqlite3';
import { join } from 'path';

const dbPath = join(process.cwd(), 'data', 'financial-calculators.db');
const db = new Database(dbPath);

// Initialize database tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    hashedPassword TEXT NOT NULL,
    name TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS mortgage_calculations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    mortgageAmount REAL NOT NULL,
    annualRate REAL NOT NULL,
    monthlyPayment REAL NOT NULL,
    extraMonthlyPayment REAL DEFAULT 0,
    calculationName TEXT,
    mortgageStartDate DATE,
    paymentDayOfMonth INTEGER DEFAULT 1,
    preferredPaymentDay INTEGER,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS lump_sum_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mortgageCalculationId INTEGER NOT NULL,
    amount REAL NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL DEFAULT 1,
    plannedDate DATE,
    description TEXT,
    isPaid BOOLEAN DEFAULT FALSE,
    actualPaidDate DATE,
    interestSaved REAL,
    timeSaved INTEGER, -- in months
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (mortgageCalculationId) REFERENCES mortgage_calculations (id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS rate_adjustments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mortgageCalculationId INTEGER NOT NULL,
    effectiveDate DATE NOT NULL,
    rateDelta REAL NOT NULL,
    description TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (mortgageCalculationId) REFERENCES mortgage_calculations (id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_rate_adjustments_calc ON rate_adjustments (mortgageCalculationId);

  -- New tables for mortgage tracking
  CREATE TABLE IF NOT EXISTS mortgage_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mortgageCalculationId INTEGER NOT NULL,
    snapshotDate DATE NOT NULL,
    remainingBalance REAL NOT NULL,
    monthlyPayment REAL NOT NULL,
    interestRate REAL NOT NULL,
    nextPaymentDate DATE NOT NULL,
    description TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (mortgageCalculationId) REFERENCES mortgage_calculations (id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS mortgage_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mortgageCalculationId INTEGER NOT NULL,
    paymentDate DATE NOT NULL,
    scheduledAmount REAL NOT NULL,
    actualAmount REAL,
    principalAmount REAL,
    interestAmount REAL,
    remainingBalance REAL NOT NULL,
    paymentType TEXT DEFAULT 'regular', -- 'regular', 'lump_sum', 'extra'
    description TEXT,
    isPaid BOOLEAN DEFAULT FALSE,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (mortgageCalculationId) REFERENCES mortgage_calculations (id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS mortgage_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mortgageCalculationId INTEGER NOT NULL,
    paymentDayOfMonth INTEGER NOT NULL, -- 1-28 for safety across all months
    preferredPaymentDay INTEGER, -- 29-31 if user wants end of month
    startDate DATE NOT NULL,
    originalPrincipal REAL NOT NULL,
    originalTerm INTEGER NOT NULL, -- in months
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (mortgageCalculationId) REFERENCES mortgage_calculations (id) ON DELETE CASCADE
  );

  -- Asset Tracking Tables
  CREATE TABLE IF NOT EXISTS asset_portfolios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    portfolioName TEXT NOT NULL,
    lastUpdated DATE NOT NULL,
    usdToCadRate REAL DEFAULT 1.35,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS real_estate_assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    portfolioId INTEGER NOT NULL,
    propertyType TEXT NOT NULL CHECK (propertyType IN ('primary_residence', 'investment_property', 'vacation_home', 'commercial')),
    address TEXT NOT NULL,
    estimatedValue REAL NOT NULL,
    mortgageBalance REAL DEFAULT 0,
    monthlyPayment REAL,
    interestRate REAL,
    acquisitionDate DATE,
    notes TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (portfolioId) REFERENCES asset_portfolios (id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS bank_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    portfolioId INTEGER NOT NULL,
    accountType TEXT NOT NULL CHECK (accountType IN ('chequing', 'savings', 'high_interest_savings')),
    institutionName TEXT NOT NULL,
    accountName TEXT,
    currentBalance REAL NOT NULL,
    currency TEXT DEFAULT 'CAD' CHECK (currency IN ('CAD', 'USD')),
    interestRate REAL,
    notes TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (portfolioId) REFERENCES asset_portfolios (id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS registered_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    portfolioId INTEGER NOT NULL,
    accountType TEXT NOT NULL CHECK (accountType IN ('rrsp', 'tfsa', 'fhsa', 'resp')),
    institutionName TEXT NOT NULL,
    accountName TEXT,
    currentBalance REAL NOT NULL,
    contributionRoom REAL,
    yearlyContribution REAL,
    beneficiary TEXT, -- For RESP accounts
    notes TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (portfolioId) REFERENCES asset_portfolios (id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS stocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    portfolioId INTEGER NOT NULL,
    companyName TEXT NOT NULL,
    ticker TEXT NOT NULL,
    shares REAL NOT NULL,
    costBasis REAL NOT NULL, -- Cost basis per share
    currentValue REAL NOT NULL, -- Current price per share
    currency TEXT DEFAULT 'CAD' CHECK (currency IN ('CAD', 'USD')),
    isPrivate BOOLEAN DEFAULT FALSE,
    exchangeName TEXT,
    industry TEXT,
    notes TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (portfolioId) REFERENCES asset_portfolios (id) ON DELETE CASCADE
  );

  -- Asset Portfolio Snapshots Table
  CREATE TABLE IF NOT EXISTS asset_portfolio_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    portfolioId INTEGER NOT NULL,
    snapshotDate DATE NOT NULL,
    snapshotName TEXT NOT NULL,
    totalRealEstate REAL NOT NULL DEFAULT 0,
    totalMortgageDebt REAL NOT NULL DEFAULT 0,
    netRealEstate REAL NOT NULL DEFAULT 0,
    totalCash REAL NOT NULL DEFAULT 0,
    totalRRSP REAL NOT NULL DEFAULT 0,
    totalTFSA REAL NOT NULL DEFAULT 0,
    totalFHSA REAL NOT NULL DEFAULT 0,
    totalRESP REAL NOT NULL DEFAULT 0,
    totalRegistered REAL NOT NULL DEFAULT 0,
    totalStocks REAL NOT NULL DEFAULT 0,
    totalAssets REAL NOT NULL DEFAULT 0,
    totalDebt REAL NOT NULL DEFAULT 0,
    netWorth REAL NOT NULL DEFAULT 0,
    notes TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (portfolioId) REFERENCES asset_portfolios (id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
  CREATE INDEX IF NOT EXISTS idx_mortgage_calculations_user ON mortgage_calculations (userId);
  CREATE INDEX IF NOT EXISTS idx_lump_sum_payments_calculation ON lump_sum_payments (mortgageCalculationId);
  CREATE INDEX IF NOT EXISTS idx_asset_portfolios_user ON asset_portfolios (userId);
  CREATE INDEX IF NOT EXISTS idx_real_estate_portfolio ON real_estate_assets (portfolioId);
  CREATE INDEX IF NOT EXISTS idx_bank_accounts_portfolio ON bank_accounts (portfolioId);
  CREATE INDEX IF NOT EXISTS idx_registered_accounts_portfolio ON registered_accounts (portfolioId);
  CREATE INDEX IF NOT EXISTS idx_stocks_portfolio ON stocks (portfolioId);
  CREATE INDEX IF NOT EXISTS idx_asset_snapshots_portfolio ON asset_portfolio_snapshots (portfolioId);
  CREATE INDEX IF NOT EXISTS idx_asset_snapshots_date ON asset_portfolio_snapshots (snapshotDate);
`);

// Migration: Add new columns to existing tables if they don't exist
try {
  // Add new date fields to mortgage_calculations table
  db.exec(`ALTER TABLE mortgage_calculations ADD COLUMN mortgageStartDate DATE DEFAULT NULL`);
} catch (e) {
  // Column already exists or other error, ignore
}

try {
  db.exec(`ALTER TABLE mortgage_calculations ADD COLUMN paymentDayOfMonth INTEGER DEFAULT 1`);
} catch (e) {
  // Column already exists or other error, ignore
}

try {
  db.exec(`ALTER TABLE mortgage_calculations ADD COLUMN preferredPaymentDay INTEGER DEFAULT NULL`);
} catch (e) {
  // Column already exists or other error, ignore
}

try {
  // Add plannedDate to lump_sum_payments table
  db.exec(`ALTER TABLE lump_sum_payments ADD COLUMN plannedDate DATE DEFAULT NULL`);
} catch (e) {
  // Column already exists or other error, ignore
}

try {
  // Add currency to bank_accounts table
  db.exec(`ALTER TABLE bank_accounts ADD COLUMN currency TEXT DEFAULT 'CAD' CHECK (currency IN ('CAD', 'USD'))`);
} catch (e) {
  // Column already exists or other error, ignore
}

try {
  // Add currency to stocks table
  db.exec(`ALTER TABLE stocks ADD COLUMN currency TEXT DEFAULT 'CAD' CHECK (currency IN ('CAD', 'USD'))`);
} catch (e) {
  // Column already exists or other error, ignore
}

try {
  // Add totalStocks to asset_portfolio_snapshots table
  db.exec(`ALTER TABLE asset_portfolio_snapshots ADD COLUMN totalStocks REAL NOT NULL DEFAULT 0`);
} catch (e) {
  // Column already exists or other error, ignore
}

try {
  // Add usdToCadRate to asset_portfolios table
  db.exec(`ALTER TABLE asset_portfolios ADD COLUMN usdToCadRate REAL DEFAULT 1.35`);
} catch (e) {
  // Column already exists or other error, ignore
}

try {
  // Add mortgageTermMonths to mortgage_calculations table
  db.exec(`ALTER TABLE mortgage_calculations ADD COLUMN mortgageTermMonths INTEGER DEFAULT 60`);
} catch (e) {
  // Column already exists or other error, ignore
}

// Add cashflow tracking tables
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_investments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      description TEXT DEFAULT '',
      is_recurring BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS resp_scenarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      scenario_data TEXT NOT NULL,
      is_default BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_user_investments_user ON user_investments (user_id);
    CREATE INDEX IF NOT EXISTS idx_user_expenses_user ON user_expenses (user_id);
    CREATE INDEX IF NOT EXISTS idx_resp_scenarios_user ON resp_scenarios (user_id);
  `);
} catch (e) {
  console.log('Cashflow tables already exist or migration error:', e);
}

// User management
export interface User {
  id: number;
  email: string;
  hashedPassword: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserParams {
  email: string;
  hashedPassword: string;
  name: string;
}

export function createUser(params: CreateUserParams): User {
  const stmt = db.prepare(`
    INSERT INTO users (email, hashedPassword, name)
    VALUES (?, ?, ?)
  `);
  
  const result = stmt.run(params.email, params.hashedPassword, params.name);
  
  return getUserById(result.lastInsertRowid as number)!;
}

export function getUserByEmail(email: string): User | null {
  const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
  return stmt.get(email) as User | null;
}

export function getUserById(id: number): User | null {
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  return stmt.get(id) as User | null;
}

// Mortgage calculation management
export interface MortgageCalculation {
  id: number;
  userId: number;
  mortgageAmount: number;
  annualRate: number;
  monthlyPayment: number;
  extraMonthlyPayment: number;
  calculationName?: string;
  mortgageStartDate?: string;
  paymentDayOfMonth?: number;
  preferredPaymentDay?: number;
  mortgageTermMonths?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMortgageCalculationParams {
  userId: number;
  mortgageAmount: number;
  annualRate: number;
  monthlyPayment: number;
  extraMonthlyPayment: number;
  calculationName?: string;
  mortgageStartDate?: string;
  paymentDayOfMonth?: number;
  preferredPaymentDay?: number;
  mortgageTermMonths?: number;
}

export function createMortgageCalculation(params: CreateMortgageCalculationParams): MortgageCalculation {
  const stmt = db.prepare(`
    INSERT INTO mortgage_calculations 
    (userId, mortgageAmount, annualRate, monthlyPayment, extraMonthlyPayment, calculationName, 
     mortgageStartDate, paymentDayOfMonth, preferredPaymentDay, mortgageTermMonths)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const result = stmt.run(
    params.userId,
    params.mortgageAmount,
    params.annualRate,
    params.monthlyPayment,
    params.extraMonthlyPayment,
    params.calculationName,
    params.mortgageStartDate,
    params.paymentDayOfMonth,
    params.preferredPaymentDay,
    params.mortgageTermMonths
  );
  
  return getMortgageCalculationById(result.lastInsertRowid as number)!;
}

export function getMortgageCalculationById(id: number): MortgageCalculation | null {
  const stmt = db.prepare('SELECT * FROM mortgage_calculations WHERE id = ?');
  return stmt.get(id) as MortgageCalculation | null;
}

export function getMortgageCalculationsByUserId(userId: number): MortgageCalculation[] {
  const stmt = db.prepare('SELECT * FROM mortgage_calculations WHERE userId = ? ORDER BY updatedAt DESC');
  return stmt.all(userId) as MortgageCalculation[];
}

export function deleteMortgageCalculation(id: number): boolean {
  const stmt = db.prepare('DELETE FROM mortgage_calculations WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

// Lump sum payment management
export interface LumpSumPaymentDB {
  id: number;
  mortgageCalculationId: number;
  amount: number;
  year: number;
  month: number;
  plannedDate?: string;
  description?: string;
  isPaid: boolean;
  actualPaidDate?: string;
  interestSaved?: number;
  timeSaved?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLumpSumPaymentParams {
  mortgageCalculationId: number;
  amount: number;
  year: number;
  month: number;
  plannedDate?: string;
  description?: string;
  isPaid?: boolean;
  actualPaidDate?: string;
  interestSaved?: number;
  timeSaved?: number;
}

export function createLumpSumPayment(params: CreateLumpSumPaymentParams): LumpSumPaymentDB {
  const stmt = db.prepare(`
    INSERT INTO lump_sum_payments 
    (mortgageCalculationId, amount, year, month, plannedDate, description, isPaid, actualPaidDate, interestSaved, timeSaved)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const result = stmt.run(
    params.mortgageCalculationId,
    params.amount,
    params.year,
    params.month,
    params.plannedDate,
    params.description,
    params.isPaid ? 1 : 0,
    params.actualPaidDate,
    params.interestSaved,
    params.timeSaved
  );
  
  return getLumpSumPaymentById(result.lastInsertRowid as number)!;
}

export function getLumpSumPaymentById(id: number): LumpSumPaymentDB | null {
  const stmt = db.prepare('SELECT * FROM lump_sum_payments WHERE id = ?');
  const result = stmt.get(id) as any;
  if (!result) return null;
  
  return {
    ...result,
    isPaid: Boolean(result.isPaid)
  };
}

export function getLumpSumPaymentsByCalculationId(calculationId: number): LumpSumPaymentDB[] {
  const stmt = db.prepare('SELECT * FROM lump_sum_payments WHERE mortgageCalculationId = ? ORDER BY year, month');
  const results = stmt.all(calculationId) as any[];
  
  return results.map(result => ({
    ...result,
    isPaid: Boolean(result.isPaid)
  }));
}

export function updateLumpSumPayment(id: number, params: Partial<CreateLumpSumPaymentParams>): LumpSumPaymentDB | null {
  const updates: string[] = [];
  const values: any[] = [];
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      updates.push(`${key} = ?`);
      values.push(key === 'isPaid' ? (value ? 1 : 0) : value);
    }
  });
  
  if (updates.length === 0) return getLumpSumPaymentById(id);
  
  updates.push('updatedAt = CURRENT_TIMESTAMP');
  values.push(id);
  
  const stmt = db.prepare(`UPDATE lump_sum_payments SET ${updates.join(', ')} WHERE id = ?`);
  stmt.run(...values);
  
  return getLumpSumPaymentById(id);
}

export function deleteLumpSumPayment(id: number): boolean {
  const stmt = db.prepare('DELETE FROM lump_sum_payments WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}


// Rate adjustment management
export interface RateAdjustmentDB {
  id: number;
  mortgageCalculationId: number;
  effectiveDate: string;
  rateDelta: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRateAdjustmentParams {
  mortgageCalculationId: number;
  effectiveDate: string;
  rateDelta: number;
  description?: string;
}

export function createRateAdjustment(params: CreateRateAdjustmentParams): RateAdjustmentDB {
  const stmt = db.prepare(`
    INSERT INTO rate_adjustments 
    (mortgageCalculationId, effectiveDate, rateDelta, description)
    VALUES (?, ?, ?, ?)
  `);

  const result = stmt.run(
    params.mortgageCalculationId,
    params.effectiveDate,
    params.rateDelta,
    params.description ?? null
  );

  return getRateAdjustmentById(result.lastInsertRowid as number)!;
}

export function getRateAdjustmentById(id: number): RateAdjustmentDB | null {
  const stmt = db.prepare('SELECT * FROM rate_adjustments WHERE id = ?');
  const result = stmt.get(id) as RateAdjustmentDB | undefined;
  return result || null;
}

export function getRateAdjustmentsByCalculationId(calculationId: number): RateAdjustmentDB[] {
  const stmt = db.prepare('SELECT * FROM rate_adjustments WHERE mortgageCalculationId = ? ORDER BY effectiveDate');
  const results = stmt.all(calculationId) as RateAdjustmentDB[];
  return results;
}

export function updateRateAdjustment(id: number, params: Partial<CreateRateAdjustmentParams>): RateAdjustmentDB | null {
  const updates: string[] = [];
  const values: (string | number | null)[] = [];

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      updates.push(`${key} = ?`);
      values.push(value as string | number | null);
    }
  }

  if (updates.length === 0) {
    return getRateAdjustmentById(id);
  }

  updates.push('updatedAt = CURRENT_TIMESTAMP');
  values.push(id);

  const stmt = db.prepare(`UPDATE rate_adjustments SET ${updates.join(', ')} WHERE id = ?`);
  stmt.run(...values);

  return getRateAdjustmentById(id);
}

export function deleteRateAdjustment(id: number): boolean {
  const stmt = db.prepare('DELETE FROM rate_adjustments WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

// Ensure data directory exists
import { mkdirSync } from 'fs';
import { dirname } from 'path';

try {
  mkdirSync(dirname(dbPath), { recursive: true });
} catch (error) {
  // Directory might already exist, ignore error
}

// Mortgage snapshot management
export interface MortgageSnapshot {
  id: number;
  mortgageCalculationId: number;
  snapshotDate: string;
  remainingBalance: number;
  monthlyPayment: number;
  interestRate: number;
  nextPaymentDate: string;
  description?: string;
  createdAt: string;
}

export interface CreateMortgageSnapshotParams {
  mortgageCalculationId: number;
  snapshotDate: string;
  remainingBalance: number;
  monthlyPayment: number;
  interestRate: number;
  nextPaymentDate: string;
  description?: string;
}

export function createMortgageSnapshot(params: CreateMortgageSnapshotParams): MortgageSnapshot {
  const stmt = db.prepare(`
    INSERT INTO mortgage_snapshots 
    (mortgageCalculationId, snapshotDate, remainingBalance, monthlyPayment, interestRate, nextPaymentDate, description)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  const result = stmt.run(
    params.mortgageCalculationId,
    params.snapshotDate,
    params.remainingBalance,
    params.monthlyPayment,
    params.interestRate,
    params.nextPaymentDate,
    params.description
  );
  
  return getMortgageSnapshotById(result.lastInsertRowid as number)!;
}

export function getMortgageSnapshotById(id: number): MortgageSnapshot | null {
  const stmt = db.prepare('SELECT * FROM mortgage_snapshots WHERE id = ?');
  return stmt.get(id) as MortgageSnapshot | null;
}

export function getMortgageSnapshotsByCalculationId(calculationId: number): MortgageSnapshot[] {
  const stmt = db.prepare('SELECT * FROM mortgage_snapshots WHERE mortgageCalculationId = ? ORDER BY snapshotDate DESC');
  return stmt.all(calculationId) as MortgageSnapshot[];
}

// Mortgage payment tracking
export interface MortgagePayment {
  id: number;
  mortgageCalculationId: number;
  paymentDate: string;
  scheduledAmount: number;
  actualAmount?: number;
  principalAmount?: number;
  interestAmount?: number;
  remainingBalance: number;
  paymentType: string;
  description?: string;
  isPaid: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMortgagePaymentParams {
  mortgageCalculationId: number;
  paymentDate: string;
  scheduledAmount: number;
  actualAmount?: number;
  principalAmount?: number;
  interestAmount?: number;
  remainingBalance: number;
  paymentType?: string;
  description?: string;
  isPaid?: boolean;
}

export function createMortgagePayment(params: CreateMortgagePaymentParams): MortgagePayment {
  const stmt = db.prepare(`
    INSERT INTO mortgage_payments 
    (mortgageCalculationId, paymentDate, scheduledAmount, actualAmount, principalAmount, 
     interestAmount, remainingBalance, paymentType, description, isPaid)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const result = stmt.run(
    params.mortgageCalculationId,
    params.paymentDate,
    params.scheduledAmount,
    params.actualAmount,
    params.principalAmount,
    params.interestAmount,
    params.remainingBalance,
    params.paymentType || 'regular',
    params.description,
    params.isPaid ? 1 : 0
  );
  
  return getMortgagePaymentById(result.lastInsertRowid as number)!;
}

export function getMortgagePaymentById(id: number): MortgagePayment | null {
  const stmt = db.prepare('SELECT * FROM mortgage_payments WHERE id = ?');
  const result = stmt.get(id) as any;
  if (!result) return null;
  
  return {
    ...result,
    isPaid: Boolean(result.isPaid)
  };
}

export function getMortgagePaymentsByCalculationId(calculationId: number): MortgagePayment[] {
  const stmt = db.prepare('SELECT * FROM mortgage_payments WHERE mortgageCalculationId = ? ORDER BY paymentDate DESC');
  const results = stmt.all(calculationId) as any[];
  
  return results.map(result => ({
    ...result,
    isPaid: Boolean(result.isPaid)
  }));
}

// Mortgage settings
export interface MortgageSettings {
  id: number;
  mortgageCalculationId: number;
  paymentDayOfMonth: number;
  preferredPaymentDay?: number;
  startDate: string;
  originalPrincipal: number;
  originalTerm: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMortgageSettingsParams {
  mortgageCalculationId: number;
  paymentDayOfMonth: number;
  preferredPaymentDay?: number;
  startDate: string;
  originalPrincipal: number;
  originalTerm: number;
}

export function createMortgageSettings(params: CreateMortgageSettingsParams): MortgageSettings {
  const stmt = db.prepare(`
    INSERT INTO mortgage_settings 
    (mortgageCalculationId, paymentDayOfMonth, preferredPaymentDay, startDate, originalPrincipal, originalTerm)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  const result = stmt.run(
    params.mortgageCalculationId,
    params.paymentDayOfMonth,
    params.preferredPaymentDay,
    params.startDate,
    params.originalPrincipal,
    params.originalTerm
  );
  
  return getMortgageSettingsById(result.lastInsertRowid as number)!;
}

export function getMortgageSettingsById(id: number): MortgageSettings | null {
  const stmt = db.prepare('SELECT * FROM mortgage_settings WHERE id = ?');
  return stmt.get(id) as MortgageSettings | null;
}

export function getMortgageSettingsByCalculationId(calculationId: number): MortgageSettings | null {
  const stmt = db.prepare('SELECT * FROM mortgage_settings WHERE mortgageCalculationId = ?');
  return stmt.get(calculationId) as MortgageSettings | null;
}

// Utility function to calculate next payment date with month-end handling
export function calculateNextPaymentDate(paymentDay: number, preferredDay: number | undefined, fromDate: Date): Date {
  const nextDate = new Date(fromDate);
  
  // Move to next month
  nextDate.setMonth(nextDate.getMonth() + 1);
  
  // Handle month-end edge cases
  let targetDay = paymentDay;
  if (preferredDay && preferredDay > 28) {
    // User wants end of month payment (29-31)
    const lastDayOfMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
    targetDay = Math.min(preferredDay, lastDayOfMonth);
  }
  
  nextDate.setDate(targetDay);
  return nextDate;
}

// Asset Portfolio management
export interface AssetPortfolio {
  id: number;
  userId: number;
  portfolioName: string;
  lastUpdated: string;
  usdToCadRate: number;
  createdAt: string;
  updatedAt: string;
}

export interface RealEstateAssetDB {
  id: number;
  portfolioId: number;
  propertyType: 'primary_residence' | 'investment_property' | 'vacation_home' | 'commercial';
  address: string;
  estimatedValue: number;
  mortgageBalance: number;
  monthlyPayment?: number;
  interestRate?: number;
  acquisitionDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BankAccountDB {
  id: number;
  portfolioId: number;
  accountType: 'chequing' | 'savings' | 'high_interest_savings';
  institutionName: string;
  accountName?: string;
  currentBalance: number;
  currency: 'CAD' | 'USD';
  interestRate?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegisteredAccountDB {
  id: number;
  portfolioId: number;
  accountType: 'rrsp' | 'tfsa' | 'fhsa' | 'resp';
  institutionName: string;
  accountName?: string;
  currentBalance: number;
  contributionRoom?: number;
  yearlyContribution?: number;
  beneficiary?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockDB {
  id: number;
  portfolioId: number;
  companyName: string;
  ticker: string;
  shares: number;
  costBasis: number; // Cost basis per share
  currentValue: number; // Current price per share
  currency: 'CAD' | 'USD';
  isPrivate: boolean;
  exchangeName?: string;
  industry?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAssetPortfolioParams {
  userId: number;
  portfolioName: string;
  lastUpdated: string;
  usdToCadRate?: number;
}

export interface CreateRealEstateAssetParams {
  portfolioId: number;
  propertyType: 'primary_residence' | 'investment_property' | 'vacation_home' | 'commercial';
  address: string;
  estimatedValue: number;
  mortgageBalance: number;
  monthlyPayment?: number;
  interestRate?: number;
  acquisitionDate?: string;
  notes?: string;
}

export interface CreateBankAccountParams {
  portfolioId: number;
  accountType: 'chequing' | 'savings' | 'high_interest_savings';
  institutionName: string;
  accountName?: string;
  currentBalance: number;
  currency: 'CAD' | 'USD';
  interestRate?: number;
  notes?: string;
}

export interface CreateRegisteredAccountParams {
  portfolioId: number;
  accountType: 'rrsp' | 'tfsa' | 'fhsa' | 'resp';
  institutionName: string;
  accountName?: string;
  currentBalance: number;
  contributionRoom?: number;
  yearlyContribution?: number;
  beneficiary?: string;
  notes?: string;
}

export interface CreateStockParams {
  portfolioId: number;
  companyName: string;
  ticker: string;
  shares: number;
  costBasis: number; // Cost basis per share
  currentValue: number; // Current price per share
  currency: 'CAD' | 'USD';
  isPrivate: boolean;
  exchangeName?: string;
  industry?: string;
  notes?: string;
}

// Asset Portfolio Functions
export function createAssetPortfolio(params: CreateAssetPortfolioParams): AssetPortfolio {
  const stmt = db.prepare(`
    INSERT INTO asset_portfolios (userId, portfolioName, lastUpdated, usdToCadRate)
    VALUES (?, ?, ?, ?)
  `);
  
  const result = stmt.run(
    params.userId, 
    params.portfolioName, 
    params.lastUpdated,
    params.usdToCadRate || 1.35
  );
  return getAssetPortfolioById(result.lastInsertRowid as number)!;
}

export function getAssetPortfolioById(id: number): AssetPortfolio | null {
  const stmt = db.prepare('SELECT * FROM asset_portfolios WHERE id = ?');
  return stmt.get(id) as AssetPortfolio | null;
}

export function getAssetPortfoliosByUserId(userId: number): AssetPortfolio[] {
  const stmt = db.prepare('SELECT * FROM asset_portfolios WHERE userId = ? ORDER BY updatedAt DESC');
  return stmt.all(userId) as AssetPortfolio[];
}

export function deleteAssetPortfolio(id: number): boolean {
  const stmt = db.prepare('DELETE FROM asset_portfolios WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

// Real Estate Asset Functions
export function createRealEstateAsset(params: CreateRealEstateAssetParams): RealEstateAssetDB {
  const stmt = db.prepare(`
    INSERT INTO real_estate_assets 
    (portfolioId, propertyType, address, estimatedValue, mortgageBalance, monthlyPayment, interestRate, acquisitionDate, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const result = stmt.run(
    params.portfolioId,
    params.propertyType,
    params.address,
    params.estimatedValue,
    params.mortgageBalance,
    params.monthlyPayment,
    params.interestRate,
    params.acquisitionDate,
    params.notes
  );
  
  return getRealEstateAssetById(result.lastInsertRowid as number)!;
}

export function getRealEstateAssetById(id: number): RealEstateAssetDB | null {
  const stmt = db.prepare('SELECT * FROM real_estate_assets WHERE id = ?');
  return stmt.get(id) as RealEstateAssetDB | null;
}

export function getRealEstateAssetsByPortfolioId(portfolioId: number): RealEstateAssetDB[] {
  const stmt = db.prepare('SELECT * FROM real_estate_assets WHERE portfolioId = ? ORDER BY createdAt DESC');
  return stmt.all(portfolioId) as RealEstateAssetDB[];
}

// Bank Account Functions
export function createBankAccount(params: CreateBankAccountParams): BankAccountDB {
  const stmt = db.prepare(`
    INSERT INTO bank_accounts 
    (portfolioId, accountType, institutionName, accountName, currentBalance, currency, interestRate, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const result = stmt.run(
    params.portfolioId,
    params.accountType,
    params.institutionName,
    params.accountName,
    params.currentBalance,
    params.currency,
    params.interestRate,
    params.notes
  );
  
  return getBankAccountById(result.lastInsertRowid as number)!;
}

export function getBankAccountById(id: number): BankAccountDB | null {
  const stmt = db.prepare('SELECT * FROM bank_accounts WHERE id = ?');
  return stmt.get(id) as BankAccountDB | null;
}

export function getBankAccountsByPortfolioId(portfolioId: number): BankAccountDB[] {
  const stmt = db.prepare('SELECT * FROM bank_accounts WHERE portfolioId = ? ORDER BY createdAt DESC');
  return stmt.all(portfolioId) as BankAccountDB[];
}

// Registered Account Functions
export function createRegisteredAccount(params: CreateRegisteredAccountParams): RegisteredAccountDB {
  const stmt = db.prepare(`
    INSERT INTO registered_accounts 
    (portfolioId, accountType, institutionName, accountName, currentBalance, contributionRoom, yearlyContribution, beneficiary, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const result = stmt.run(
    params.portfolioId,
    params.accountType,
    params.institutionName,
    params.accountName,
    params.currentBalance,
    params.contributionRoom,
    params.yearlyContribution,
    params.beneficiary,
    params.notes
  );
  
  return getRegisteredAccountById(result.lastInsertRowid as number)!;
}

export function getRegisteredAccountById(id: number): RegisteredAccountDB | null {
  const stmt = db.prepare('SELECT * FROM registered_accounts WHERE id = ?');
  return stmt.get(id) as RegisteredAccountDB | null;
}

export function getRegisteredAccountsByPortfolioId(portfolioId: number, accountType?: string): RegisteredAccountDB[] {
  let query = 'SELECT * FROM registered_accounts WHERE portfolioId = ?';
  const params: any[] = [portfolioId];
  
  if (accountType) {
    query += ' AND accountType = ?';
    params.push(accountType);
  }
  
  query += ' ORDER BY createdAt DESC';
  
  const stmt = db.prepare(query);
  return stmt.all(...params) as RegisteredAccountDB[];
}

// Stock Functions
export function createStock(params: CreateStockParams): StockDB {
  const stmt = db.prepare(`
    INSERT INTO stocks 
    (portfolioId, companyName, ticker, shares, costBasis, currentValue, currency, isPrivate, exchangeName, industry, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const result = stmt.run(
    params.portfolioId,
    params.companyName,
    params.ticker,
    params.shares,
    params.costBasis,
    params.currentValue,
    params.currency,
    params.isPrivate ? 1 : 0,
    params.exchangeName,
    params.industry,
    params.notes
  );
  
  return getStockById(result.lastInsertRowid as number)!;
}

export function getStockById(id: number): StockDB | null {
  const stmt = db.prepare('SELECT * FROM stocks WHERE id = ?');
  const result = stmt.get(id) as any;
  if (!result) return null;
  
  return {
    ...result,
    isPrivate: Boolean(result.isPrivate)
  };
}

export function getStocksByPortfolioId(portfolioId: number): StockDB[] {
  const stmt = db.prepare('SELECT * FROM stocks WHERE portfolioId = ? ORDER BY createdAt DESC');
  const results = stmt.all(portfolioId) as any[];
  
  return results.map(result => ({
    ...result,
    isPrivate: Boolean(result.isPrivate)
  }));
}

// Type aliases for API compatibility
export type AssetPortfolioData = CreateAssetPortfolioParams;
export type RealEstateAssetData = CreateRealEstateAssetParams;
export type BankAccountData = CreateBankAccountParams;
export type RegisteredAccountData = CreateRegisteredAccountParams;
export type StockData = CreateStockParams;

// Additional functions needed for API endpoints
export function updateAssetPortfolio(id: number, data: Partial<AssetPortfolioData>): boolean {
  const updates: string[] = [];
  const values: (string | number)[] = [];
  
  if (data.portfolioName) {
    updates.push('portfolioName = ?');
    values.push(data.portfolioName);
  }
  if (data.lastUpdated) {
    updates.push('lastUpdated = ?');
    values.push(data.lastUpdated);
  }
  if (data.usdToCadRate !== undefined) {
    updates.push('usdToCadRate = ?');
    values.push(data.usdToCadRate);
  }
  
  if (updates.length === 0) return false;
  
  updates.push('updatedAt = CURRENT_TIMESTAMP');
  values.push(id);
  
  const stmt = db.prepare(`UPDATE asset_portfolios SET ${updates.join(', ')} WHERE id = ?`);
  const result = stmt.run(...values);
  return result.changes > 0;
}

// Asset Portfolio Snapshot management
export interface AssetPortfolioSnapshot {
  id: number;
  portfolioId: number;
  snapshotDate: string;
  snapshotName: string;
  totalRealEstate: number;
  totalMortgageDebt: number;
  netRealEstate: number;
  totalCash: number;
  totalRRSP: number;
  totalTFSA: number;
  totalFHSA: number;
  totalRESP: number;
  totalRegistered: number;
  totalStocks: number;
  totalAssets: number;
  totalDebt: number;
  netWorth: number;
  notes?: string;
  createdAt: string;
}

export interface CreateAssetSnapshotParams {
  portfolioId: number;
  snapshotDate: string;
  snapshotName: string;
  totalRealEstate: number;
  totalMortgageDebt: number;
  netRealEstate: number;
  totalCash: number;
  totalRRSP: number;
  totalTFSA: number;
  totalFHSA: number;
  totalRESP: number;
  totalRegistered: number;
  totalStocks: number;
  totalAssets: number;
  totalDebt: number;
  netWorth: number;
  notes?: string;
}

export function createAssetSnapshot(params: CreateAssetSnapshotParams): AssetPortfolioSnapshot {
  const stmt = db.prepare(`
    INSERT INTO asset_portfolio_snapshots 
    (portfolioId, snapshotDate, snapshotName, totalRealEstate, totalMortgageDebt, netRealEstate,
     totalCash, totalRRSP, totalTFSA, totalFHSA, totalRESP, totalRegistered, totalStocks,
     totalAssets, totalDebt, netWorth, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const result = stmt.run(
    params.portfolioId,
    params.snapshotDate,
    params.snapshotName,
    params.totalRealEstate,
    params.totalMortgageDebt,
    params.netRealEstate,
    params.totalCash,
    params.totalRRSP,
    params.totalTFSA,
    params.totalFHSA,
    params.totalRESP,
    params.totalRegistered,
    params.totalStocks,
    params.totalAssets,
    params.totalDebt,
    params.netWorth,
    params.notes
  );
  
  return getAssetSnapshotById(result.lastInsertRowid as number)!;
}

export function getAssetSnapshotById(id: number): AssetPortfolioSnapshot | null {
  const stmt = db.prepare('SELECT * FROM asset_portfolio_snapshots WHERE id = ?');
  return stmt.get(id) as AssetPortfolioSnapshot | null;
}

export function getAssetSnapshotsByPortfolioId(portfolioId: number): AssetPortfolioSnapshot[] {
  const stmt = db.prepare('SELECT * FROM asset_portfolio_snapshots WHERE portfolioId = ? ORDER BY snapshotDate DESC, createdAt DESC');
  return stmt.all(portfolioId) as AssetPortfolioSnapshot[];
}

export function updateAssetSnapshot(id: number, data: Partial<CreateAssetSnapshotParams>): boolean {
  const updates: string[] = [];
  const values: (string | number)[] = [];
  
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) {
      updates.push(`${key} = ?`);
      values.push(value);
    }
  });
  
  if (updates.length === 0) return false;
  
  values.push(id);
  
  const stmt = db.prepare(`UPDATE asset_portfolio_snapshots SET ${updates.join(', ')} WHERE id = ?`);
  const result = stmt.run(...values);
  return result.changes > 0;
}

export function deleteAssetSnapshot(id: number): boolean {
  const stmt = db.prepare('DELETE FROM asset_portfolio_snapshots WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

// Type alias for API compatibility
export type AssetSnapshotData = CreateAssetSnapshotParams;

// Cashflow Management Interfaces and Functions
export interface UserInvestment {
  id: number;
  user_id: number;
  type: string;
  amount: number;
  month: number;
  year: number;
  description: string;
  is_recurring: boolean;
  created_at: string;
}

export interface UserExpense {
  id: number;
  user_id: number;
  category: string;
  description: string;
  amount: number;
  month: number;
  year: number;
  created_at: string;
}

export interface RespScenario {
  id: number;
  user_id: number;
  name: string;
  scenario_data: string;
  is_default: boolean;
  created_at: string;
}

export interface CreateInvestmentParams {
  user_id: number;
  type: string;
  amount: number;
  month: number;
  year: number;
  description?: string;
  is_recurring?: boolean;
}

export interface CreateExpenseParams {
  user_id: number;
  category: string;
  description: string;
  amount: number;
  month: number;
  year: number;
}

export interface CreateRespScenarioParams {
  user_id: number;
  name: string;
  scenario_data: string;
  is_default?: boolean;
}

// Investment Functions
export function createUserInvestment(params: CreateInvestmentParams): UserInvestment {
  const stmt = db.prepare(`
    INSERT INTO user_investments (user_id, type, amount, month, year, description, is_recurring)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  const result = stmt.run(
    params.user_id,
    params.type,
    params.amount,
    params.month,
    params.year,
    params.description || '',
    params.is_recurring ? 1 : 0
  );
  
  return getUserInvestmentById(result.lastInsertRowid as number)!;
}

export function getUserInvestmentById(id: number): UserInvestment | null {
  const stmt = db.prepare('SELECT * FROM user_investments WHERE id = ?');
  return stmt.get(id) as UserInvestment | null;
}

export function getUserInvestmentsByUserId(userId: number): UserInvestment[] {
  const stmt = db.prepare(`
    SELECT id, user_id, type, amount, month, year, description, 
           is_recurring, created_at 
    FROM user_investments 
    WHERE user_id = ? 
    ORDER BY year, month
  `);
  return stmt.all(userId) as UserInvestment[];
}

export function updateUserInvestment(id: number, userId: number, data: Partial<CreateInvestmentParams>): boolean {
  const updates: string[] = [];
  const values: (string | number)[] = [];
  
  if (data.type !== undefined) {
    updates.push('type = ?');
    values.push(data.type);
  }
  if (data.amount !== undefined) {
    updates.push('amount = ?');
    values.push(data.amount);
  }
  if (data.month !== undefined) {
    updates.push('month = ?');
    values.push(data.month);
  }
  if (data.year !== undefined) {
    updates.push('year = ?');
    values.push(data.year);
  }
  if (data.description !== undefined) {
    updates.push('description = ?');
    values.push(data.description);
  }
  if (data.is_recurring !== undefined) {
    updates.push('is_recurring = ?');
    values.push(data.is_recurring ? 1 : 0);
  }
  
  if (updates.length === 0) return false;
  
  values.push(id, userId);
  
  const stmt = db.prepare(`UPDATE user_investments SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`);
  const result = stmt.run(...values);
  return result.changes > 0;
}

export function deleteUserInvestment(id: number, userId: number): boolean {
  const stmt = db.prepare('DELETE FROM user_investments WHERE id = ? AND user_id = ?');
  const result = stmt.run(id, userId);
  return result.changes > 0;
}

// Expense Functions
export function createUserExpense(params: CreateExpenseParams): UserExpense {
  const stmt = db.prepare(`
    INSERT INTO user_expenses (user_id, category, description, amount, month, year)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  const result = stmt.run(
    params.user_id,
    params.category,
    params.description,
    params.amount,
    params.month,
    params.year
  );
  
  return getUserExpenseById(result.lastInsertRowid as number)!;
}

export function getUserExpenseById(id: number): UserExpense | null {
  const stmt = db.prepare('SELECT * FROM user_expenses WHERE id = ?');
  return stmt.get(id) as UserExpense | null;
}

export function getUserExpensesByUserId(userId: number): UserExpense[] {
  const stmt = db.prepare(`
    SELECT id, user_id, category, description, amount, month, year, created_at
    FROM user_expenses 
    WHERE user_id = ? 
    ORDER BY year, month
  `);
  return stmt.all(userId) as UserExpense[];
}

export function updateUserExpense(id: number, userId: number, data: Partial<CreateExpenseParams>): boolean {
  const updates: string[] = [];
  const values: (string | number)[] = [];
  
  if (data.category !== undefined) {
    updates.push('category = ?');
    values.push(data.category);
  }
  if (data.description !== undefined) {
    updates.push('description = ?');
    values.push(data.description);
  }
  if (data.amount !== undefined) {
    updates.push('amount = ?');
    values.push(data.amount);
  }
  if (data.month !== undefined) {
    updates.push('month = ?');
    values.push(data.month);
  }
  if (data.year !== undefined) {
    updates.push('year = ?');
    values.push(data.year);
  }
  
  if (updates.length === 0) return false;
  
  values.push(id, userId);
  
  const stmt = db.prepare(`UPDATE user_expenses SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`);
  const result = stmt.run(...values);
  return result.changes > 0;
}

export function deleteUserExpense(id: number, userId: number): boolean {
  const stmt = db.prepare('DELETE FROM user_expenses WHERE id = ? AND user_id = ?');
  const result = stmt.run(id, userId);
  return result.changes > 0;
}

// RESP Scenario Functions
export function createRespScenario(params: CreateRespScenarioParams): RespScenario {
  const stmt = db.prepare(`
    INSERT INTO resp_scenarios (user_id, name, scenario_data, is_default)
    VALUES (?, ?, ?, ?)
  `);
  
  const result = stmt.run(
    params.user_id,
    params.name,
    params.scenario_data,
    params.is_default ? 1 : 0
  );
  
  return getRespScenarioById(result.lastInsertRowid as number)!;
}

export function getRespScenarioById(id: number): RespScenario | null {
  const stmt = db.prepare('SELECT * FROM resp_scenarios WHERE id = ?');
  return stmt.get(id) as RespScenario | null;
}

export function getRespScenariosByUserId(userId: number): RespScenario[] {
  const stmt = db.prepare(`
    SELECT id, user_id, name, scenario_data, is_default, created_at
    FROM resp_scenarios 
    WHERE user_id = ? 
    ORDER BY is_default DESC, created_at DESC
  `);
  return stmt.all(userId) as RespScenario[];
}

export function updateRespScenario(id: number, userId: number, data: Partial<CreateRespScenarioParams>): boolean {
  const updates: string[] = [];
  const values: (string | number)[] = [];
  
  if (data.name !== undefined) {
    updates.push('name = ?');
    values.push(data.name);
  }
  if (data.scenario_data !== undefined) {
    updates.push('scenario_data = ?');
    values.push(data.scenario_data);
  }
  if (data.is_default !== undefined) {
    updates.push('is_default = ?');
    values.push(data.is_default ? 1 : 0);
  }
  
  if (updates.length === 0) return false;
  
  values.push(id, userId);
  
  const stmt = db.prepare(`UPDATE resp_scenarios SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`);
  const result = stmt.run(...values);
  return result.changes > 0;
}

export function deleteRespScenario(id: number, userId: number): boolean {
  const stmt = db.prepare('DELETE FROM resp_scenarios WHERE id = ? AND user_id = ?');
  const result = stmt.run(id, userId);
  return result.changes > 0;
}

export default db;