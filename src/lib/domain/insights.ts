/**
 * AI Financial Coach — insight engine.
 *
 * A deterministic, explainable rules engine that turns raw transaction data
 * into personalised, behavioural nudges ("you overspend on Fridays", "these
 * subscriptions cost $780/yr"). It runs locally with zero latency and zero
 * data leaving the device/server.
 *
 * Architecture note: an LLM layer (Claude) is designed to sit ON TOP of these
 * structured findings — it receives the insight objects (never raw bank data)
 * and turns them into conversational coaching. Keeping the analytics
 * deterministic makes the numbers trustworthy and auditable while the LLM
 * handles language.
 */

import { formatAUD } from "./money";
import type { RecurringSeries } from "./recurring";

export interface InsightTxn {
  date: Date;
  amountCents: number;
  merchant: string;
  categoryName: string | null;
}

export type InsightSeverity = "celebrate" | "info" | "nudge" | "warning";

export interface Insight {
  id: string;
  severity: InsightSeverity;
  title: string;
  body: string;
  action?: string;
}

interface MonthSlice {
  current: InsightTxn[];
  previous: InsightTxn[];
}

function spendByCategory(txns: InsightTxn[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const t of txns) {
    if (t.amountCents >= 0) continue;
    const key = t.categoryName ?? "Uncategorised";
    map.set(key, (map.get(key) ?? 0) + Math.abs(t.amountCents));
  }
  return map;
}

export function generateInsights(
  slice: MonthSlice,
  recurring: RecurringSeries[],
  opts: { savingsRate: number },
): Insight[] {
  const insights: Insight[] = [];
  const cur = spendByCategory(slice.current);
  const prev = spendByCategory(slice.previous);

  // 1. Category momentum — biggest month-on-month movers (≥15% and ≥$25)
  const movers: { cat: string; delta: number; pct: number }[] = [];
  for (const [cat, amount] of cur) {
    const before = prev.get(cat) ?? 0;
    if (before < 2000) continue;
    const delta = amount - before;
    const pct = delta / before;
    if (Math.abs(pct) >= 0.15 && Math.abs(delta) >= 2500) movers.push({ cat, delta, pct });
  }
  movers.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  for (const m of movers.slice(0, 3)) {
    if (m.delta > 0) {
      insights.push({
        id: `mover-up-${m.cat}`,
        severity: "nudge",
        title: `${m.cat} is up ${(m.pct * 100).toFixed(0)}% this month`,
        body: `You've spent ${formatAUD(m.delta)} more on ${m.cat.toLowerCase()} than last month. Small trims here compound quickly.`,
        action: `Set a ${m.cat} budget`,
      });
    } else {
      insights.push({
        id: `mover-down-${m.cat}`,
        severity: "celebrate",
        title: `${m.cat} is trending down ${(Math.abs(m.pct) * 100).toFixed(0)}%`,
        body: `You spent ${formatAUD(Math.abs(m.delta))} less on ${m.cat.toLowerCase()} than last month. Keep it up!`,
      });
    }
  }

  // 2. Day-of-week overspending pattern
  const daySpend = new Array(7).fill(0);
  const dayCount = new Array(7).fill(0);
  for (const t of [...slice.current, ...slice.previous]) {
    if (t.amountCents >= 0) continue;
    daySpend[t.date.getDay()] += Math.abs(t.amountCents);
    dayCount[t.date.getDay()]++;
  }
  const total = daySpend.reduce((a: number, b: number) => a + b, 0);
  if (total > 0) {
    const maxDay = daySpend.indexOf(Math.max(...daySpend));
    const share = daySpend[maxDay] / total;
    if (share > 0.22) {
      const names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      insights.push({
        id: "day-pattern",
        severity: "nudge",
        title: `${names[maxDay]} is your biggest spending day`,
        body: `${(share * 100).toFixed(0)}% of your recent spending lands on ${names[maxDay]}s. A pre-set ${names[maxDay]} limit is an easy guard-rail.`,
        action: `Create a ${names[maxDay]} spending limit`,
      });
    }
  }

  // 3. Subscription load
  const subAnnual = recurring.reduce((acc, s) => acc + s.annualCostCents, 0);
  if (subAnnual > 50000) {
    insights.push({
      id: "sub-load",
      severity: "info",
      title: `Your subscriptions total ${formatAUD(subAnnual)} a year`,
      body: `That's ${formatAUD(Math.round(subAnnual / 12))} every month across ${recurring.length} recurring services. Cancelling just the two you use least could fund a goal instead.`,
      action: "Review subscriptions",
    });
  }
  const increased = recurring.filter((s) => s.priceIncreased);
  for (const s of increased.slice(0, 2)) {
    insights.push({
      id: `price-up-${s.merchant}`,
      severity: "warning",
      title: `${titleCase(s.merchant)} raised its price`,
      body: `Your latest charge of ${formatAUD(s.amountCents)} is higher than your usual payment. Worth checking whether the plan still earns its keep.`,
      action: "View subscription",
    });
  }

  // 4. Savings rate feedback
  if (opts.savingsRate >= 0.2) {
    insights.push({
      id: "savings-strong",
      severity: "celebrate",
      title: `You're saving ${(opts.savingsRate * 100).toFixed(0)}% of your income`,
      body: "That's ahead of the 20% benchmark — you're building wealth faster than most households.",
    });
  } else if (opts.savingsRate > 0) {
    insights.push({
      id: "savings-nudge",
      severity: "info",
      title: `Savings rate: ${(opts.savingsRate * 100).toFixed(0)}%`,
      body: "Nudging this towards 20% is the single highest-impact change you can make. Automate a payday transfer so saving happens before spending.",
      action: "Set up a payday rule",
    });
  }

  // 5. Late-night spending
  const lateNight = slice.current.filter(
    (t) => t.amountCents < 0 && (t.date.getHours() >= 22 || t.date.getHours() < 5),
  );
  const lateTotal = lateNight.reduce((a, t) => a + Math.abs(t.amountCents), 0);
  if (lateNight.length >= 4 && lateTotal > 10000) {
    insights.push({
      id: "late-night",
      severity: "nudge",
      title: "Late-night purchases add up",
      body: `${lateNight.length} purchases after 10pm this month totalled ${formatAUD(lateTotal)}. Late-night spending is the most commonly regretted kind — a 24-hour wishlist rule helps.`,
    });
  }

  const order: InsightSeverity[] = ["warning", "nudge", "info", "celebrate"];
  return insights.sort((a, b) => order.indexOf(a.severity) - order.indexOf(b.severity));
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
