import { monthsToTermParts, normalizeTermParts, termPartsToMonths } from '../mortgageTerm';

describe('mortgageTerm utilities', () => {
  it('converts years and months into total months', () => {
    expect(termPartsToMonths(25, 6)).toBe(306);
  });

  it('returns zero months when inputs are missing or invalid', () => {
    expect(termPartsToMonths(undefined, undefined)).toBe(0);
    expect(termPartsToMonths('not-a-number', -3)).toBe(0);
  });

  it('converts total months back into term parts', () => {
    expect(monthsToTermParts(306)).toEqual({ years: 25, months: 6 });
    expect(monthsToTermParts(null)).toEqual({ years: 0, months: 0 });
  });

  it('normalizes overflow months into additional years', () => {
    expect(normalizeTermParts(24, 18)).toEqual({ years: 25, months: 6 });
  });
});
