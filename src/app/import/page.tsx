import { getDemoUser } from "@/lib/data";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui";
import { ImportClient } from "./ImportClient";
import { SyncButton } from "./SyncButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "Import & Sync" };

export default async function ImportPage() {
  const user = await getDemoUser();
  const accounts = await prisma.account.findMany({
    where: { userId: user.id, type: { in: ["TRANSACTION", "SAVINGS", "CREDIT_CARD"] } },
    select: { id: true, name: true, institution: true, lastSyncedAt: true },
  });

  return (
    <>
      <Card
        title="Bank connections"
        subtitle="Production uses read-only Open Banking (CDR) via accredited providers — never your internet banking password. The demo feed below exercises the exact same pipeline."
        action={<SyncButton />}
      >
        <ul className="divide-y divide-border">
          {accounts.map((a) => (
            <li key={a.id} className="flex items-center justify-between py-2.5 text-sm">
              <div>
                <p className="font-medium">{a.name}</p>
                <p className="text-xs text-faint">{a.institution}</p>
              </div>
              <p className="text-xs text-muted">
                {a.lastSyncedAt
                  ? `Synced ${a.lastSyncedAt.toLocaleString("en-AU", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}`
                  : "Never synced"}
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs leading-relaxed text-faint">
          Every import path — feed, CSV, manual — runs the same pipeline: normalise → auto-categorise
          (your rules first) → duplicate suppression → insert. Syncing twice never double-counts.
        </p>
      </Card>

      <ImportClient accounts={accounts.map(({ id, name }) => ({ id, name }))} />
    </>
  );
}
