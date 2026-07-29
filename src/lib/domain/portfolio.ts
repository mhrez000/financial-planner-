/**
 * Portfolio maths for investment tracking. Pure and price-feed-agnostic:
 * holdings carry their own last price, whatever refreshed it.
 */

export interface HoldingLike {
  symbol: string;
  name: string;
  assetClass: string;
  units: number;
  avgCostCents: number; // per unit
  lastPriceCents: number; // per unit
}

export interface HoldingView extends HoldingLike {
  valueCents: number;
  costCents: number;
  gainCents: number;
  gainFraction: number;
  weight: number; // share of portfolio value
}

export interface PortfolioSummary {
  valueCents: number;
  costCents: number;
  gainCents: number;
  gainFraction: number;
  holdings: HoldingView[];
  allocation: { assetClass: string; valueCents: number; weight: number }[];
}

const round = (n: number) => Math.round(n);

export function summarisePortfolio(holdings: HoldingLike[]): PortfolioSummary {
  const views = holdings.map((h) => {
    const valueCents = round(h.units * h.lastPriceCents);
    const costCents = round(h.units * h.avgCostCents);
    const gainCents = valueCents - costCents;
    return {
      ...h,
      valueCents,
      costCents,
      gainCents,
      gainFraction: costCents > 0 ? gainCents / costCents : 0,
      weight: 0,
    };
  });
  const valueCents = views.reduce((a, v) => a + v.valueCents, 0);
  const costCents = views.reduce((a, v) => a + v.costCents, 0);
  for (const v of views) v.weight = valueCents > 0 ? v.valueCents / valueCents : 0;

  const byClass = new Map<string, number>();
  for (const v of views) byClass.set(v.assetClass, (byClass.get(v.assetClass) ?? 0) + v.valueCents);

  return {
    valueCents,
    costCents,
    gainCents: valueCents - costCents,
    gainFraction: costCents > 0 ? (valueCents - costCents) / costCents : 0,
    holdings: views.sort((a, b) => b.valueCents - a.valueCents),
    allocation: [...byClass.entries()]
      .map(([assetClass, v]) => ({ assetClass, valueCents: v, weight: valueCents > 0 ? v / valueCents : 0 }))
      .sort((a, b) => b.valueCents - a.valueCents),
  };
}
