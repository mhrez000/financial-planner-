import { getDashboard } from "@/lib/data";
import { formatAUD } from "@/lib/domain/money";
import { Badge, Card, ProgressBar } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Budgets" };

export default async function BudgetsPage() {
  const d = await getDashboard();
  const totalBudget = d.budgets.reduce((a, b) => a + b.amountCents, 0);
  const totalSpent = d.budgets.reduce((a, b) => a + b.spentCents, 0);
  const now = new Date();
  const monthFrac = now.getDate() / new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  return (
    <>
      <Card title="This month at a glance" subtitle={`${Math.round(monthFrac * 100)}% of the month gone — a healthy pace keeps the bar behind that line`}>
        <div className="mb-2 flex items-baseline justify-between">
          <p className="text-2xl font-semibold tabular-nums">{formatAUD(totalSpent)}</p>
          <p className="text-sm text-muted">of {formatAUD(totalBudget)} budgeted</p>
        </div>
        <div className="relative">
          <ProgressBar fraction={totalSpent / totalBudget} tone={totalSpent / totalBudget > monthFrac * 1.1 ? "warning" : "accent"} className="h-3" />
          <div
            className="absolute top-[-3px] h-[18px] w-0.5 rounded bg-ink/40"
            style={{ left: `${monthFrac * 100}%` }}
            title="Where the month is up to"
            aria-hidden
          />
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {d.budgets
          .sort((a, b) => b.spentCents / b.amountCents - a.spentCents / a.amountCents)
          .map((b) => {
            const frac = b.spentCents / b.amountCents;
            const remaining = b.amountCents - b.spentCents;
            return (
              <Card key={b.id}>
                <div className="mb-1 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{b.category.name}</h3>
                  <Badge tone={frac > 1 ? "negative" : b.onTrack ? "positive" : "warning"}>
                    {frac > 1 ? "over budget" : b.onTrack ? "on track" : "running hot"}
                  </Badge>
                </div>
                <p className="mb-2 text-xs text-muted">
                  {remaining >= 0 ? `${formatAUD(remaining)} left` : `${formatAUD(-remaining)} over`} ·{" "}
                  {formatAUD(b.spentCents)} of {formatAUD(b.amountCents)}
                </p>
                <ProgressBar fraction={frac} tone={frac > 1 ? "negative" : frac > 0.85 ? "warning" : "accent"} />
                <p className="mt-2 text-[11px] text-faint">
                  Weekly slice: about {formatAUD(Math.round((b.amountCents / 30.4) * 7))} — small weekly limits beat big monthly ones.
                </p>
              </Card>
            );
          })}
      </div>

      <Card title="Budgeting styles" subtitle="Sage supports several methods — mix and match per category">
        <div className="grid gap-3 text-xs leading-relaxed text-muted sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-surface-2 p-3">
            <p className="mb-1 font-semibold text-ink">Category budgets</p>
            Caps per category (active above). Simple, visible, forgiving.
          </div>
          <div className="rounded-xl bg-surface-2 p-3">
            <p className="mb-1 font-semibold text-ink">50 / 30 / 20</p>
            50% essentials, 30% lifestyle, 20% saving. Sage&rsquo;s category groups map straight onto it.
          </div>
          <div className="rounded-xl bg-surface-2 p-3">
            <p className="mb-1 font-semibold text-ink">Envelope</p>
            Give every dollar a job on payday; spend only what&rsquo;s in the envelope.
          </div>
          <div className="rounded-xl bg-surface-2 p-3">
            <p className="mb-1 font-semibold text-ink">Zero-based</p>
            Income − allocations = $0. Maximum control for variable months.
          </div>
        </div>
      </Card>
    </>
  );
}
