import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Download } from "lucide-react";
import { getMonthlyReport } from "@/lib/data";
import { formatAUD, percent } from "@/lib/domain/money";
import { Card, Stat } from "@/components/ui";
import { PrintButton } from "./PrintButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reports" };

export default async function ReportsPage({ searchParams }: { searchParams: { m?: string } }) {
  const offset = Math.max(0, Math.min(6, Number(searchParams.m ?? 0) || 0));
  const r = await getMonthlyReport(offset);
  const surplus = r.summary.incomeCents - r.summary.spendCents - r.summary.savedCents;
  const savingsRate = r.summary.incomeCents > 0 ? (r.summary.savedCents / r.summary.incomeCents) : 0;

  return (
    <>
      <Card
        title={`Monthly report — ${r.label}`}
        subtitle={`${r.transactionCount} transactions`}
        action={
          <div className="flex items-center gap-2 print:hidden">
            <Link
              href={`/reports?m=${offset + 1}`}
              className="rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-muted hover:text-ink"
              aria-label="Previous month"
            >
              ← Older
            </Link>
            {offset > 0 && (
              <Link
                href={`/reports?m=${offset - 1}`}
                className="rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-muted hover:text-ink"
                aria-label="Next month"
              >
                Newer →
              </Link>
            )}
            <PrintButton />
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Income" value={formatAUD(r.summary.incomeCents)} tone="positive" />
          <Stat label="Spending" value={formatAUD(r.summary.spendCents)} />
          <Stat label="Saved & invested" value={formatAUD(r.summary.savedCents)} hint={`${percent(savingsRate)} savings rate`} tone="positive" />
          <Stat label="Left over" value={formatAUD(surplus, { signed: true })} tone={surplus >= 0 ? "positive" : "negative"} />
        </div>
      </Card>

      <Card title="Spending by category" subtitle="Compared with the previous month">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-faint">
              <th className="py-2 pr-3 font-medium">Category</th>
              <th className="py-2 pr-3 text-right font-medium">This month</th>
              <th className="py-2 pr-3 text-right font-medium">Last month</th>
              <th className="py-2 text-right font-medium">Change</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {r.categories.map((c) => {
              const delta = c.cents - c.prevCents;
              const pct = c.prevCents > 0 ? delta / c.prevCents : null;
              return (
                <tr key={c.name}>
                  <td className="py-2.5 pr-3 font-medium">{c.name}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{formatAUD(c.cents)}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums text-muted">{formatAUD(c.prevCents)}</td>
                  <td className="py-2.5 text-right tabular-nums">
                    {pct === null ? (
                      <span className="text-faint">new</span>
                    ) : (
                      <span className={delta > 0 ? "text-negative" : "text-positive"}>
                        {delta > 0 ? <ArrowUpRight size={12} className="inline" aria-hidden /> : <ArrowDownRight size={12} className="inline" aria-hidden />}{" "}
                        {percent(Math.abs(pct))}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <Card title="Exports" subtitle="Your data is yours — take it anywhere" className="print:hidden">
        <div className="flex flex-wrap gap-3">
          <a
            href="/api/export/transactions"
            className="flex items-center gap-2 rounded-xl border border-accent px-4 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent-soft"
          >
            <Download size={14} aria-hidden /> All transactions (CSV)
          </a>
          <a
            href="/api/export/data"
            className="flex items-center gap-2 rounded-xl border border-accent px-4 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent-soft"
          >
            <Download size={14} aria-hidden /> Everything (JSON)
          </a>
        </div>
        <p className="mt-3 text-xs text-faint">
          Use “Print report” above for a PDF via your browser&rsquo;s print dialog. EOFY tax exports arrive with the Tax Centre.
        </p>
      </Card>
    </>
  );
}
