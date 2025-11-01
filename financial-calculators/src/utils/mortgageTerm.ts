export interface MortgageTermParts {
  years: number;
  months: number;
}

export function termPartsToMonths(yearsInput: unknown, monthsInput: unknown): number {
  const years = Number(yearsInput);
  const months = Number(monthsInput);

  const safeYears = Number.isFinite(years) ? Math.max(0, Math.floor(years)) : 0;
  const safeMonths = Number.isFinite(months) ? Math.max(0, Math.floor(months)) : 0;

  return safeYears * 12 + safeMonths;
}

export function monthsToTermParts(totalMonthsInput: unknown): MortgageTermParts {
  const totalMonths = Number(totalMonthsInput);
  if (!Number.isFinite(totalMonths) || totalMonths <= 0) {
    return { years: 0, months: 0 };
  }

  const safeTotal = Math.floor(totalMonths);
  return {
    years: Math.floor(safeTotal / 12),
    months: safeTotal % 12
  };
}

export function normalizeTermParts(yearsInput: unknown, monthsInput: unknown): MortgageTermParts {
  const totalMonths = termPartsToMonths(yearsInput, monthsInput);
  return monthsToTermParts(totalMonths);
}
