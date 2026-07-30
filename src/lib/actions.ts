"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./db";
import { getSessionUser } from "./data";
import { categorise } from "./domain/categorise";
import { parseTransactionsCsv } from "./domain/csv";
import { markDuplicates } from "./domain/dedupe";
import { ingestTransactions, syncAccounts, type SyncResult } from "./bank/sync";
import { CHALLENGE_DEFS } from "./domain/challenges";
import { ALLOWED_RECEIPT_TYPES, MAX_RECEIPT_BYTES, receiptKeyFor, storage } from "./storage";
import { generateInviteCode, normaliseInviteCode } from "./domain/household";
import { ruleBasedProvider, type CoachAnswer } from "./domain/coach";
import { getCoachContext } from "./data";

/**
 * Sage Coach Q&A. The rule-based provider answers offline from the user's
 * real numbers; a Claude-backed provider slots in here (same interface, same
 * context object — aggregates only, never raw transactions).
 */
export async function askCoach(question: string): Promise<CoachAnswer> {
  const trimmed = question.trim().slice(0, 300);
  const ctx = await getCoachContext();
  return ruleBasedProvider.ask(trimmed, ctx);
}

/** "Sync now" — runs the full bank pipeline against the demo CDR provider. */
export async function syncNow(): Promise<SyncResult[]> {
  const user = await getSessionUser();
  const results = await syncAccounts(user.id);
  revalidatePath("/", "layout");
  return results;
}

export interface CsvPreviewRow {
  dateISO: string;
  amountCents: number;
  merchant: string;
  categoryName: string | null;
  duplicate: boolean;
}

export interface CsvPreview {
  rows: CsvPreviewRow[];
  skipped: { line: number; reason: string }[];
}

/** Parse + categorise + dedupe a CSV without importing — powers the preview table. */
export async function previewCsv(text: string): Promise<CsvPreview> {
  const user = await getSessionUser();
  const { rows, skipped } = parseTransactionsCsv(text);
  if (rows.length === 0) return { rows: [], skipped };

  const rules = await prisma.categoryRule.findMany({ where: { userId: user.id }, include: { category: true } });
  const userRules = rules.map((r) => ({ pattern: r.pattern, categoryName: r.category.name, priority: r.priority }));

  const minDate = new Date(Math.min(...rows.map((r) => r.date.getTime())) - 2 * 86400_000);
  const maxDate = new Date(Math.max(...rows.map((r) => r.date.getTime())) + 2 * 86400_000);
  const existing = await prisma.transaction.findMany({
    where: { userId: user.id, date: { gte: minDate, lte: maxDate } },
    select: { date: true, amountCents: true, merchant: true },
  });
  const dupes = markDuplicates(rows, existing);

  return {
    rows: rows.map((r, i) => ({
      dateISO: r.date.toISOString(),
      amountCents: r.amountCents,
      merchant: r.merchant,
      categoryName: categorise(r.merchant, "", userRules),
      duplicate: dupes[i],
    })),
    skipped,
  };
}

/** Import a CSV through the shared ingestion pipeline (categorise + dedupe). */
export async function importCsv(
  text: string,
  accountId: string,
): Promise<{ imported: number; duplicatesSkipped: number }> {
  const user = await getSessionUser();
  const { rows } = parseTransactionsCsv(text);
  const result = await ingestTransactions(
    user.id,
    accountId,
    rows.map((r) => ({ date: r.date, amountCents: r.amountCents, merchant: r.merchant, description: "CSV import" })),
  );
  revalidatePath("/", "layout");
  return result;
}

