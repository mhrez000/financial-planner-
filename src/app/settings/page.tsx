import { Download, Fingerprint, KeyRound, ShieldCheck, Trash2 } from "lucide-react";
import { getDemoUser } from "@/lib/data";
import { Badge, Card } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await getDemoUser();

  return (
    <>
      <Card title="Profile">
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-faint">Name</dt>
            <dd className="font-medium">{user.name}</dd>
          </div>
          <div>
            <dt className="text-xs text-faint">Email</dt>
            <dd className="font-medium">{user.email}</dd>
          </div>
          <div>
            <dt className="text-xs text-faint">Currency & region</dt>
            <dd className="font-medium">AUD · Australia</dd>
          </div>
        </dl>
      </Card>

      <Card title="Security" subtitle="What ships with real accounts in Phase 2 — designed in from day one">
        <ul className="grid gap-3 sm:grid-cols-2">
          {[
            { icon: KeyRound, label: "Passkeys first, password + TOTP fallback", state: "Phase 2" },
            { icon: Fingerprint, label: "Face ID / fingerprint unlock on mobile", state: "Phase 2" },
            { icon: ShieldCheck, label: "Read-only CDR bank access — never your banking password", state: "By design" },
            { icon: ShieldCheck, label: "Audit log of logins, exports and consent changes", state: "Phase 2" },
          ].map((s) => (
            <li key={s.label} className="flex items-center gap-3 rounded-xl border border-border p-3 text-sm">
              <s.icon size={16} className="shrink-0 text-accent" aria-hidden />
              <span className="flex-1">{s.label}</span>
              <Badge tone="accent">{s.state}</Badge>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Your data" subtitle="Portability and deletion are product features, not support tickets">
        <div className="flex flex-wrap gap-3">
          <a
            href="/api/export/transactions"
            className="flex items-center gap-2 rounded-xl border border-accent px-4 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent-soft"
          >
            <Download size={14} aria-hidden /> Export transactions (CSV)
          </a>
          <a
            href="/api/export/data"
            className="flex items-center gap-2 rounded-xl border border-accent px-4 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent-soft"
          >
            <Download size={14} aria-hidden /> Export everything (JSON)
          </a>
          <button
            type="button"
            disabled
            title="Enabled when real accounts land — the demo dataset resets with `npm run db:reset`"
            className="flex cursor-not-allowed items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-faint"
          >
            <Trash2 size={14} aria-hidden /> Delete all my data
          </button>
        </div>
        <p className="mt-4 max-w-2xl text-xs leading-relaxed text-muted">
          Sage never sells or shares your financial data, runs no ad SDKs, and does no credit-score
          lead generation. The AI coach receives only aggregated insight objects — never raw
          transactions or merchant names. Full posture: <code className="text-[11px]">docs/SECURITY.md</code>.
        </p>
      </Card>
    </>
  );
}
