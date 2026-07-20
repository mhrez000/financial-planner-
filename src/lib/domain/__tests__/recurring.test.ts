import { describe, expect, it } from "vitest";
import { detectRecurring, type TxnLike } from "../recurring";

function series(merchant: string, amountCents: number, startISO: string, intervalDays: number, count: number): TxnLike[] {
  const start = new Date(startISO);
  return Array.from({ length: count }, (_, i) => ({
    id: `${merchant}-${i}`,
    date: new Date(start.getTime() + i * intervalDays * 86400_000),
    amountCents: -amountCents,
    merchant,
  }));
}

const NOW = new Date("2026-07-15T00:00:00Z");

describe("detectRecurring", () => {
  it("detects a monthly subscription", () => {
    const txns = series("NETFLIX.COM", 2299, "2026-01-10", 30, 6);
    const found = detectRecurring(txns, NOW);
    expect(found).toHaveLength(1);
    expect(found[0].cadence).toBe("MONTHLY");
    expect(found[0].amountCents).toBe(2299);
    expect(found[0].annualCostCents).toBe(2299 * 12);
  });

  it("detects weekly and fortnightly cadences", () => {
    const txns = [
      ...series("ANYTIME FITNESS", 1795, "2026-05-01", 14, 6),
      ...series("SPOTIFY", 1399, "2026-06-01", 7, 7),
    ];
    const cadences = new Map(detectRecurring(txns, NOW).map((s) => [s.merchant, s.cadence]));
    expect(cadences.get("ANYTIME FITNESS")).toBe("FORTNIGHTLY");
    expect(cadences.get("SPOTIFY")).toBe("WEEKLY");
  });

  it("ignores irregular spending at the same merchant", () => {
    const txns: TxnLike[] = [
      { id: "1", date: new Date("2026-05-01"), amountCents: -4500, merchant: "KMART" },
      { id: "2", date: new Date("2026-05-04"), amountCents: -12800, merchant: "KMART" },
      { id: "3", date: new Date("2026-06-28"), amountCents: -900, merchant: "KMART" },
      { id: "4", date: new Date("2026-07-02"), amountCents: -33000, merchant: "KMART" },
    ];
    expect(detectRecurring(txns, NOW)).toHaveLength(0);
  });

  it("drops lapsed subscriptions", () => {
    const txns = series("STAN", 1700, "2025-06-01", 30, 5); // last charge ~Oct 2025
    expect(detectRecurring(txns, NOW)).toHaveLength(0);
  });

  it("flags price increases", () => {
    const txns = series("NETFLIX.COM", 2299, "2026-01-10", 30, 5);
    txns.push({
      id: "n-last",
      date: new Date(txns[txns.length - 1].date.getTime() + 30 * 86400_000),
      amountCents: -2599,
      merchant: "NETFLIX.COM",
    });
    const found = detectRecurring(txns, NOW);
    expect(found[0].priceIncreased).toBe(true);
    expect(found[0].amountCents).toBe(2599);
  });
});
