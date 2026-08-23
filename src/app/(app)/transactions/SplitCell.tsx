"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus, Scissors, X } from "lucide-react";
import { splitTransaction, type SplitPartInput } from "@/lib/actions";

interface CategoryOption {
  id: string;
  name: string;
}

/** Per-row control that opens a small dialog to split a transaction. */
export function SplitCell({
  txnId,
  amountCents,
  merchant,
  isChild,
  categories,
}: {
  txnId: string;
  amountCents: number;
  merchant: string;
  isChild: boolean;
  categories: CategoryOption[];
}) {
  const [open, setOpen] = useState(false);
  const [parts, setParts] = useState<SplitPartInput[]>([
    { amountDollars: 0, categoryId: categories[0]?.id ?? "" },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (isChild) {
    return (
      <span title="Part of a split" className="text-[10px] font-medium text-faint">
        ↳ split
      </span>
    );
  }

  const magnitude = Math.abs(amountCents) / 100;
  const remainder = magnitude - parts.reduce((a, p) => a + (p.amountDollars || 0), 0);

  const submit = () =>
    startTransition(async () => {
      const result = await splitTransaction(txnId, parts);
      if (result.error) setError(result.error);
      else {
        setOpen(false);
        setParts([{ amountDollars: 0, categoryId: categories[0]?.id ?? "" }]);
        setError(null);
      }
    });

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Split ${merchant}`}
        title="Split transaction"
        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border text-faint transition-colors hover:border-accent hover:text-accent"
      >
        <Scissors size={13} aria-hidden />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Split ${merchant}`}
        >
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-xl">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-sm font-bold">Split transaction</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-faint hover:text-ink"
              >
                <X size={14} aria-hidden />
              </button>
            </div>
            <p className="mb-4 text-xs text-muted">
              {merchant.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())} · $
              {magnitude.toFixed(2)} — carve out parts with their own categories; the original keeps
              the remainder.
            </p>

            <div className="space-y-2">
              {parts.map((part, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={part.amountDollars || ""}
                    onChange={(e) =>
                      setParts((p) =>
                        p.map((x, j) => (j === i ? { ...x, amountDollars: Number(e.target.value) } : x)),
                      )
                    }
                    placeholder="0.00"
                    aria-label={`Split ${i + 1} amount`}
                    className="w-28 rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
                  />
                  <select
                    value={part.categoryId}
                    onChange={(e) =>
                      setParts((p) => p.map((x, j) => (j === i ? { ...x, categoryId: e.target.value } : x)))
                    }
                    aria-label={`Split ${i + 1} category`}
                    className="flex-1 rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {parts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setParts((p) => p.filter((_, j) => j !== i))}
                      aria-label={`Remove split ${i + 1}`}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border text-faint hover:text-negative"
                    >
                      <X size={13} aria-hidden />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setParts((p) => [...p, { amountDollars: 0, categoryId: categories[0]?.id ?? "" }])}
              className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
            >
              <Plus size={12} aria-hidden /> Add another part
            </button>

            <p className={`mt-3 text-xs ${remainder <= 0 ? "text-negative" : "text-muted"}`}>
              Original keeps: ${remainder.toFixed(2)}
            </p>
            {error && (
              <p role="alert" className="mt-2 rounded-xl bg-negative/10 px-3 py-2 text-xs text-negative">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={submit}
              disabled={pending || remainder <= 0 || parts.some((p) => !p.amountDollars)}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {pending && <Loader2 size={14} className="animate-spin" aria-hidden />}
              Split into {parts.length + 1} transactions
            </button>
          </div>
        </div>
      )}
    </>
  );
}
