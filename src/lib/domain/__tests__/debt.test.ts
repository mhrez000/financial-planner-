import { describe, expect, it } from "vitest";
import { simulatePayoff, type DebtInput } from "../debt";

const debts: DebtInput[] = [
  { id: "cc", name: "Credit Card", balanceCents: 420000, aprBps: 2099, minPaymentCents: 12000 },
  { id: "car", name: "Car Loan", balanceCents: 1650000, aprBps: 849, minPaymentCents: 38000 },
  { id: "pl", name: "Personal Loan", balanceCents: 800000, aprBps: 1249, minPaymentCents: 25000 },
];

describe("simulatePayoff", () => {
  it("avalanche clears highest-rate debt first", () => {
    const result = simulatePayoff(debts, 30000, "AVALANCHE");
    expect(result.payoffOrder[0].name).toBe("Credit Card");
    expect(result.months).toBeGreaterThan(0);
    expect(result.balanceTimeline[result.balanceTimeline.length - 1]).toBe(0);
  });

  it("snowball clears smallest balance first", () => {
    const result = simulatePayoff(debts, 30000, "SNOWBALL");
    expect(result.payoffOrder[0].name).toBe("Credit Card"); // also smallest here
    const bigFirst = simulatePayoff(
      [
        { id: "a", name: "Small", balanceCents: 100000, aprBps: 500, minPaymentCents: 5000 },
        { id: "b", name: "Big", balanceCents: 900000, aprBps: 2000, minPaymentCents: 20000 },
      ],
      10000,
      "SNOWBALL",
    );
    expect(bigFirst.payoffOrder[0].name).toBe("Small");
  });

  it("avalanche never pays more interest than snowball", () => {
    const avalanche = simulatePayoff(debts, 30000, "AVALANCHE");
    const snowball = simulatePayoff(debts, 30000, "SNOWBALL");
    expect(avalanche.totalInterestCents).toBeLessThanOrEqual(snowball.totalInterestCents);
  });

  it("extra payments shorten the payoff", () => {
    const slow = simulatePayoff(debts, 0, "AVALANCHE");
    const fast = simulatePayoff(debts, 50000, "AVALANCHE");
    expect(fast.months).toBeLessThan(slow.months);
    expect(fast.totalInterestCents).toBeLessThan(slow.totalInterestCents);
  });
});
