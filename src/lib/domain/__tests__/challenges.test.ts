import { describe, expect, it } from "vitest";
import { evaluateChallenge, type ChallengeTxn } from "../challenges";

const spend = (dateISO: string, cents: number, categoryName: string, categoryGroup: string): ChallengeTxn => ({
  date: new Date(dateISO),
  amountCents: -cents,
  categoryName,
  categoryGroup,
});

const window7 = { start: new Date("2026-07-13"), end: new Date("2026-07-19"), targetCents: null };

describe("evaluateChallenge", () => {
  it("NO_SPEND_WEEK passes on essentials, fails instantly on lifestyle spend", () => {
    const essentialsOnly = [spend("2026-07-14", 8000, "Groceries", "ESSENTIAL")];
    const mid = new Date("2026-07-16");
    expect(evaluateChallenge("NO_SPEND_WEEK", window7, essentialsOnly, mid).passing).toBe(true);
    expect(evaluateChallenge("NO_SPEND_WEEK", window7, essentialsOnly, mid).failed).toBe(false);

    const broken = [...essentialsOnly, spend("2026-07-15", 2400, "Takeaway", "LIFESTYLE")];
    const state = evaluateChallenge("NO_SPEND_WEEK", window7, broken, mid);
    expect(state.passing).toBe(false);
    expect(state.failed).toBe(true); // unrecoverable mid-window
  });

  it("NO_SPEND_WEEK succeeds once the window closes clean", () => {
    const after = new Date("2026-07-20");
    const state = evaluateChallenge("NO_SPEND_WEEK", window7, [], after);
    expect(state.succeeded).toBe(true);
    expect(state.timeFraction).toBe(1);
  });

  it("COFFEE_CHALLENGE tracks spend against the cap", () => {
    const w = { start: new Date("2026-07-01"), end: new Date("2026-07-30"), targetCents: 3000 };
    const txns = [spend("2026-07-05", 1200, "Coffee", "LIFESTYLE"), spend("2026-07-12", 1300, "Coffee", "LIFESTYLE")];
    const mid = evaluateChallenge("COFFEE_CHALLENGE", w, txns, new Date("2026-07-15"));
    expect(mid.passing).toBe(true);
    expect(mid.detail).toContain("$25 of your $30");
    const blown = [...txns, spend("2026-07-20", 900, "Coffee", "LIFESTYLE")];
    expect(evaluateChallenge("COFFEE_CHALLENGE", w, blown, new Date("2026-07-21")).failed).toBe(true);
  });

  it("WEEKEND_FREEZE only counts weekend lifestyle spending", () => {
    // 2026-07-17 is a Friday, 18th Saturday
    const friday = [spend("2026-07-17", 5000, "Dining", "LIFESTYLE")];
    const saturday = [spend("2026-07-18", 5000, "Dining", "LIFESTYLE")];
    const now = new Date("2026-07-19");
    expect(evaluateChallenge("WEEKEND_FREEZE", window7, friday, now).passing).toBe(true);
    expect(evaluateChallenge("WEEKEND_FREEZE", window7, saturday, now).passing).toBe(false);
  });

  it("FIFTY_TWO_WEEK can fall behind and catch up", () => {
    const w = { start: new Date("2026-01-05"), end: new Date("2027-01-03"), targetCents: null };
    // Week 3: schedule needs $1+$2+$3 = $6
    const behind = evaluateChallenge("FIFTY_TWO_WEEK", w, [], new Date("2026-01-20"));
    expect(behind.passing).toBe(false);
    expect(behind.failed).toBe(false); // recoverable
    const caughtUp = evaluateChallenge(
      "FIFTY_TWO_WEEK",
      w,
      [spend("2026-01-18", 700, "Savings Transfer", "FINANCIAL")],
      new Date("2026-01-20"),
    );
    expect(caughtUp.passing).toBe(true);
  });
});
