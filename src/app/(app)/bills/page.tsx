import { differenceInCalendarDays } from "date-fns";
import { getDashboard } from "@/lib/data";
import { formatAUD } from "@/lib/domain/money";
import { Badge, Card, Stat } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bills" };

export default async function BillsPage() {
  const d = await getDashboard();
  const now = new Date();
  const next30 = d.bills.filter((b) => differenceInCalendarDays(b.nextDueDate, now) <= 30);

  return (
    <>
      <Card>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Stat label="Due in 30 days" value={formatAUD(next30.reduce((a, b) => a + b.amountCents, 0))} hint={`${next30.length} bills`} />
          <Stat label="On autopay" value={`${d.bills.filter((b) => b.autopay).length} of ${d.bills.length}`} hint="Set-and-forget beats late fees" />
          <Stat
            label="Needs action"
            value={String(d.bills.filter((b) => !b.autopay && differenceInCalendarDays(b.nextDueDate, now) <= 14).length)}
            tone="negative"
            hint="Manual bills due within a fortnight"
          />
        </div>
      </Card>

      <Card title="Upcoming bills" subtitle="Sorted by due date — reminders fire 3 days out">
        <ul className="divide-y divide-border">
          {d.bills.map((b) => {
            const days = differenceInCalendarDays(b.nextDueDate, now);
            return (
              <li key={b.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{b.name}</p>
                  <p className="text-xs text-faint">
                    {b.nextDueDate.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "long" })} ·{" "}
                    {b.frequency.toLowerCase()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {b.autopay ? (
                    <Badge tone="positive">autopay</Badge>
                  ) : days <= 7 ? (
                    <Badge tone="negative">due in {days}d — late fee risk</Badge>
                  ) : (
                    <Badge tone="warning">manual</Badge>
                  )}
                  <span className="tabular-nums text-sm font-semibold">{formatAUD(b.amountCents)}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
    </>
  );
}
