import { getAnalytics } from "@/lib/data";
import { formatAUD } from "@/lib/domain/money";
import { Card } from "@/components/ui";
import { CategoryDonut, TrendChart, WeekdayBar } from "@/components/charts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Analytics" };

export default async function InsightsPage() {
  const a = await getAnalytics();
  const maxDaily = Math.max(1, ...a.daily.values());

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Income vs spending" subtitle="Last 6 months">
          <TrendChart data={a.trend} />
        </Card>
        <Card title="Where the money went" subtitle="This month by category">
          <CategoryDonut data={a.categoryBreakdown} />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Spending by weekday" subtitle="Last 90 days — the amber bar is your danger day">
          <WeekdayBar data={a.weekday} />
        </Card>
        <Card title="Spending calendar" subtitle="Darker means a heavier day this month">
          <div className="grid grid-cols-7 gap-1.5" role="img" aria-label="Calendar heat map of daily spending">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <span key={i} className="text-center text-[10px] font-medium text-faint">{d}</span>
            ))}
            {(() => {
              const now = new Date();
              const first = new Date(now.getFullYear(), now.getMonth(), 1);
              const lead = (first.getDay() + 6) % 7;
              const cells = [];
              for (let i = 0; i < lead; i++) cells.push(<span key={`pad-${i}`} />);
              for (let day = 1; day <= a.daysInMonth; day++) {
                const cents = a.daily.get(day) ?? 0;
                const intensity = cents / maxDaily;
                const future = day > now.getDate();
                cells.push(
                  <div
                    key={day}
                    title={`${day}: ${formatAUD(cents)}`}
                    className="flex aspect-square items-center justify-center rounded-lg text-[10px] tabular-nums"
                    style={{
                      background: future
                        ? "rgb(var(--surface-2) / 0.5)"
                        : `rgb(var(--accent) / ${0.08 + intensity * 0.85})`,
                      color: intensity > 0.55 ? "white" : "rgb(var(--muted))",
                    }}
                  >
                    {day}
                  </div>,
                );
              }
              return cells;
            })()}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Largest purchases" subtitle="Last 90 days — worth a second look">
          <ul className="divide-y divide-border">
            {a.largest.map((t) => (
              <li key={t.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <p className="font-medium">{t.merchant.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}</p>
                  <p className="text-xs text-faint">
                    {t.date.toLocaleDateString("en-AU", { day: "numeric", month: "short" })} · {t.category?.name ?? "Uncategorised"}
                  </p>
                </div>
                <span className="tabular-nums font-semibold text-negative">{formatAUD(t.amountCents)}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Top merchants" subtitle="Where your money actually goes, last 90 days">
          <ul className="space-y-2.5">
            {a.topMerchants.map((m) => {
              const max = a.topMerchants[0].total;
              return (
                <li key={m.merchant} className="text-xs">
                  <div className="mb-1 flex justify-between">
                    <span className="font-medium">{m.merchant.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}</span>
                    <span className="tabular-nums text-muted">{formatAUD(m.total)} · {m.count}×</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${(m.total / max) * 100}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </>
  );
}