/** Manual expense/income entry. Auto-categorises when no category chosen. */
export async function addTransaction(formData: FormData) {
  const user = await getSessionUser();
  const merchant = String(formData.get("merchant") ?? "").trim();
  const amount = Number(formData.get("amount"));
  const kind = String(formData.get("kind") ?? "expense");
  const accountId = String(formData.get("accountId") ?? "");
  const dateRaw = String(formData.get("date") ?? "");
  let categoryId = String(formData.get("categoryId") ?? "");

  if (!merchant || !Number.isFinite(amount) || amount <= 0 || !accountId) return;

  if (!categoryId) {
    const rules = await prisma.categoryRule.findMany({ where: { userId: user.id }, include: { category: true } });
    const name = categorise(
      merchant,
      "",
      rules.map((r) => ({ pattern: r.pattern, categoryName: r.category.name, priority: r.priority })),
    );
    if (name) {
      const cat = await prisma.category.findUnique({
        where: { userId_name: { userId: user.id, name } },
      });
      categoryId = cat?.id ?? "";
    }
  }

  const amountCents = Math.round(amount * 100) * (kind === "expense" ? -1 : 1);
  await prisma.transaction.create({
    data: {
      userId: user.id,
      accountId,
      merchant,
      amountCents,
      date: dateRaw ? new Date(dateRaw) : new Date(),
      categoryId: categoryId || null,
    },
  });
  await prisma.account.update({
    where: { id: accountId },
    data: { balanceCents: { increment: amountCents } },
  });
  revalidatePath("/", "layout");
}

export async function setTransactionCategory(txnId: string, categoryId: string) {
  const user = await getSessionUser();
  await prisma.transaction.update({
    where: { id: txnId, userId: user.id },
    data: { categoryId: categoryId || null },
  });
  revalidatePath("/", "layout");
}

/** "Always categorise <pattern> as X" — the rules engine users train themselves. */
export async function addCategoryRule(formData: FormData) {
  const user = await getSessionUser();
  const pattern = String(formData.get("pattern") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "");
  if (!pattern || !categoryId) return;
  await prisma.categoryRule.create({
    data: { userId: user.id, pattern, categoryId, priority: 10 },
  });
  // Re-categorise existing matches so the rule pays off immediately
  const txns = await prisma.transaction.findMany({ where: { userId: user.id } });
  const hits = txns.filter((t) =>
    `${t.merchant} ${t.description}`.toUpperCase().includes(pattern.toUpperCase()),
  );
  await prisma.transaction.updateMany({
    where: { id: { in: hits.map((t) => t.id) } },
    data: { categoryId },
  });
  revalidatePath("/", "layout");
}

export async function toggleHabitToday(habitId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const existing = await prisma.habitLog.findUnique({
    where: { habitId_date: { habitId, date: today } },
  });
  if (existing) {
    await prisma.habitLog.delete({ where: { id: existing.id } });
  } else {
    await prisma.habitLog.create({ data: { habitId, date: today } });
  }
  revalidatePath("/habits");
}

/** Attach a receipt photo/PDF to a transaction (5MB max, image or PDF). */
export async function attachReceipt(txnId: string, formData: FormData): Promise<{ error: string | null }> {
  const user = await getSessionUser();
  const file = formData.get("receipt");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a file first." };
  if (file.size > MAX_RECEIPT_BYTES) return { error: "Receipts are capped at 5MB." };
  if (!ALLOWED_RECEIPT_TYPES.includes(file.type)) return { error: "JPEG, PNG, WebP or PDF only." };

  const txn = await prisma.transaction.findUnique({ where: { id: txnId, userId: user.id } });
  if (!txn) return { error: "Transaction not found." };

  const key = receiptKeyFor(user.id, txnId, file.type);
  if (!key) return { error: "Unsupported file type." };
  await storage.put(key, { bytes: Buffer.from(await file.arrayBuffer()), contentType: file.type });
  await prisma.transaction.update({ where: { id: txnId }, data: { receiptKey: key } });
  revalidatePath("/transactions");
  return { error: null };
}

/** Tax Centre: flip the deductible flag on a transaction. */
export async function toggleTaxDeductible(txnId: string) {
  const user = await getSessionUser();
  const txn = await prisma.transaction.findUnique({ where: { id: txnId, userId: user.id } });
  if (!txn) return;
  await prisma.transaction.update({
    where: { id: txnId },
    data: { taxDeductible: !txn.taxDeductible },
  });
  revalidatePath("/tax");
}

