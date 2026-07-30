import { Copy, Eye, EyeOff, LogOut, Users } from "lucide-react";
import { getHouseholdPage } from "@/lib/data";
import { createHousehold, leaveHousehold, toggleAccountShared } from "@/lib/actions";
import { formatAUD, percent } from "@/lib/domain/money";
import { Badge, Card, ProgressBar, Stat } from "@/components/ui";
import { JoinForm } from "./JoinForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Household" };

export default async function HouseholdPage() {
  const { household, myAccounts, summary, role } = await getHouseholdPage();

  if (!household || !summary) {
    return (
      <>
        <Card title="Household mode" subtitle="Run money as a team — with privacy by design">
          <p className="max-w-2xl text-sm leading-relaxed text-muted">
            Share finances with a partner or family without giving up autonomy: each member chooses
            exactly which accounts the household can see. Unshared accounts and their spending
            never appear in household views — not hidden in the UI, excluded in the engine.
          </p>
        </Card>
        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Start a household">
            <form action={createHousehold} className="space-y-3">
              <input
                name="name"
                placeholder="e.g. The Nguyen household"
                aria-label="Household name"
                className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent"
              />
              <button type="submit" className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90">
                Create household
              </button>
            </form>
          </Card>
          <Card title="Join with an invite code">
            <JoinForm />
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <Card
        title={household.name}
        subtitle={`${household.members.length} member${household.members.length === 1 ? "" : "s"} · you are ${role === "OWNER" ? "the owner" : "a member"}`}
        action={
          <form action={leaveHousehold}>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:text-negative"
            >
              <LogOut size={12} aria-hidden /> Leave
            </button>
          </form>
        }
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Shared balance" value={formatAUD(summary.combinedBalanceCents, { compact: true })} tone={summary.combinedBalanceCents >= 0 ? "positive" : "negative"} />
          <Stat label="Shared assets" value={formatAUD(summary.combinedAssetsCents, { compact: true })} />
          <Stat label="Shared debts" value={formatAUD(summary.combinedLiabilitiesCents, { compact: true })} tone="negative" />
          <Stat label="Month spending" value={formatAUD(summary.monthSpendCents)} hint={`of ${formatAUD(summary.monthIncomeCents)} income`} />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-surface-2 p-3 text-sm">
          <Users size={15} className="text-accent" aria-hidden />
          <span className="text-muted">Invite code:</span>
          <code className="rounded-lg bg-surface px-2 py-1 font-mono text-sm font-bold tracking-widest">{household.inviteCode}</code>
          <span className="flex items-center gap-1 text-xs text-faint">
            <Copy size={11} aria-hidden /> share it with family to add them
          </span>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Members" subtitle="This month, from shared accounts only">
          <ul className="space-y-4">
            {summary.members.map((m) => (
              <li key={m.name}>
                <div className="mb-1 flex items-baseline justify-between">
                  <p className="text-sm font-semibold">
                    {m.name} {m.isYou && <Badge tone="accent">you</Badge>}
                  </p>
                  <p className="text-xs tabular-nums text-muted">
                    {formatAUD(m.sharedSpendCents)} spent · {percent(m.spendShare)} of household
                  </p>
                </div>
                <ProgressBar fraction={m.spendShare} />
                <p className="mt-1 text-[11px] text-faint">
                  {m.sharedAccounts.length} shared account{m.sharedAccounts.length === 1 ? "" : "s"} ·{" "}
                  {formatAUD(m.sharedBalanceCents)} combined
                </p>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Your account sharing" subtitle="Only what you switch on is visible to the household — everything else stays yours alone">
          <ul className="divide-y divide-border">
            {myAccounts.map((a) => {
              const toggle = toggleAccountShared.bind(null, a.id);
              return (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{a.name}</p>
                    <p className="text-xs text-faint">
                      {a.institution} · {formatAUD(a.balanceCents)}
                    </p>
                  </div>
                  <form action={toggle}>
                    <button
                      type="submit"
                      aria-pressed={a.shared}
                      aria-label={`${a.shared ? "Stop sharing" : "Share"} ${a.name} with household`}
                      className={
                        a.shared
                          ? "flex items-center gap-1.5 rounded-xl bg-accent px-3 py-1.5 text-xs font-semibold text-white"
                          : "flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:border-accent hover:text-accent"
                      }
                    >
                      {a.shared ? <Eye size={12} aria-hidden /> : <EyeOff size={12} aria-hidden />}
                      {a.shared ? "Shared" : "Private"}
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </>
  );
}
