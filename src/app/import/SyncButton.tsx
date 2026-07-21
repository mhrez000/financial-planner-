"use client";

import { useState, useTransition } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { syncNow } from "@/lib/actions";
import type { SyncResult } from "@/lib/bank/sync";

export function SyncButton() {
  const [pending, startTransition] = useTransition();
  const [results, setResults] = useState<SyncResult[] | null>(null);

  return (
    <div className="text-right">
      <button
        type="button"
        onClick={() => startTransition(async () => setResults(await syncNow()))}
        disabled={pending}
        className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <RefreshCw size={14} aria-hidden />}
        Sync now
      </button>
      {results && (
        <p className="mt-1.5 text-[11px] text-muted" role="status">
          {results.reduce((a, r) => a + r.imported, 0)} imported ·{" "}
          {results.reduce((a, r) => a + r.duplicatesSkipped, 0)} duplicates skipped
        </p>
      )}
    </div>
  );
}