/** Join a savings challenge starting today. */
export async function joinChallenge(type: string) {
  const user = await getSessionUser();
  const def = CHALLENGE_DEFS.find((d) => d.type === type);
  if (!def) return;
  const active = await prisma.challenge.findFirst({
    where: { userId: user.id, type, status: "ACTIVE" },
  });
  if (active) return; // one at a time per challenge type

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + def.durationDays * 86400_000 - 1);

  // The Coffee Challenge cap is personal: half of the last 30 days' coffee spend
  let targetCents: number | null = null;
  if (type === "COFFEE_CHALLENGE") {
    const monthAgo = new Date(start.getTime() - 30 * 86400_000);
    const coffee = await prisma.transaction.findMany({
      where: { userId: user.id, date: { gte: monthAgo }, amountCents: { lt: 0 }, category: { name: "Coffee" } },
    });
    const recentSpend = coffee.reduce((a, t) => a + Math.abs(t.amountCents), 0);
    targetCents = Math.max(500, Math.round(recentSpend / 2));
  }

  await prisma.challenge.create({
    data: { userId: user.id, type, startDate: start, endDate: end, targetCents, xp: def.xp },
  });
  revalidatePath("/habits");
}

/** Claim a finished challenge (locks in the XP) or abandon an active one. */
export async function resolveChallenge(challengeId: string, outcome: "COMPLETED" | "FAILED" | "ABANDONED") {
  const user = await getSessionUser();
  await prisma.challenge.update({
    where: { id: challengeId, userId: user.id, status: "ACTIVE" },
    data: { status: outcome },
  });
  revalidatePath("/habits");
}

/** Create a household and become its owner. */
export async function createHousehold(formData: FormData) {
  const user = await getSessionUser();
  if (user.householdId) return;
  const name = String(formData.get("name") ?? "").trim() || `${user.name.split(" ")[0]}'s household`;
  const household = await prisma.household.create({
    data: { name, inviteCode: generateInviteCode() },
  });
  await prisma.user.update({
    where: { id: user.id },
    data: { householdId: household.id, householdRole: "OWNER" },
  });
  revalidatePath("/household");
}

export async function joinHousehold(
  _prev: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const user = await getSessionUser();
  if (user.householdId) return { error: "You're already in a household — leave it first." };
  const code = normaliseInviteCode(String(formData.get("code") ?? ""));
  if (code.length !== 8) return { error: "Invite codes are 8 characters." };
  const household = await prisma.household.findUnique({ where: { inviteCode: code } });
  if (!household) return { error: "That code doesn't match a household." };
  await prisma.user.update({
    where: { id: user.id },
    data: { householdId: household.id, householdRole: "MEMBER" },
  });
  revalidatePath("/household");
  return { error: null };
}

/** Leave the household; unshares your accounts on the way out. */
export async function leaveHousehold() {
  const user = await getSessionUser();
  if (!user.householdId) return;
  await prisma.account.updateMany({ where: { userId: user.id }, data: { shared: false } });
  await prisma.user.update({
    where: { id: user.id },
    data: { householdId: null, householdRole: "MEMBER" },
  });
  revalidatePath("/household");
}

/** Flip an account's household visibility. Owners decide, per account. */
export async function toggleAccountShared(accountId: string) {
  const user = await getSessionUser();
  const account = await prisma.account.findUnique({ where: { id: accountId, userId: user.id } });
  if (!account) return;
  await prisma.account.update({ where: { id: accountId }, data: { shared: !account.shared } });
  revalidatePath("/household");
}

export async function addGoalContribution(goalId: string, dollars: number) {
  const user = await getSessionUser();
  if (!Number.isFinite(dollars) || dollars <= 0) return;
  await prisma.goal.update({
    where: { id: goalId, userId: user.id },
    data: { savedCents: { increment: Math.round(dollars * 100) } },
  });
  revalidatePath("/goals");
  revalidatePath("/");
}
