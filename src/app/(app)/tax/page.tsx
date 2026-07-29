import Link from "next/link";
import { Download, Plus, X } from "lucide-react";
import { getTaxPage } from "@/lib/data";
import { toggleTaxDeductible } from "@/lib/actions";
import { formatAUD } from "@/lib/domain/money";
import { Card, Stat } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tax Centre" };

const title = (s: string) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

export default async function TaxPage({ searchParams }: { searchParams: { fy?: string } }) {
  const fyParam = Number(searchParams.fy) || undefined;
  const t = await getTaxPage(fyParam);

  return (
    <>
      <Card
        title={`Tax Centre — ${t.fy.label}`}
        subtitle="Australian financial year: 1 July to 30 June"
        action={
          <div className="flex items-center gap-2">
            <Link href={`/tax?fy=${t.fy.endYear - 1}`} className="rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-muted hover:text-ink">
              ← {t.fy.endYear - 2}–{String(t.fy.endYear - 1).slice(2)}
            </Link>
            <a
              href={`/api/export/tax?fy=${t.fy.endYear}`}
              className="flex items-center gap-1.5 rounded-xl bg-accent px-3 py-1.5 text-xs font-semibold text-white"
            >
              <Download size={13} aria-hidden /> EOFY export (CSV)
            </a>
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Stat label="Income (FY)" value={formatAUD(t.incomeCents)} />
          <Stat label="Deductions tracked" value={formatAUD(t.totalDeductibleCents)} tone="positive" hint={`${t.deductible.length} receipts`} />
          <Stat
            label="Est. refund impact"
            value={`~${formatAUD(Math.round(t.totalDeductibleCents * 0.32))}`}
            hint="At a 32.5% marginal rate — indicative only"
          />
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Deductible expenses" subtitle="Everything marked for this FY — untick anything that shouldn't be here">
          {t.deductible.length === 0 ? (
            <p className="py-4 text-sm text-muted">Nothing marked yet — flag work-related expenses from the suggestions.</p>
          ) : (
            <ul className="divide-y divide-border">
              {t.deductible.map((d) => {
                const untag = toggleTaxDeductible.bind(null, d.id);
                return (
                  <li key={d.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{title(d.merchant)}</p>
                      <p className="text-xs text-faint">
                        {d.date.toLocaleDateString("en-AU", { day: "numeric", month: "short" })} · {d.category?.name ?? "Uncategorised"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="tabular-nums font-medium">{formatAUD(Math.abs(d.amountCents))}</span>
                      <form action={untag}>
                        <button
                          type="submit"
                          aria-label={`Remove ${title(d.merchant)} from deductions`}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-faint transition-colors hover:text-negative"
                        >
                          <X size={13} aria-hidden />
                        </button>
                      </form>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {t.byCategory.length > 0 && (
            <div className="mt-4 rounded-xl bg-surface-2 p-3">
              <p className="mb-2 text-xs font-semibold">By category</p>
              <ul className="space-y-1 text-xs text-muted">
                {t.byCategory.map((c) => (
                  <li key={c.name} className="flex justify-between">
                    <span>{c.name}</span>
                    <span className="tabular-nums font-medium">{formatAUD(c.cents)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        <Card title="Likely deductible?" subtitle="Common work-related categories you haven't flagged — one tap to add">
          {t.candidates.length === 0 ? (
            <p className="py-4 text-sm text-muted">No suggestions right now.</p>
          ) : (
            <ul className="divide-y divide-border">
              {t.candidates.map((c) => {
                const tag = toggleTaxDeductible.bind(null, c.id);
                return (
                  <li key={c.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{title(c.merchant)}</p>
                      <p className="text-xs text-faint">
                        {c.date.toLocaleDateString("en-AU", { day: "numeric", month: "short" })} · {c.category?.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="tabular-nums text-muted">{formatAUD(Math.abs(c.amountCents))}</span>
                      <form action={tag}>
                        <button
                          type="submit"
                          aria-label={`Mark ${title(c.merchant)} as deductible`}
                          className="flex h-7 items-center gap-1 rounded-lg border border-accent px-2 text-xs font-semibold text-accent transition-colors hover:bg-accent-soft"
                        >
                          <Plus size={12} aria-hidden /> Deduct
                        </button>
                      </form>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-4 text-[11px] leading-relaxed text-faint">
            General information only, not tax advice — deductibility depends on your circumstances.
            The EOFY export gives your accountant everything in one file.
          </p>
        </Card>
      </div>
    </>
  );
}
