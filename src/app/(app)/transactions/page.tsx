import { Search } from "lucide-react";
import { ReceiptCell } from "./ReceiptCell";
import { getTransactionsPage } from "@/lib/data";
import { addTransaction, addCategoryRule } from "@/lib/actions";
import { formatAUD } from "@/lib/domain/money";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata = { title: "Transactions" };

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: { q?: string; category?: string };
}) {
  const { txns, categories, accounts } = await getTransactionsPage(searchParams.q, searchParams.category);
  const spendCats = categories.filter((c) => c.group !== "INCOME");

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" title="Add a transaction" subtitle="Leave category empty to auto-categorise">
          <form action={addTransaction} className="grid grid-cols-2 gap-3 sm:grid-cols-6">
            <label className="col-span-2 sm:col-span-2">
              <span className="mb-1 block text-xs font-medium text-muted">Merchant</span>
              <input name="merchant" required placeholder="e.g. Woolworths" className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent" />
            </label>
            <label>
              <span className="mb-1 block text-xs font-medium text-muted">Amount</span>
              <input name="amount" type="number" step="0.01" min="0.01" required placeholder="0.00" className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent" />
            </label>
            <label>
              <span className="mb-1 block text-xs font-medium text-muted">Type</span>
              <select name="kind" className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm">
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </label>
            <label>
              <span className="mb-1 block text-xs font-medium text-muted">Account</span>
              <select name="accountId" className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm">
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-xs font-medium text-muted">Category</span>
              <select name="categoryId" className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm">
                <option value="">Auto</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
            <div className="col-span-2 sm:col-span-6">
              <button type="submit" className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90">
                Add transaction
              </button>
            </div>
          </form>
        </Card>

        <Card title="Categorisation rule" subtitle="e.g. anything containing “MCD” → Fast Food">
          <form action={addCategoryRule} className="space-y-3">
            <input name="pattern" required placeholder="Text to match, e.g. MCD" className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent" aria-label="Pattern to match" />
            <select name="categoryId" required className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm" aria-label="Category">
              {spendCats.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button type="submit" className="rounded-xl border border-accent px-4 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent-soft">
              Create rule & apply
            </button>
          </form>
        </Card>
      </div>

      <Card title={`Transactions ${searchParams.q ? `matching “${searchParams.q}”` : ""}`}>
        <form className="mb-4 flex flex-wrap gap-2" role="search">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" aria-hidden />
            <input
              name="q"
              defaultValue={searchParams.q ?? ""}
              placeholder="Search merchant or description…"
              className="w-full rounded-xl border border-border bg-surface-2 py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-accent"
              aria-label="Search transactions"
            />
          </div>
          <select name="category" defaultValue={searchParams.category ?? ""} className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm" aria-label="Filter by category">
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button type="submit" className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white">Filter</button>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-faint">
                <th className="py-2 pr-3 font-medium">Date</th>
                <th className="py-2 pr-3 font-medium">Merchant</th>
                <th className="py-2 pr-3 font-medium">Category</th>
                <th className="py-2 pr-3 font-medium">Account</th>
                <th className="py-2 pr-3 text-right font-medium">Amount</th>
                <th className="py-2 font-medium">
                  <span className="sr-only">Receipt</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {txns.map((t) => (
                <tr key={t.id}>
                  <td className="whitespace-nowrap py-2.5 pr-3 text-xs text-muted">
                    {t.date.toLocaleDateString("en-AU", { day: "2-digit", month: "short" })}
                  </td>
                  <td className="max-w-[220px] truncate py-2.5 pr-3 font-medium">
                    {t.merchant.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
                  </td>
                  <td className="py-2.5 pr-3 text-xs text-muted">{t.category?.name ?? "—"}</td>
                  <td className="py-2.5 pr-3 text-xs text-muted">{t.account.name}</td>
                  <td className={`py-2.5 pr-3 text-right tabular-nums font-medium ${t.amountCents > 0 ? "text-positive" : ""}`}>
                    {formatAUD(t.amountCents, { signed: true })}
                  </td>
                  <td className="py-2.5">
                    <ReceiptCell txnId={t.id} hasReceipt={t.receiptKey !== null} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {txns.length === 0 && <p className="py-8 text-center text-sm text-muted">No transactions match.</p>}
        </div>
      </Card>
    </>
  );
}
