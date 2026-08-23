/**
 * Financial Health Score — a single 0–100 number answering
 * "how am I doing financially?", plus per-pillar breakdowns with concrete
 * advice so the score is always actionable, never a black box.
 *
 * Pillars (weights sum to 100):
 *   Savings rate        25 — % of income kept (saved or invested)
 *   Emergency fund      20 — months of essential expenses covered by cash
 *   Debt load           20 — non-mortgage debt repayments vs income
 *   Budget adherence    15 — categories at/under budget this month
 *   Cash flow           10 — income exceeds spending
 *   Subscription load   10 — recurring commitments vs income
 */

import { clamp } from "./money";

export interface HealthInputs {
  monthlyIncomeCents: number;
  monthlySpendCents: number; // positive number
  monthlySavedCents: number; // savings + investment contributions
  cashCents: number; // liquid savings + transaction balances
  essentialMonthlySpendCents: number;
  nonMortgageDebtMonthlyPaymentCents: number;
  budgetsOnTrack: number;
  budgetsTotal: number;
  subscriptionMonthlyCents: number;
}

export interface Pillar {
  key: string;
  label: string;
  weight: number;
  /** 0–1 attainment of this pillar. */
  score: number;
  detail: string;
  advice: string | null;
}

export interface HealthScore {
  score: number; // 0-100
  grade: "Excellent" | "Good" | "Fair" | "Needs work";
  pillars: Pillar[];
}

export function computeHealthScore(i: HealthInputs): HealthScore {
  const income = Math.max(i.monthlyIncomeCents, 1);

  const savingsRate = i.monthlySavedCents / income;
  const emergencyMonths =
    i.essentialMonthlySpendCents > 0 ? i.cashCents / i.essentialMonthlySpendCents : 6;
  const debtRatio = i.nonMortgageDebtMonthlyPaymentCents / income;
  const budgetAdherence = i.budgetsTotal > 0 ? i.budgetsOnTrack / i.budgetsTotal : 1;
  const cashFlowRatio = (income - i.monthlySpendCents) / income;
  const subscriptionRatio = i.subscriptionMonthlyCents / income;

  const pillars: Pillar[] = [
    {
      key: "savings",
      label: "Savings rate",
      weight: 25,
      score: clamp(savingsRate / 0.2, 0, 1), // 20%+ of income saved = full marks
      detail: `You keep ${(savingsRate * 100).toFixed(0)}% of your income.`,
      advice:
        savingsRate < 0.2
          ? "Aim to save or invest 20% of income. Automating a transfer on payday makes this effortless."
          : null,
    },
    {
      key: "emergency",
      label: "Emergency fund",
      weight: 20,
      score: clamp(emergencyMonths / 3, 0, 1), // 3 months of essentials = full marks
      detail: `Your cash covers ${emergencyMonths.toFixed(1)} months of essential spending.`,
      advice:
        emergencyMonths < 3
          ? "Build towards 3 months of essential expenses in an offset or high-interest saver before other goals."
          : null,
    },
    {
      key: "debt",
      label: "Debt load",
      weight: 20,
      score: clamp(1 - debtRatio / 0.2, 0, 1), // 0% great, 20%+ of income on non-mortgage debt = zero
      detail: `${(debtRatio * 100).toFixed(0)}% of income goes to non-mortgage debt.`,
      advice:
        debtRatio > 0.1
          ? "Prioritise your highest-interest debt (avalanche) — see the Debt Planner for a payoff schedule."
          : null,
    },
    {
      key: "budget",
      label: "Budget adherence",
      weight: 15,
      score: budgetAdherence,
      detail: `${i.budgetsOnTrack} of ${i.budgetsTotal} budgets on track this month.`,
      advice:
        budgetAdherence < 0.8
          ? "Review the categories running hot — a small weekly limit beats a big monthly one."
          : null,
    },
    {
      key: "cashflow",
      label: "Cash flow",
      weight: 10,
      score: clamp(cashFlowRatio / 0.1 + 0.5, 0, 1), // positive flow scores well, deficit collapses fast
      detail:
        cashFlowRatio >= 0
          ? `You spend less than you earn (${(cashFlowRatio * 100).toFixed(0)}% surplus).`
          : `You're spending ${Math.abs(cashFlowRatio * 100).toFixed(0)}% more than you earn.`,
      advice: cashFlowRatio < 0 ? "Spending currently exceeds income — start with the three largest categories." : null,
    },
    {
      key: "subscriptions",
      label: "Subscriptions",
      weight: 10,
      score: clamp(1 - subscriptionRatio / 0.1, 0, 1), // 10%+ of income on subscriptions = zero
      detail: `Recurring services take ${(subscriptionRatio * 100).toFixed(1)}% of income.`,
      advice:
        subscriptionRatio > 0.05
          ? "Audit your subscriptions — cancelling unused ones is the fastest saving there is."
          : null,
    },
  ];

  const score = Math.round(pillars.reduce((acc, p) => acc + p.score * p.weight, 0));
  const grade = score >= 80 ? "Excellent" : score >= 65 ? "Good" : score >= 50 ? "Fair" : "Needs work";
  return { score, grade, pillars };
}
