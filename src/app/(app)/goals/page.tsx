import { Car, Home, Plane, Shield, Target } from "lucide-react";
import { getDashboard } from "@/lib/data";
import { addGoalContribution } from "@/lib/actions";
import { formatAUD, percent } from "@/lib/domain/money";
import { Badge, Card, ProgressBar } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Goals" };

const ICONS: Record<string, typeof Target> = { shield: Shield, plane: Plane, home: Home, car: Car };

export default async function GoalsPage() {
  const d = await getDashboard();

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {d.goals.map((g) => {
          const Icon = ICONS[g.icon] ?? Target;
          const frac = g.savedCents / g.targetCents;
          const f = g.forecast;
          const contribute = addGoalContribution.bind(null, g.id, 100);
          return (
            <Card key={g.id}>
              <div className="mb-3 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <Icon size={18} aria-hidden />
                </span>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold">{g.name}</h3>
                  <p className="text-xs text-muted">
                    {g.deadline
                      ? `Target: ${g.deadline.toLocaleDateString("en-AU", { month: "long", year: "numeric" })}`
                      : "No deadline — steady as she goes"}
                  </p>
                </div>
                {f.onTrack ? <Badge tone="positive">on track</Badge> : <Badge tone="warning">needs a boost</Badge>}
              </div>

              <div className="mb-1 flex items-baseline justify-between">
                <p className="text-xl font-semibold tabular-nums">{formatAUD(g.savedCents)}</p>
                <p className="text-xs text-muted">of {formatAUD(g.targetCents)} · {percent(frac)}</p>
              </div>
              <ProgressBar fraction={frac} className="h-2.5" />

              <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-surface-2 p-2">
                  <dt className="text-[10px] uppercase tracking-wide text-faint">Monthly</dt>
                  <dd className="text-sm font-semibold tabular-nums">{formatAUD(g.monthlyContribCents)}</dd>
                </div>
                <div className="rounded-xl bg-surface-2 p-2">
                  <dt className="text-[10px] uppercase tracking-wide text-faint">Finish</dt>
                  <dd className="text-sm font-semibold">
                    {f.predictedCompletion
                      ? f.predictedCompletion.toLocaleDateString("en-AU", { month: "short", year: "2-digit" })
                      : "—"}
                  </dd>
                </div>
                <div className="rounded-xl bg-surface-2 p-2">
                  <dt className="text-[10px] uppercase tracking-wide text-faint">Likelihood</dt>
                  <dd className="text-sm font-semibold tabular-nums">{Math.round(f.successProbability * 100)}%</dd>
                </div>
              </dl>

              <form action={contribute} className="mt-3">
                <button type="submit" className="w-full rounded-xl border border-accent px-3 py-2 text-xs font-semibold text-accent transition-colors hover:bg-accent-soft">
                  Add a $100 boost
                </button>
              </form>
            </Card>
          );
        })}
      </div>

      <Card title="How predictions work" subtitle="No black boxes">
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The finish date divides what&rsquo;s left by your monthly contribution. The likelihood compares that
          finish date with your deadline — comfortable slack scores high, cutting it fine scores low. Boost a
          goal or trim a category budget and both update instantly, so you can see exactly what a $30/week
          change buys you.
        </p>
      </Card>
    </>
  );
}
