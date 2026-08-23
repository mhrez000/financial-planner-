import { Check, Flame, Trophy } from "lucide-react";
import { getChallengesPage, getHabitsPage } from "@/lib/data";
import { joinChallenge, resolveChallenge, toggleHabitToday } from "@/lib/actions";
import { CHALLENGE_DEFS } from "@/lib/domain/challenges";
import { Badge, Card, ProgressBar, Stat } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Habits" };

const LEVELS = [0, 500, 1200, 2500, 5000, 9000];

export default async function HabitsPage() {
  const [habits, challenges] = await Promise.all([getHabitsPage(), getChallengesPage()]);
  const challengeXp = challenges.filter((c) => c.status === "COMPLETED").reduce((a, c) => a + c.xp, 0);
  const totalXp = habits.reduce((a, h) => a + h.xp, 0) + challengeXp;
  const level = LEVELS.filter((l) => totalXp >= l).length;
  const nextLevelXp = LEVELS[level] ?? LEVELS[LEVELS.length - 1];
  const bestStreak = Math.max(0, ...habits.map((h) => h.streak));

  return (
    <>
      <Card>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Level" value={String(level)} hint={`${totalXp} XP · next at ${nextLevelXp}`} />
          <Stat label="Best streak" value={`${bestStreak} days`} tone="positive" />
          <Stat label="Habits active" value={String(habits.length)} />
          <Stat label="Check-ins" value={String(habits.reduce((a, h) => a + h.totalLogs, 0))} hint="Last 30 days" />
        </div>
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs text-muted">
            <span>Level {level}</span>
            <span>{totalXp} / {nextLevelXp} XP</span>
          </div>
          <ProgressBar fraction={totalXp / nextLevelXp} className="h-2.5" />
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {habits.map((h) => {
          const toggle = toggleHabitToday.bind(null, h.id);
          return (
            <Card key={h.id}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">{h.name}</h3>
                <Badge tone={h.streak > 0 ? "accent" : "neutral"}>
                  <Flame size={11} aria-hidden /> {h.streak} day streak
                </Badge>
              </div>
              <p className="mb-4 text-xs text-muted">
                {h.totalLogs} check-ins in 30 days · {h.xp} XP earned
              </p>
              <form action={toggle}>
                <button
                  type="submit"
                  className={
                    h.doneToday
                      ? "flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-3 py-2.5 text-sm font-semibold text-white"
                      : "flex w-full items-center justify-center gap-2 rounded-xl border border-border px-3 py-2.5 text-sm font-semibold text-muted transition-colors hover:border-accent hover:text-accent"
                  }
                >
                  <Check size={15} aria-hidden />
                  {h.doneToday ? "Done today — nice!" : "Mark today done"}
                </button>
              </form>
            </Card>
          );
        })}
      </div>

      {challenges.filter((c) => c.status === "ACTIVE").length > 0 && (
        <Card title="Your challenges" subtitle="Judged live by your transactions — the ledger is the referee">
          <div className="grid gap-3 md:grid-cols-2">
            {challenges
              .filter((c) => c.status === "ACTIVE")
              .map((c) => {
                const claim = resolveChallenge.bind(null, c.id, "COMPLETED");
                const concede = resolveChallenge.bind(null, c.id, c.state.failed ? "FAILED" : "ABANDONED");
                return (
                  <div key={c.id} className="rounded-xl border border-border p-4">
                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-sm font-semibold">{c.def.name}</p>
                      {c.state.succeeded ? (
                        <Badge tone="positive">complete!</Badge>
                      ) : c.state.failed ? (
                        <Badge tone="negative">broken</Badge>
                      ) : c.state.passing ? (
                        <Badge tone="accent">on track</Badge>
                      ) : (
                        <Badge tone="warning">behind pace</Badge>
                      )}
                    </div>
                    <p className="mb-2 text-xs text-muted">{c.state.detail}</p>
                    <ProgressBar
                      fraction={c.state.timeFraction}
                      tone={c.state.failed ? "negative" : "accent"}
                    />
                    <p className="mt-1 text-[11px] text-faint">
                      {Math.round(c.state.timeFraction * 100)}% of the window elapsed · ends{" "}
                      {c.endDate.toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                    </p>
                    <div className="mt-3 flex gap-2">
                      {c.state.succeeded && (
                        <form action={claim} className="flex-1">
                          <button type="submit" className="w-full rounded-xl bg-accent px-3 py-2 text-xs font-semibold text-white">
                            Claim +{c.xp} XP
                          </button>
                        </form>
                      )}
                      {(c.state.failed || !c.state.succeeded) && (
                        <form action={concede} className={c.state.succeeded ? "" : "flex-1"}>
                          <button
                            type="submit"
                            className="w-full rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted transition-colors hover:text-negative"
                          >
                            {c.state.failed ? "Accept defeat — rematch later" : "Abandon"}
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </Card>
      )}

      <Card title="Savings challenges" subtitle="Structured sprints that turn saving into a game — progress is verified against your real spending">
        <div className="grid gap-3 sm:grid-cols-2">
          {CHALLENGE_DEFS.map((def) => {
            const active = challenges.some((c) => c.type === def.type && c.status === "ACTIVE");
            const completed = challenges.filter((c) => c.type === def.type && c.status === "COMPLETED").length;
            const join = joinChallenge.bind(null, def.type);
            return (
              <div key={def.type} className="flex items-start gap-3 rounded-xl border border-border p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <Trophy size={16} aria-hidden />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold">
                    {def.name} <span className="ml-1 text-[11px] font-medium text-accent">+{def.xp} XP</span>
                    {completed > 0 && <span className="ml-1.5 text-[11px] text-faint">✓ ×{completed}</span>}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted">{def.description}</p>
                  <form action={join} className="mt-2">
                    <button
                      type="submit"
                      disabled={active}
                      className="rounded-xl border border-accent px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent-soft disabled:cursor-not-allowed disabled:border-border disabled:text-faint"
                    >
                      {active ? "In progress" : "Start challenge"}
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </>
  );
}
