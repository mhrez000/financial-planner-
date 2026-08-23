import { describe, expect, it } from "vitest";
import { answerQuestion, type CoachContext } from "../coach";
import { computeHealthScore } from "../healthScore";

const ctx: CoachContext = {
  now: new Date("2026-07-20"),
  firstName: "Alex",
  cashCents: 2300000,
  safeToSpend: {
    safeCents: 180000,
    breakdown: [
      { label: "Cash on hand", cents: 2300000 },
      { label: "Bills due within 14 days (3)", cents: -50000 },
      { label: "Goal contributions still to make this month", cents: -70000 },
    ],
  },
  health: computeHealthScore({
    monthlyIncomeCents: 900000,
    monthlySpendCents: 600000,
    monthlySavedCents: 150000,
    cashCents: 2300000,
    essentialMonthlySpendCents: 450000,
    nonMortgageDebtMonthlyPaymentCents: 38000,
    budgetsOnTrack: 6,
    budgetsTotal: 9,
    subscriptionMonthlyCents: 25000,
  }),
  insights: [
    { id: "a", severity: "nudge", title: "Takeaway is up 30% this month", body: "" },
    { id: "b", severity: "celebrate", title: "Groceries trending down", body: "" },
  ],
  goals: [
    {
      name: "Japan Holiday",
      targetCents: 800000,
      savedCents: 350000,
      monthlyContribCents: 40000,
      forecast: { monthsToTarget: 12, predictedCompletion: new Date("2027-07-01"), successProbability: 0.8, onTrack: true },
    },
  ],
  budgets: [{ name: "Dining", amountCents: 30000, spentCents: 36000 }],
  subscriptions: [
    {
      merchant: "NETFLIX.COM",
      cadence: "MONTHLY",
      amountCents: 2599,
      monthlyCostCents: 2599,
      annualCostCents: 31188,
      lastPayment: new Date("2026-07-04"),
      nextPayment: new Date("2026-08-03"),
      occurrences: 8,
      priceIncreased: true,
      transactionIds: [],
    },
  ],
  monthlyIncomeCents: 900000,
  monthlySpendCents: 600000,
  savingsRate: 0.17,
  topCategories: [
    { name: "Groceries", cents: 90000 },
    { name: "Dining", cents: 36000 },
  ],
  projectedEomCents: 2100000,
};

describe("answerQuestion", () => {
  it("answers affordability with the safe-to-spend breakdown", () => {
    const yes = answerQuestion("Can I afford a $500 jacket?", ctx);
    expect(yes.text).toMatch(/^Yes/);
    expect(yes.bullets.some((b) => b.includes("Bills due"))).toBe(true);

    const no = answerQuestion("Can I afford a $2,500 holiday?", ctx);
    expect(no.text).toContain("Not right now");
  });

  it("parses $Nk amounts", () => {
    const answer = answerQuestion("could I buy a $3k bike", ctx);
    expect(answer.text).toContain("Not right now");
  });

  it("explains the health score via its weakest pillars", () => {
    const a = answerQuestion("How do I improve my score?", ctx);
    expect(a.text).toContain(`${ctx.health.score}/100`);
    expect(a.bullets.length).toBeGreaterThan(0);
  });

  it("answers about a named goal with the what-if boost framing", () => {
    const a = answerQuestion("When will I reach my Japan trip goal?", ctx);
    expect(a.text).toContain("Japan Holiday");
    expect(a.text).toContain("July 2027");
    expect(a.bullets[0]).toContain("$30/week");
  });

  it("surfaces subscriptions with price-rise warnings", () => {
    const a = answerQuestion("What subscriptions am I paying for?", ctx);
    expect(a.text).toContain("$311.88");
    expect(a.bullets.some((b) => b.includes("⚠"))).toBe(true);
  });

  it("reports overspending with over-budget count and top categories", () => {
    const a = answerQuestion("Where am I overspending?", ctx);
    expect(a.text).toContain("1 budget is over");
    expect(a.bullets.some((b) => b.startsWith("Groceries"))).toBe(true);
  });

  it("falls back to a grounded summary with suggestions", () => {
    const a = answerQuestion("tell me something interesting", ctx);
    expect(a.text).toContain("Alex");
    expect(a.suggestions.length).toBeGreaterThan(0);
  });
});
