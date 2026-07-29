/**
 * Server-side data access. Every page reads through these functions, which
 * combine Prisma queries with the pure domain engines. All queries are scoped
 * to the authenticated session user; API routes use `getSessionUserOrNull`
 * and return 401 instead of redirecting.
 */

import { endOfMonth, startOfMonth, subMonths } from "date-fns";
import { prisma } from "./db";
import { computeHealthScore, type HealthScore } from "./domain/healthScore";
import { detectRecurring, type RecurringSeries } from "./domain/recurring";
import { forecastEndOfMonth, forecastGoal } from "./domain/forecast";
import { generateInsights, type Insight } from "./domain/insights";
import { generateNotifications } from "./domain/notifications";
import { median } from "./domain/money";
import { getSessionUserId } from "./auth";
import { redirect } from "next/navigation";
import { summarisePortfolio } from "./domain/portfolio";
import { currentFinancialYear, financialYear } from "./domain/tax";
import { CHALLENGE_DEFS, evaluateChallenge, type ChallengeType } from "./domain/challenges";

/** The authenticated user, or a redirect to /login. Every query scopes to this. */
export async function getSessionUser() {
  const userId = getSessionUserId();
  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) return user;
  }
  redirect("/login");
}

/** Session user for API routes, which return 401 instead of redirecting. */
export async function getSessionUserOrNull() {
  const userId = getSessionUserId();
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId } });
}

type TxnWithCategory = Awaited<ReturnType<typeof getAllTransactions>>[number];

async function getAllTransactions(userId: string) {
  return prisma.transaction.findMany({
    where: { userId },
    include: { category: true },
    orderBy: { date: "desc" },
  });
}

const isSpend = (t: { amountCents: number; category: { group: string } | null }) =>
  t.amountCents < 0 && t.category?.group !== "FINANCIAL";
const isIncome = (t: { amountCents: number; category: { group: string } | null }) =>
  t.amountCents > 0 && t.category?.group === "INCOME";
const isSaved = (t: { amountCents: number; category: { group: string } | null }) =>
  t.amountCents < 0 && t.category?.group === "FINANCIAL";

function inRange(t: { date: Date }, from: Date, to: Date) {
  return t.date >= from && t.date <= to;
}

function monthWindow(offset: number, now = new Date()) {
  const base = subMonths(now, offset);
  return { from: startOfMonth(base), to: endOfMonth(base) };
}

export interface SpendSummary {
  incomeCents: number;
  spendCents: number; // positive
  savedCents: number; // positive
}

function summarise(txns: TxnWithCategory[]): SpendSummary {
  let income = 0,
    spend = 0,
    saved = 0;
  for (const t of txns) {
    if (isIncome(t)) income += t.amountCents;
    else if (isSaved(t)) saved += Math.abs(t.amountCents);
    else if (isSpend(t)) spend += Math.abs(t.amountCents);
  }
  return { incomeCents: income, spendCents: spend, savedCents: saved };
}

export async function getSubscriptions(): Promise<RecurringSeries[]> {
  const user = await getSessionUser();
  const txns = await getAllTransactions(user.id);
  // Subscriptions = recurring spends that aren't loan repayments or savings automation
  const candidates = txns.filter(
    (t) => t.category?.group !== "FINANCIAL" && !["Mortgage", "Rent"].includes(t.category?.name ?? ""),
  );
  return detectRecurring(
    candidates.map((t) => ({ id: t.id, date: t.date, amountCents: t.amountCents, merchant: t.merchant })),
    new Date(),
  );
}

