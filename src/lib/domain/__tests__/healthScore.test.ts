import { describe, expect, it } from "vitest";
import { computeHealthScore, type HealthInputs } from "../healthScore";

const healthy: HealthInputs = {
  monthlyIncomeCents: 800000,
  monthlySpendCents: 550000,
  monthlySavedCents: 200000,
  cashCents: 2400000,
  essentialMonthlySpendCents: 400000,
  nonMortgageDebtMonthlyPaymentCents: 0,
  budgetsOnTrack: 8,
  budgetsTotal: 8,
  subscriptionMonthlyCents: 8000,
};

describe("computeHealthScore", () => {
  it("scores a healthy profile as excellent", () => {
    const result = computeHealthScore(healthy);
    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.grade).toBe("Excellent");
    expect(result.pillars.every((p) => p.advice === null)).toBe(true);
  });

  it("scores a stressed profile low with actionable advice", () => {
    const result = computeHealthScore({
      monthlyIncomeCents: 500000,
      monthlySpendCents: 560000, // spending exceeds income
      monthlySavedCents: 0,
      cashCents: 100000,
      essentialMonthlySpendCents: 350000,
      nonMortgageDebtMonthlyPaymentCents: 120000,
      budgetsOnTrack: 2,
      budgetsTotal: 8,
      subscriptionMonthlyCents: 45000,
    });
    expect(result.score).toBeLessThan(40);
    expect(result.grade).toBe("Needs work");
    const withAdvice = result.pillars.filter((p) => p.advice !== null);
    expect(withAdvice.length).toBeGreaterThanOrEqual(4);
  });

  it("stays within 0-100 and weights sum to 100", () => {
    const result = computeHealthScore(healthy);
    expect(result.pillars.reduce((a, p) => a + p.weight, 0)).toBe(100);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});
