import Link from "next/link";
import { ArrowRight, Lightbulb, PartyPopper, TrendingUp } from "lucide-react";
import { getDashboard } from "@/lib/data";
import { formatAUD } from "@/lib/domain/money";
import { Badge, Card, ProgressBar, ScoreRing, Stat } from "@/components/ui";
import { CashflowChart } from "@/components/charts";

export const dynamic = "force-dynamic";

const SEVERITY_TONE = { celebrate: "positive", info: "accent", nudge: "warning", warning: "negative" } as const;

export default async function DashboardPage() {
  const d = await getDashboard();
  const surplus = d.curSummary.incomeCents - d.curSummary.spendCents - d.curSummary.savedCents;

  return (
    <>
      {/* Row 1 — the answer to "how am I doing today?" */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1" title="Financial health" subtitle={d.health.grade}>
          <div className="flex items-center gap-5">
            <ScoreRing score={d.health.score} />
            <ul className="flex-1 space-y-2">
              {d.health.pillars.slice(0, 4).map((p) => (
                <li key={p.key}>
                  <div className="mb-0.5 flex justify-between text-[11px]">
                    <span className="text-muted">{p.label}</span>
                    <span className="font-medium tabular-nums">{Math.round(p.score * p.weight)}/{p.weight}</span>
                  </div>
                  <ProgressBar fraction={p.score} tone={p.score > 0.66 ? "accent" : p.score > 0.33 ? "warning" : "negative"} />
                </li>
              ))}
            </ul>
          </div>
          {d.health.pillars.find((p) => p.advice) && (
            <p className="mt-4 rounded-xl bg-surface-2 p-3 text-xs leading-relaxed text-muted">
              <Lightbulb size={13} className="mb-0.5 mr-1 inline text-warning" aria-hidden />
              {d.health.pillars.find((p) => p.advice)!.advice}
            </p>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3">
            <Stat label="Net worth" value={formatAUD(d.netWorthCents, { compact: true })} hint="All accounts" tone="positive" />
            <Stat label="Total cash" value={formatAUD(d.cashCents)} hint="Everyday + savings" />
            <Stat
              label="This month"
              value={formatAUD(-d.curSummary.spendCents, { signed: true })}
              hint={`of ${formatAUD(d.curSummary.incomeCents)} income`}
              tone={surplus >= 0 ? "neutral" : "negative"}
            />
            <Stat label="Saved this month" value={formatAUD(d.curSummary.savedCents)} hint="Transfers + investing" tone="positive" />
            <Stat
              label="Bills due"
              value={formatAUD(d.billsDueThisMonth.reduce((a, b) => a + b.amountCents, 0))}
              hint={`${d.billsDueThisMonth.length} before month end`}
            />
            <Stat
              label="Projected month end"
              value={formatAUD(d.eom.projectedBalanceCents, { compact: true })}
              hint={`~${formatAUD(d.eom.dailySpendRateCents)}/day pace`}
              tone={d.eom.projectedBalanceCents >= d.cashCents ? "positive" : "neutral"}
            />
          </div>
        </Card>
      </div>

      {/* Row 2 — cash flow + coach */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3" title="Cash flow" subtitle="Income vs spending vs saved, last 6 months">
          <CashflowChart data={d.cashflow} />
        </Card>
        <Card className="lg:col-span-2" title="Your coach" subtitle="Personalised, explainable insights">
          <ul className="space-y-3">
            {d.insights.slice(0, 4).map((i) => (
              <li key={i.id} className="rounded-xl border border-border p-3">
                <div className="mb-1 flex items-center gap-2">
                  {i.severity === "celebrate" ? (
                    <PartyPopper size={14} className="text-positive" aria-hidden />
                  ) : (
                    <TrendingUp size={14} className="text-accent" aria-hidden />
                  )}
                  <p className="flex-1 text-[13px] font-semibold leading-tight">{i.title}</p>
                  <Badge tone={SEVERITY_TONE[i.severity]}>{i.severity}</Badge>
                </div>
                <p className="text-xs leading-relaxed text-muted">{i.body}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Row 3 — budgets, goals, subscriptions */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card
          title="Budgets"
          subtitle="This month"
          action={<Link href="/budgets" className="text-xs font-medium text-accent hover:underline">All budgets <ArrowRight size={11} className="inline" aria-hidden /></Link>}
        >
          <ul className="space-y-3">
            {d.budgets.slice(0, 5).map((b) => {
              const frac = b.spentCents / b.amountCents;
              return (
                <li key={b.id}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="font-medium">{b.category.name}</span>
                    <span className="tabular-nums text-muted">
                      {formatAUD(b.spentCents)} / {formatAUD(b.amountCents)}
                    </span>
                  </div>
                  <ProgressBar fraction={frac} tone={frac > 1 ? "negative" : frac > 0.85 ? "warning" : "accent"} />
                </li>
              );
            })}
          </ul>
        </Card>

        <Card
          title="Goals"
          subtitle="Progress & prediction"
          action={<Link href="/goals" className="text-xs font-medium text-accent hover:underline">All goals <ArrowRight size={11} className="inline" aria-hidden /></Link>}
        >
          <ul className="space-y-4">
            {d.goals.slice(0, 3).map((g) => (
              <li key={g.id}>
                <div className="mb-1 flex items-baseline justify-between">
                  <span className="text-xs font-medium">{g.name}</span>
                  <span className="text-[11px] tabular-nums text-muted">
                    {formatAUD(g.savedCents, { compact: true })} of {formatAUD(g.targetCents, { compact: true })}
                  </span>
                </div>
                <ProgressBar fraction={g.savedCents / g.targetCents} />
                <p className="mt-1 text-[11px] text-faint">
                  {g.forecast.predictedCompletion
                    ? `On track for ${g.forecast.predictedCompletion.toLocaleDateString("en-AU", { month: "short", year: "numeric" })} · ${Math.round(g.forecast.successProbability * 100)}% likely`
                    : "Add a monthly contribution to forecast"}
                </p>
              </li>
            ))}
          </ul>
        </Card>

        <Card
          title="Subscriptions"
          subtitle={`${formatAUD(d.subscriptions.reduce((a, s) => a + s.monthlyCostCents, 0))}/month detected`}
          action={<Link href="/subscriptions" className="text-xs font-medium text-accent hover:underline">Manage <ArrowRight size={11} className="inline" aria-hidden /></Link>}
        >
          <ul className="space-y-2.5">
            {d.subscriptions.slice(0, 6).map((s) => (
              <li key={s.merchant} className="flex items-center justify-between text-xs">
                <span className="truncate font-medium">{s.merchant.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}</span>
                <span className="flex items-center gap-2">
                  {s.priceIncreased && <Badge tone="warning">price ↑</Badge>}
                  <span className="tabular-nums text-muted">{formatAUD(s.monthlyCostCents)}/mo</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Row 4 — recent activity */}
      <Card
        title="Recent transactions"
        action={<Link href="/transactions" className="text-xs font-medium text-accent hover:underline">View all <ArrowRight size={11} className="inline" aria-hidden /></Link>}
      >
        <ul className="divide-y divide-border">
          {d.recentTransactions.map((t) => (
            <li key={t.id} className="flex items-center justify-between py-2.5 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">{t.merchant.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}</p>
                <p className="text-xs text-faint">
                  {t.date.toLocaleDateString("en-AU", { day: "numeric", month: "short" })} · {t.category?.name ?? "Uncategorised"}
                </p>
              </div>
              <span className={`tabular-nums font-medium ${t.amountCents > 0 ? "text-positive" : ""}`}>
                {formatAUD(t.amountCents, { signed: true })}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
