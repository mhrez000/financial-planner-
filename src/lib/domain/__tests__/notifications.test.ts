import { describe, expect, it } from "vitest";
import { generateNotifications, type NotificationInputs } from "../notifications";

const NOW = new Date("2026-07-20T12:00:00");

const base: NotificationInputs = {
  now: NOW,
  cashCents: 500000,
  bills: [],
  budgets: [],
  recentTransactions: [],
  goals: [],
  subscriptions: [],
  typicalSpendCents: 3000,
};

describe("generateNotifications", () => {
  it("escalates manual bills due soon and stays calm about autopay", () => {
    const out = generateNotifications({
      ...base,
      bills: [
        { name: "Council Rates", amountCents: 41200, nextDueDate: new Date("2026-07-21"), autopay: false },
        { name: "AGL", amountCents: 14500, nextDueDate: new Date("2026-07-24"), autopay: true },
        { name: "Far Away", amountCents: 9900, nextDueDate: new Date("2026-08-30"), autopay: false },
      ],
    });
    expect(out.map((n) => n.kind)).toEqual(["bill_due", "bill_due"]);
    expect(out[0].severity).toBe("critical"); // manual, 1 day out
    expect(out[1].severity).toBe("info"); // autopay
  });

  it("flags exceeded budgets, large purchases, salary, and low balance", () => {
    const out = generateNotifications({
      ...base,
      cashCents: 10000,
      bills: [{ name: "Rego", amountCents: 90000, nextDueDate: new Date("2026-07-23"), autopay: false }],
      budgets: [{ name: "Dining", amountCents: 30000, spentCents: 34000 }],
      recentTransactions: [
        { merchant: "JB HI-FI", amountCents: -45000, date: new Date("2026-07-19"), categoryGroup: "LIFESTYLE" },
        { merchant: "ACME SALARY", amountCents: 446000, date: new Date("2026-07-17"), categoryGroup: "INCOME" },
      ],
    });
    const kinds = out.map((n) => n.kind);
    expect(kinds).toContain("budget_exceeded");
    expect(kinds).toContain("large_purchase");
    expect(kinds).toContain("salary_received");
    expect(kinds).toContain("low_balance");
    expect(out[0].severity).toBe("critical"); // sorted critical-first
  });

  it("reports the highest goal milestone passed", () => {
    const out = generateNotifications({
      ...base,
      goals: [{ name: "Japan Holiday", savedCents: 620000, targetCents: 800000 }],
    });
    expect(out).toHaveLength(1);
    expect(out[0].title).toContain("75%");
  });
});
