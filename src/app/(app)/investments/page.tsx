import { getInvestmentsPage } from "@/lib/data";
import { formatAUD, percent } from "@/lib/domain/money";
import { Badge, Card, Stat } from "@/components/ui";
import { CategoryDonut } from "@/components/charts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Investments" };

const CLASS_LABEL: Record<string, string> = {
  AU_SHARES: "Australian shares",
  INTL_SHARES: "International shares",
  CRYPTO: "Crypto",
  CASH: "Cash",
  SUPER: "Super",
};

export default async function InvestmentsPage() {
  const { portfolio, priceAsOf, dividends, superCents } = await getInvestmentsPage();
  const p = portfolio;

  return (
    <>
      <Card>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Portfolio value" value={formatAUD(p.valueCents)} tone="positive" hint={priceAsOf ? `Prices as of ${priceAsOf.toLocaleDateString("en-AU", { day: "numeric", month: "short" })}` : undefined} />
          <Stat label="Total return" value={formatAUD(p.gainCents, { signed: true })} tone={p.gainCents >= 0 ? "positive" : "negative"} hint={`${percent(p.gainFraction, 1)} on cost`} />
          <Stat label="Invested (cost base)" value={formatAUD(p.costCents)} />
          <Stat label="Super (separate)" value={formatAUD(superCents, { compact: true })} hint="Tracked in Net Worth" />
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Holdings" subtitle="Manual price refresh now; market feed is a background-job swap later">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-faint">
                  <th className="py-2 pr-3 font-medium">Holding</th>
                  <th className="py-2 pr-3 text-right font-medium">Units</th>
                  <th className="py-2 pr-3 text-right font-medium">Value</th>
                  <th className="py-2 text-right font-medium">Return</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {p.holdings.map((h) => (
                  <tr key={h.symbol}>
                    <td className="py-2.5 pr-3">
                      <p className="font-semibold">{h.symbol}</p>
                      <p className="max-w-[180px] truncate text-xs text-faint">{h.name}</p>
                    </td>
                    <td className="py-2.5 pr-3 text-right tabular-nums text-muted">{h.units}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums font-medium">{formatAUD(h.valueCents)}</td>
                    <td className={`py-2.5 text-right tabular-nums font-medium ${h.gainCents >= 0 ? "text-positive" : "text-negative"}`}>
                      {percent(h.gainFraction, 1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Allocation" subtitle="By asset class">
          <CategoryDonut
            data={p.allocation.map((a) => ({ name: CLASS_LABEL[a.assetClass] ?? a.assetClass, value: a.valueCents / 100 }))}
          />
          <p className="mt-3 text-xs leading-relaxed text-muted">
            A simple rule of thumb: broad index ETFs as the core, anything speculative (crypto,
            single stocks) kept under ~10%. Consistency beats timing — your fortnightly
            auto-invest is doing the heavy lifting.
          </p>
        </Card>
      </div>

      <Card title="Dividends & distributions" subtitle="From your transaction history">
        {dividends.length === 0 ? (
          <p className="py-4 text-sm text-muted">No investment income recorded yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {dividends.map((d) => (
              <li key={d.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <p className="font-medium">{d.merchant.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}</p>
                  <p className="text-xs text-faint">{d.date.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}</p>
                </div>
                <span className="flex items-center gap-2">
                  <Badge tone="positive">distribution</Badge>
                  <span className="tabular-nums font-semibold text-positive">{formatAUD(d.amountCents, { signed: true })}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
