/**
 * Australian financial-year helpers for the Tax Centre.
 * FY runs 1 July → 30 June and is named by its end year: FY2026 = Jul 2025–Jun 2026.
 */

export interface FinancialYear {
  /** e.g. 2026 for FY2025-26 */
  endYear: number;
  label: string;
  from: Date;
  to: Date;
}

export function financialYear(endYear: number): FinancialYear {
  return {
    endYear,
    label: `FY${endYear - 1}–${String(endYear).slice(2)}`,
    from: new Date(endYear - 1, 6, 1),
    to: new Date(endYear, 5, 30, 23, 59, 59, 999),
  };
}

export function currentFinancialYear(now: Date): FinancialYear {
  return financialYear(now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear());
}
