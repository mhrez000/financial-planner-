import { describe, expect, it } from "vitest";
import { computeSafeToSpend } from "../safeToSpend";

describe("computeSafeToSpend", () => {
  it("deducts upcoming bills and remaining goal commitments from cash", () => {
    const r = computeSafeToSpend({
      cashCents: 500000,
      upcomingBills: [
        { name: "AGL", amountCents: 14500 },
        { name: "Rego", amountCents: 41200 },
      ],
      goals: [
        { name: "Japan", monthlyContribCents: 40000 },
        { name: "Emergency", monthlyContribCents: 60000 },
      ],
      savedThisMonthCents: 0,
    });
    expect(r.safeCents).toBe(500000 - 55700 - 100000);
    expect(r.breakdown).toHaveLength(3);
    expect(r.breakdown[1].cents).toBe(-55700);
  });

  it("credits contributions already made this month against the goal commitment", () => {
    const r = computeSafeToSpend({
      cashCents: 300000,
      upcomingBills: [],
      goals: [{ name: "Japan", monthlyContribCents: 40000 }],
      savedThisMonthCents: 30000,
    });
    expect(r.safeCents).toBe(300000 - 10000);
    // Over-saving never inflates the number
    const over = computeSafeToSpend({
      cashCents: 300000,
      upcomingBills: [],
      goals: [{ name: "Japan", monthlyContribCents: 40000 }],
      savedThisMonthCents: 90000,
    });
    expect(over.safeCents).toBe(300000);
  });

  it("can go negative — an honest warning, not a floor of zero", () => {
    const r = computeSafeToSpend({
      cashCents: 20000,
      upcomingBills: [{ name: "Rent", amountCents: 80000 }],
      goals: [],
      savedThisMonthCents: 0,
    });
    expect(r.safeCents).toBe(-60000);
  });
});
