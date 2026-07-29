import { getDebtsPage } from "@/lib/data";
import { simulatePayoff } from "@/lib/domain/debt";
import { formatAUD } from "@/lib/domain/money";
import { Badge, Card, Stat } from "@/components/ui";
import { PayoffChart } from "@/components/charts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Debt Planner" };

const EXTRA_CENTS = 40000; // $400/month extra — the scenario shown

export default async function DebtsPage() {
  const debts = await getDebtsPage();
  // The mortgage is modelled separately (offset strategy); the planner focuses
  // on consumer debt where strategy choice actually changes the outcome.
  const consumer = debts.filter((d) => d.type !== "MORTGAGE");
  const inputs = consumer.map((d) => ({
    id: d.id,
    name: d.name,
    balanceCents: d.balanceCents,
    aprBps: d.aprBps,
    minPaymentCents: d.minPaymentCents,
  }));

  const avalanche = simulatePayoff(inputs, EXTRA_CENTS, "AVALANCHE");
  const snowball = simulatePayoff(inputs, EXTRA_CENTS, "SNOWBALL");
  const minimumOnly = simulatePayoff(inputs, 0, "AVALANCHE");
  const interestSaved = minimumOnly.totalInterestCents - avalanche.totalInterestCents;

  const chartLen = Math.max(avalanche.months, snowball.months);
  const chart = Array.from({ length: chartLen }, (_, i) => ({
    month: i + 1,
    avalanche: avalanche.balanceTimeline[i] != null ? avalanche.balanceTimeline[i] / 100 : null,
    snowball: snowball.balanceTimeline[i] != null ? snowball.balanceTimeline[i] / 100 : null,
  }));

  return (
    <>
      <Card>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Consumer debt" value={formatAUD(consumer.reduce((a, d) => a + d.balanceCents, 0))} tone="negative" />
          <Stat label="Debt-free in" value={`${avalanche.months} months`} hint={`with ${formatAUD(EXTRA_CENTS)}/mo extra`} />
          <Stat label="Interest saved" value={formatAUD(interestSaved)} tone="positive" hint="vs minimum payments only" />
          <Stat
            label="Best strategy"
            value="Avalanche"
            hint={`saves ${formatAUD(snowball.totalInterestCents - avalanche.totalInterestCents)} over snowball`}
          />
        </div>
      </Card>

      <Card title="Payoff forecast" subtitle={`Total balance by month, paying ${formatAUD(EXTRA_CENTS)} extra per month`}>
        <PayoffChart data={chart} />
        <div className="mt-3 grid gap-3 text-xs leading-relaxed text-muted sm:grid-cols-2">
          <div className="rounded-xl bg-surface-2 p-3">
            <p className="mb-1 font-semibold text-ink">Avalanche — highest interest first</p>
            Mathematically optimal: {avalanche.months} months, {formatAUD(avalanche.totalInterestCents)} interest.
            Order: {avalanche.payoffOrder.map((p) => p.name).join(" → ")}.
          </div>
          <div className="rounded-xl bg-surface-2 p-3">
            <p className="mb-1 font-semibold text-ink">Snowball — smallest balance first</p>
            Motivation optimised: quick wins early. {snowball.months} months,{" "}
            {formatAUD(snowball.totalInterestCents)} interest. If you&rsquo;ve struggled to stick with payoff
            plans before, the behavioural boost is often worth the small extra cost.
          </div>
        </div>
      </Card>

      <Card title="Your debts">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-faint">
                <th className="py-2 pr-3 font-medium">Debt</th>
                <th className="py-2 pr-3 font-medium">Type</th>
                <th className="py-2 pr-3 text-right font-medium">Balance</th>
                <th className="py-2 pr-3 text-right font-medium">Rate</th>
                <th className="py-2 text-right font-medium">Min payment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {debts.map((d) => (
                <tr key={d.id}>
                  <td className="py-2.5 pr-3 font-medium">{d.name}</td>
                  <td className="py-2.5 pr-3">
                    <Badge tone={d.type === "MORTGAGE" ? "neutral" : "warning"}>
                      {d.type.replace("_", " ").toLowerCase()}
                    </Badge>
                  </td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{formatAUD(d.balanceCents)}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums text-muted">{(d.aprBps / 100).toFixed(2)}%</td>
                  <td className="py-2.5 text-right tabular-nums text-muted">{formatAUD(d.minPaymentCents)}/mo</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 max-w-2xl text-xs leading-relaxed text-muted">
          Mortgage tip: every dollar in an offset account works at your mortgage rate, tax-free. Once consumer
          debt is gone, redirecting the {formatAUD(EXTRA_CENTS)}/month there is usually the next best move.
        </p>
      </Card>
    </>
  );
}
