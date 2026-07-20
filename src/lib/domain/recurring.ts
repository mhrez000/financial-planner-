/**
 * Recurring payment / subscription detection.
 *
 * Groups outgoing transactions by normalised merchant, then looks for series
 * with stable amounts and stable intervals (weekly, fortnightly, monthly,
 * quarterly, annual). Powers the Subscription Manager, bill predictions and
 * "price increase" alerts — no bank metadata required, so it works identically
 * for Open Banking feeds, CSV imports and manual entry.
 */

import { differenceInDays } from "date-fns";

export interface TxnLike {
  id: string;
  date: Date;
  amountCents: number; // negative = spend
  merchant: string;
}

export type Cadence = "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "QUARTERLY" | "ANNUAL";

export interface RecurringSeries {
  merchant: string;
  cadence: Cadence;
  /** Latest observed charge (positive cents). */
  amountCents: number;
  monthlyCostCents: number;
  annualCostCents: number;
  lastPayment: Date;
  nextPayment: Date;
  occurrences: number;
  /** True when the latest charge is >2% above the series' earlier average. */
  priceIncreased: boolean;
  transactionIds: string[];
}

const CADENCES: { name: Cadence; days: number; tolerance: number; perYear: number }[] = [
  { name: "WEEKLY", days: 7, tolerance: 2, perYear: 52 },
  { name: "FORTNIGHTLY", days: 14, tolerance: 3, perYear: 26 },
  { name: "MONTHLY", days: 30.4, tolerance: 5, perYear: 12 },
  { name: "QUARTERLY", days: 91, tolerance: 10, perYear: 4 },
  { name: "ANNUAL", days: 365, tolerance: 20, perYear: 1 },
];

function normaliseMerchant(merchant: string): string {
  return merchant
    .toUpperCase()
    .replace(/[*#]\s*\w+$/g, "") // strip trailing reference codes
    .replace(/\s+\d{4,}$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function detectRecurring(transactions: TxnLike[], now: Date): RecurringSeries[] {
  const spends = transactions.filter((t) => t.amountCents < 0);
  const byMerchant = new Map<string, TxnLike[]>();
  for (const t of spends) {
    const key = normaliseMerchant(t.merchant);
    const list = byMerchant.get(key) ?? [];
    list.push(t);
    byMerchant.set(key, list);
  }

  const series: RecurringSeries[] = [];

  for (const [merchant, txns] of byMerchant) {
    if (txns.length < 3) continue;
    const sorted = [...txns].sort((a, b) => a.date.getTime() - b.date.getTime());

    // Amounts must be stable: median absolute deviation within 15% of median.
    const amounts = sorted.map((t) => Math.abs(t.amountCents));
    const med = [...amounts].sort((a, b) => a - b)[Math.floor(amounts.length / 2)];
    const stableAmounts = amounts.filter((a) => Math.abs(a - med) / med <= 0.15);
    if (stableAmounts.length < Math.max(3, Math.floor(amounts.length * 0.7))) continue;

    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      gaps.push(differenceInDays(sorted[i].date, sorted[i - 1].date));
    }
    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;

    const cadence = CADENCES.find((c) => Math.abs(avgGap - c.days) <= c.tolerance);
    if (!cadence) continue;

    // Intervals must be individually consistent, not just on average.
    const consistent = gaps.filter((g) => Math.abs(g - cadence.days) <= cadence.tolerance * 2);
    if (consistent.length < gaps.length * 0.7) continue;

    const last = sorted[sorted.length - 1];
    // Series is live if we'd expect another charge and haven't clearly lapsed.
    const daysSinceLast = differenceInDays(now, last.date);
    if (daysSinceLast > cadence.days + cadence.tolerance * 3) continue;

    const latestAmount = Math.abs(last.amountCents);
    const earlier = amounts.slice(0, -1);
    const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;
    const annual = Math.round(latestAmount * cadence.perYear);

    series.push({
      merchant,
      cadence: cadence.name,
      amountCents: latestAmount,
      monthlyCostCents: Math.round(annual / 12),
      annualCostCents: annual,
      lastPayment: last.date,
      nextPayment: new Date(last.date.getTime() + cadence.days * 24 * 3600 * 1000),
      occurrences: sorted.length,
      priceIncreased: latestAmount > earlierAvg * 1.02,
      transactionIds: sorted.map((t) => t.id),
    });
  }

  return series.sort((a, b) => b.annualCostCents - a.annualCostCents);
}
