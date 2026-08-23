"use client";

import { useRef, useState, useTransition } from "react";
import { CheckCircle2, FileUp, Loader2 } from "lucide-react";
import { importCsv, previewCsv, type CsvPreview } from "@/lib/actions";
import { Badge, Card } from "@/components/ui";

const fmt = (cents: number) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(cents / 100);

export function ImportClient({ accounts }: { accounts: { id: string; name: string }[] }) {
  const [csvText, setCsvText] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<CsvPreview | null>(null);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [done, setDone] = useState<{ imported: number; duplicatesSkipped: number } | null>(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setDone(null);
    setFileName(file.name);
    file.text().then((text) => {
      setCsvText(text);
      startTransition(async () => setPreview(await previewCsv(text)));
    });
  };

  const runImport = () => {
    if (!csvText) return;
    startTransition(async () => {
      setDone(await importCsv(csvText, accountId));
      setPreview(null);
      setCsvText(null);
    });
  };

  const fresh = preview?.rows.filter((r) => !r.duplicate).length ?? 0;
  const dupes = preview?.rows.filter((r) => r.duplicate).length ?? 0;

  return (
    <>
      <Card title="Import a bank CSV" subtitle="CBA, ING, NAB, ANZ, Westpac and most other exports are detected automatically — headers or not">
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            aria-label="Choose CSV file"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <FileUp size={15} aria-hidden /> Choose CSV file
          </button>
          {fileName && <span className="text-xs text-muted">{fileName}</span>}
          <label className="ml-auto flex items-center gap-2 text-xs text-muted">
            Into account
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-ink"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </label>
        </div>
        {pending && (
          <p className="mt-3 flex items-center gap-2 text-xs text-muted">
            <Loader2 size={13} className="animate-spin" aria-hidden /> Analysing…
          </p>
        )}
        {done && (
          <p className="mt-3 flex items-center gap-2 rounded-xl bg-accent-soft p-3 text-sm text-accent">
            <CheckCircle2 size={15} aria-hidden />
            Imported {done.imported} transaction{done.imported === 1 ? "" : "s"}
            {done.duplicatesSkipped > 0 && ` — ${done.duplicatesSkipped} duplicate${done.duplicatesSkipped === 1 ? "" : "s"} skipped automatically`}.
          </p>
        )}
      </Card>

      {preview && (
        <Card
          title="Preview"
          subtitle={`${fresh} new · ${dupes} duplicates will be skipped · ${preview.skipped.length} unparseable lines`}
          action={
            <button
              type="button"
              onClick={runImport}
              disabled={pending || fresh === 0}
              className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Import {fresh} transactions
            </button>
          }
        >
          <div className="max-h-96 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface">
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-faint">
                  <th className="py-2 pr-3 font-medium">Date</th>
                  <th className="py-2 pr-3 font-medium">Merchant</th>
                  <th className="py-2 pr-3 font-medium">Auto category</th>
                  <th className="py-2 pr-3 text-right font-medium">Amount</th>
                  <th className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {preview.rows.map((r, i) => (
                  <tr key={i} className={r.duplicate ? "opacity-45" : ""}>
                    <td className="whitespace-nowrap py-2 pr-3 text-xs text-muted">
                      {new Date(r.dateISO).toLocaleDateString("en-AU", { day: "2-digit", month: "short" })}
                    </td>
                    <td className="max-w-[260px] truncate py-2 pr-3 font-medium">{r.merchant}</td>
                    <td className="py-2 pr-3 text-xs text-muted">{r.categoryName ?? "—"}</td>
                    <td className={`py-2 pr-3 text-right tabular-nums ${r.amountCents > 0 ? "text-positive" : ""}`}>
                      {fmt(r.amountCents)}
                    </td>
                    <td className="py-2">
                      {r.duplicate ? <Badge tone="warning">duplicate</Badge> : <Badge tone="positive">new</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.skipped.length > 0 && (
            <p className="mt-3 text-xs text-faint">
              Skipped lines: {preview.skipped.map((s) => `${s.line} (${s.reason})`).join(", ")}
            </p>
          )}
        </Card>
      )}
    </>
  );
}
