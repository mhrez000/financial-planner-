import { Check, Merge } from "lucide-react";
import { getCategoriesPage } from "@/lib/data";
import { mergeCategoriesForm, renameCategory } from "@/lib/actions";
import { formatAUD } from "@/lib/domain/money";
import { Badge, Card } from "@/components/ui";
import { CreateCategoryForm } from "./CreateCategoryForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Categories" };

const GROUP_LABEL: Record<string, string> = {
  INCOME: "Income",
  ESSENTIAL: "Essentials",
  LIFESTYLE: "Lifestyle",
  FINANCIAL: "Saving & investing",
};
const GROUP_ORDER = ["INCOME", "ESSENTIAL", "LIFESTYLE", "FINANCIAL"];

export default async function CategoriesPage() {
  const categories = await getCategoriesPage();
  const groups = GROUP_ORDER.map((g) => ({
    group: g,
    label: GROUP_LABEL[g],
    items: categories.filter((c) => c.group === g),
  })).filter((g) => g.items.length > 0);

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Create a category" subtitle="Custom categories behave exactly like built-ins — budgets, rules, analytics">
          <CreateCategoryForm />
        </Card>

        <Card title="Merge categories" subtitle="Moves transactions, rules and budgets to the target, then removes the source">
          <form action={mergeCategoriesForm} className="flex flex-wrap items-center gap-2">
            <select name="sourceId" aria-label="Category to merge away" className="min-w-36 flex-1 rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm">
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <Merge size={14} className="shrink-0 text-faint" aria-hidden />
            <select name="targetId" aria-label="Category to keep" className="min-w-36 flex-1 rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm">
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button type="submit" className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90">
              Merge
            </button>
          </form>
          <p className="mt-3 text-xs leading-relaxed text-faint">
            Left is absorbed into right. Same-period budgets are added together. This can&rsquo;t be
            undone — but nothing is lost, only re-labelled.
          </p>
        </Card>
      </div>

      {groups.map((g) => (
        <Card key={g.group} title={g.label} subtitle={`${g.items.length} categories`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-faint">
                  <th className="py-2 pr-3 font-medium">Name (rename inline)</th>
                  <th className="py-2 pr-3 text-right font-medium">Transactions</th>
                  <th className="py-2 pr-3 text-right font-medium">Rules</th>
                  <th className="py-2 pr-3 text-right font-medium">This month</th>
                  <th className="py-2 font-medium">Budgeted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {g.items.map((c) => {
                  const rename = renameCategory.bind(null, c.id);
                  return (
                    <tr key={c.id}>
                      <td className="py-2 pr-3">
                        <form action={rename} className="flex items-center gap-1.5">
                          <input
                            name="name"
                            defaultValue={c.name}
                            aria-label={`Rename ${c.name}`}
                            className="w-44 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-medium outline-none transition-colors hover:border-border focus:border-accent focus:bg-surface-2"
                          />
                          <button
                            type="submit"
                            aria-label={`Save name for ${c.name}`}
                            className="flex h-6 w-6 items-center justify-center rounded-lg text-faint hover:text-accent"
                          >
                            <Check size={12} aria-hidden />
                          </button>
                        </form>
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums text-muted">{c._count.transactions}</td>
                      <td className="py-2 pr-3 text-right tabular-nums text-muted">{c._count.rules}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{formatAUD(c.monthSpendCents)}</td>
                      <td className="py-2">
                        {c._count.budgets > 0 ? <Badge tone="accent">budgeted</Badge> : <span className="text-xs text-faint">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ))}
    </>
  );
}