export async function getDashboard() {
  const user = await getSessionUser();
  const now = new Date();
  const txns = await getAllTransactions(user.id);

  const cur = monthWindow(0, now);
  const prev = monthWindow(1, now);
  const curTxns = txns.filter((t) => inRange(t, cur.from, cur.to));
  const prevTxns = txns.filter((t) => inRange(t, prev.from, prev.to));
  const curSummary = summarise(curTxns);
  const prevSummary = summarise(prevTxns);

  const accounts = await prisma.account.findMany({ where: { userId: user.id } });
  const cashCents = accounts
    .filter((a) => ["TRANSACTION", "SAVINGS"].includes(a.type))
    .reduce((acc, a) => acc + a.balanceCents, 0);
  const assets = accounts.filter((a) => a.balanceCents > 0).reduce((a, b) => a + b.balanceCents, 0);
  const liabilities = accounts.filter((a) => a.balanceCents < 0).reduce((a, b) => a + b.balanceCents, 0);

  const bills = await prisma.bill.findMany({
    where: { userId: user.id },
    orderBy: { nextDueDate: "asc" },
  });
  const billsDueThisMonth = bills.filter((b) => b.nextDueDate <= cur.to);

  const goals = await prisma.goal.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } });
  const goalsWithForecast = goals.map((g) => ({
    ...g,
    forecast: forecastGoal(g.targetCents, g.savedCents, g.monthlyContribCents, g.deadline, now),
  }));

  const subscriptions = await getSubscriptions();

  // Budgets & adherence
  const budgets = await prisma.budget.findMany({ where: { userId: user.id }, include: { category: true } });
  const spendByCat = new Map<string, number>();
  for (const t of curTxns) {
    if (!isSpend(t) || !t.categoryId) continue;
    spendByCat.set(t.categoryId, (spendByCat.get(t.categoryId) ?? 0) + Math.abs(t.amountCents));
  }
  const dayOfMonth = now.getDate();
  const daysInMonth = endOfMonth(now).getDate();
  const budgetsWithSpend = budgets.map((b) => {
    const spent = spendByCat.get(b.categoryId) ?? 0;
    // "On track" = pro-rata pace with 10% grace, not just under the full cap
    const pace = (b.amountCents * dayOfMonth) / daysInMonth;
    return { ...b, spentCents: spent, onTrack: spent <= pace * 1.1 };
  });

  // Health score built on the previous full month (stable, not mid-month noise)
  const essentials = prevTxns
    .filter((t) => isSpend(t) && t.category?.group === "ESSENTIAL")
    .reduce((a, t) => a + Math.abs(t.amountCents), 0);
  const debts = await prisma.debt.findMany({ where: { userId: user.id } });
  const nonMortgageDebtPayment = debts
    .filter((d) => d.type !== "MORTGAGE")
    .reduce((a, d) => a + d.minPaymentCents, 0);
  const health: HealthScore = computeHealthScore({
    monthlyIncomeCents: prevSummary.incomeCents,
    monthlySpendCents: prevSummary.spendCents,
    monthlySavedCents: prevSummary.savedCents,
    cashCents,
    essentialMonthlySpendCents: essentials,
    nonMortgageDebtMonthlyPaymentCents: nonMortgageDebtPayment,
    budgetsOnTrack: budgetsWithSpend.filter((b) => b.onTrack).length,
    budgetsTotal: budgetsWithSpend.length,
    subscriptionMonthlyCents: subscriptions.reduce((a, s) => a + s.monthlyCostCents, 0),
  });

  const insights: Insight[] = generateInsights(
    {
      current: curTxns.map((t) => ({ date: t.date, amountCents: t.amountCents, merchant: t.merchant, categoryName: t.category?.name ?? null })),
      previous: prevTxns.map((t) => ({ date: t.date, amountCents: t.amountCents, merchant: t.merchant, categoryName: t.category?.name ?? null })),
    },
    subscriptions,
    { savingsRate: prevSummary.incomeCents > 0 ? prevSummary.savedCents / prevSummary.incomeCents : 0 },
  );

  // End-of-month forecast
  const paydaysLeft = [3, 17].filter((d) => d > now.getDate()).length;
  const upcomingBills = billsDueThisMonth.reduce((a, b) => a + b.amountCents, 0);
  const eom = forecastEndOfMonth(cashCents, curSummary.spendCents, upcomingBills, paydaysLeft * 446000, now);

  // 6-month income/spend series for the cash-flow chart
  const cashflow = Array.from({ length: 6 }, (_, i) => {
    const w = monthWindow(5 - i, now);
    const s = summarise(txns.filter((t) => inRange(t, w.from, w.to)));
    return {
      month: w.from.toLocaleString("en-AU", { month: "short" }),
      income: s.incomeCents / 100,
      spending: s.spendCents / 100,
      saved: s.savedCents / 100,
    };
  });

  const snapshots = await prisma.netWorthSnapshot.findMany({
    where: { userId: user.id },
    orderBy: { date: "asc" },
  });

  return {
    user,
    accounts,
    cashCents,
    netWorthCents: assets + liabilities,
    curSummary,
    prevSummary,
    billsDueThisMonth,
    bills,
    goals: goalsWithForecast,
    subscriptions,
    budgets: budgetsWithSpend,
    health,
    insights,
    eom,
    cashflow,
    snapshots,
    recentTransactions: txns.slice(0, 8),
  };
}

