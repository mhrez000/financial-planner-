/**
 * Debt payoff planning: amortised month-by-month simulation of the
 * snowball (smallest balance first) and avalanche (highest rate first)
 * strategies, so users see real dates and real interest saved — not
 * abstractions.
 */

export interface DebtInput {
  id: string;
  name: string;
  balanceCents: number; // positive
  aprBps: number; // 599 = 5.99% p.a.
  minPaymentCents: number;
}

export interface PayoffResult {
  strategy: "SNOWBALL" | "AVALANCHE";
  months: number;
  totalInterestCents: number;
  totalPaidCents: number;
  payoffOrder: { id: string; name: string; month: number }[];
  /** Remaining total balance at the end of each month, for charting. */
  balanceTimeline: number[];
}

const MAX_MONTHS = 1200;

export function simulatePayoff(
  debts: DebtInput[],
  extraMonthlyCents: number,
  strategy: "SNOWBALL" | "AVALANCHE",
): PayoffResult {
  const order = [...debts].sort((a, b) =>
    strategy === "SNOWBALL" ? a.balanceCents - b.balanceCents : b.aprBps - a.aprBps,
  );
  const balances = new Map(order.map((d) => [d.id, d.balanceCents]));
  const payoffOrder: PayoffResult["payoffOrder"] = [];
  const balanceTimeline: number[] = [];
  let totalInterest = 0;
  let totalPaid = 0;
  let month = 0;

  while ([...balances.values()].some((b) => b > 0) && month < MAX_MONTHS) {
    month++;
    // Accrue interest
    for (const d of order) {
      const bal = balances.get(d.id)!;
      if (bal <= 0) continue;
      const interest = Math.round((bal * d.aprBps) / 10000 / 12);
      balances.set(d.id, bal + interest);
      totalInterest += interest;
    }
    // Pay minimums, pool freed-up minimums + extra onto the target debt
    let extra = extraMonthlyCents;
    for (const d of order) {
      const bal = balances.get(d.id)!;
      if (bal <= 0) {
        extra += d.minPaymentCents; // debt cleared — its minimum rolls forward
        continue;
      }
      const payment = Math.min(bal, d.minPaymentCents);
      balances.set(d.id, bal - payment);
      totalPaid += payment;
    }
    const target = order.find((d) => balances.get(d.id)! > 0);
    if (target && extra > 0) {
      const bal = balances.get(target.id)!;
      const payment = Math.min(bal, extra);
      balances.set(target.id, bal - payment);
      totalPaid += payment;
    }
    for (const d of order) {
      if (balances.get(d.id)! <= 0 && !payoffOrder.some((p) => p.id === d.id)) {
        payoffOrder.push({ id: d.id, name: d.name, month });
      }
    }
    balanceTimeline.push([...balances.values()].reduce((a, b) => a + Math.max(0, b), 0));
  }

  return { strategy, months: month, totalInterestCents: totalInterest, totalPaidCents: totalPaid, payoffOrder, balanceTimeline };
}
