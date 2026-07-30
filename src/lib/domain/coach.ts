/**
 * Sage Coach — conversational Q&A over the deterministic engines.
 *
 * An intent parser routes questions to the real domain data (health score,
 * forecasts, budgets, subscriptions, safe-to-spend), so every answer is
 * grounded in the user's actual numbers with zero hallucination risk.
 *
 * LLM seam: `CoachProvider` is the interface a Claude-backed provider
 * implements in Phase 3 production. It receives this same CoachContext —
 * aggregates and insight objects, never raw transactions — and can fall back
 * to this rule-based provider offline. The numbers always come from here;
 * the LLM only improves the language and intent coverage.
 */

import { formatAUD, percent } from "./money";
import type { HealthScore } from "./healthScore";
import type { Insight } from "./insights";
import type { RecurringSeries } from "./recurring";
import type { GoalForecast } from "./forecast";
import type { SafeToSpendResult } from "./safeToSpend";

export interface CoachGoal {
  name: string;
  targetCents: number;
  savedCents: number;
  monthlyContribCents: number;
  forecast: GoalForecast;
}

export interface CoachContext {
  now: Date;
  firstName: string;
  cashCents: number;
  safeToSpend: SafeToSpendResult;
  health: HealthScore;
  insights: Insight[];
  goals: CoachGoal[];
  budgets: { name: string; amountCents: number; spentCents: number }[];
  subscriptions: RecurringSeries[];
  monthlyIncomeCents: number;
  monthlySpendCents: number;
  savingsRate: number;
  topCategories: { name: string; cents: number }[];
  projectedEomCents: number;
}

export interface CoachAnswer {
  text: string;
  bullets: string[];
  /** Follow-up questions worth suggesting after this answer. */
  suggestions: string[];
}

export interface CoachProvider {
  ask(question: string, ctx: CoachContext): Promise<CoachAnswer>;
}

const DEFAULT_SUGGESTIONS = [
  "Can I afford a $2,000 holiday?",
  "How do I improve my health score?",
  "Where am I overspending?",
  "What should I do on payday?",
];

function parseAmountCents(question: string): number | null {
  const m = question.replace(/,/g, "").match(/\$?\s*(\d+(?:\.\d{1,2})?)\s*(k\b)?/i);
  if (!m) return null;
  const value = Number(m[1]) * (m[2] ? 1000 : 1);
  return value > 0 ? Math.round(value * 100) : null;
}

