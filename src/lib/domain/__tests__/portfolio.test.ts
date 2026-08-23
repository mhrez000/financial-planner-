import { describe, expect, it } from "vitest";
import { summarisePortfolio } from "../portfolio";

const holdings = [
  { symbol: "VAS", name: "Vanguard AU Shares", assetClass: "AU_SHARES", units: 100, avgCostCents: 8500, lastPriceCents: 9200 },
  { symbol: "VGS", name: "Vanguard Intl Shares", assetClass: "INTL_SHARES", units: 50, avgCostCents: 10000, lastPriceCents: 11800 },
  { symbol: "BTC", name: "Bitcoin", assetClass: "CRYPTO", units: 0.05, avgCostCents: 6_200_000_00, lastPriceCents: 5_800_000_00 },
];

describe("summarisePortfolio", () => {
  it("computes value, cost, gains and weights", () => {
    const p = summarisePortfolio(holdings);
    expect(p.valueCents).toBe(100 * 9200 + 50 * 11800 + Math.round(0.05 * 5_800_000_00));
    expect(p.gainCents).toBe(p.valueCents - p.costCents);
    expect(p.holdings[0].weight).toBeGreaterThan(0);
    expect(p.holdings.reduce((a, h) => a + h.weight, 0)).toBeCloseTo(1, 5);
  });

  it("handles losing positions and allocation rollup", () => {
    const p = summarisePortfolio(holdings);
    const btc = p.holdings.find((h) => h.symbol === "BTC")!;
    expect(btc.gainCents).toBeLessThan(0);
    expect(p.allocation.map((a) => a.assetClass)).toContain("CRYPTO");
    expect(p.allocation.reduce((a, x) => a + x.weight, 0)).toBeCloseTo(1, 5);
  });

  it("is safe on an empty portfolio", () => {
    const p = summarisePortfolio([]);
    expect(p.valueCents).toBe(0);
    expect(p.gainFraction).toBe(0);
  });
});
