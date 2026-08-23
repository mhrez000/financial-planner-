/**
 * Notification engine. Derives alert events from current state — the same
 * function feeds the in-app notification centre today and the FCM/APNs push
 * workers in Phase 2 production, so what you see in-app and what lands on
 * your phone can never disagree.
 */

import { differenceInCalendarDays } from "date-fns";
import { formatAUD } from "./money";
import type { RecurringSeries } from "./recurring";

export type NotificationKind =
  | "bill_due"
  | "budget_exceeded"
  | "budget_warning"
  | "large_purchase"
  | "salary_received"
  | "goal_milestone"
  | "price_increase"
  | "low_balance";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  severity: "info" | "warning" | "critical";
  date: Date;
}

export interface NotificationInputs {
  now: Date;
  cashCents: number;
  bills: { name: string; amountCents: number; nextDueDate: Date; autopay: boolean }[];
  budgets: { name: string; amountCents: number; spentCents: number }[];
  recentTransactions: { merchant: string; amountCents: number; date: Date; categoryGroup: string | null }[];
  goals: { name: string; savedCents: number; targetCents: number }[];
  subscriptions: RecurringSeries[];
  /** Median spend txn size — "large purchase" means 5× this. */
  typicalSpendCents: number;
}

export function generateNotifications(i: NotificationInputs): AppNotification[] {
  const out: AppNotification[] = [];

  // Bills due within 5 days (manual bills escalate)
  for (const b of i.bills) {
    const days = differenceInCalendarDays(b.nextDueDate, i.now);
    if (days < 0 || days > 5) continue;
    out.push({
      id: `bill-${b.name}`,
      kind: "bill_due",
      severity: b.autopay ? "info" : days <= 2 ? "critical" : "warning",
      title: days === 0 ? `${b.name} is due today` : `${b.name} due in ${days} day${days === 1 ? "" : "s"}`,
      body: b.autopay
        ? `${formatAUD(b.amountCents)} will be taken automatically — make sure the balance covers it.`
        : `${formatAUD(b.amountCents)} — this one isn't on autopay, so pay it to dodge a late fee.`,
      date: b.nextDueDate,
    });
  }

  // Budgets exceeded or ≥90%
  for (const b of i.budgets) {
    const frac = b.spentCents / b.amountCents;
    if (frac >= 1) {
      out.push({
        id: `budget-over-${b.name}`,
        kind: "budget_exceeded",
        severity: "warning",
        title: `${b.name} budget exceeded`,
        body: `${formatAUD(b.spentCents)} spent of ${formatAUD(b.amountCents)}. Anything more comes out of next month's fun.`,
        date: i.now,
      });
    } else if (frac >= 0.9) {
      out.push({
        id: `budget-warn-${b.name}`,
        kind: "budget_warning",
        severity: "info",
        title: `${b.name} at ${Math.round(frac * 100)}%`,
        body: `${formatAUD(b.amountCents - b.spentCents)} left for the month — worth pacing.`,
        date: i.now,
      });
    }
  }

  // Recent large purchases & salary (last 7 days)
  for (const t of i.recentTransactions) {
    const age = differenceInCalendarDays(i.now, t.date);
    if (age > 7) continue;
    if (t.amountCents < 0 && Math.abs(t.amountCents) >= i.typicalSpendCents * 5 && t.categoryGroup !== "FINANCIAL") {
      out.push({
        id: `large-${t.merchant}-${t.date.getTime()}`,
        kind: "large_purchase",
        severity: "info",
        title: `Large purchase: ${formatAUD(Math.abs(t.amountCents))}`,
        body: `At ${t.merchant}. Just making sure it was you — and that it was worth it.`,
        date: t.date,
      });
    }
    if (t.amountCents > 0 && t.categoryGroup === "INCOME" && Math.abs(t.amountCents) > 100000) {
      out.push({
        id: `salary-${t.date.getTime()}`,
        kind: "salary_received",
        severity: "info",
        title: `Pay day: ${formatAUD(t.amountCents)} landed`,
        body: "Best moment to move money to goals — future you says thanks.",
        date: t.date,
      });
    }
  }

  // Goal milestones (25/50/75/100%)
  for (const g of i.goals) {
    const frac = g.savedCents / g.targetCents;
    const milestone = [1, 0.75, 0.5, 0.25].find((m) => frac >= m);
    if (milestone) {
      out.push({
        id: `goal-${g.name}-${milestone}`,
        kind: "goal_milestone",
        severity: "info",
        title:
          milestone === 1
            ? `🎉 ${g.name} complete!`
            : `${g.name}: ${Math.round(milestone * 100)}% milestone passed`,
        body: `${formatAUD(g.savedCents)} of ${formatAUD(g.targetCents)} saved. Momentum is the whole game.`,
        date: i.now,
      });
    }
  }

  // Subscription price rises
  for (const s of i.subscriptions.filter((s) => s.priceIncreased)) {
    out.push({
      id: `price-${s.merchant}`,
      kind: "price_increase",
      severity: "warning",
      title: `${s.merchant} charged more than usual`,
      body: `Latest charge ${formatAUD(s.amountCents)} (${s.cadence.toLowerCase()}). Check whether the plan changed.`,
      date: s.lastPayment,
    });
  }

  // Low balance vs upcoming week of bills
  const weekBills = i.bills
    .filter((b) => differenceInCalendarDays(b.nextDueDate, i.now) <= 7)
    .reduce((a, b) => a + b.amountCents, 0);
  if (i.cashCents < weekBills) {
    out.push({
      id: "low-balance",
      kind: "low_balance",
      severity: "critical",
      title: "Balance may not cover this week's bills",
      body: `${formatAUD(i.cashCents)} cash vs ${formatAUD(weekBills)} due within 7 days.`,
      date: i.now,
    });
  }

  const rank = { critical: 0, warning: 1, info: 2 };
  return out.sort((a, b) => rank[a.severity] - rank[b.severity] || b.date.getTime() - a.date.getTime());
}
