/**
 * Bank connection abstraction.
 *
 * In production this fronts an accredited CDR intermediary (Basiq / Frollo /
 * Adatree): `fetchTransactions` pulls the delta since the sync cursor and the
 * pipeline in sync.ts does the rest. The pipeline is provider-agnostic on
 * purpose — CSV import and manual entry flow through the same normalise →
 * categorise → dedupe steps, so swapping the demo provider for a real one
 * changes exactly one file.
 */

export interface BankTxn {
  date: Date;
  amountCents: number;
  merchant: string;
  description: string;
}

export interface BankProvider {
  readonly name: string;
  /** Fetch transactions for an account since the given cursor (exclusive). */
  fetchTransactions(accountExternalRef: string, since: Date, now: Date): Promise<BankTxn[]>;
}

/**
 * Demo provider: deterministically simulates the trickle of everyday
 * transactions a real feed would deliver, so "Sync now" exercises the entire
 * production pipeline (including duplicate suppression on repeated syncs).
 */
export class DemoBankProvider implements BankProvider {
  readonly name = "Demo CDR feed";

  async fetchTransactions(ref: string, since: Date, now: Date): Promise<BankTxn[]> {
    const out: BankTxn[] = [];
    const pool: [string, number][] = [
      ["SINGLE ORIGIN CAFE", -650],
      ["WOOLWORTHS 2103 SYDNEY", -6820],
      ["OPAL TRANSPORT NSW", -1240],
      ["UBER EATS SYDNEY", -4390],
      ["CHEMIST WAREHOUSE EPPING", -2150],
      ["BP 7291 EPPING", -7810],
      ["KMART 1054 TOP RYDE", -3499],
    ];
    // One plausible transaction per ~8 waking hours elapsed since last sync,
    // capped at 6; deterministic per (ref, day, slot) so re-syncs overlap and
    // the dedupe stage visibly earns its keep.
    const hours = Math.max(0, (now.getTime() - since.getTime()) / 3_600_000);
    const count = Math.min(6, Math.floor(hours / 8));
    for (let i = 0; i < count; i++) {
      const slotTime = new Date(since.getTime() + (i + 1) * 8 * 3_600_000);
      const seed = (ref.charCodeAt(0) + slotTime.getUTCDate() * 7 + i * 13) % pool.length;
      const [merchant, cents] = pool[seed];
      out.push({
        date: slotTime > now ? now : slotTime,
        amountCents: cents,
        merchant,
        description: `${this.name} import`,
      });
    }
    return out;
  }
}
