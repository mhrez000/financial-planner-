"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./db";
import { getDemoUser } from "./data";
import { categorise } from "./domain/categorise";

/** Manual expense/income entry. Auto-categorises when no category chosen. */
export async function addTransaction(formData: FormData) {
  const user = await getDemoUser();
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
  const user = await getDemoUser();
  await prisma.transaction.update({
    where: { id: txnId, userId: user.id },
    data: { categoryId: categoryId || null },
  });
  revalidatePath("/", "layout");
}

/** "Always categorise <pattern> as X" — the rules engine users train themselves. */
export async function addCategoryRule(formData: FormData) {
  const user = await getDemoUser();
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

export async function addGoalContribution(goalId: string, dollars: number) {
  const user = await getDemoUser();
  if (!Number.isFinite(dollars) || dollars <= 0) return;
  await prisma.goal.update({
    where: { id: goalId, userId: user.id },
    data: { savedCents: { increment: Math.round(dollars * 100) } },
  });
  revalidatePath("/goals");
  revalidatePath("/");
}
