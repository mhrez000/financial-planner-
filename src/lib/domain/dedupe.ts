/**
 * Duplicate reconciliation.
 *
 * Used by every ingestion path (bank sync, CSV import, manual entry) so the
 * same transaction arriving twice — a re-delivered webhook, an overlapping
 * CSV export, a pending charge that later posts — never lands twice.
 *
 * Strategy: exact amount + normalised merchant + date within ±1 day.
 * Bank feeds shift posting dates across midnight/weekends, so exact-date
 * matching misses real duplicates; ±1 day with exact amount and merchant is
 * conservative enough that false positives are rare, and the import preview
 * lets users override.
 */

export interface DedupeTxn {
  date: Date;
  amountCents: number;
  merchant: string;
}

const DAY_MS = 86_400_000;

export function normaliseMerchantKey(merchant: string): string {
  return merchant
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\b\d{3,}\b/g, "") // store numbers, references
    .replace(/\s+/g, " ")
    .trim();
}

export function fingerprint(t: DedupeTxn): string {
  return `${t.amountCents}|${normaliseMerchantKey(t.merchant)}`;
}

/**
 * Returns a parallel array: for each incoming transaction, true if it
 * duplicates an existing one (or an earlier incoming one — CSV files often
 * contain their own repeats).
 */
export function markDuplicates(incoming: DedupeTxn[], existing: DedupeTxn[]): boolean[] {
  const seen = new Map<string, number[]>(); // fingerprint -> timestamps
  const add = (t: DedupeTxn) => {
    const key = fingerprint(t);
    const list = seen.get(key) ?? [];
    list.push(t.date.getTime());
    seen.set(key, list);
  };
  for (const t of existing) add(t);

  return incoming.map((t) => {
    const times = seen.get(fingerprint(t)) ?? [];
    const isDupe = times.some((ts) => Math.abs(ts - t.date.getTime()) <= DAY_MS);
    if (!isDupe) add(t); // future incoming rows can duplicate this one
    return isDupe;
  });
}