export async function getTransactionsPage(query?: string, categoryId?: string) {
  const user = await getSessionUser();
  const txns = await prisma.transaction.findMany({
    where: {
      userId: user.id,
      ...(categoryId ? { categoryId } : {}),
      ...(query
        ? { OR: [{ merchant: { contains: query } }, { description: { contains: query } }] }
        : {}),
    },
    include: { category: true, account: true },
    orderBy: { date: "desc" },
    take: 120,
  });
  const categories = await prisma.category.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } });
  const accounts = await prisma.account.findMany({
    where: { userId: user.id, type: { in: ["TRANSACTION", "SAVINGS", "CREDIT_CARD"] } },
  });
  return { txns, categories, accounts };
}

export async function getAnalytics() {
  const user = await getSessionUser();
  const now = new Date();
  const txns = await getAllTransactions(user.id);

  const months = Array.from({ length: 6 }, (_, i) => {
    const w = monthWindow(5 - i, now);
    const monthTxns = txns.filter((t) => inRange(t, w.from, w.to));
    const byCat = new Map<string, number>();
    for (const t of monthTxns) {
      if (!isSpend(t)) continue;
      const name = t.category?.name ?? "Other";
      byCat.set(name, (byCat.get(name) ?? 0) + Math.abs(t.amountCents));
    }
    return { label: w.from.toLocaleString("en-AU", { month: "short" }), byCat, ...summarise(monthTxns) };
  });

  // Current-month category breakdown
  const cur = months[months.length - 1];
  const categoryBreakdown = [...cur.byCat.entries()]
    .map(([name, cents]) => ({ name, value: cents / 100 }))
    .sort((a, b) => b.value - a.value);

  // Weekday profile (last 90 days)
  const cutoff = new Date(now.getTime() - 90 * 86400_000);
  const recent = txns.filter((t) => t.date >= cutoff && isSpend(t));
  const weekday = Array.from({ length: 7 }, (_, i) => ({
    day: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i],
    total: 0,
  }));
  for (const t of recent) {
    const idx = (t.date.getDay() + 6) % 7;
    weekday[idx].total += Math.abs(t.amountCents) / 100;
  }

  // Calendar heat map — daily spend for current month
  const w = monthWindow(0, now);
  const daily = new Map<number, number>();
  for (const t of txns) {
    if (!inRange(t, w.from, w.to) || !isSpend(t)) continue;
    const d = t.date.getDate();
    daily.set(d, (daily.get(d) ?? 0) + Math.abs(t.amountCents));
  }

  const largest = [...txns]
    .filter((t) => isSpend(t) && t.date >= cutoff)
    .sort((a, b) => a.amountCents - b.amountCents)
    .slice(0, 6);

  // Merchant analysis (90 days)
  const byMerchant = new Map<string, { total: number; count: number }>();
  for (const t of recent) {
    const key = t.merchant.replace(/\s+\d+.*$/, "").trim();
    const entry = byMerchant.get(key) ?? { total: 0, count: 0 };
    entry.total += Math.abs(t.amountCents);
    entry.count++;
    byMerchant.set(key, entry);
  }
  const topMerchants = [...byMerchant.entries()]
    .map(([merchant, v]) => ({ merchant, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  return {
    trend: months.map((m) => ({
      month: m.label,
      income: m.incomeCents / 100,
      spending: m.spendCents / 100,
    })),
    categoryBreakdown,
    weekday,
    daily,
    daysInMonth: endOfMonth(now).getDate(),
    largest,
    topMerchants,
  };
}

export async function getDebtsPage() {
  const user = await getSessionUser();
  return prisma.debt.findMany({ where: { userId: user.id }, orderBy: { balanceCents: "desc" } });
}

export async function getNotifications() {
  const d = await getDashboard();
  const user = d.user;
  const weekAgo = new Date(Date.now() - 7 * 86400_000);
  const recent = await prisma.transaction.findMany({
    where: { userId: user.id, date: { gte: weekAgo } },
    include: { category: true },
  });
  const ninetyDays = new Date(Date.now() - 90 * 86400_000);
  const spends = await prisma.transaction.findMany({
    where: { userId: user.id, date: { gte: ninetyDays }, amountCents: { lt: 0 } },
    select: { amountCents: true },
  });
  const typical = median(spends.map((t) => Math.abs(t.amountCents)));

  return generateNotifications({
    now: new Date(),
    cashCents: d.cashCents,
    bills: d.bills,
    budgets: d.budgets.map((b) => ({ name: b.category.name, amountCents: b.amountCents, spentCents: b.spentCents })),
    recentTransactions: recent.map((t) => ({
      merchant: t.merchant,
      amountCents: t.amountCents,
      date: t.date,
      categoryGroup: t.category?.group ?? null,
    })),
    goals: d.goals.map((g) => ({ name: g.name, savedCents: g.savedCents, targetCents: g.targetCents })),
    subscriptions: d.subscriptions,
    typicalSpendCents: Math.max(typical, 1000),
  });
}

/** Month summary for the Reports page. offset 0 = current month. */
export async function getMonthlyReport(offset: number) {
  const user = await getSessionUser();
  const now = new Date();
  const txns = await getAllTransactions(user.id);
  const w = monthWindow(offset, now);
  const prevW = monthWindow(offset + 1, now);
  const monthTxns = txns.filter((t) => inRange(t, w.from, w.to));
  const prevTxns = txns.filter((t) => inRange(t, prevW.from, prevW.to));

  const byCat = (list: TxnWithCategory[]) => {
    const map = new Map<string, number>();
    for (const t of list) {
      if (!isSpend(t)) continue;
      const name = t.category?.name ?? "Uncategorised";
      map.set(name, (map.get(name) ?? 0) + Math.abs(t.amountCents));
    }
    return map;
  };
  const cur = byCat(monthTxns);
  const prev = byCat(prevTxns);
  const categories = [...cur.entries()]
    .map(([name, cents]) => ({ name, cents, prevCents: prev.get(name) ?? 0 }))
    .sort((a, b) => b.cents - a.cents);

  return {
    label: w.from.toLocaleDateString("en-AU", { month: "long", year: "numeric" }),
    from: w.from,
    summary: summarise(monthTxns),
    prevSummary: summarise(prevTxns),
    categories,
    transactionCount: monthTxns.length,
  };
}

export async function getInvestmentsPage() {
  const user = await getSessionUser();
  const holdings = await prisma.holding.findMany({ where: { userId: user.id } });
  const dividends = await prisma.transaction.findMany({
    where: { userId: user.id, category: { name: "Investment Income" } },
    orderBy: { date: "desc" },
    take: 8,
  });
  const superAccounts = await prisma.account.findMany({ where: { userId: user.id, type: "SUPER" } });
  return {
    portfolio: summarisePortfolio(holdings),
    priceAsOf: holdings[0]?.priceAsOf ?? null,
    dividends,
    superCents: superAccounts.reduce((a, s) => a + s.balanceCents, 0),
  };
}

export async function getTaxPage(fyEndYear?: number) {
  const user = await getSessionUser();
  const now = new Date();
  const fy = fyEndYear ? financialYear(fyEndYear) : currentFinancialYear(now);
  const [deductible, candidates] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId: user.id, taxDeductible: true, date: { gte: fy.from, lte: fy.to } },
      include: { category: true },
      orderBy: { date: "desc" },
    }),
    // Likely-deductible suggestions: common work-related categories, not yet marked
    prisma.transaction.findMany({
      where: {
        userId: user.id,
        taxDeductible: false,
        amountCents: { lt: 0 },
        date: { gte: fy.from, lte: fy.to },
        category: { name: { in: ["Education", "Phone & Internet", "Medical", "Transport"] } },
      },
      include: { category: true },
      orderBy: { date: "desc" },
      take: 6,
    }),
  ]);
  const byCategory = new Map<string, number>();
  for (const t of deductible) {
    const name = t.category?.name ?? "Other";
    byCategory.set(name, (byCategory.get(name) ?? 0) + Math.abs(t.amountCents));
  }
  const incomeTxns = await prisma.transaction.findMany({
    where: { userId: user.id, amountCents: { gt: 0 }, date: { gte: fy.from, lte: fy.to }, category: { group: "INCOME" } },
  });
  return {
    fy,
    deductible,
    candidates,
    totalDeductibleCents: deductible.reduce((a, t) => a + Math.abs(t.amountCents), 0),
    incomeCents: incomeTxns.reduce((a, t) => a + t.amountCents, 0),
    byCategory: [...byCategory.entries()].map(([name, cents]) => ({ name, cents })).sort((a, b) => b.cents - a.cents),
  };
}