export function answerQuestion(question: string, ctx: CoachContext): CoachAnswer {
  const q = question.toLowerCase();

  // "Can I afford …?"
  if (/afford|buy|purchase|splurge/.test(q)) {
    const amount = parseAmountCents(q);
    if (amount) {
      const safe = ctx.safeToSpend.safeCents;
      const comfortable = amount <= safe * 0.5;
      const tight = amount > safe;
      return {
        text: comfortable
          ? `Yes — comfortably. ${formatAUD(amount)} fits inside your safe-to-spend of ${formatAUD(safe)}, which already accounts for upcoming bills and your goal contributions.`
          : tight
            ? `Not right now without trade-offs. ${formatAUD(amount)} exceeds your safe-to-spend of ${formatAUD(safe)} — it would eat into bill money or your goal contributions.`
            : `Yes, but it's a meaningful chunk: ${formatAUD(amount)} is ${percent(amount / Math.max(ctx.safeToSpend.safeCents, 1))} of your ${formatAUD(safe)} safe-to-spend. Fine if it matters to you — just make it a decision, not a default.`,
        bullets: ctx.safeToSpend.breakdown.map((b) => `${b.label}: ${formatAUD(b.cents, { signed: b.cents < 0 })}`),
        suggestions: tight
          ? ["Where am I overspending?", "How do I save more?"]
          : ["When will I reach my goals?", "What should I do on payday?"],
      };
    }
    return {
      text: `Tell me the amount — e.g. "Can I afford a $1,500 trip?" — and I'll check it against your safe-to-spend of ${formatAUD(ctx.safeToSpend.safeCents)}.`,
      bullets: [],
      suggestions: DEFAULT_SUGGESTIONS,
    };
  }

  // Health score
  if (/score|health/.test(q)) {
    const weakest = [...ctx.health.pillars].filter((p) => p.advice).sort((a, b) => a.score - b.score);
    return {
      text: `Your financial health score is ${ctx.health.score}/100 — ${ctx.health.grade.toLowerCase()}. The fastest ways to lift it:`,
      bullets: weakest.slice(0, 3).map((p) => `${p.label} (${Math.round(p.score * p.weight)}/${p.weight}): ${p.advice}`),
      suggestions: ["How do I save more?", "Where am I overspending?"],
    };
  }

  // Goals — match a specific goal by name, else summarise all
  if (/goal|when will i|reach|sooner|faster|holiday|deposit|emergency/.test(q)) {
    const named = ctx.goals.find((g) => q.includes(g.name.toLowerCase().split(" ")[0].toLowerCase()));
    if (named) {
      const f = named.forecast;
      const boostCents = 3000; // the "what would $30/week do" framing
      const remaining = named.targetCents - named.savedCents;
      const monthsNow = f.monthsToTarget;
      const monthsBoosted = named.monthlyContribCents > 0
        ? Math.ceil(remaining / (named.monthlyContribCents + boostCents * 4.33))
        : null;
      const saved = monthsNow !== null && monthsBoosted !== null ? monthsNow - monthsBoosted : 0;
      return {
        text: f.predictedCompletion
          ? `${named.name}: ${formatAUD(named.savedCents)} of ${formatAUD(named.targetCents)} saved. At ${formatAUD(named.monthlyContribCents)}/month you'll get there around ${f.predictedCompletion.toLocaleDateString("en-AU", { month: "long", year: "numeric" })} (${Math.round(f.successProbability * 100)}% likely).`
          : `${named.name} has no monthly contribution set, so there's no forecast yet — even a small automatic amount changes that.`,
        bullets:
          saved > 0
            ? [`Adding $30/week would bring it roughly ${saved} month${saved === 1 ? "" : "s"} closer.`]
            : [],
        suggestions: ["Can I afford to boost my goal by $100?", "What should I do on payday?"],
      };
    }
    return {
      text: "Here's where your goals stand:",
      bullets: ctx.goals.map((g) =>
        g.forecast.predictedCompletion
          ? `${g.name}: ${percent(g.savedCents / g.targetCents)} funded, on track for ${g.forecast.predictedCompletion.toLocaleDateString("en-AU", { month: "short", year: "numeric" })}`
          : `${g.name}: ${percent(g.savedCents / g.targetCents)} funded — set a monthly contribution to get a forecast`,
      ),
      suggestions: ["When will I reach my Japan goal?", "Can I afford a $2,000 holiday?"],
    };
  }

  // Overspending / biggest categories
  if (/overspend|spending too much|where.*(money|going)|biggest|cut back/.test(q)) {
    const hot = ctx.budgets
      .filter((b) => b.spentCents > b.amountCents)
      .sort((a, b) => b.spentCents / b.amountCents - a.spentCents / a.amountCents);
    return {
      text:
        hot.length > 0
          ? `${hot.length} budget${hot.length === 1 ? " is" : "s are"} over this month. Your biggest spending categories:`
          : "No budgets are blown this month — nice. Your biggest spending categories:",
      bullets: [
        ...ctx.topCategories.slice(0, 4).map((c) => `${c.name}: ${formatAUD(c.cents)} this month`),
        ...ctx.insights
          .filter((i) => i.severity === "nudge")
          .slice(0, 2)
          .map((i) => i.title),
      ],
      suggestions: ["How do I improve my health score?", "What subscriptions am I paying for?"],
    };
  }

  // Subscriptions
  if (/subscription|netflix|spotify|cancel|recurring/.test(q)) {
    const annual = ctx.subscriptions.reduce((a, s) => a + s.annualCostCents, 0);
    const priciest = ctx.subscriptions.slice(0, 3);
    const risen = ctx.subscriptions.filter((s) => s.priceIncreased);
    return {
      text: `You have ${ctx.subscriptions.length} recurring services totalling ${formatAUD(annual)} a year. The heaviest:`,
      bullets: [
        ...priciest.map((s) => `${titleCase(s.merchant)}: ${formatAUD(s.annualCostCents)}/yr (${s.cadence.toLowerCase()})`),
        ...risen.map((s) => `⚠ ${titleCase(s.merchant)} recently charged more than usual`),
      ],
      suggestions: ["Where am I overspending?", "Can I afford a $500 splurge?"],
    };
  }

  // Payday plan
  if (/payday|salary|paid|pay day|income arrives/.test(q)) {
    const fortnightly = Math.round(ctx.monthlyIncomeCents / 2.17);
    const goalCommit = ctx.goals.reduce((a, g) => a + g.monthlyContribCents, 0);
    return {
      text: `A payday that runs itself beats willpower. On your roughly ${formatAUD(fortnightly)} fortnightly pay:`,
      bullets: [
        `Move ${formatAUD(Math.round(goalCommit / 2))} to goals first — automate it for the morning after payday`,
        `Set aside a bills buffer so due dates never touch spending money`,
        `Your savings rate is ${percent(ctx.savingsRate)} — each 1% more is about ${formatAUD(Math.round(ctx.monthlyIncomeCents / 100))}/month towards freedom`,
      ],
      suggestions: ["How do I improve my health score?", "When will I reach my goals?"],
    };
  }

  // Savings rate / saving more
  if (/save more|savings rate|how much should i save/.test(q)) {
    const gap = Math.max(0, 0.2 - ctx.savingsRate);
    return {
      text: `You're currently saving ${percent(ctx.savingsRate)} of income. The 20% benchmark ${gap > 0 ? `is ${formatAUD(Math.round(ctx.monthlyIncomeCents * gap))}/month away` : "is behind you — you're ahead of it"}.`,
      bullets: [
        "Automate transfers on payday — saving before spending beats saving what's left",
        `Your subscriptions cost ${formatAUD(ctx.subscriptions.reduce((a, s) => a + s.monthlyCostCents, 0))}/month — the two you use least are the easiest win`,
        ...ctx.insights.filter((i) => i.severity === "celebrate").slice(0, 1).map((i) => `Keep it up: ${i.title.toLowerCase()}`),
      ],
      suggestions: ["What should I do on payday?", "What subscriptions am I paying for?"],
    };
  }

  // Safe to spend / what's left
  if (/safe to spend|left (this|for the) week|spend (this|right) (week|now)|how much can i spend/.test(q)) {
    return {
      text: `Your safe-to-spend is ${formatAUD(ctx.safeToSpend.safeCents)} — that's what's genuinely free after commitments:`,
      bullets: ctx.safeToSpend.breakdown.map((b) => `${b.label}: ${formatAUD(b.cents, { signed: b.cents < 0 })}`),
      suggestions: ["Can I afford a $300 night out?", "What should I do on payday?"],
    };
  }

  // Fallback: a grounded status summary
  return {
    text: `Here's the picture, ${ctx.firstName}: health score ${ctx.health.score}/100 (${ctx.health.grade.toLowerCase()}), ${formatAUD(ctx.safeToSpend.safeCents)} safe to spend, and a projected ${formatAUD(ctx.projectedEomCents, { compact: true })} cash position at month end. Ask me anything specific — a few ideas below.`,
    bullets: ctx.insights.slice(0, 2).map((i) => i.title),
    suggestions: DEFAULT_SUGGESTIONS,
  };
}

/** The offline, deterministic provider. A Claude-backed provider implements the same interface. */
export const ruleBasedProvider: CoachProvider = {
  async ask(question, ctx) {
    return answerQuestion(question, ctx);
  },
};

function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
