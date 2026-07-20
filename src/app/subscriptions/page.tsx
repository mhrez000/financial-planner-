import { getSubscriptions } from "@/lib/data";
import { formatAUD } from "@/lib/domain/money";
import { Badge, Card, Stat } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Subscriptions" };

const title = (s: string) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

export default async function SubscriptionsPage() {
  const subs = await getSubscriptions();
  const monthly = subs.reduce((a, s) => a + s.monthlyCostCents, 0);
  const annual = subs.reduce((a, s) => a + s.annualCostCents, 0);
  const increased = subs.filter((s) => s.priceIncreased);

  return (
    <>
      <Card>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Recurring services" value={String(subs.length)} hint="Detected automatically" />
          <Stat label="Monthly cost" value={formatAUD(monthly)} />
          <Stat label="Annual cost" value={formatAUD(annual)} tone="negative" hint="What they really add up to" />
          <Stat label="Price rises" value={String(increased.length)} tone={increased.length ? "negative" : "positive"} hint="In your latest charges" />
        </div>
      </Card>

      <Card title="Detected subscriptions & recurring bills" subtitle="Found by analysing amount and interval stability — nothing to set up">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-faint">
                <th className="py-2 pr-3 font-medium">Service</th>
                <th className="py-2 pr-3 font-medium">Cadence</th>
                <th className="py-2 pr-3 text-right font-medium">Charge</th>
                <th className="py-2 pr-3 text-right font-medium">Per month</th>
                <th className="py-2 pr-3 text-right font-medium">Per year</th>
                <th className="py-2 pr-3 font-medium">Next payment</th>
                <th className="py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {subs.map((s) => (
                <tr key={s.merchant}>
                  <td className="py-2.5 pr-3 font-medium">{title(s.merchant)}</td>
                  <td className="py-2.5 pr-3 text-xs text-muted">{s.cadence.toLowerCase()}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{formatAUD(s.amountCents)}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums text-muted">{formatAUD(s.monthlyCostCents)}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums font-medium">{formatAUD(s.annualCostCents)}</td>
                  <td className="py-2.5 pr-3 text-xs text-muted">
                    {s.nextPayment.toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                  </td>
                  <td className="py-2.5">
                    {s.priceIncreased ? <Badge tone="warning">price increased</Badge> : <Badge tone="positive">stable</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 max-w-2xl text-xs leading-relaxed text-muted">
          The two services you use least are usually worth {formatAUD(Math.round(annual * 0.15))}+ a year.
          Cancelling one streaming service and redirecting it to a goal is the single easiest win in this app.
        </p>
      </Card>
    </>
  );
}
