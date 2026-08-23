/**
 * Safe-to-spend: the one number that answers "can I spend right now?"
 *
 *   cash − bills due in the next 14 days − this month's remaining goal
 *   contributions
 *
 * Deliberately conservative and fully explainable — every deduction is shown
 * to the user as a line item, because a number you can't interrogate is a
 * number you won't trust.
 */

export interface SafeToSpendInput {
  cashCents: number;
  /** Bills due within the next 14 days, positive cents. */
  upcomingBills: { name: string; amountCents: number }[];
  /** Goals with an automatic monthly contribution. */
  goals: { name: string; monthlyContribCents: number }[];
  /** Cents already moved to savings/investing this month. */
  savedThisMonthCents: number;
}

export interface SafeToSpendResult {
  safeCents: number;
  breakdown: { label: string; cents: number }[]; // negative = deduction
}

export function computeSafeToSpend(i: SafeToSpendInput): SafeToSpendResult {
  const billsTotal = i.upcomingBills.reduce((a, b) => a + b.amountCents, 0);
  const goalCommit = i.goals.reduce((a, g) => a + g.monthlyContribCents, 0);
  // Contributions already made this month count toward the commitment.
  const goalRemaining = Math.max(0, goalCommit - i.savedThisMonthCents);

  const breakdown = [
    { label: "Cash on hand", cents: i.cashCents },
    { label: `Bills due within 14 days (${i.upcomingBills.length})`, cents: -billsTotal },
    { label: "Goal contributions still to make this month", cents: -goalRemaining },
  ];
  return {
    safeCents: i.cashCents - billsTotal - goalRemaining,
    breakdown,
  };
}
