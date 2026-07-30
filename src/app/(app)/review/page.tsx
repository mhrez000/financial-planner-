import { getWeeklyReview } from "@/lib/data";
import { formatAUD } from "@/lib/domain/money";
import { ReviewFlow, type ReviewStep } from "./ReviewFlow";

export const dynamic = "force-dynamic";
export const metadata = { title: "Weekly Review" };

const title = (s: string) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

export default async function ReviewPage() {
  const r = await getWeeklyReview();
  const surplus = r.week.incomeCents - r.week.spendCents - r.week.savedCents;

  const steps: ReviewStep[] = [
    {
      title: "Your wins",
      emoji: "🎉",
      intro: "Start with what went right — momentum is built on noticing it.",
      items: [
        { text: `You saved ${formatAUD(r.week.savedCents)} this week`, tone: "positive" },
        {
          text:
            surplus >= 0
              ? `You spent ${formatAUD(surplus)} less than you earned`
              : `Spending ran ${formatAUD(-surplus)} over income this week — next step covers where`,
          tone: surplus >= 0 ? "positive" : "neutral",
        },
        ...(r.bestStreak
          ? [{ text: `Best habit streak: ${r.bestStreak.name} — ${r.bestStreak.streak} days`, tone: "positive" as const }]
          : []),
        ...r.celebrations.map((c) => ({ text: c.title, tone: "positive" as const })),
      ],
    },
    {
      title: "Worth a look",
      emoji: "🔍",
      intro: "No judgement — just the three things your money did that deserve a glance.",
      items: [
        ...r.largest.map((t) => ({
          text: `${formatAUD(Math.abs(t.amountCents))} at ${title(t.merchant)} (${t.category?.name ?? "uncategorised"})`,
          tone: "neutral" as const,
        })),
        ...r.hotBudgets.map((b) => ({
          text: `${b.category.name} budget is running hot: ${formatAUD(b.spentCents)} of ${formatAUD(b.amountCents)}`,
          tone: "warning" as const,
        })),
        ...r.priceRises.map((s) => ({
          text: `${title(s.merchant)} charged more than usual — worth checking the plan`,
          tone: "warning" as const,
        })),
      ],
    },
    {
      title: "The week ahead",
      emoji: "🗺️",
      intro: "Set the week up so good decisions happen by default.",
      items: [
        { text: `Safe to spend: ${formatAUD(r.safeToSpend.safeCents)} after bills and goal commitments`, tone: "positive" },
        ...r.billsNext7.map((b) => ({
          text: `${b.name} due ${b.nextDueDate.toLocaleDateString("en-AU", { weekday: "long" })} — ${formatAUD(b.amountCents)}${b.autopay ? " (autopay)" : " — pay it manually"}`,
          tone: b.autopay ? ("neutral" as const) : ("warning" as const),
        })),
        ...r.goals.slice(0, 2).map((g) => ({
          text: g.forecast.predictedCompletion
            ? `${g.name}: on track for ${g.forecast.predictedCompletion.toLocaleDateString("en-AU", { month: "short", year: "numeric" })}`
            : `${g.name}: set a monthly contribution to get a forecast`,
          tone: "neutral" as const,
        })),
      ],
    },
  ];

  return (
    <ReviewFlow
      steps={steps}
      alreadyDone={r.completedThisWeek}
      reviewCount={r.reviewStreakWeeks}
    />
  );
}
