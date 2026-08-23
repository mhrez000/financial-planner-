/**
 * The ingestion pipeline shared by every way transactions enter Sage:
 * bank sync, CSV import (and, trivially, manual entry).
 *
 *   fetch/parse → categorise (user rules → knowledge base) → dedupe → insert
 *   → update balance → stamp sync cursor
 *
 * In production this body runs inside a Temporal/BullMQ worker triggered by
 * schedule or webhook; here it runs in a server action. Same code either way.
 */

import { prisma } from "../db";
import { categorise, type Rule } from "../domain/categorise";
import { markDuplicates, type DedupeTxn } from "../domain/dedupe";
import type { BankProvider, BankTxn } from "./provider";
import { DemoBankProvider } from "./provider";

export interface SyncResult {
  accountName: string;
  fetched: number;
  imported: number;
  duplicatesSkipped: number;
}

async function loadUserRules(userId: string): Promise<Rule[]> {
  const rules = await prisma.categoryRule.findMany({
    where: { userId },
    include: { category: true },
  });
  return rules.map((r) => ({ pattern: r.pattern, categoryName: r.category.name, priority: r.priority }));
}

/**
 * Insert a batch of already-parsed transactions for one account, with
 * categorisation and duplicate suppression. Returns counts for the UI.
 */
export async function ingestTransactions(
  userId: string,
  accountId: string,
  incoming: BankTxn[],
): Promise<{ imported: number; duplicatesSkipped: number }> {
  if (incoming.length === 0) return { imported: 0, duplicatesSkipped: 0 };

  const userRules = await loadUserRules(userId);
  const categories = await prisma.category.findMany({ where: { userId } });
  const catId = new Map(categories.map((c) => [c.name, c.id]));

  // Compare against the surrounding window of existing txns only
  const minDate = new Date(Math.min(...incoming.map((t) => t.date.getTime())) - 2 * 86400_000);
  const maxDate = new Date(Math.max(...incoming.map((t) => t.date.getTime())) + 2 * 86400_000);
  const existing = await prisma.transaction.findMany({
    where: { userId, date: { gte: minDate, lte: maxDate } },
    select: { date: true, amountCents: true, merchant: true },
  });

  const dupes = markDuplicates(
    incoming.map((t): DedupeTxn => ({ date: t.date, amountCents: t.amountCents, merchant: t.merchant })),
    existing,
  );

  const fresh = incoming.filter((_, i) => !dupes[i]);
  if (fresh.length > 0) {
    await prisma.transaction.createMany({
      data: fresh.map((t) => {
        const categoryName = categorise(t.merchant, t.description, userRules);
        return {
          userId,
          accountId,
          date: t.date,
          amountCents: t.amountCents,
          merchant: t.merchant,
          description: t.description,
          categoryId: categoryName ? catId.get(categoryName) ?? null : null,
        };
      }),
    });
    const delta = fresh.reduce((a, t) => a + t.amountCents, 0);
    await prisma.account.update({
      where: { id: accountId },
      data: { balanceCents: { increment: delta } },
    });
  }

  return { imported: fresh.length, duplicatesSkipped: dupes.filter(Boolean).length };
}

/** Run a sync across all feed-connected accounts for a user. */
export async function syncAccounts(
  userId: string,
  provider: BankProvider = new DemoBankProvider(),
): Promise<SyncResult[]> {
  const now = new Date();
  const accounts = await prisma.account.findMany({
    where: { userId, type: { in: ["TRANSACTION", "CREDIT_CARD"] } },
  });

  const results: SyncResult[] = [];
  for (const account of accounts) {
    const since = account.lastSyncedAt ?? new Date(now.getTime() - 3 * 86400_000);
    const fetched = await provider.fetchTransactions(account.id, since, now);
    const { imported, duplicatesSkipped } = await ingestTransactions(userId, account.id, fetched);
    await prisma.account.update({ where: { id: account.id }, data: { lastSyncedAt: now } });
    results.push({ accountName: account.name, fetched: fetched.length, imported, duplicatesSkipped });
  }
  return results;
}
