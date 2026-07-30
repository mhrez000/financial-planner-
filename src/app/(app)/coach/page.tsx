import { getCoachContext } from "@/lib/data";
import { formatAUD } from "@/lib/domain/money";
import { CoachChat } from "./CoachChat";

export const dynamic = "force-dynamic";
export const metadata = { title: "Coach" };

export default async function CoachPage() {
  const ctx = await getCoachContext();
  const opening = `G'day ${ctx.firstName} — I'm your money coach. Right now: health score ${ctx.health.score}/100, ${formatAUD(ctx.safeToSpend.safeCents)} safe to spend. Every answer I give is computed from your actual data, never guessed. What would you like to know?`;

  return (
    <CoachChat
      opening={opening}
      suggestions={[
        "Can I afford a $2,000 holiday?",
        "How do I improve my health score?",
        "Where am I overspending?",
        "When will I reach my goals?",
        "What should I do on payday?",
        "What subscriptions am I paying for?",
      ]}
    />
  );
}
