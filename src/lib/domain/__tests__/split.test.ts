import { describe, expect, it } from "vitest";
import { planSplit } from "../split";

describe("planSplit", () => {
  it("splits an expense keeping signs and a remainder", () => {
    const plan = planSplit(-12000, [4000, 3000]);
    expect(plan).toEqual({ ok: true, childAmounts: [-4000, -3000], remainderCents: -5000 });
  });

  it("works for income too", () => {
    const plan = planSplit(50000, [20000]);
    expect(plan).toEqual({ ok: true, childAmounts: [20000], remainderCents: 30000 });
  });

  it("conserves the total exactly", () => {
    const plan = planSplit(-9999, [3333, 3333]);
    if (!plan.ok) throw new Error("expected ok");
    expect(plan.childAmounts.reduce((a, b) => a + b, 0) + plan.remainderCents).toBe(-9999);
  });

  it("rejects empty, non-positive, and over-total splits", () => {
    expect(planSplit(-10000, []).ok).toBe(false);
    expect(planSplit(-10000, [0]).ok).toBe(false);
    expect(planSplit(-10000, [-500]).ok).toBe(false);
    expect(planSplit(-10000, [6000, 4000]).ok).toBe(false); // equal to total
    expect(planSplit(-10000, [12000]).ok).toBe(false);
  });
});
