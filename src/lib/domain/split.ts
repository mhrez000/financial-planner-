/**
 * Transaction splitting.
 *
 * Semantics chosen so analytics never change shape: splitting carves child
 * transactions out of the original and reduces the original to the
 * remainder. Amounts always sum to the pre-split total, so every existing
 * aggregation (budgets, trends, health score) stays correct with zero
 * special-casing — no double counting, no parent filtering.
 */

export interface SplitPart {
  amountCents: number; // positive magnitude
  categoryId: string;
}

export type SplitPlan =
  | { ok: true; childAmounts: number[]; remainderCents: number }
  | { ok: false; error: string };

/**
 * Validate a split of `originalCents` (signed) into positive part magnitudes.
 * Parts must each be > 0 and sum to strictly less than the original's
 * magnitude — the original always keeps a non-zero remainder, preserving the
 * merchant's presence in history.
 */
export function planSplit(originalCents: number, partCents: number[]): SplitPlan {
  if (partCents.length === 0) return { ok: false, error: "Add at least one split." };
  if (partCents.some((p) => !Number.isInteger(p) || p <= 0)) {
    return { ok: false, error: "Each split needs a positive amount." };
  }
  const magnitude = Math.abs(originalCents);
  const total = partCents.reduce((a, b) => a + b, 0);
  if (total >= magnitude) {
    return {
      ok: false,
      error: `Splits must total less than the original amount (${(magnitude / 100).toFixed(2)}).`,
    };
  }
  const sign = originalCents < 0 ? -1 : 1;
  return {
    ok: true,
    childAmounts: partCents.map((p) => p * sign),
    remainderCents: (magnitude - total) * sign,
  };
}
