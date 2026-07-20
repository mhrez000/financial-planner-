import { Check, Flame, Trophy } from "lucide-react";
import { getHabitsPage } from "@/lib/data";
import { toggleHabitToday } from "@/lib/actions";
import { Badge, Card, ProgressBar, Stat } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Habits" };

const CHALLENGES = [
  { name: "No Spend Week", desc: "Seven days, essentials only. Average member saves $180.", xp: 300 },
  { name: "Coffee Challenge", desc: "Halve café coffees for a month; watch the Coffee budget line fall.", xp: 200 },
  { name: "52 Week Challenge", desc: "Save $1 in week 1, $2 in week 2… $1,378 by Christmas.", xp: 500 },
  { name: "Weekend Freeze", desc: "One weekend, zero discretionary spending. Harder than it sounds.", xp: 150 },
];

const LEVELS = [0, 500, 1200, 2500, 5000, 9000];

export default async function HabitsPage() {
  const habits = await getHabitsPage();
  const totalXp = habits.reduce((a, h) => a + h.xp, 0);
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

      <Card title="Savings challenges" subtitle="Structured sprints that turn saving into a game">
        <div className="grid gap-3 sm:grid-cols-2">
          {CHALLENGES.map((c) => (
            <div key={c.name} className="flex items-start gap-3 rounded-xl border border-border p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <Trophy size={16} aria-hidden />
              </span>
              <div>
                <p className="text-sm font-semibold">
                  {c.name} <span className="ml-1 text-[11px] font-medium text-accent">+{c.xp} XP</span>
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted">{c.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
