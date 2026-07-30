import { describe, expect, it } from "vitest";
import { generateInviteCode, normaliseInviteCode, summariseHousehold } from "../household";

const members = [
  {
    name: "Alex",
    isYou: true,
    accounts: [
      { name: "Everyday", type: "TRANSACTION", balanceCents: 400000, shared: true },
      { name: "Secret Saver", type: "SAVINGS", balanceCents: 900000, shared: false },
      { name: "Home Loan", type: "LOAN", balanceCents: -20000000, shared: true },
    ],
    sharedIncomeCents: 800000,
    sharedSpendCents: 300000,
  },
  {
    name: "Sam",
    isYou: false,
    accounts: [{ name: "Spending", type: "TRANSACTION", balanceCents: 250000, shared: true }],
    sharedIncomeCents: 600000,
    sharedSpendCents: 100000,
  },
];

describe("summariseHousehold", () => {
  it("combines only shared accounts — unshared balances never leak", () => {
    const s = summariseHousehold(members);
    expect(s.combinedBalanceCents).toBe(400000 - 20000000 + 250000);
    expect(s.combinedAssetsCents).toBe(650000);
    expect(s.combinedLiabilitiesCents).toBe(-20000000);
    const alex = s.members.find((m) => m.isYou)!;
    expect(alex.sharedAccounts.map((a) => a.name)).not.toContain("Secret Saver");
  });

  it("computes month totals and per-member spend shares", () => {
    const s = summariseHousehold(members);
    expect(s.monthIncomeCents).toBe(1400000);
    expect(s.monthSpendCents).toBe(400000);
    expect(s.members.find((m) => m.isYou)!.spendShare).toBeCloseTo(0.75);
    expect(s.members.reduce((a, m) => a + m.spendShare, 0)).toBeCloseTo(1);
  });

  it("puts the current user first and handles zero spending", () => {
    const s = summariseHousehold(members.map((m) => ({ ...m, sharedSpendCents: 0 })));
    expect(s.members[0].isYou).toBe(true);
    expect(s.members[0].spendShare).toBe(0);
  });
});

describe("invite codes", () => {
  it("generates 8 chars from the unambiguous alphabet", () => {
    const code = generateInviteCode();
    expect(code).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/);
  });

  it("normalises user-typed codes (lowercase, spaces, dashes)", () => {
    expect(normaliseInviteCode(" abcd-2345 ")).toBe("ABCD2345");
  });
});
