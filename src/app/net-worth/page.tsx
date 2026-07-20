import { getDashboard } from "@/lib/data";
import { formatAUD } from "@/lib/domain/money";
import { Card, Stat } from "@/components/ui";
import { NetWorthChart } from "@/components/charts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Net Worth" };

const TYPE_LABEL: Record<string, string> = {
  TRANSACTION: "Cash",
  SAVINGS: "Cash",
  CREDIT_CARD: "Debts",
  LOAN: "Debts",
  INVESTMENT: "Investments",
  SUPER: "Super",
  PROPERTY: "Property",
  VEHICLE: "Vehicles",
};

export default async function NetWorthPage() {
  const d = await getDashboard();
  const series = d.snapshots.map((s) => ({
    month: s.date.toLocaleDateString("en-AU", { month: "short" }),
    netWorth: (s.assetsCents - s.liabilitiesCents) / 100,
  }));
  const first = d.snapshots[0];
  const last = d.snapshots[d.snapshots.length - 1];
  const growth = last && first ? last.assetsCents - last.liabilitiesCents - (first.assetsCents - first.liabilitiesCents) : 0;

  const groups = new Map<string, { total: number; accounts: typeof d.accounts }>();
  for (const a of d.accounts) {
    const label = TYPE_LABEL[a.type] ?? "Other";
    const g = groups.get(label) ?? { total: 0, accounts: [] };
    g.total += a.balanceCents;
    g.accounts.push(a);
    groups.set(label, g);
  }

  return (
    <>
      <Card>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Net worth" value={formatAUD(d.netWorthCents)} tone="positive" />
          <Stat
            label="Assets"
            value={formatAUD(d.accounts.filter((a) => a.balanceCents > 0).reduce((x, a) => x + a.balanceCents, 0), { compact: true })}
          />
          <Stat
            label="Liabilities"
            value={formatAUD(d.accounts.filter((a) => a.balanceCents < 0).reduce((x, a) => x + a.balanceCents, 0), { compact: true })}
            tone="negative"
          />
          <Stat label="Growth (8 months)" value={formatAUD(growth, { signed: true, compact: true })} tone={growth >= 0 ? "positive" : "negative"} />
        </div>
      </Card>

      <Card title="Net worth over time" subtitle="Assets minus liabilities, monthly snapshots">
        <NetWorthChart data={series} />
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...groups.entries()]
          .sort((a, b) => b[1].total - a[1].total)
          .map(([label, g]) => (
            <Card key={label} title={label}>
              <p className={`mb-3 text-xl font-semibold tabular-nums ${g.total < 0 ? "text-negative" : ""}`}>
                {formatAUD(g.total)}
              </p>
              <ul className="space-y-2">
                {g.accounts.map((a) => (
                  <li key={a.id} className="flex justify-between text-xs">
                    <span className="text-muted">
                      {a.name} <span className="text-faint">· {a.institution}</span>
                    </span>
                    <span className="tabular-nums font-medium">{formatAUD(a.balanceCents)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
      </div>
    </>
  );
}