export async function getChallengesPage() {
  const user = await getSessionUser();
  const now = new Date();
  const challenges = await prisma.challenge.findMany({
    where: { userId: user.id },
    orderBy: { startDate: "desc" },
  });
  const oldest = challenges.reduce<Date | null>((min, c) => (!min || c.startDate < min ? c.startDate : min), null);
  const txns = oldest
    ? await prisma.transaction.findMany({
        where: { userId: user.id, date: { gte: oldest } },
        include: { category: true },
      })
    : [];
  const challengeTxns = txns.map((t) => ({
    date: t.date,
    amountCents: t.amountCents,
    categoryName: t.category?.name ?? null,
    categoryGroup: t.category?.group ?? null,
  }));

  return challenges.map((c) => ({
    ...c,
    def: CHALLENGE_DEFS.find((d) => d.type === c.type)!,
    state: evaluateChallenge(
      c.type as ChallengeType,
      { start: c.startDate, end: c.endDate, targetCents: c.targetCents },
      challengeTxns,
      now,
    ),
  }));
}

export async function getHabitsPage() {
  const user = await getSessionUser();
  const habits = await prisma.habit.findMany({
    where: { userId: user.id },
    include: { logs: { orderBy: { date: "desc" } } },
  });
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return habits.map((h) => {
    // Streak = consecutive logged days walking back from today/yesterday
    let streak = 0;
    const dates = new Set(h.logs.map((l) => new Date(l.date).setHours(0, 0, 0, 0)));
    let cursor = today.getTime();
    if (!dates.has(cursor)) cursor -= 86400_000; // streak survives until today is missed for a full day
    while (dates.has(cursor)) {
      streak++;
      cursor -= 86400_000;
    }
    const doneToday = dates.has(today.getTime());
    return { ...h, streak, doneToday, totalLogs: h.logs.length, xp: h.logs.length * 15 };
  });
}
