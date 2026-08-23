"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2, Paperclip, Receipt } from "lucide-react";
import { attachReceipt } from "@/lib/actions";

/** Per-row receipt attach/view control. */
export function ReceiptCell({ txnId, hasReceipt }: { txnId: string; hasReceipt: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [attached, setAttached] = useState(hasReceipt);

  if (attached) {
    return (
      <a
        href={`/api/receipts/${txnId}`}
        target="_blank"
        rel="noreferrer"
        aria-label="View receipt"
        title="View receipt"
        className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-accent-soft text-accent"
      >
        <Receipt size={13} aria-hidden />
      </a>
    );
  }

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="sr-only"
        aria-label="Attach receipt"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const data = new FormData();
          data.set("receipt", file);
          startTransition(async () => {
            const result = await attachReceipt(txnId, data);
            if (result.error) setError(result.error);
            else setAttached(true);
          });
        }}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={pending}
        aria-label="Attach receipt"
        title={error ?? "Attach receipt"}
        className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border transition-colors ${
          error ? "border-negative text-negative" : "border-border text-faint hover:border-accent hover:text-accent"
        }`}
      >
        {pending ? <Loader2 size={13} className="animate-spin" aria-hidden /> : <Paperclip size={13} aria-hidden />}
      </button>
    </>
  );
}
