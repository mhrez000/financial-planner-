import { describe, expect, it } from "vitest";
import { forecastEndOfMonth, forecastGoal } from "../forecast";

describe("forecastEndOfMonth", () => {
  it("projects balance from run-rate, bills and income", () => {
    const now = new Date("2026-07-15T12:00:00");
    const f = forecastEndOfMonth(500000, 150000, 80000, 400000, now);
    expect(f.dailySpendRateCents).toBe(10000);
    expect(f.daysRemaining).toBe(16);
    expect(f.projectedBalanceCents).toBe(500000 - 10000 * 16 - 80000 + 400000);
  });
});

describe("forecastGoal", () => {
  const now = new Date("2026-07-01");

  it("computes months to target and completion date", () => {
    const f = forecastGoal(1200000, 600000, 100000, null, now);
    expect(f.monthsToTarget).toBe(6);
    expect(f.predictedCompletion?.getMonth()).toBe(0); // January
    expect(f.onTrack).toBe(true);
  });

  it("gives high probability with comfortable slack, low when behind", () => {
    const comfy = forecastGoal(1200000, 600000, 100000, new Date("2027-07-01"), now);
    expect(comfy.successProbability).toBeGreaterThan(0.9);
    const tight = forecastGoal(1200000, 0, 50000, new Date("2027-01-01"), now);
    expect(tight.successProbability).toBeLessThan(0.2);
    expect(tight.onTrack).toBe(false);
  });

  it("handles completed and stalled goals", () => {
    expect(forecastGoal(1000, 1000, 0, null, now).successProbability).toBe(1);
    expect(forecastGoal(1000, 0, 0, null, now).monthsToTarget).toBeNull();
  });
});
